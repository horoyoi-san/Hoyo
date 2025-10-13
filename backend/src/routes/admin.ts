import { Elysia, t } from "elysia"
import { jwt } from "@elysiajs/jwt"
import { bearer } from "@elysiajs/bearer"
import { db } from "../db"
import { users, files, smtpConfig, emailVerificationCodes, storageConfig, r2MountPoints, folders, userQuotas, roleQuotaConfig, fileDirectLinks, fileShares, oneDriveAuth } from "../db/schema"
import { eq, desc, and, like, or } from "drizzle-orm"
import { nanoid } from "nanoid"
import { sendVerificationEmail } from "../services/email"
import { StorageService } from "../services/storage"
import { logger } from "../utils/logger"
import { hashPassword, verifyPassword, validatePasswordStrength } from "../utils/password"
import { siteConfig } from "../db/schema"
import { QuotaService } from "../services/quota"
import { OneDriveService } from "../services/onedrive"

export const adminRoutes = new Elysia({ prefix: "/admin" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET!,
    }),
  )
  .use(bearer())
  .derive(async ({ jwt, bearer, set }) => {
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
  })
  // 站点配置：获取
  .get("/site-config", async ({ set }) => {
    try {
      const siteCfg = await db.select().from(siteConfig).get()
      return {
        title: siteCfg?.title || "FireflyCloud",
        description: siteCfg?.description || "云存储",
        allowUserRegistration: siteCfg?.allowUserRegistration ?? true
      }
    } catch (error) {
      logger.error("Failed to get site config:", error as unknown as Error)
      set.status = 500
      return { error: "Failed to get site configuration" }
    }
  })
  // 站点配置：更新
  .put("/site-config", async ({ body, set }) => {
    try {
      const { title, description, allowUserRegistration } = body
      const now = Date.now()

      const existing = await db.select().from(siteConfig).get()
      
      // 构建更新数据对象
      const updateData: any = { updatedAt: now }
      if (title !== undefined) updateData.title = title
      if (description !== undefined) updateData.description = description
      if (allowUserRegistration !== undefined) updateData.allowUserRegistration = allowUserRegistration

      if (existing) {
        await db.update(siteConfig).set(updateData).where(eq(siteConfig.id, 1))
      } else {
        await db.insert(siteConfig).values({ 
          id: 1, 
          title: title || "FireflyCloud", 
          description: description || "云存储",
          allowUserRegistration: allowUserRegistration ?? true,
          updatedAt: now 
        })
      }

      logger.info("Site configuration updated", { title, description, allowUserRegistration })
      return { message: "Site configuration updated" }
    } catch (error) {
      logger.error("Failed to update site config:", error as unknown as Error)
      set.status = 500
      return { error: "Failed to update site configuration" }
    }
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      allowUserRegistration: t.Optional(t.Boolean())
    })
  })
  // 列出所有直链（管理员）
  .get("/direct-links", async () => {
    const links = await db
      .select({
        id: fileDirectLinks.id,
        userId: fileDirectLinks.userId,
        fileId: fileDirectLinks.fileId,
        directName: fileDirectLinks.directName,
        enabled: fileDirectLinks.enabled,
        adminDisabled: fileDirectLinks.adminDisabled,
        accessCount: fileDirectLinks.accessCount,
        createdAt: fileDirectLinks.createdAt,
        updatedAt: fileDirectLinks.updatedAt,
        fileName: files.originalName,
        fileSize: files.size,
        fileMimeType: files.mimeType,
        userEmail: users.email,
      })
      .from(fileDirectLinks)
      .leftJoin(files, eq(fileDirectLinks.fileId, files.id))
      .leftJoin(users, eq(fileDirectLinks.userId, users.id))
      .orderBy(desc(fileDirectLinks.createdAt))

    return { directLinks: links }
  })
  // 管理员切换直链（管理员禁用/启用）
  .put("/direct-links/:id/toggle", async ({ params, body, set }) => {
    const { id } = params as { id: string }
    const { adminDisabled } = body as { adminDisabled: boolean }
    try {
      const now = Date.now()
      if (adminDisabled) {
        await db.update(fileDirectLinks).set({ adminDisabled: true, enabled: false, updatedAt: now }).where(eq(fileDirectLinks.id, id))
      } else {
        await db.update(fileDirectLinks).set({ adminDisabled: false, enabled: true, updatedAt: now }).where(eq(fileDirectLinks.id, id))
      }
      return { success: true }
    } catch (error) {
      logger.error("Admin toggle direct link failed:", error)
      set.status = 500
      return { error: "Failed to toggle direct link" }
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ adminDisabled: t.Boolean() })
  })
  // 列出所有分享（管理员）
  .get("/shares", async () => {
    const shares = await db
      .select({
        id: fileShares.id,
        userId: fileShares.userId,
        fileId: fileShares.fileId,
        shareToken: fileShares.shareToken,
        pickupCode: fileShares.pickupCode,
        enabled: fileShares.enabled,
        adminDisabled: fileShares.adminDisabled,
        accessCount: fileShares.accessCount,
        expiresAt: fileShares.expiresAt,
        createdAt: fileShares.createdAt,
        updatedAt: fileShares.updatedAt,
        fileName: files.originalName,
        fileSize: files.size,
        fileMimeType: files.mimeType,
        userEmail: users.email,
      })
      .from(fileShares)
      .leftJoin(files, eq(fileShares.fileId, files.id))
      .leftJoin(users, eq(fileShares.userId, users.id))
      .orderBy(desc(fileShares.createdAt))

    return { shares }
  })
  // 管理员切换分享
  .put("/shares/:id/toggle", async ({ params, body, set }) => {
    const { id } = params as { id: string }
    const { adminDisabled } = body as { adminDisabled: boolean }
    try {
      const now = Date.now()
      if (adminDisabled) {
        await db.update(fileShares).set({ adminDisabled: true, enabled: false, updatedAt: now }).where(eq(fileShares.id, id))
      } else {
        await db.update(fileShares).set({ adminDisabled: false, enabled: true, updatedAt: now }).where(eq(fileShares.id, id))
      }
      return { success: true }
    } catch (error) {
      logger.error("Admin toggle share failed:", error)
      set.status = 500
      return { error: "Failed to toggle share" }
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ adminDisabled: t.Boolean() })
  })
  .get("/stats", async () => {
    try {
      const totalUsers = await db.select().from(users).all()
      const totalFiles = await db.select().from(files).all()

      // 计算数据库中记录的存储使用量
      const totalStorage = totalFiles.reduce((sum, file) => sum + file.size, 0)
      const r2FilesInDB = totalFiles.filter(file => file.storageType === "r2")
      const r2StorageInDB = r2FilesInDB.reduce((sum, file) => sum + file.size, 0)
      const localFiles = totalFiles.filter(file => file.storageType === "local")
      const localStorage = localFiles.reduce((sum, file) => sum + file.size, 0)
      const oneDriveFilesInDB = totalFiles.filter(file => file.storageType === "onedrive")
      const oneDriveStorageInDB = oneDriveFilesInDB.reduce((sum, file) => sum + file.size, 0)

      // 获取存储配置
      const storageCfg = await db.select().from(storageConfig).get()

      // 初始化R2实际使用量
      let r2ActualStorage = 0
      let r2ActualFiles = 0
      let r2StorageError: string | undefined

      // 如果配置了R2存储，查询实际使用量
      if (storageCfg && (storageCfg.storageType === "r2" || storageCfg.enableMixedMode) && storageCfg.r2Endpoint) {
        try {
          logger.debug("查询R2存储桶实际使用量")
          const storageService = new StorageService(storageCfg)
          const r2Stats = await storageService.calculateR2StorageUsage()

          if (r2Stats.error) {
            r2StorageError = r2Stats.error
            logger.warn(`R2存储统计失败: ${r2Stats.error}`)
          } else {
            r2ActualStorage = r2Stats.totalSize
            r2ActualFiles = r2Stats.totalFiles
          }
        } catch (error) {
          r2StorageError = error instanceof Error ? error.message : "Unknown error"
          logger.error("查询R2存储使用量失败:", error as unknown as Error)
        }
      }

      // 统计 OneDrive 实际使用量（管理员账户驱动器用量，包含所有用户子目录）
      let oneDriveActualStorage = 0
      let oneDriveStorageError: string | undefined
      if (storageCfg && (storageCfg.storageType === "onedrive" || storageCfg.enableMixedMode) && storageCfg.oneDriveClientId) {
        try {
          // 获取管理员 OneDrive 认证
          const adminAuth = await db
            .select({
              id: oneDriveAuth.id,
              accessToken: oneDriveAuth.accessToken,
              refreshToken: oneDriveAuth.refreshToken,
              expiresAt: oneDriveAuth.expiresAt,
            })
            .from(oneDriveAuth)
            .innerJoin(users, eq(oneDriveAuth.userId, users.id))
            .where(eq(users.role, 'admin'))
            .get()

          if (!adminAuth) {
            oneDriveStorageError = "OneDrive not configured"
          } else {
            const odClientId = storageCfg.oneDriveClientId!
            const odClientSecret = storageCfg.oneDriveClientSecret!
            const odTenantId = storageCfg.oneDriveTenantId!

            let accessToken = adminAuth.accessToken
            // 刷新过期令牌
            if (adminAuth.expiresAt <= Date.now()) {
              const odSvcForRefresh = new OneDriveService({ clientId: odClientId, clientSecret: odClientSecret, tenantId: odTenantId })
              const refreshed = await odSvcForRefresh.refreshToken(adminAuth.refreshToken)
              accessToken = refreshed.accessToken
              await db.update(oneDriveAuth).set({ accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken, expiresAt: refreshed.expiresAt, updatedAt: Date.now() }).where(eq(oneDriveAuth.id, adminAuth.id))
              logger.info(`管理员OneDrive访问令牌刷新成功(统计)`) 
            }

            const odSvc = new OneDriveService({ clientId: odClientId, clientSecret: odClientSecret, tenantId: odTenantId })
            odSvc.setAccessToken(accessToken)
            const driveInfo = await odSvc.getDriveInfo()
            oneDriveActualStorage = Number(driveInfo?.quota?.used || 0)
          }
        } catch (error) {
          oneDriveStorageError = error instanceof Error ? error.message : "Unknown error"
          logger.error("查询OneDrive存储使用量失败:", error as unknown as Error)
        }
      }

      // 计算总存储（本地存储 + R2实际存储 + OneDrive 实际存储）
      const actualTotalStorage = localStorage + r2ActualStorage + oneDriveActualStorage

      return {
        totalUsers: totalUsers.length,
        totalFiles: totalFiles.length,
        totalStorage: actualTotalStorage, // 使用实际总存储

        // R2存储信息（实际）
        r2Storage: r2ActualStorage,
        r2Files: r2ActualFiles,
        r2StorageError,

        // OneDrive 存储信息
        oneDriveStorage: oneDriveActualStorage,
        oneDriveStorageInDB,
        oneDriveStorageError,

        // 本地存储信息
        localStorage,
        localFiles: localFiles.length,

        // 数据库中的R2记录（用于对比）
        r2StorageInDB,
        r2FilesInDB: r2FilesInDB.length,

        // 用户统计
        adminUsers: totalUsers.filter((u) => u.role === "admin").length,
        regularUsers: totalUsers.filter((u) => u.role === "user").length,

        // 存储配置信息
        storageType: storageCfg?.storageType || "local",
        enableMixedMode: storageCfg?.enableMixedMode || false,
      }
    } catch (error) {
      logger.error("获取统计信息失败:", (error as unknown as Error))
      return {
        totalUsers: 0,
        totalFiles: 0,
        totalStorage: 0,
        r2Storage: 0,
        localStorage: 0,
        r2Files: 0,
        localFiles: 0,
        r2StorageInDB: 0,
        r2FilesInDB: 0,
        adminUsers: 0,
        regularUsers: 0,
        storageType: "local",
        enableMixedMode: false,
        r2StorageError: "Failed to fetch stats",
        oneDriveStorage: 0,
        oneDriveStorageInDB: 0,
        oneDriveStorageError: "Failed to fetch stats"
      }
    }
  })
  .get("/users", async () => {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)

    return { users: allUsers }
  })
  .get("/files", async () => {
    const allFiles = await db.select().from(files).all()
    return { files: allFiles }
  })
  .delete("/users/:id", async ({ params, set }) => {
    try {
      if (params.id === "admin") {
        set.status = 400
        return { error: "Cannot delete admin user" }
      }

      // Delete user's files first
      await db.delete(files).where(eq(files.userId, params.id))

      // Delete user
      await db.delete(users).where(eq(users.id, params.id))

      return { message: "User deleted successfully" }
    } catch (error) {
      set.status = 500
      return { error: "Delete failed" }
    }
  })
  .delete("/files/:id", async ({ params, set }) => {
    try {
      await db.delete(files).where(eq(files.id, params.id))
      return { message: "File deleted successfully" }
    } catch (error) {
      set.status = 500
      return { error: "Delete failed" }
    }
  })
  .get("/smtp-config", async ({ set }) => {
    try {
      // 获取数据库中的配置
      const config = await db.select().from(smtpConfig).get()

      // 如果数据库中没有配置，返回环境变量中的配置
      if (!config) {
        return {
          enabled: false,
          host: process.env.SMTP_HOST || "",
          port: parseInt(process.env.SMTP_PORT || "465"),
          user: process.env.SMTP_USER || "",
          pass: process.env.SMTP_PASS || "",
          secure: true,
          emailTemplate: ""
        }
      }

      return {
        enabled: config.enabled,
        host: config.host || "",
        port: config.port || 465,
        user: config.user || "",
        pass: config.pass || "",
        secure: config.secure,
        emailTemplate: config.emailTemplate || ""
      }
    } catch (error) {
      logger.error("Failed to get SMTP config:", error)
      set.status = 500
      return {
        error: "Failed to get SMTP configuration",
        config: {
          enabled: false,
          host: "",
          port: 465,
          user: "",
          pass: "",
          secure: true,
          emailTemplate: ""
        }
      }
    }
  })
  .put(
    "/smtp-config",
    async ({ body, set }) => {
      try {
        const { enabled, host, port, user, pass, secure, emailTemplate } = body

        const now = Date.now()

        // 检查是否已存在配置
        const existingConfig = await db.select().from(smtpConfig).get()

        if (existingConfig) {
          // 更新现有配置
          await db
            .update(smtpConfig)
            .set({
              enabled,
              host,
              port,
              user,
              pass,
              secure,
              emailTemplate,
              updatedAt: now,
            })
            .where(eq(smtpConfig.id, 1))
        } else {
          // 创建新配置
          await db.insert(smtpConfig).values({
            id: 1,
            enabled,
            host,
            port,
            user,
            pass,
            secure,
            emailTemplate,
            updatedAt: now,
          })
        }

        logger.info("SMTP configuration updated successfully")
        return { message: "SMTP configuration updated successfully" }
      } catch (error) {
        logger.error("Failed to update SMTP config:", error)
        set.status = 500
        return { error: "Failed to update SMTP configuration" }
      }
    },
    {
      body: t.Object({
        enabled: t.Boolean(),
        host: t.String(),
        port: t.Number(),
        user: t.String(),
        pass: t.String(),
        secure: t.Boolean(),
        emailTemplate: t.String(),
      }),
    }
  )
  .post(
    "/test-smtp",
    async ({ body, set }) => {
      try {
        const { email, config } = body

        logger.info('收到测试邮件请求', { email, config: { ...config, pass: '***' } })

        // 验证必要的配置
        if (!config.host || !config.port || !config.user || !config.pass) {
          set.status = 400
          return { error: "SMTP 配置不完整，请检查主机、端口、用户名和密码" }
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          set.status = 400
          return { error: "请提供有效的邮箱地址" }
        }

        // 生成测试验证码
        const testCode = "123456"

        // 使用提供的配置发送测试邮件
        const success = await sendTestEmail(email, testCode, config)

        if (success) {
          return { message: "Test email sent successfully" }
        } else {
          set.status = 500
          return { error: "Failed to send test email" }
        }
      } catch (error) {
        const err = error as unknown as Error
        logger.error("Failed to send test email:", err)
        set.status = 500
        return { error: `发送测试邮件失败: ${err.message}` }
      }
    },
    {
      body: t.Object({
        email: t.String(),
        config: t.Object({
          enabled: t.Boolean(),
          host: t.String(),
          port: t.Number(),
          user: t.String(),
          pass: t.String(),
          secure: t.Boolean(),
          emailTemplate: t.String(),
        }),
      }),
    }
  )

// 发送测试邮件的函数
async function sendTestEmail(email: string, code: string, config: any): Promise<boolean> {
  try {
    logger.info(`开始发送测试邮件到: ${email}`)
    logger.debug('SMTP 配置:', {
      host: config.host,
      port: config.port,
      user: config.user,
      secure: config.secure
    })

    const nodemailer = await import('nodemailer')

    const transporter = nodemailer.default.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    })

    // 首先验证连接
    await transporter.verify()
    logger.info('SMTP 连接验证成功')

    const template = config.emailTemplate || `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>FireflyCloud SMTP 测试</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: hsl(0, 0%, 3.9%); background-color: hsl(0, 0%, 96.1%); padding: 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: hsl(0, 0%, 100%); border: 1px solid hsl(0, 0%, 89.8%); border-radius: 8px; overflow: hidden;">
              <div style="background-color: hsl(0, 0%, 9%); color: hsl(0, 0%, 98%); padding: 32px; text-align: center;">
                  <h1 style="font-size: 24px; font-weight: 600; margin: 0;">FireflyCloud</h1>
                  <p style="color: hsl(0, 0%, 71%); font-size: 14px; margin: 4px 0 0 0;">SMTP 测试邮件</p>
              </div>
              <div style="padding: 32px;">
                  <p style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">测试成功！</p>
                  <p style="color: hsl(0, 0%, 45.1%); margin-bottom: 24px;">这是一封测试邮件，用于验证 SMTP 配置是否正确。</p>
                  <div style="background-color: hsl(0, 0%, 96.1%); border: 1px solid hsl(0, 0%, 89.8%); border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                      <div style="font-size: 32px; font-weight: 700; color: hsl(0, 0%, 9%); letter-spacing: 6px; margin-bottom: 8px; font-family: ui-monospace, monospace;">${code}</div>
                      <div style="color: hsl(0, 0%, 45.1%); font-size: 14px; font-weight: 500;">测试验证码</div>
                  </div>
                  <p style="color: hsl(0, 0%, 45.1%);">如果您收到此邮件，说明 SMTP 配置正确。</p>
              </div>
              <div style="background-color: hsl(0, 0%, 98%); padding: 24px 32px; text-align: center; border-top: 1px solid hsl(0, 0%, 89.8%); color: hsl(0, 0%, 45.1%); font-size: 14px;">
                  <p style="margin: 0;">此邮件由 FireflyCloud 系统自动发送，请勿回复。</p>
              </div>
          </div>
      </body>
      </html>
    `

    const mailOptions = {
      from: {
        name: 'FireflyCloud',
        address: config.user
      },
      to: email,
      subject: '【FireflyCloud】SMTP 测试邮件',
      html: template.replace(/\{\{CODE\}\}/g, code),
      text: `FireflyCloud SMTP 测试邮件。测试验证码：${code}`
    }

    const result = await transporter.sendMail(mailOptions)
    logger.email(email, 'SMTP 测试邮件', true)
    logger.info(`测试邮件发送成功: ${result.messageId}`)
    return true
  } catch (error) {
    const err = error as unknown as Error & { code?: string; command?: string }
    logger.email(email, 'SMTP 测试邮件', false, err)
    logger.error('测试邮件发送失败:', err)
    logger.debug('错误详情:', {
      message: err.message,
      code: err.code,
      command: err.command
    })
    return false
  }
}

// 添加数据库管理路由到主路由
adminRoutes
  .get("/database/tables", async () => {
    try {
      // 获取所有表的数据统计
      const usersCount = await db.select().from(users).all()
      const filesCount = await db.select().from(files).all()
      const emailCodesCount = await db.select().from(emailVerificationCodes).all()
      const smtpConfigData = await db.select().from(smtpConfig).all()
      const storageConfigData = await db.select().from(storageConfig).all()

      return {
        tables: [
          {
            name: "users",
            displayName: "用户表",
            count: usersCount.length,
            description: "存储用户账户信息"
          },
          {
            name: "files",
            displayName: "文件表",
            count: filesCount.length,
            description: "存储文件元数据信息"
          },
          {
            name: "email_verification_codes",
            displayName: "邮箱验证码表",
            count: emailCodesCount.length,
            description: "存储邮箱验证码记录"
          },
          {
            name: "smtp_config",
            displayName: "SMTP配置表",
            count: smtpConfigData.length,
            description: "存储邮件服务器配置"
          },
          {
            name: "storage_config",
            displayName: "存储配置表",
            count: storageConfigData.length,
            description: "存储文件存储配置"
          }
        ]
      }
    } catch (error) {
      logger.error("Failed to get database tables:", error)
      return { error: "Failed to get database tables" }
    }
  })
  .get("/database/table/:tableName", async ({ params, set }) => {
    try {
      const { tableName } = params
      let data: any[] = []
      let columns: string[] = []

      switch (tableName) {
        case "users":
          data = await db.select().from(users).all()
          columns = ["id", "email", "role", "emailVerified", "createdAt", "updatedAt"]
          // 隐藏密码字段
          data = data.map(user => ({
            ...user,
            password: "***隐藏***"
          }))
          break
        case "files":
          data = await db.select().from(files).all()
          columns = ["id", "userId", "filename", "originalName", "size", "mimeType", "storageType", "storagePath", "createdAt"]
          break
        case "email_verification_codes":
          data = await db.select().from(emailVerificationCodes).all()
          columns = ["id", "email", "code", "expiresAt", "used", "createdAt"]
          break
        case "smtp_config":
          data = await db.select().from(smtpConfig).all()
          columns = ["id", "enabled", "host", "port", "user", "secure", "updatedAt"]
          // 隐藏密码字段
          data = data.map(config => ({
            ...config,
            pass: config.pass ? "***隐藏***" : ""
          }))
          break
        case "storage_config":
          data = await db.select().from(storageConfig).all()
          columns = ["id", "storageType", "r2Endpoint", "r2AccessKey", "r2Bucket", "updatedAt"]
          // 隐藏敏感字段
          data = data.map(config => ({
            ...config,
            r2SecretKey: config.r2SecretKey ? "***隐藏***" : ""
          }))
          break
        default:
          set.status = 404
          return { error: "Table not found" }
      }

      return {
        tableName,
        columns,
        data,
        count: data.length
      }
    } catch (error) {
      logger.error(`Failed to get table ${params.tableName}:`, error)
      set.status = 500
      return { error: "Failed to get table data" }
    }
  })

  // R2 挂载点管理 API
  // 获取所有用户的 R2 挂载点
  .get("/r2-mounts", async () => {
    try {
      logger.debug("管理员获取所有 R2 挂载点")

      const mounts = await db
        .select({
          id: r2MountPoints.id,
          userId: r2MountPoints.userId,
          folderId: r2MountPoints.folderId,
          r2Path: r2MountPoints.r2Path,
          mountName: r2MountPoints.mountName,
          enabled: r2MountPoints.enabled,
          createdAt: r2MountPoints.createdAt,
          updatedAt: r2MountPoints.updatedAt,
          userEmail: users.email,
          folderName: folders.name,
          folderPath: folders.path,
        })
        .from(r2MountPoints)
        .leftJoin(users, eq(r2MountPoints.userId, users.id))
        .leftJoin(folders, eq(r2MountPoints.folderId, folders.id))
        .orderBy(desc(r2MountPoints.createdAt))

      logger.info(`管理员查询到 ${mounts.length} 个 R2 挂载点`)
      return { mounts }
    } catch (error) {
      logger.error("管理员获取 R2 挂载点失败:", error)
      return { error: "Failed to get R2 mount points" }
    }
  })

  // 为指定用户创建 R2 挂载点
  .post("/r2-mounts", async ({ body, set }) => {
    try {
      const { userId, folderId, r2Path, mountName } = body

      logger.info(`管理员为用户 ${userId} 创建 R2 挂载点: ${mountName}`)

      // 检查用户是否存在
      const user = await db.select().from(users).where(eq(users.id, userId)).get()
      if (!user) {
        set.status = 404
        return { error: "User not found" }
      }

      // 检查文件夹是否存在且属于该用户
      const folder = await db
        .select()
        .from(folders)
        .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
        .get()

      if (!folder) {
        set.status = 404
        return { error: "Folder not found or does not belong to user" }
      }

      // 检查挂载点是否已存在
      const existingMount = await db
        .select()
        .from(r2MountPoints)
        .where(
          and(
            eq(r2MountPoints.userId, userId),
            eq(r2MountPoints.folderId, folderId)
          )
        )
        .get()

      if (existingMount) {
        set.status = 400
        return { error: "Mount point already exists for this folder" }
      }

      const mountId = nanoid()
      const now = Date.now()

      await db.insert(r2MountPoints).values({
        id: mountId,
        userId,
        folderId,
        r2Path,
        mountName,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })

      logger.database('INSERT', 'r2_mount_points')
      logger.info(`管理员创建 R2 挂载点成功: ${mountName}`)

      return { message: "Mount point created successfully", mountId }
    } catch (error) {
      logger.error("管理员创建 R2 挂载点失败:", error)
      set.status = 500
      return { error: "Failed to create mount point" }
    }
  }, {
    body: t.Object({
      userId: t.String(),
      folderId: t.String(),
      r2Path: t.String(),
      mountName: t.String(),
    }),
  })

  // 更新 R2 挂载点
  .put("/r2-mounts/:id", async ({ params, body, set }) => {
    try {
      const { id } = params
      const { mountName, r2Path, enabled } = body

      logger.info(`管理员更新 R2 挂载点: ${id}`)

      const existingMount = await db
        .select()
        .from(r2MountPoints)
        .where(eq(r2MountPoints.id, id))
        .get()

      if (!existingMount) {
        set.status = 404
        return { error: "Mount point not found" }
      }

      await db
        .update(r2MountPoints)
        .set({
          mountName,
          r2Path,
          enabled,
          updatedAt: Date.now(),
        })
        .where(eq(r2MountPoints.id, id))

      logger.database('UPDATE', 'r2_mount_points')
      logger.info(`管理员更新 R2 挂载点成功: ${id}`)

      return { message: "Mount point updated successfully" }
    } catch (error) {
      logger.error("管理员更新 R2 挂载点失败:", error)
      set.status = 500
      return { error: "Failed to update mount point" }
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      mountName: t.String(),
      r2Path: t.String(),
      enabled: t.Boolean(),
    }),
  })

  // 删除 R2 挂载点
  .delete("/r2-mounts/:id", async ({ params, set }) => {
    try {
      const { id } = params

      logger.info(`管理员删除 R2 挂载点: ${id}`)

      const existingMount = await db
        .select()
        .from(r2MountPoints)
        .where(eq(r2MountPoints.id, id))
        .get()

      if (!existingMount) {
        set.status = 404
        return { error: "Mount point not found" }
      }

      await db.delete(r2MountPoints).where(eq(r2MountPoints.id, id))

      logger.database('DELETE', 'r2_mount_points')
      logger.info(`管理员删除 R2 挂载点成功: ${id}`)

      return { message: "Mount point deleted successfully" }
    } catch (error) {
      logger.error("管理员删除 R2 挂载点失败:", error)
      set.status = 500
      return { error: "Failed to delete mount point" }
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })

  // 获取所有用户的文件夹（用于创建挂载点时选择）
  .get("/users/:userId/folders", async ({ params, set }) => {
    try {
      const { userId } = params

      logger.debug(`管理员获取用户 ${userId} 的文件夹`)

      // 检查用户是否存在
      const user = await db.select().from(users).where(eq(users.id, userId)).get()
      if (!user) {
        set.status = 404
        return { error: "User not found" }
      }

      const userFolders = await db
        .select()
        .from(folders)
        .where(eq(folders.userId, userId))
        .orderBy(folders.path)

      return { folders: userFolders }
    } catch (error) {
      logger.error("管理员获取用户文件夹失败:", error)
      set.status = 500
      return { error: "Failed to get user folders" }
    }
  }, {
    params: t.Object({
      userId: t.String(),
    }),
  })

  // 刷新R2存储统计缓存
  .post("/refresh-r2-stats", async ({ set }) => {
    try {
      // 获取存储配置
      const config = await db.select().from(storageConfig).get()

      if (!config || (!config.enableMixedMode && config.storageType !== "r2") || !config.r2Endpoint) {
        set.status = 400
        return { error: "R2 storage not configured" }
      }

      const storageService = new StorageService(config)

      // 清除缓存
      storageService.clearR2StorageCache()

      // 强制重新查询
      const r2Stats = await storageService.calculateR2StorageUsage(false)

      if (r2Stats.error) {
        logger.warn(`R2存储统计刷新失败: ${r2Stats.error}`)
        set.status = 500
        return {
          error: r2Stats.error,
          stats: r2Stats
        }
      }

      logger.info(`R2存储统计刷新成功: ${r2Stats.totalFiles} 个文件，${r2Stats.totalSize} 字节`)

      return {
        message: "R2 storage stats refreshed successfully",
        stats: r2Stats
      }

    } catch (error) {
      logger.error("刷新R2存储统计失败:", error)
      set.status = 500
      return { error: "Failed to refresh R2 storage stats" }
    }
  })

  // 用户配额管理 API
  // 获取所有用户的配额信息
  .get("/user-quotas", async () => {
    try {
      logger.debug("管理员获取所有用户配额信息")

      const quotas = await db
        .select({
          id: userQuotas.id,
          userId: userQuotas.userId,
          maxStorage: userQuotas.maxStorage,
          usedStorage: userQuotas.usedStorage,
          role: userQuotas.role,
          customQuota: userQuotas.customQuota,
          createdAt: userQuotas.createdAt,
          updatedAt: userQuotas.updatedAt,
          userEmail: users.email,
        })
        .from(userQuotas)
        .leftJoin(users, eq(userQuotas.userId, users.id))
        .orderBy(desc(userQuotas.updatedAt))

      return { quotas }
    } catch (error) {
      logger.error("管理员获取用户配额失败:", error)
      return { error: "Failed to get user quotas" }
    }
  })

  // 获取角色默认配额配置
  .get("/role-quota-config", async () => {
    try {
      logger.debug("管理员获取角色默认配额配置")

      const configs = await db
        .select()
        .from(roleQuotaConfig)
        .orderBy(roleQuotaConfig.role)

      logger.info(`查询到 ${configs.length} 个角色配额配置`)
      return { configs }
    } catch (error) {
      logger.error("获取角色配额配置失败:", error)
      return { error: "Failed to get role quota config" }
    }
  })

  // 更新角色默认配额
  .put("/role-quota-config/:role", async ({ params, body, set }) => {
    try {
      const { role } = params
      const { defaultQuota, description } = body

      logger.info(`管理员更新角色 ${role} 的默认配额: ${defaultQuota} 字节`)

      const existingConfig = await db
        .select()
        .from(roleQuotaConfig)
        .where(eq(roleQuotaConfig.role, role))
        .get()

      if (existingConfig) {
        await db
          .update(roleQuotaConfig)
          .set({
            defaultQuota,
            description,
            updatedAt: Date.now(),
          })
          .where(eq(roleQuotaConfig.role, role))
      } else {
        const configId = `quota_${role}_${Date.now()}`
        await db.insert(roleQuotaConfig).values({
          id: configId,
          role,
          defaultQuota,
          description,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }

      logger.database(existingConfig ? 'UPDATE' : 'INSERT', 'role_quota_config')
      logger.info(`角色 ${role} 的默认配额更新成功`)

      return { message: "Role quota config updated successfully" }
    } catch (error) {
      logger.error("更新角色配额配置失败:", error)
      set.status = 500
      return { error: "Failed to update role quota config" }
    }
  }, {
    params: t.Object({
      role: t.String(),
    }),
    body: t.Object({
      defaultQuota: t.Number(),
      description: t.Optional(t.String()),
    }),
  })

  // 更新用户配额
  .put("/user-quotas/:userId", async ({ params, body, set }) => {
    try {
      const { userId } = params
      const { maxStorage, customQuota } = body

      logger.info(`管理员更新用户 ${userId} 的配额: ${maxStorage} 字节`)

      // 检查用户是否存在
      const user = await db.select().from(users).where(eq(users.id, userId)).get()
      if (!user) {
        set.status = 404
        return { error: "User not found" }
      }

      // 检查用户配额记录是否存在
      const existingQuota = await db
        .select()
        .from(userQuotas)
        .where(eq(userQuotas.userId, userId))
        .get()

      if (existingQuota) {
        await db
          .update(userQuotas)
          .set({
            maxStorage,
            customQuota,
            updatedAt: Date.now(),
          })
          .where(eq(userQuotas.userId, userId))
      } else {
        // 计算用户当前使用量（包括本地存储和R2存储）
        const userFiles = await db
          .select()
          .from(files)
          .where(eq(files.userId, userId))
          .all()

        // 分别计算本地存储和R2存储，然后求和
        let localStorage = 0
        let r2Storage = 0

        userFiles.forEach(file => {
          if (file.storageType === 'local') {
            localStorage += file.size
          } else if (file.storageType === 'r2') {
            r2Storage += file.size
          }
        })

        const totalUsedStorage = localStorage + r2Storage

        const quotaId = `quota_${userId}_${Date.now()}`
        await db.insert(userQuotas).values({
          id: quotaId,
          userId,
          maxStorage,
          usedStorage: totalUsedStorage,
          role: user.role,
          customQuota,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }

      logger.database(existingQuota ? 'UPDATE' : 'INSERT', 'user_quotas')

      return { message: "User quota updated successfully" }
    } catch (error) {
      logger.error("更新用户配额失败:", error)
      set.status = 500
      return { error: "Failed to update user quota" }
    }
  }, {
    params: t.Object({
      userId: t.String(),
    }),
    body: t.Object({
      maxStorage: t.Number(),
      customQuota: t.Optional(t.Number()),
    }),
  })

  // 重新计算用户存储使用量
  .post("/recalculate-user-storage/:userId", async ({ params, set }) => {
    try {
      const { userId } = params

      // 检查用户是否存在
      const user = await db.select().from(users).where(eq(users.id, userId)).get()
      if (!user) {
        set.status = 404
        return { error: "User not found" }
      }

      // 使用QuotaService重新计算用户存储使用量
      const result = await QuotaService.recalculateUserStorage(userId)

      if (!result.success) {
        set.status = 404
        return { error: result.error || "User quota record not found" }
      }

      return {
        message: "User storage recalculated successfully",
        oldUsedStorage: result.oldUsed,
        newUsedStorage: result.newUsed,
        fileCount: result.fileCount,
        localStorage: result.localStorage,
        r2Storage: result.r2Storage,
        localFiles: result.localFiles,
        r2Files: result.r2Files
      }

    } catch (error) {
      logger.error("重新计算用户存储使用量失败:", error)
      set.status = 500
      return { error: "Failed to recalculate user storage" }
    }
  }, {
    params: t.Object({
      userId: t.String(),
    }),
  })

  // 批量重新计算所有用户存储使用量
  .post("/recalculate-all-storage", async () => {
    try {
      const allUsers = await db.select().from(users).all()
      let updatedCount = 0

      for (const user of allUsers) {
        try {
          // 计算用户实际使用量（包括本地存储和R2存储）
          const userFiles = await db
            .select()
            .from(files)
            .where(eq(files.userId, user.id))
            .all()

          // 分别计算本地存储和R2存储，然后求和
          let localStorage = 0
          let r2Storage = 0

          userFiles.forEach(file => {
            if (file.storageType === 'local') {
              localStorage += file.size
            } else if (file.storageType === 'r2') {
              r2Storage += file.size
            }
          })

          const actualUsedStorage = localStorage + r2Storage

          // 更新配额记录
          const existingQuota = await db
            .select()
            .from(userQuotas)
            .where(eq(userQuotas.userId, user.id))
            .get()

          if (existingQuota) {
            await db
              .update(userQuotas)
              .set({
                usedStorage: actualUsedStorage,
                updatedAt: Date.now(),
              })
              .where(eq(userQuotas.userId, user.id))

            updatedCount++
            logger.debug(`用户 ${user.id} 存储使用量更新: ${actualUsedStorage} 字节 (本地: ${localStorage}, R2: ${r2Storage})`)
          }
        } catch (userError) {
          logger.error(`更新用户 ${user.id} 存储使用量失败:`, userError)
        }
      }

      logger.database('UPDATE', 'user_quotas')

      return {
        message: "All user storage recalculated successfully",
        updatedCount,
        totalUsers: allUsers.length
      }

    } catch (error) {
      logger.error("批量重新计算存储使用量失败:", error)
      return { error: "Failed to recalculate all user storage" }
    }
  })

  // 修改管理员密码
  .put("/change-password", async ({ body, user, set }) => {
    try {
      const { currentPassword, newPassword } = body

      logger.info(`管理员 ${user.email} 请求修改密码`)

      // 获取当前管理员信息
      const adminId = String((user as any).userId)
      const admin = await db.select().from(users).where(eq(users.id, adminId)).get()
      if (!admin) {
        set.status = 404
        return { error: "管理员账户不存在" }
      }

      // 验证当前密码
      const isCurrentPasswordValid = await verifyPassword(currentPassword, admin.password)
      if (!isCurrentPasswordValid) {
        set.status = 400
        return { error: "当前密码不正确" }
      }

      // 验证新密码强度
      const passwordValidation = validatePasswordStrength(newPassword)
      if (!passwordValidation.isValid) {
        set.status = 400
        return {
          error: "密码强度不足",
          details: passwordValidation.errors
        }
      }

      // 检查新密码是否与当前密码相同
      const isSamePassword = await verifyPassword(newPassword, admin.password)
      if (isSamePassword) {
        set.status = 400
        return { error: "新密码不能与当前密码相同" }
      }

      // 哈希新密码
      const hashedNewPassword = await hashPassword(newPassword)

      // 更新密码
      await db
        .update(users)
        .set({
          password: hashedNewPassword,
          updatedAt: Date.now(),
        })
        .where(eq(users.id, String((user as any).userId)))

      logger.database('UPDATE', 'users')
      logger.info(`管理员 ${user.email} 密码修改成功`)

      return {
        message: "密码修改成功",
        passwordStrength: passwordValidation.strength
      }
    } catch (error) {
      logger.error("管理员密码修改失败:", (error as unknown as Error))
      set.status = 500
      return { error: "密码修改失败" }
    }
  }, {
    body: t.Object({
      currentPassword: t.String({ minLength: 1 }),
      newPassword: t.String({ minLength: 6, maxLength: 128 }),
    }),
  })
