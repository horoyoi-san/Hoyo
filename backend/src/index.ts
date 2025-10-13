import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { swagger } from "@elysiajs/swagger"
import { jwt } from "@elysiajs/jwt"
import { bearer } from "@elysiajs/bearer"

import { authRoutes } from "./routes/auth"
import { fileRoutes } from "./routes/files"
import { folderRoutes } from "./routes/folders"
import { adminRoutes } from "./routes/admin"
import { adminGoogleOAuthRoutes } from "./routes/admin-google-oauth"
import { adminGitHubOAuthRoutes } from "./routes/admin-github-oauth"
import { adminMicrosoftOAuthRoutes } from "./routes/admin-microsoft-oauth"
import { adminUserStorageRoutes } from "./routes/admin-user-storage"
import { storageRoutes } from "./routes/storage"
import { downloadRoutes } from "./routes/download"
import { shareRoutes } from "./routes/share"
import { pickupRoutes } from "./routes/pickup"
import { directLinksRoutes } from "./routes/direct-links"
import { logsRoutes } from "./routes/logs"
import { systemRoutes } from "./routes/system"
import { userIpRoutes } from "./routes/userip"
import { logger } from "./utils/logger"
import { startCleanupScheduler } from "./utils/cleanup"
import { publicSiteRoutes } from "./routes/site"

// 检查必要的环境变量
function validateEnvironmentVariables() {
  logger.info('🔍 开始检查环境变量配置...')

  const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL'
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    logger.fatal('服务启动失败：缺少必要的环境变量')
    logger.error(`缺少的环境变量: ${missingVars.join(', ')}`)
    logger.error('')
    logger.error('请在 backend/.env 文件中配置以下变量:')
    logger.error('JWT_SECRET=your_jwt_secret_key')
    logger.error('DATABASE_URL=./netdisk.db')
    logger.error('')
    logger.error('可选配置:')
    logger.error('PORT=8080 (服务端口)')
    logger.error('LOG_LEVEL=INFO (日志等级: DEBUG, INFO, WARN, ERROR, FATAL)')
    logger.error('')
    logger.error('注意: SMTP 配置可以在管理面板中设置，无需在环境变量中配置')
    logger.error('配置完成后请重新启动服务')
    process.exit(1)
  }

  logger.info('环境变量检查通过')

  // 显示当前日志等级
  const currentLogLevel = process.env.LOG_LEVEL || 'INFO'
  logger.info(`当前日志等级: ${currentLogLevel}`)

  // 提示SMTP配置方式
  logger.info('SMTP 配置可在管理面板中设置')
}

// 启动前检查环境变量
validateEnvironmentVariables()

logger.startup('🚀 正在启动 NetDisk API 服务器...')

// 获取客户端IP地址的辅助函数
function getClientIp(request: Request, headers: Record<string, string | undefined>): string {
  // 尝试从各种可能的头部获取真实IP
  const xForwardedFor = headers['x-forwarded-for']
  const cfConnectingIp = headers['cf-connecting-ip']
  const xRealIp = headers['x-real-ip']
  const xClientIp = headers['x-client-ip']

  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }
  if (cfConnectingIp) return cfConnectingIp
  if (xRealIp) return xRealIp
  if (xClientIp) return xClientIp

  // 尝试从URL获取（对于本地开发）
  try {
    const url = new URL(request.url)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return '127.0.0.1'
    }
    return url.hostname
  } catch {
    return '127.0.0.1' // 默认本地IP
  }
}

const app = new Elysia()
  // 添加简单的HTTP日志中间件
  .onRequest(({ request, set }) => {
    // 记录请求开始时间
    const startTime = Date.now()
    const url = new URL(request.url)
    const path = url.pathname
    const headers = Object.fromEntries(request.headers.entries())
    const clientIp = getClientIp(request, headers)

    // 存储信息供后续使用
    set.headers = set.headers || {}
    set.headers['x-start-time'] = startTime.toString()
    set.headers['x-client-ip'] = clientIp
    set.headers['x-request-path'] = path
  })
  .onAfterResponse(({ request, set }) => {
    const startTime = parseInt(set.headers?.['x-start-time'] as string || '0')
    const clientIp = set.headers?.['x-client-ip'] as string || 'unknown'
    const requestPath = set.headers?.['x-request-path'] as string || new URL(request.url).pathname

    // 跳过健康检查等路径
    const skipPaths = ['/health', '/favicon.ico', '/robots.txt']
    if (skipPaths.some(skipPath => requestPath.startsWith(skipPath))) {
      return
    }

    // 计算响应时间
    const duration = Date.now() - startTime
    const statusCode = typeof set.status === 'number' ? set.status : 200

    // 使用我们自己的 logger 记录HTTP请求
    logger.http(request.method, requestPath, statusCode, duration, undefined, clientIp)
  })
  .use(cors()) // 允许所有跨域请求
  .use(
    swagger({
      documentation: {
        info: {
          title: "NetDisk API",
          version: "1.0.0",
          description: "Universal NetDisk API with local and R2 storage support",
        },
      },
    }),
  )
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET!,
    }),
  )
  .use(bearer())
  .get("/", () => {
    logger.debug('健康检查请求 - 根路径')
    return { message: "NetDisk API Server Running" }
  })
  .get("/health", () => {
    logger.debug('健康检查请求 - /health')
    return { status: "ok", timestamp: new Date().toISOString() }
  })
  .get("/test-log", () => {
    // 测试路由被调用，应该在HTTP日志中显示
    return { message: "Test log route", timestamp: new Date().toISOString() }
  })
  .use(authRoutes)
  .use(fileRoutes)
  .use(folderRoutes)
  .use(adminRoutes)
  .use(adminGoogleOAuthRoutes)
  .use(adminGitHubOAuthRoutes)
  .use(adminMicrosoftOAuthRoutes)
  .use(adminUserStorageRoutes)
  .use(storageRoutes)
  .use(downloadRoutes)
  .use(shareRoutes)
  .use(pickupRoutes)
  .use(directLinksRoutes)
  .use(logsRoutes)
  .use(systemRoutes)
  .use(publicSiteRoutes)
  .use(userIpRoutes)
  // 新格式直链访问路由 (/dl/:filename?token=xxxxx) - 使用专用前缀避免冲突
  .get("/dl/:filename", async ({ params, query, set, headers }) => {
    try {
      const { filename } = params
      const { token } = query as { token?: string }

      // 如果没有token参数，这不是新格式直链，返回404
      if (!token) {
        set.status = 404
        return { error: "Direct link requires token parameter" }
      }

      // 导入必要的模块
      const { db } = require("./db")
      const { fileDirectLinks, files, storageConfig, directLinkAccessLogs } = require("./db/schema")
      const { eq } = require("drizzle-orm")
      const { IPBanService } = require("./services/ip-ban")
      const { IPLocationService } = require("./services/ip-location")
      const { StorageService } = require("./services/storage")
      const { nanoid } = require("nanoid")

      logger.debug(`新格式直链访问: ${filename}?token=${token}`)

      // 根据token查找直链记录
      const linkRecord = await db
        .select()
        .from(fileDirectLinks)
        .where(eq(fileDirectLinks.token, token))
        .get()

      if (!linkRecord) {
        logger.warn(`直链token无效: ${token}`)
        set.status = 404
        return { error: "Direct link not found" }
      }

      // 验证文件名是否匹配
      if (linkRecord.directName !== filename) {
        logger.warn(`文件名不匹配: 期望 ${linkRecord.directName}, 实际 ${filename}`)
        set.status = 404
        return { error: "File name mismatch" }
      }

      // 检查直链是否启用
      if (!linkRecord.enabled) {
        logger.warn(`直链已禁用: ${filename}`)
        set.status = 403
        return { error: "Direct link disabled" }
      }

      // 获取客户端IP并检查是否被封禁
      const getClientIP = (headers: Record<string, string | undefined>): string => {
        return headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               headers['x-real-ip'] ||
               headers['cf-connecting-ip'] ||
               'unknown'
      }

      const clientIP = getClientIP(headers)
      const isIPBanned = await IPBanService.isIPBanned(clientIP, linkRecord.id)

      if (isIPBanned) {
        logger.warn(`IP已被封禁，拒绝访问: ${clientIP} - 直链: ${filename}`)
        set.status = 403
        return { error: "Access denied: IP banned" }
      }

      // 工具函数：检测是否为OneDrive文件ID
      function isOneDriveFileId(id: string): boolean {
        // OneDrive文件ID通常包含感叹号，格式类似：20236B000B26DA17!s36871feb50624ea49a98f64de8d9c934
        return id.includes('!') && (id.includes('s') || id.includes('f'))
      }

      // 获取文件信息
      let file: any = null
      
      // 检查是否为OneDrive文件ID
      if (isOneDriveFileId(linkRecord.fileId)) {
        logger.info(`检测到OneDrive文件ID，使用Graph API获取文件信息: ${linkRecord.fileId}`)
        
        try {
          // 获取用户的OneDrive认证信息
          const { oneDriveAuth, users } = require("./db/schema")
          const userAuth = await db
            .select()
            .from(oneDriveAuth)
            .where(eq(oneDriveAuth.userId, linkRecord.userId))
            .get()

          if (!userAuth) {
            logger.warn(`OneDrive认证信息未找到 - 用户: ${linkRecord.userId}`)
            set.status = 400
            return { error: "OneDrive not authenticated" }
          }

          // 获取存储配置
          const config = await db.select().from(storageConfig).get()
          if (!config) {
            logger.error("存储配置未找到")
            set.status = 500
            return { error: "Storage not configured" }
          }

          // 检查访问令牌是否过期并刷新
          let accessToken = userAuth.accessToken
          if (userAuth.expiresAt <= Date.now()) {
            try {
              if (!config.oneDriveClientId) {
                set.status = 400
                return { error: "OneDrive OAuth not configured" }
              }

              const { OneDriveService } = require("./services/onedrive")
              const oneDriveService = new OneDriveService({
                clientId: config.oneDriveClientId,
                clientSecret: config.oneDriveClientSecret || "",
                tenantId: config.oneDriveTenantId || "common",
              })

              const newTokens = await oneDriveService.refreshToken(userAuth.refreshToken)
              accessToken = newTokens.accessToken

              // 更新数据库中的令牌
              await db.update(oneDriveAuth).set({
                accessToken: newTokens.accessToken,
                refreshToken: newTokens.refreshToken,
                expiresAt: newTokens.expiresAt,
                updatedAt: Date.now(),
              }).where(eq(oneDriveAuth.id, userAuth.id))

              logger.info(`OneDrive访问令牌刷新成功 - 用户: ${linkRecord.userId}`)
            } catch (e) {
              logger.error(`OneDrive访问令牌刷新失败 - 用户: ${linkRecord.userId}`, e)
              set.status = 401
              return { error: "OneDrive access token expired, please re-authenticate" }
            }
          }

          // 创建OneDrive服务实例并获取文件信息
          const { OneDriveService } = require("./services/onedrive")
          const oneDriveService = new OneDriveService({
            clientId: config.oneDriveClientId!,
            clientSecret: config.oneDriveClientSecret || "",
            tenantId: config.oneDriveTenantId || "common",
          })
          oneDriveService.setAccessToken(accessToken)

          const fileInfo = await oneDriveService.getItemById(linkRecord.fileId)
          if (!fileInfo || !fileInfo.name) {
            logger.warn(`OneDrive文件信息无效: ${linkRecord.fileId}`)
            set.status = 404
            return { error: "OneDrive file not found" }
          }

          // 创建虚拟文件对象，与本地文件对象格式兼容
          file = {
            id: linkRecord.fileId,
            userId: linkRecord.userId,
            originalName: fileInfo.name,
            size: fileInfo.size || 0,
            mimeType: fileInfo.file?.mimeType || "application/octet-stream",
            storageType: "onedrive",
            storagePath: linkRecord.fileId, // 对于OneDrive文件，存储路径就是文件ID
            createdAt: new Date(fileInfo.createdDateTime || Date.now()).getTime(),
          }

          logger.info(`通过Graph API获取OneDrive文件信息成功: ${fileInfo.name}`)
        } catch (error) {
          logger.error(`获取OneDrive文件信息失败: ${linkRecord.fileId}`, error)
          set.status = 500
          return { error: "Failed to get OneDrive file info" }
        }
      } else {
        // 原有的本地文件查找逻辑
        file = await db
          .select()
          .from(files)
          .where(eq(files.id, linkRecord.fileId))
          .get()
      }

      if (!file) {
        logger.warn(`直链对应的文件未找到: ${linkRecord.fileId}`)
        set.status = 404
        return { error: "File not found" }
      }

      // 记录访问日志
      const userAgent = headers['user-agent'] || ''

      // 异步查询IP归属地信息
      IPLocationService.getIPLocation(clientIP).then(async (locationInfo: any) => {
        try {
          await db.insert(directLinkAccessLogs).values({
            id: nanoid(),
            directLinkId: linkRecord.id,
            ipAddress: clientIP,
            userAgent: userAgent,
            country: locationInfo?.country || '',
            province: locationInfo?.province || '',
            city: locationInfo?.city || '',
            isp: locationInfo?.isp || '',
            accessedAt: Date.now(),
          })
        } catch (error: any) {
          logger.error('记录直链访问日志失败:', error)
        }
      }).catch((error: any) => {
        logger.error('查询IP归属地失败:', error)
      })

      // 增加访问计数
      await db
        .update(fileDirectLinks)
        .set({
          accessCount: linkRecord.accessCount + 1,
          updatedAt: Date.now()
        })
        .where(eq(fileDirectLinks.id, linkRecord.id))

      // 获取存储配置
      const config = await db.select().from(storageConfig).get()
      if (!config) {
        logger.error("存储配置未找到")
        set.status = 500
        return { error: "Storage not configured" }
      }

      logger.info(`新格式直链访问: ${file.originalName} - 用户: ${linkRecord.userId} - 访问次数: ${linkRecord.accessCount + 1}`)

      const storageService = new StorageService(config)
      // 新增：依据用户“有效存储策略”决定直链分流，避免误判为本地
      const { UserStorageStrategyService } = require("./services/user-storage-strategy")
      const { assignment, strategy } = await UserStorageStrategyService.getUserEffectiveStorageStrategy(file.userId)
      const effectiveStorageType = (strategy?.type || file.storageType || config.storageType || "").toLowerCase()
      logger.debug(`新格式直链分流: effectiveStorageType=${effectiveStorageType}, file.storageType=${file.storageType}, global=${config.storageType}`)

      if (effectiveStorageType === "onedrive") {
        try {
          const { users, oneDriveAuth } = require("./db/schema")
          const { eq } = require("drizzle-orm")
          const { OneDriveService } = require("./services/onedrive")

          // 管理员OneDrive认证
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
            logger.error(`管理员OneDrive认证信息未找到`)
            set.status = 401
            return { error: "OneDrive not configured" }
          }

          // 刷新过期令牌
          let accessToken = adminAuth.accessToken
          if (adminAuth.expiresAt <= Date.now()) {
            const odClientId = config.oneDriveClientId || config.clientId
            const odClientSecret = config.oneDriveClientSecret || config.clientSecret
            const odTenantId = config.oneDriveTenantId || config.tenantId
            const oneDriveService = new OneDriveService({ clientId: odClientId, clientSecret: odClientSecret, tenantId: odTenantId })
            const refreshed = await oneDriveService.refreshToken(adminAuth.refreshToken)
            accessToken = refreshed.accessToken
            await db.update(oneDriveAuth).set({ accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken, expiresAt: refreshed.expiresAt, updatedAt: Date.now() }).where(eq(oneDriveAuth.id, adminAuth.id))
            logger.info(`管理员OneDrive访问令牌刷新成功`)
          }

          // 使用 OneDrive API 生成下载直链
          const odClientId = config.oneDriveClientId || config.clientId
          const odClientSecret = config.oneDriveClientSecret || config.clientSecret
          const odTenantId = config.oneDriveTenantId || config.tenantId
          const odSvc = new OneDriveService({ clientId: odClientId, clientSecret: odClientSecret, tenantId: odTenantId })
          odSvc.setAccessToken(accessToken)

          try {
            // 优先按 itemId
            const directUrl = await odSvc.getDownloadUrl(file.storagePath)
            set.status = 302
            set.headers["Location"] = directUrl
            return
          } catch {
            // 回退：按路径（基于用户策略分配的用户目录）
            const userPath = assignment ? `${assignment.userFolder}/${file.filename}` : `users/${file.userId}/${file.filename}`
            const directUrl = await odSvc.getDownloadUrlByPath(userPath)
            set.status = 302
            set.headers["Location"] = directUrl
            return
          }
        } catch (error) {
          logger.error("新格式直链 OneDrive 直链生成失败:", error)
          set.status = 500
          return { error: "OneDrive download failed" }
        }
      } else if (effectiveStorageType === "r2") {
        // R2 存储：返回预签名URL进行重定向
        const downloadUrl = await storageService.getDownloadUrl(file.storagePath)
        set.status = 302
        set.headers["Location"] = downloadUrl
        return
      }

      // 其他（本地）存储：直接返回文件流
      const fs = await import("fs")

      if (!fs.existsSync(file.storagePath)) {
        logger.error(`本地文件不存在: ${file.storagePath}`)
        set.status = 404
        return { error: "File not found on storage" }
      }

      const fileBuffer = fs.readFileSync(file.storagePath)

      // 设置响应头
      set.headers["Content-Type"] = file.mimeType || "application/octet-stream"
      set.headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(file.originalName)}"`
      set.headers["Content-Length"] = file.size.toString()

      // 直接返回Buffer
      return fileBuffer
    } catch (error) {
      logger.error("新格式直链访问失败:", error)
      set.status = 500
      return { error: "Direct link access failed" }
    }
  })

const port = app.server?.port || process.env.PORT || 8080
app.listen(port)

logger.startup(`NetDisk API 服务器启动成功`)
logger.startup(`服务器地址: http://localhost:${port}`)
logger.startup(`健康检查: http://localhost:${port}/health`)

// 启动清理调度器
startCleanupScheduler()
