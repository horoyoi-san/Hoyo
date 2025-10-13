import { Elysia, t } from "elysia"
import { jwt } from "@elysiajs/jwt"
import { bearer } from "@elysiajs/bearer"
import { db } from "../db"
import { googleOAuthConfig, googleOAuthRedirectUris } from "../db/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { logger } from "../utils/logger"
import { GoogleOAuthService } from "../services/google-oauth"

// 管理员权限验证中间件
const requireAdmin = async (bearer: string | undefined, jwt: any) => {
  if (!bearer) {
    throw new Error("未提供认证令牌")
  }

  const payload = await jwt.verify(bearer)
  if (!payload) {
    throw new Error("认证令牌无效")
  }

  if (payload.role !== "admin") {
    throw new Error("需要管理员权限")
  }

  return payload
}

export const adminGoogleOAuthRoutes = new Elysia({ prefix: "/admin" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "your-secret-key",
    }),
  )
  .use(bearer())
  .get("/google-oauth-config", async ({ jwt, bearer, set }) => {
    try {
      await requireAdmin(bearer, jwt)

      const config = await db.select().from(googleOAuthConfig).get()
      const redirectUris = await db.select().from(googleOAuthRedirectUris).all()
      
      return {
        config: config ? {
          enabled: config.enabled,
          clientId: config.clientId || "",
          clientSecret: config.clientSecret || "",
          redirectUris: redirectUris.map(uri => ({
            id: uri.id,
            redirectUri: uri.redirectUri,
            name: uri.name,
            enabled: uri.enabled
          }))
        } : {
          enabled: false,
          clientId: "",
          clientSecret: "",
          redirectUris: []
        }
      }
    } catch (error: any) {
      logger.error("获取谷歌OAuth配置失败:", error)
      set.status = error.message === "需要管理员权限" ? 403 : 401
      return { error: error.message }
    }
  })
  .post("/google-oauth-config", async ({ body, jwt, bearer, set }) => {
    try {
      await requireAdmin(bearer, jwt)

      const { enabled, clientId, clientSecret } = body

      // 如果要启用OAuth，验证必填字段和回调链接
      if (enabled) {
        if (!clientId || !clientSecret) {
          set.status = 400
          return { error: "启用谷歌OAuth时，客户端ID和客户端密钥都是必填的" }
        }

        // 检查是否至少有一个启用的回调链接
        const enabledRedirectUris = await db
          .select()
          .from(googleOAuthRedirectUris)
          .where(eq(googleOAuthRedirectUris.enabled, true))
          .all()

        if (enabledRedirectUris.length === 0) {
          set.status = 400
          return { error: "启用谷歌OAuth时，至少需要一个有效的回调链接" }
        }
      }

      const now = Date.now()

      // 检查是否已存在配置
      const existingConfig = await db.select().from(googleOAuthConfig).get()

      if (existingConfig) {
        // 更新现有配置
        await db.update(googleOAuthConfig)
          .set({
            enabled,
            clientId: enabled ? clientId : null,
            clientSecret: enabled ? clientSecret : null,
            updatedAt: now
          })
          .where(eq(googleOAuthConfig.id, 1))
      } else {
        // 创建新配置
        await db.insert(googleOAuthConfig).values({
          id: 1,
          enabled,
          clientId: enabled ? clientId : null,
          clientSecret: enabled ? clientSecret : null,
          redirectUri: null, // 保留字段但不使用
          updatedAt: now
        })
      }

      logger.info(`谷歌OAuth配置已更新: enabled=${enabled}`)
      return { success: true, message: "配置已保存" }
    } catch (error: any) {
      logger.error("保存谷歌OAuth配置失败:", error)
      set.status = error.message === "需要管理员权限" ? 403 : 500
      return { error: error.message }
    }
  }, {
    body: t.Object({
      enabled: t.Boolean(),
      clientId: t.String(),
      clientSecret: t.String()
    })
  })
  // 添加新的回调链接
  .post("/google-oauth-redirect-uri", async ({ body, jwt, bearer, set }) => {
    try {
      await requireAdmin(bearer, jwt)

      const { redirectUri, name } = body

      if (!redirectUri || !name) {
        set.status = 400
        return { error: "回调链接和名称都是必填的" }
      }

      // 检查是否已存在相同的回调链接
      const existingUri = await db
        .select()
        .from(googleOAuthRedirectUris)
        .where(eq(googleOAuthRedirectUris.redirectUri, redirectUri))
        .get()

      if (existingUri) {
        set.status = 400
        return { error: "此回调链接已存在" }
      }

      const now = Date.now()
      const id = nanoid()

      await db.insert(googleOAuthRedirectUris).values({
        id,
        redirectUri,
        name,
        enabled: true,
        createdAt: now,
        updatedAt: now
      })

      logger.info(`新增谷歌OAuth回调链接: ${name} - ${redirectUri}`)
      return { 
        success: true, 
        message: "回调链接已添加",
        redirectUri: { id, redirectUri, name, enabled: true }
      }
    } catch (error: any) {
      logger.error("添加谷歌OAuth回调链接失败:", error)
      set.status = error.message === "需要管理员权限" ? 403 : 500
      return { error: error.message }
    }
  }, {
    body: t.Object({
      redirectUri: t.String(),
      name: t.String()
    })
  })
  // 更新回调链接
  .put("/google-oauth-redirect-uri/:id", async ({ params, body, jwt, bearer, set }) => {
    try {
      await requireAdmin(bearer, jwt)

      const { id } = params
      const { redirectUri, name, enabled } = body

      if (!redirectUri || !name) {
        set.status = 400
        return { error: "回调链接和名称都是必填的" }
      }

      // 检查回调链接是否存在
      const existingUri = await db
        .select()
        .from(googleOAuthRedirectUris)
        .where(eq(googleOAuthRedirectUris.id, id))
        .get()

      if (!existingUri) {
        set.status = 404
        return { error: "回调链接不存在" }
      }

      // 如果更新了URL，检查新URL是否与其他记录冲突
      if (redirectUri !== existingUri.redirectUri) {
        const conflictingUri = await db
          .select()
          .from(googleOAuthRedirectUris)
          .where(eq(googleOAuthRedirectUris.redirectUri, redirectUri))
          .get()

        if (conflictingUri && conflictingUri.id !== id) {
          set.status = 400
          return { error: "此回调链接已被其他配置使用" }
        }
      }

      const now = Date.now()

      await db
        .update(googleOAuthRedirectUris)
        .set({
          redirectUri,
          name,
          enabled,
          updatedAt: now
        })
        .where(eq(googleOAuthRedirectUris.id, id))

      logger.info(`更新谷歌OAuth回调链接: ${name} - ${redirectUri}`)
      return { success: true, message: "回调链接已更新" }
    } catch (error: any) {
      logger.error("更新谷歌OAuth回调链接失败:", error)
      set.status = error.message === "需要管理员权限" ? 403 : 500
      return { error: error.message }
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      redirectUri: t.String(),
      name: t.String(),
      enabled: t.Boolean()
    })
  })
  // 删除回调链接
  .delete("/google-oauth-redirect-uri/:id", async ({ params, jwt, bearer, set }) => {
    try {
      await requireAdmin(bearer, jwt)

      const { id } = params

      // 检查回调链接是否存在
      const existingUri = await db
        .select()
        .from(googleOAuthRedirectUris)
        .where(eq(googleOAuthRedirectUris.id, id))
        .get()

      if (!existingUri) {
        set.status = 404
        return { error: "回调链接不存在" }
      }

      // 检查是否至少保留一个回调链接（如果OAuth已启用）
      const config = await db.select().from(googleOAuthConfig).get()
      if (config?.enabled) {
        const allUris = await db.select().from(googleOAuthRedirectUris).all()
        if (allUris.length <= 1) {
          set.status = 400
          return { error: "至少需要保留一个回调链接（OAuth已启用）" }
        }
      }

      await db
        .delete(googleOAuthRedirectUris)
        .where(eq(googleOAuthRedirectUris.id, id))

      logger.info(`删除谷歌OAuth回调链接: ${existingUri.name} - ${existingUri.redirectUri}`)
      return { success: true, message: "回调链接已删除" }
    } catch (error: any) {
      logger.error("删除谷歌OAuth回调链接失败:", error)
      set.status = error.message === "需要管理员权限" ? 403 : 500
      return { error: error.message }
    }
  }, {
    params: t.Object({
      id: t.String()
    })
  })
  .post("/test-google-oauth", async ({ body, jwt, bearer, set }) => {
    try {
      await requireAdmin(bearer, jwt)

      const { clientId, clientSecret, redirectUri } = body

      if (!clientId || !clientSecret || !redirectUri) {
        set.status = 400
        return { error: "所有配置项都是必填的" }
      }

      // 创建谷歌OAuth服务实例进行测试
      const googleOAuth = new GoogleOAuthService({
        clientId,
        clientSecret,
        redirectUri
      })

      // 生成授权URL来测试配置是否有效
      try {
        const authUrl = googleOAuth.getAuthUrl("test")
        
        // 如果能成功生成URL，说明配置基本有效
        if (authUrl && authUrl.includes('accounts.google.com')) {
          return { 
            success: true, 
            message: "谷歌OAuth配置测试成功",
            authUrl: authUrl.substring(0, 100) + "..." // 只返回URL的前100个字符用于验证
          }
        } else {
          return { success: false, error: "生成的授权URL无效" }
        }
      } catch (error: any) {
        return { 
          success: false, 
          error: `配置测试失败: ${error.message}` 
        }
      }
    } catch (error: any) {
      logger.error("测试谷歌OAuth配置失败:", error)
      set.status = error.message === "需要管理员权限" ? 403 : 500
      return { error: error.message }
    }
  }, {
    body: t.Object({
      clientId: t.String(),
      clientSecret: t.String(),
      redirectUri: t.String()
    })
  })