import { Elysia, t } from "elysia"
import { jwt } from "@elysiajs/jwt"
import { bearer } from "@elysiajs/bearer"
import bcrypt from "bcryptjs"
import { nanoid } from "nanoid"
import { db } from "../db"
import { users, emailVerificationCodes, smtpConfig, googleOAuthConfig, googleOAuthRedirectUris, githubOAuthConfig, githubOAuthRedirectUris, microsoftOAuthConfig, microsoftOAuthRedirectUris, files, storageConfig, userQuotas, siteConfig } from "../db/schema"
import { eq, and, gt } from "drizzle-orm"
import { sendVerificationEmail, generateVerificationCode } from "../services/email"
import { QuotaService } from "../services/quota"
import { GoogleOAuthService } from "../services/google-oauth"
import { GitHubOAuthService } from "../services/github-oauth"
import { MicrosoftOAuthService } from "../services/microsoft-oauth"
import { logger } from "../utils/logger"

// 检查 SMTP 是否启用的辅助函数
async function isSmtpEnabled(): Promise<boolean> {
  try {
    const config = await db.select().from(smtpConfig).get()

    if (config) {
      // 如果数据库中有配置，使用数据库配置
      logger.debug(`SMTP 状态检查: 使用数据库配置, enabled=${config.enabled}`)
      return config.enabled
    }

    // 如果数据库中没有配置，检查环境变量
    const hasEnvConfig = !!(process.env.SMTP_HOST && process.env.SMTP_PORT &&
                           process.env.SMTP_USER && process.env.SMTP_PASS)
    logger.debug(`SMTP 状态检查: 使用环境变量配置, enabled=${hasEnvConfig}`)
    return hasEnvConfig
  } catch (error) {
    logger.error("Failed to check SMTP status:", error)
    return false
  }
}

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "your-secret-key",
    }),
  )
  .use(bearer())
  .get("/smtp-status", async () => {
    const enabled = await isSmtpEnabled()
    return { enabled }
  })
  .get("/google-oauth-status", async () => {
    try {
      const config = await db.select().from(googleOAuthConfig).get()
      
      // 检查是否有至少一个启用的回调链接
      const redirectUris = await db
        .select()
        .from(googleOAuthRedirectUris)
        .where(eq(googleOAuthRedirectUris.enabled, true))
        .all()
      
      return { 
        enabled: config?.enabled || false,
        configured: !!(config?.clientId && config?.clientSecret && redirectUris.length > 0)
      }
    } catch (error) {
      logger.error("Failed to check Google OAuth status:", error)
      return { enabled: false, configured: false }
    }
  })
  .get("/github-oauth-status", async () => {
    try {
      const config = await db.select().from(githubOAuthConfig).get()
      
      // 检查是否有至少一个启用的回调链接
      const redirectUris = await db
        .select()
        .from(githubOAuthRedirectUris)
        .where(eq(githubOAuthRedirectUris.enabled, true))
        .all()
      
      return { 
        enabled: config?.enabled || false,
        configured: !!(config?.clientId && config?.clientSecret && redirectUris.length > 0)
      }
    } catch (error) {
      logger.error("Failed to check GitHub OAuth status:", error)
      return { enabled: false, configured: false }
    }
  })
  .get("/google-oauth-url", async ({ query, set }) => {
    try {
      const config = await db.select().from(googleOAuthConfig).get()
      
      if (!config?.enabled || !config.clientId || !config.clientSecret) {
        set.status = 400
        return { error: "谷歌OAuth未配置或未启用" }
      }

      // 获取所有启用的回调链接
      const redirectUris = await db
        .select()
        .from(googleOAuthRedirectUris)
        .where(eq(googleOAuthRedirectUris.enabled, true))
        .all()

      if (redirectUris.length === 0) {
        set.status = 400
        return { error: "未配置有效的回调链接" }
      }

      // 智能选择回调链接
      let finalRedirectUri: string
      const { origin } = query as { origin?: string }

      if (origin) {
        // 构造期望的回调链接
        const expectedRedirectUri = `${origin}/auth/google/callback`
        
        // 寻找匹配的回调链接
        const matchedUri = redirectUris.find(uri => uri.redirectUri === expectedRedirectUri)
        
        if (matchedUri) {
          finalRedirectUri = matchedUri.redirectUri
          logger.debug(`使用匹配的Google OAuth回调链接: ${finalRedirectUri}`)
        } else {
          // 如果没有找到完全匹配的，使用第一个启用的回调链接
          finalRedirectUri = redirectUris[0].redirectUri
          logger.debug(`未找到匹配的回调链接，使用默认的: ${finalRedirectUri}`)
          logger.warn(`建议在管理后台添加回调链接: ${expectedRedirectUri}`)
        }
      } else {
        // 如果没有传入origin，使用第一个启用的回调链接
        finalRedirectUri = redirectUris[0].redirectUri
      }

      const googleOAuth = new GoogleOAuthService({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: finalRedirectUri
      })

      const authUrl = googleOAuth.getAuthUrl()
      return { authUrl }
    } catch (error) {
      logger.error("生成谷歌OAuth URL失败:", error)
      set.status = 500
      return { error: "生成授权链接失败" }
    }
  })
  .get("/microsoft-oauth-status", async () => {
    try {
      const config = await db.select().from(microsoftOAuthConfig).get()
      
      // 检查是否有至少一个启用的回调链接
      const redirectUris = await db
        .select()
        .from(microsoftOAuthRedirectUris)
        .where(eq(microsoftOAuthRedirectUris.enabled, true))
        .all()
      
      return { 
        enabled: config?.enabled || false,
        configured: !!(config?.clientId && config?.clientSecret && redirectUris.length > 0)
      }
    } catch (error) {
      logger.error("Failed to check Microsoft OAuth status:", error)
      return { enabled: false, configured: false }
    }
  })
  .get("/microsoft-oauth-url", async ({ query, set }) => {
    try {
      const config = await db.select().from(microsoftOAuthConfig).get()
      
      if (!config?.enabled || !config.clientId || !config.clientSecret) {
        set.status = 400
        return { error: "Microsoft OAuth未配置或未启用" }
      }

      // 获取所有启用的回调链接
      const redirectUris = await db
        .select()
        .from(microsoftOAuthRedirectUris)
        .where(eq(microsoftOAuthRedirectUris.enabled, true))
        .all()

      if (redirectUris.length === 0) {
        set.status = 400
        return { error: "未配置有效的回调链接" }
      }

      // 智能选择回调链接
      let finalRedirectUri: string
      const { origin } = query as { origin?: string }

      if (origin) {
        // 构造期望的回调链接
        const expectedRedirectUri = `${origin}/auth/microsoft/callback`
        
        // 寻找匹配的回调链接
        const matchedUri = redirectUris.find(uri => uri.redirectUri === expectedRedirectUri)
        
        if (matchedUri) {
          finalRedirectUri = matchedUri.redirectUri
          logger.debug(`使用匹配的Microsoft OAuth回调链接: ${finalRedirectUri}`)
        } else {
          // 如果没有找到完全匹配的，使用第一个启用的回调链接
          finalRedirectUri = redirectUris[0].redirectUri
          logger.debug(`未找到匹配的回调链接，使用默认的: ${finalRedirectUri}`)
          logger.warn(`建议在管理后台添加回调链接: ${expectedRedirectUri}`)
        }
      } else {
        // 如果没有传入origin，使用第一个启用的回调链接
        finalRedirectUri = redirectUris[0].redirectUri
      }

      const microsoftOAuth = new MicrosoftOAuthService({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: finalRedirectUri,
        tenantId: config.tenantId || 'common'
      })

      const authUrl = microsoftOAuth.getAuthUrl()
      return { authUrl }
    } catch (error) {
      logger.error("生成Microsoft OAuth URL失败:", error)
      set.status = 500
      return { error: "生成授权链接失败" }
    }
  })
  .get("/github-oauth-url", async ({ query, set }) => {
    try {
      const config = await db.select().from(githubOAuthConfig).get()
      
      if (!config?.enabled || !config.clientId || !config.clientSecret) {
        set.status = 400
        return { error: "GitHub OAuth未配置或未启用" }
      }

      // 获取所有启用的回调链接
      const redirectUris = await db
        .select()
        .from(githubOAuthRedirectUris)
        .where(eq(githubOAuthRedirectUris.enabled, true))
        .all()

      if (redirectUris.length === 0) {
        set.status = 400
        return { error: "未配置有效的回调链接" }
      }

      // 智能选择回调链接
      let finalRedirectUri: string
      const { origin } = query as { origin?: string }

      if (origin) {
        // 构造期望的回调链接
        const expectedRedirectUri = `${origin}/auth/github/callback`
        
        // 寻找匹配的回调链接
        const matchedUri = redirectUris.find(uri => uri.redirectUri === expectedRedirectUri)
        
        if (matchedUri) {
          finalRedirectUri = matchedUri.redirectUri
          logger.debug(`使用匹配的GitHub OAuth回调链接: ${finalRedirectUri}`)
        } else {
          // 如果没有找到完全匹配的，使用第一个启用的回调链接
          finalRedirectUri = redirectUris[0].redirectUri
          logger.debug(`未找到匹配的回调链接，使用默认的: ${finalRedirectUri}`)
          logger.warn(`建议在管理后台添加回调链接: ${expectedRedirectUri}`)
        }
      } else {
        // 如果没有传入origin，使用第一个启用的回调链接
        finalRedirectUri = redirectUris[0].redirectUri
      }

      const githubOAuth = new GitHubOAuthService({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: finalRedirectUri
      })

      const authUrl = githubOAuth.getAuthUrl()
      return { authUrl }
    } catch (error) {
      logger.error("生成GitHub OAuth URL失败:", error)
      set.status = 500
      return { error: "生成授权链接失败" }
    }
  })
  .post("/google-oauth-callback", async ({ body, jwt, set, headers }) => {
    try {
      const { code } = body as { code: string }

      if (!code) {
        set.status = 400
        return { error: "缺少授权码" }
      }

      logger.info(`处理Google OAuth回调，授权码: ${code.substring(0, 10)}...`)

      // 获取谷歌OAuth配置
      const googleConfig = await db.select().from(googleOAuthConfig).get()
      
      if (!googleConfig?.enabled || !googleConfig.clientId || !googleConfig.clientSecret) {
        set.status = 400
        return { error: "谷歌OAuth未配置或未启用" }
      }

      // 获取所有启用的回调链接
      const googleRedirectUris = await db
        .select()
        .from(googleOAuthRedirectUris)
        .where(eq(googleOAuthRedirectUris.enabled, true))
        .all()

      if (googleRedirectUris.length === 0) {
        set.status = 400
        return { error: "未配置有效的回调链接" }
      }

      // 智能选择回调链接（与授权URL生成逻辑保持一致）
      let selectedRedirectUri: string
      
      // 尝试从请求头获取origin信息
      const referer = headers['referer'] || headers['origin']
      let origin: string | undefined
      
      if (referer) {
        try {
          const refererUrl = new URL(referer)
          origin = refererUrl.origin
        } catch {
          // 如果解析失败，忽略
        }
      }
      
      if (origin) {
        // 构造期望的回调链接
        const expectedRedirectUri = `${origin}/auth/google/callback`
        
        // 寻找匹配的回调链接
        const matchedUri = googleRedirectUris.find(uri => uri.redirectUri === expectedRedirectUri)
        
        if (matchedUri) {
          selectedRedirectUri = matchedUri.redirectUri
          logger.info(`使用匹配的Google OAuth回调链接: ${selectedRedirectUri} (基于origin: ${origin})`)
        } else {
          // 如果没有找到完全匹配的，使用第一个启用的回调链接
          selectedRedirectUri = googleRedirectUris[0].redirectUri
          logger.info(`未找到匹配的回调链接，使用默认的: ${selectedRedirectUri} (期望: ${expectedRedirectUri})`)
        }
      } else {
        // 如果没有origin信息，使用第一个启用的回调链接
        selectedRedirectUri = googleRedirectUris[0].redirectUri
        logger.info(`无origin信息，使用默认Google OAuth回调链接: ${selectedRedirectUri}`)
      }

      // 创建Google OAuth服务实例
      const googleOAuthService = new GoogleOAuthService({
        clientId: googleConfig.clientId,
        clientSecret: googleConfig.clientSecret,
        redirectUri: selectedRedirectUri
      })

      logger.info("开始获取Google访问令牌...")
      
      // 获取访问令牌
      const googleTokenResponse = await googleOAuthService.getAccessToken(code)
      
      logger.info("Google访问令牌获取成功，开始获取用户信息...")
      
      // 获取用户信息
      const googleUserInfo = await googleOAuthService.getUserInfo(googleTokenResponse.access_token)

      if (!googleUserInfo.verified_email) {
        set.status = 400
        return { error: "谷歌账户邮箱未验证" }
      }

      logger.info(`Google用户信息获取成功: ${googleUserInfo.email}`)

      // 检查用户是否已存在
      let user = await db.select().from(users).where(eq(users.email, googleUserInfo.email)).get()

      if (!user) {
        // 检查是否允许用户注册
        const siteCfg = await db.select().from(siteConfig).get()
        const allowRegistration = siteCfg?.allowUserRegistration ?? true
        
        if (!allowRegistration) {
          set.status = 403
          return { error: "系统已关闭新用户注册功能" }
        }

        // 创建新用户
        const userId = nanoid()
        const now = Date.now()

        await db.insert(users).values({
          id: userId,
          email: googleUserInfo.email,
          password: "", // 谷歌登录用户不需要密码
          role: "user",
          emailVerified: true, // 谷歌账户已验证
          createdAt: now,
          updatedAt: now,
        })

        user = {
          id: userId,
          email: googleUserInfo.email,
          password: "",
          role: "user",
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        }

        // 为新用户创建配额
        await QuotaService.createUserQuota(userId, "user")
        
        logger.info(`创建新Google用户: ${googleUserInfo.email}`)
      } else {
        logger.info(`Google用户登录: ${googleUserInfo.email}`)
      }

      // 生成JWT令牌
      const token = await jwt.sign({
        userId: user.id,
        email: user.email,
        role: user.role,
      })

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
      }
    } catch (error) {
      logger.error("谷歌OAuth回调处理失败:", error)
      set.status = 500
      return { error: "登录失败，请稍后重试" }
    }
  }, {
    body: t.Object({
      code: t.String(),
    }),
  })
  .post("/github-oauth-callback", async ({ body, jwt, set, headers }) => {
    try {
      const { code, redirectUri } = body as { code?: string; redirectUri?: string }

      if (!code) {
        set.status = 400
        return { error: "缺少授权码" }
      }

      // 获取GitHub OAuth配置
      const config = await db.select().from(githubOAuthConfig).get()
      
      if (!config?.enabled || !config.clientId || !config.clientSecret) {
        set.status = 400
        return { error: "GitHub OAuth未配置或未启用" }
      }

      // 获取所有启用的回调链接
      const redirectUris = await db
        .select()
        .from(githubOAuthRedirectUris)
        .where(eq(githubOAuthRedirectUris.enabled, true))
        .all()

      if (redirectUris.length === 0) {
        set.status = 400
        return { error: "未配置有效的回调链接" }
      }

      // 智能选择回调链接
      let finalRedirectUri: string
      
      if (redirectUri) {
        // 如果明确传入了回调URI，验证并使用它
        const allowedUri = redirectUris.find(uri => uri.redirectUri === redirectUri)
        if (!allowedUri) {
          set.status = 400
          return { error: "无效的回调链接" }
        }
        finalRedirectUri = redirectUri
        logger.info(`使用传入的GitHub OAuth回调链接: ${finalRedirectUri}`)
      } else {
        // 如果没有传入，尝试智能选择（与Google OAuth逻辑一致）
        const referer = headers['referer'] || headers['origin']
        let origin: string | undefined
        
        if (referer) {
          try {
            const refererUrl = new URL(referer)
            origin = refererUrl.origin
          } catch {
            // 如果解析失败，忽略
          }
        }
        
        if (origin) {
          // 构造期望的回调链接
          const expectedRedirectUri = `${origin}/auth/github/callback`
          
          // 寻找匹配的回调链接
          const matchedUri = redirectUris.find(uri => uri.redirectUri === expectedRedirectUri)
          
          if (matchedUri) {
            finalRedirectUri = matchedUri.redirectUri
            logger.info(`使用匹配的GitHub OAuth回调链接: ${finalRedirectUri} (基于origin: ${origin})`)
          } else {
            // 如果没有找到完全匹配的，使用第一个启用的回调链接
            finalRedirectUri = redirectUris[0].redirectUri
            logger.info(`未找到匹配的回调链接，使用默认的: ${finalRedirectUri} (期望: ${expectedRedirectUri})`)
          }
        } else {
          // 如果没有origin信息，使用第一个启用的回调链接
          finalRedirectUri = redirectUris[0].redirectUri
          logger.info(`无origin信息，使用默认GitHub OAuth回调链接: ${finalRedirectUri}`)
        }
      }

      const githubOAuth = new GitHubOAuthService({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: finalRedirectUri
      })

      // 获取访问令牌
      const tokenResponse = await githubOAuth.getAccessToken(code)
      
      logger.info(`GitHub访问令牌获取成功，令牌类型: ${tokenResponse.token_type}`)
      
      // 获取用户邮箱和用户信息（一次调用避免重复）
      const { email: userEmail, userInfo } = await githubOAuth.getPrimaryEmailAndUserInfo(tokenResponse.access_token)

      logger.info(`GitHub用户信息获取成功: ${userInfo.login} <${userEmail}>`)

      // 检查用户是否已存在
      let user = await db.select().from(users).where(eq(users.email, userEmail)).get()

      if (!user) {
        // 检查是否允许用户注册
        const siteCfg = await db.select().from(siteConfig).get()
        const allowRegistration = siteCfg?.allowUserRegistration ?? true
        
        if (!allowRegistration) {
          set.status = 403
          return { error: "系统已关闭新用户注册功能" }
        }

        // 创建新用户
        const userId = nanoid()
        const now = Date.now()

        await db.insert(users).values({
          id: userId,
          email: userEmail,
          password: "", // GitHub登录用户不需要密码
          role: "user",
          emailVerified: true, // GitHub账户已验证
          createdAt: now,
          updatedAt: now,
        })

        user = {
          id: userId,
          email: userEmail,
          password: "",
          role: "user",
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        }

        // 为新用户创建配额
        await QuotaService.createUserQuota(userId, "user")
      }

      // 生成JWT令牌
      const token = await jwt.sign({
        userId: user.id,
        email: user.email,
        role: user.role,
      })

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
      }
    } catch (error) {
      logger.error("GitHub OAuth回调处理失败:", error)
      set.status = 500
      return { error: "登录失败，请稍后重试" }
    }
  }, {
    body: t.Object({
      code: t.String(),
    }),
  })
  .post("/microsoft-oauth-callback", async ({ body, jwt, set, headers }) => {
    try {
      const { code, redirectUri } = body as { code?: string; redirectUri?: string }

      if (!code) {
        set.status = 400
        return { error: "缺少授权码" }
      }

      // 获取Microsoft OAuth配置
      const config = await db.select().from(microsoftOAuthConfig).get()
      
      if (!config?.enabled || !config.clientId || !config.clientSecret) {
        set.status = 400
        return { error: "Microsoft OAuth未配置或未启用" }
      }

      // 获取所有启用的回调链接
      const redirectUris = await db
        .select()
        .from(microsoftOAuthRedirectUris)
        .where(eq(microsoftOAuthRedirectUris.enabled, true))
        .all()

      if (redirectUris.length === 0) {
        set.status = 400
        return { error: "未配置有效的回调链接" }
      }

      // 智能选择回调链接
      let finalRedirectUri: string
      
      if (redirectUri) {
        // 如果明确传入了回调URI，验证并使用它
        const allowedUri = redirectUris.find(uri => uri.redirectUri === redirectUri)
        if (!allowedUri) {
          set.status = 400
          return { error: "无效的回调链接" }
        }
        finalRedirectUri = redirectUri
        logger.info(`使用传入的Microsoft OAuth回调链接: ${finalRedirectUri}`)
      } else {
        // 如果没有传入，尝试智能选择（与其他OAuth逻辑一致）
        const referer = headers['referer'] || headers['origin']
        let origin: string | undefined
        
        if (referer) {
          try {
            const refererUrl = new URL(referer)
            origin = refererUrl.origin
          } catch {
            // 如果解析失败，忽略
          }
        }
        
        if (origin) {
          // 构造期望的回调链接
          const expectedRedirectUri = `${origin}/auth/microsoft/callback`
          
          // 寻找匹配的回调链接
          const matchedUri = redirectUris.find(uri => uri.redirectUri === expectedRedirectUri)
          
          if (matchedUri) {
            finalRedirectUri = matchedUri.redirectUri
            logger.info(`使用匹配的Microsoft OAuth回调链接: ${finalRedirectUri} (基于origin: ${origin})`)
          } else {
            // 如果没有找到完全匹配的，使用第一个启用的回调链接
            finalRedirectUri = redirectUris[0].redirectUri
            logger.info(`未找到匹配的回调链接，使用默认的: ${finalRedirectUri} (期望: ${expectedRedirectUri})`)
          }
        } else {
          // 如果没有origin信息，使用第一个启用的回调链接
          finalRedirectUri = redirectUris[0].redirectUri
          logger.info(`无origin信息，使用默认Microsoft OAuth回调链接: ${finalRedirectUri}`)
        }
      }

      const microsoftOAuth = new MicrosoftOAuthService({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: finalRedirectUri,
        tenantId: config.tenantId || 'common'
      })

      // 获取访问令牌
      const tokenResponse = await microsoftOAuth.getAccessToken(code)
      
      logger.info(`Microsoft访问令牌获取成功，令牌类型: ${tokenResponse.token_type}`)
      
      // 获取用户邮箱和用户信息（一次调用避免重复）
      const { email: userEmail, userInfo } = await microsoftOAuth.getPrimaryEmailAndUserInfo(tokenResponse.access_token)

      logger.info(`Microsoft用户信息获取成功: ${userInfo.displayName} <${userEmail}>`)

      // 检查用户是否已存在
      let user = await db.select().from(users).where(eq(users.email, userEmail)).get()

      if (!user) {
        // 检查是否允许用户注册
        const siteCfg = await db.select().from(siteConfig).get()
        const allowRegistration = siteCfg?.allowUserRegistration ?? true
        
        if (!allowRegistration) {
          set.status = 403
          return { error: "系统已关闭新用户注册功能" }
        }

        // 创建新用户
        const userId = nanoid()
        const now = Date.now()

        await db.insert(users).values({
          id: userId,
          email: userEmail,
          password: "", // Microsoft登录用户不需要密码
          role: "user",
          emailVerified: true, // Microsoft账户已验证
          createdAt: now,
          updatedAt: now,
        })

        user = {
          id: userId,
          email: userEmail,
          password: "",
          role: "user",
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        }

        // 为新用户创建配额
        await QuotaService.createUserQuota(userId, "user")
        
        logger.info(`创建新Microsoft用户: ${userEmail}`)
      } else {
        logger.info(`Microsoft用户登录: ${userEmail}`)
      }

      // 生成JWT令牌
      const token = await jwt.sign({
        userId: user.id,
        email: user.email,
        role: user.role,
      })

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
      }
    } catch (error) {
      logger.error("Microsoft OAuth回调处理失败:", error)
      set.status = 500
      return { error: "登录失败，请稍后重试" }
    }
  }, {
    body: t.Object({
      code: t.String(),
    }),
  })
  .post(
    "/send-verification-code",
    async ({ body, set }) => {
      try {
        const { email } = body

        // 检查是否启用了 SMTP
        const smtpEnabled = await isSmtpEnabled()

        if (!smtpEnabled) {
          set.status = 400
          return { error: "邮件服务未启用，无法发送验证码" }
        }

        // 检查用户是否已存在
        const existingUser = await db.select().from(users).where(eq(users.email, email)).get()
        if (existingUser) {
          set.status = 400
          return { error: "邮箱已被注册" }
        }

        // 生成验证码
        const code = generateVerificationCode()
        const expiresAt = Date.now() + 10 * 60 * 1000 // 10分钟后过期
        const codeId = nanoid()

        // 删除该邮箱之前未使用的验证码
        await db.delete(emailVerificationCodes)
          .where(and(
            eq(emailVerificationCodes.email, email),
            eq(emailVerificationCodes.used, false)
          ))

        // 保存验证码
        await db.insert(emailVerificationCodes).values({
          id: codeId,
          email,
          code,
          expiresAt,
          used: false,
          createdAt: Date.now(),
        })

        // 发送邮件
        const emailSent = await sendVerificationEmail(email, code)
        if (!emailSent) {
          set.status = 500
          return { error: "邮件发送失败，请稍后重试" }
        }

        return {
          success: true,
          message: "验证码已发送到您的邮箱，请查收",
          expiresIn: 600 // 10分钟
        }
      } catch (error) {
        logger.error("发送验证码失败:", error)
        set.status = 500
        return { error: "发送验证码失败" }
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
      }),
    },
  )
  .post(
    "/register",
    async ({ body, jwt, set }) => {
      try {
        const { email, password, verificationCode } = body

        // 检查是否允许用户注册
        const siteCfg = await db.select().from(siteConfig).get()
        const allowRegistration = siteCfg?.allowUserRegistration ?? true
        
        if (!allowRegistration) {
          set.status = 403
          return { error: "系统已关闭新用户注册功能" }
        }

        // 检查用户是否已存在
        const existingUser = await db.select().from(users).where(eq(users.email, email)).get()
        if (existingUser) {
          set.status = 400
          return { error: "邮箱已被注册" }
        }

        // 检查是否启用了 SMTP
        const smtpEnabled = await isSmtpEnabled()

        let emailVerified = false

        // 如果启用了 SMTP，则需要验证邮箱验证码
        if (smtpEnabled) {
          if (!verificationCode) {
            set.status = 400
            return { error: "请输入邮箱验证码" }
          }

          // 验证邮箱验证码
          const now = Date.now()
          const validCode = await db.select()
            .from(emailVerificationCodes)
            .where(and(
              eq(emailVerificationCodes.email, email),
              eq(emailVerificationCodes.code, verificationCode),
              eq(emailVerificationCodes.used, false),
              gt(emailVerificationCodes.expiresAt, now)
            ))
            .get()

          if (!validCode) {
            set.status = 400
            return { error: "验证码无效或已过期" }
          }

          // 标记验证码为已使用
          await db.update(emailVerificationCodes)
            .set({ used: true })
            .where(eq(emailVerificationCodes.id, validCode.id))

          emailVerified = true
        } else {
          // 如果未启用 SMTP，直接设置为已验证
          emailVerified = true
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10)

        // 创建用户
        const userId = nanoid()
        const now = Date.now()

        await db.insert(users).values({
          id: userId,
          email,
          password: hashedPassword,
          role: "user",
          emailVerified,
          createdAt: now,
          updatedAt: now,
        })

        // 生成token
        const token = await jwt.sign({
          userId,
          email,
          role: "user",
        })

        return {
          token,
          user: {
            id: userId,
            email,
            role: "user",
            emailVerified,
          },
        }
      } catch (error) {
        logger.error("注册失败:", error)
        set.status = 500
        return { error: "注册失败" }
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 }),
        verificationCode: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/login",
    async ({ body, jwt, set }) => {
      try {
        const { email, password } = body

        // Find user
        const user = await db.select().from(users).where(eq(users.email, email)).get()
        if (!user) {
          logger.warn(`登录失败: 用户不存在 - ${email}`)
          set.status = 401
          return { error: "用户名或密码不正确" }
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) {
          logger.warn(`登录失败: 密码错误 - ${email}`)
          set.status = 401
          return { error: "用户名或密码不正确" }
        }

        // Generate token
        const token = await jwt.sign({
          userId: user.id,
          email: user.email,
          role: user.role,
        })

        return {
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
        }
      } catch (error) {
        logger.error("登录失败:", error)
        set.status = 500
        return { error: "登录失败，请稍后重试" }
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    },
  )
  .get("/me", async ({ jwt, bearer, set }) => {
    try {
      if (!bearer) {
        set.status = 401
        return { error: "未提供认证令牌" }
      }

      const payload = await jwt.verify(bearer)
      if (!payload) {
        set.status = 401
        return { error: "认证令牌无效" }
      }

      const user = await db.select().from(users).where(eq(users.id, String(payload.userId))).get()
      if (!user) {
        set.status = 404
        return { error: "用户不存在" }
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      }
    } catch (error) {
      logger.error("用户认证失败:", error)
      set.status = 401
      return { error: "认证失败" }
    }
  })
  .get("/quota", async ({ jwt, bearer, set }) => {
    try {
      if (!bearer) {
        set.status = 401
        return { error: "未提供认证令牌" }
      }

      const payload = await jwt.verify(bearer)
      if (!payload) {
        set.status = 401
        return { error: "认证令牌无效" }
      }

      // 获取用户配额信息
      const quota = await QuotaService.getUserQuota(String(payload.userId))
      if (!quota) {
        // 如果没有配额记录，尝试创建一个
        const user = await db.select().from(users).where(eq(users.id, String(payload.userId))).get()
        if (user) {
          await QuotaService.createUserQuota(String(payload.userId), user.role)
          const newQuota = await QuotaService.getUserQuota(String(payload.userId))
          if (newQuota) {
            return {
              quota: {
                maxStorage: newQuota.maxStorage,
                usedStorage: newQuota.usedStorage,
                availableSpace: newQuota.availableSpace,
                usagePercentage: QuotaService.getUsagePercentage(newQuota.usedStorage, newQuota.maxStorage),
                maxStorageFormatted: QuotaService.formatFileSize(newQuota.maxStorage),
                usedStorageFormatted: QuotaService.formatFileSize(newQuota.usedStorage),
                availableSpaceFormatted: QuotaService.formatFileSize(newQuota.availableSpace),
              }
            }
          }
        }

        set.status = 404
        return { error: "配额信息未找到" }
      }

      return {
        quota: {
          maxStorage: quota.maxStorage,
          usedStorage: quota.usedStorage,
          availableSpace: quota.availableSpace,
          usagePercentage: QuotaService.getUsagePercentage(quota.usedStorage, quota.maxStorage),
          maxStorageFormatted: QuotaService.formatFileSize(quota.maxStorage),
          usedStorageFormatted: QuotaService.formatFileSize(quota.usedStorage),
          availableSpaceFormatted: QuotaService.formatFileSize(quota.availableSpace),
        }
      }
    } catch (error) {
      logger.error("获取用户配额失败:", error)
      set.status = 500
      return { error: "获取配额信息失败" }
    }
  })
  .get("/quota-debug", async ({ jwt, bearer, set }) => {
    try {
      if (!bearer) {
        set.status = 401
        return { error: "未提供认证令牌" }
      }

      const payload = await jwt.verify(bearer)
      if (!payload) {
        set.status = 401
        return { error: "认证令牌无效" }
      }

      logger.info(`调试配额信息: 用户 ${String(payload.userId)}`)

      // 获取用户所有文件
      const userFiles = await db
        .select()
        .from(files)
        .where(eq(files.userId, String(payload.userId)))
        .all()

      // 计算本地存储使用量（数据库中storageType='local'的文件）
      let localStorage = 0
      let localCount = 0

      const fileDetails = userFiles.map(file => {
        if (file.storageType === 'local') {
          localStorage += file.size
          localCount++
        }

        return {
          id: file.id,
          name: file.originalName,
          size: file.size,
          storageType: file.storageType,
          createdAt: file.createdAt
        }
      })

      // 获取R2实际存储使用量
      let r2ActualStorage = 0
      let r2ActualFiles = 0
      let r2StorageError: string | undefined

      const config = await db.select().from(storageConfig).get()
      if (config && (config.storageType === "r2" || config.enableMixedMode) && config.r2Endpoint) {
        try {
          const { StorageService } = await import("../services/storage.js")
          const storageService = new StorageService(config)
          const r2Stats = await storageService.calculateR2StorageUsage()

          if (!r2Stats.error) {
            r2ActualStorage = r2Stats.totalSize
            r2ActualFiles = r2Stats.totalFiles
          } else {
            r2StorageError = r2Stats.error
          }
        } catch (error) {
          r2StorageError = error instanceof Error ? error.message : "Unknown error"
        }
      }

      const totalUsed = localStorage + r2ActualStorage

      // 获取数据库中的配额记录
      const quota = await db
        .select()
        .from(userQuotas)
        .where(eq(userQuotas.userId, String(payload.userId)))
        .get()

      return {
        userId: String(payload.userId),
        fileCount: userFiles.length,
        files: fileDetails,
        calculatedUsage: {
          localStorage,
          r2ActualStorage,
          totalUsed,
          localCount,
          r2ActualFiles,
          r2StorageError
        },
        databaseQuota: quota ? {
          usedStorage: quota.usedStorage,
          maxStorage: quota.maxStorage,
          customQuota: quota.customQuota
        } : null,
        isConsistent: quota ? (totalUsed === quota.usedStorage) : false
      }
    } catch (error) {
      logger.error("获取配额调试信息失败:", error)
      set.status = 500
      return { error: "获取配额调试信息失败" }
    }
  })