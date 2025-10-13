import { Elysia, t } from "elysia"
import { jwt } from "@elysiajs/jwt"
import { bearer } from "@elysiajs/bearer"
import { db } from "../db"
import { microsoftOAuthConfig, microsoftOAuthRedirectUris } from "../db/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { logger } from "../utils/logger"
import { MicrosoftOAuthService } from "../services/microsoft-oauth"

// 验证管理员权限的中间件
const adminAuth = async ({ jwt, bearer, set }: any) => {
  if (!bearer) {
    set.status = 401
    throw new Error("No token provided")
  }

  const payload = await jwt.verify(bearer)
  if (!payload || payload.role !== "admin") {
    set.status = 403
    throw new Error("Admin access required")
  }

  return { user: payload }
}

export const adminMicrosoftOAuthRoutes = new Elysia({ prefix: "/admin" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET!,
    }),
  )
  .use(bearer())
  .derive(adminAuth)
  
  // 获取Microsoft OAuth配置
  .get("/microsoft-oauth-config", async ({ jwt, bearer, set }) => {
    try {
      const config = await db.select().from(microsoftOAuthConfig).get()
      const redirectUris = await db.select().from(microsoftOAuthRedirectUris).all()

      // 隐藏敏感信息
      const safeConfig = config ? {
        id: config.id,
        enabled: config.enabled,
        clientId: config.clientId,
        clientSecret: config.clientSecret ? "***已设置***" : null,
        tenantId: config.tenantId,
        updatedAt: config.updatedAt,
      } : null

      const safeRedirectUris = redirectUris.map(uri => ({
        id: uri.id,
        redirectUri: uri.redirectUri,
        name: uri.name,
        enabled: uri.enabled,
        createdAt: uri.createdAt,
        updatedAt: uri.updatedAt,
      }))

      return {
        config: safeConfig,
        redirectUris: safeRedirectUris,
      }
    } catch (error) {
      logger.error("获取Microsoft OAuth配置失败:", error)
      set.status = 500
      return { error: "获取配置失败" }
    }
  })

  // 保存Microsoft OAuth配置
  .post("/microsoft-oauth-config", async ({ body, jwt, bearer, set }) => {
    try {
      const { enabled, clientId, clientSecret, tenantId } = body as {
        enabled: boolean
        clientId?: string
        clientSecret?: string
        tenantId?: string
      }

      // 如果启用Microsoft OAuth，必须提供客户端ID和客户端密钥
      if (enabled && (!clientId || !clientSecret)) {
        set.status = 400
        return { error: "启用Microsoft OAuth时，客户端ID和客户端密钥都是必填的" }
      }

      // 如果启用Microsoft OAuth，必须至少有一个有效的回调链接
      if (enabled) {
        const enabledUris = await db
          .select()
          .from(microsoftOAuthRedirectUris)
          .where(eq(microsoftOAuthRedirectUris.enabled, true))
          .all()

        if (enabledUris.length === 0) {
          set.status = 400
          return { error: "启用Microsoft OAuth时，至少需要一个有效的回调链接" }
        }
      }

      const now = Date.now()

      // 检查配置是否已存在
      const existingConfig = await db.select().from(microsoftOAuthConfig).get()

      if (existingConfig) {
        // 更新现有配置
        await db.update(microsoftOAuthConfig)
          .set({
            enabled,
            clientId: clientId || existingConfig.clientId,
            clientSecret: clientSecret || existingConfig.clientSecret,
            tenantId: tenantId || existingConfig.tenantId || 'common',
            updatedAt: now,
          })
          .where(eq(microsoftOAuthConfig.id, 1))
      } else {
        // 创建新配置
        await db.insert(microsoftOAuthConfig).values({
          id: 1,
          enabled,
          clientId: clientId || "",
          clientSecret: clientSecret || "",
          tenantId: tenantId || 'common',
          updatedAt: now,
        })
      }

      logger.info(`Microsoft OAuth配置已更新: enabled=${enabled}`)
      return { success: true }
    } catch (error) {
      logger.error("保存Microsoft OAuth配置失败:", error)
      set.status = 500
      return { error: "保存配置失败" }
    }
  }, {
    body: t.Object({
      enabled: t.Boolean(),
      clientId: t.Optional(t.String()),
      clientSecret: t.Optional(t.String()),
      tenantId: t.Optional(t.String()),
    }),
  })

  // 添加回调URI
  .post("/microsoft-oauth-redirect-uri", async ({ body, jwt, bearer, set }) => {
    try {
      const { redirectUri, name } = body as {
        redirectUri: string
        name: string
      }

      // 检查回调URI是否已存在
      const existingUri = await db
        .select()
        .from(microsoftOAuthRedirectUris)
        .where(eq(microsoftOAuthRedirectUris.redirectUri, redirectUri))
        .get()

      if (existingUri) {
        set.status = 400
        return { error: "该回调链接已存在" }
      }

      const now = Date.now()
      const id = nanoid()

      await db.insert(microsoftOAuthRedirectUris).values({
        id,
        redirectUri,
        name,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

      logger.info(`新增Microsoft OAuth回调链接: ${name} - ${redirectUri}`)
      return { 
        success: true,
        uri: { id, redirectUri, name, enabled: true, createdAt: now, updatedAt: now }
      }
    } catch (error) {
      logger.error("添加Microsoft OAuth回调链接失败:", error)
      set.status = 500
      return { error: "添加回调链接失败" }
    }
  }, {
    body: t.Object({
      redirectUri: t.String(),
      name: t.String(),
    }),
  })

  // 更新回调URI
  .put("/microsoft-oauth-redirect-uri/:id", async ({ params, body, jwt, bearer, set }) => {
    try {
      const { id } = params
      const { redirectUri, name, enabled } = body as {
        redirectUri: string
        name: string
        enabled: boolean
      }

      // 检查回调URI是否存在
      const existingUri = await db
        .select()
        .from(microsoftOAuthRedirectUris)
        .where(eq(microsoftOAuthRedirectUris.id, id))
        .get()

      if (!existingUri) {
        set.status = 404
        return { error: "回调链接未找到" }
      }

      // 如果修改了URI，检查新URI是否与其他记录冲突
      if (redirectUri !== existingUri.redirectUri) {
        const conflictUri = await db
          .select()
          .from(microsoftOAuthRedirectUris)
          .where(eq(microsoftOAuthRedirectUris.redirectUri, redirectUri))
          .get()

        if (conflictUri) {
          set.status = 400
          return { error: "该回调链接已被其他记录使用" }
        }
      }

      const now = Date.now()

      await db
        .update(microsoftOAuthRedirectUris)
        .set({
          redirectUri,
          name,
          enabled,
          updatedAt: now,
        })
        .where(eq(microsoftOAuthRedirectUris.id, id))

      logger.info(`更新Microsoft OAuth回调链接: ${name} - ${redirectUri}`)
      return { success: true }
    } catch (error) {
      logger.error("更新Microsoft OAuth回调链接失败:", error)
      set.status = 500
      return { error: "更新回调链接失败" }
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      redirectUri: t.String(),
      name: t.String(),
      enabled: t.Boolean(),
    }),
  })

  // 删除回调URI
  .delete("/microsoft-oauth-redirect-uri/:id", async ({ params, jwt, bearer, set }) => {
    try {
      const { id } = params

      // 检查回调URI是否存在
      const existingUri = await db
        .select()
        .from(microsoftOAuthRedirectUris)
        .where(eq(microsoftOAuthRedirectUris.id, id))
        .get()

      if (!existingUri) {
        set.status = 404
        return { error: "回调链接未找到" }
      }

      // 检查删除后是否会导致Microsoft OAuth无法使用（如果已启用）
      const config = await db.select().from(microsoftOAuthConfig).get()
      const allUris = await db.select().from(microsoftOAuthRedirectUris).all()

      if (config?.enabled && allUris.length === 1 && allUris[0].id === id) {
        set.status = 400
        return { error: "无法删除最后一个回调链接，Microsoft OAuth功能需要至少一个回调链接" }
      }

      await db
        .delete(microsoftOAuthRedirectUris)
        .where(eq(microsoftOAuthRedirectUris.id, id))

      logger.info(`删除Microsoft OAuth回调链接: ${existingUri.name} - ${existingUri.redirectUri}`)
      return { success: true }
    } catch (error) {
      logger.error("删除Microsoft OAuth回调链接失败:", error)
      set.status = 500
      return { error: "删除回调链接失败" }
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })

  // 测试Microsoft OAuth配置
  .post("/test-microsoft-oauth", async ({ body, jwt, bearer, set }) => {
    try {
      const { clientId, clientSecret, tenantId, redirectUri } = body as {
        clientId: string
        clientSecret: string
        tenantId?: string
        redirectUri: string
      }

      // 创建Microsoft OAuth服务实例进行测试
      const microsoftOAuth = new MicrosoftOAuthService({
        clientId,
        clientSecret,
        redirectUri,
        tenantId: tenantId || 'common'
      })

      // 测试生成授权URL
      const authUrl = microsoftOAuth.getAuthUrl("test")

      // 基本验证：检查URL是否包含预期的域名和参数
      if (authUrl && authUrl.includes('login.partner.microsoftonline.cn') && authUrl.includes('oauth2/v2.0/authorize')) {
        return {
          success: true,
          message: "Microsoft OAuth配置测试成功",
          authUrl: authUrl.substring(0, 100) + "...", // 只返回URL的前缀用于确认
        }
      } else {
        set.status = 400
        return {
          success: false,
          error: "Microsoft OAuth配置可能存在问题"
        }
      }
    } catch (error) {
      logger.error("测试Microsoft OAuth配置失败:", error)
      set.status = 500
      return {
        success: false,
        error: "测试失败：" + (error instanceof Error ? error.message : String(error))
      }
    }
  }, {
    body: t.Object({
      clientId: t.String(),
      clientSecret: t.String(),
      tenantId: t.Optional(t.String()),
      redirectUri: t.String(),
    }),
  }) 