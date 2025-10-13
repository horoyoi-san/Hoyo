import { Elysia } from "elysia"
import { nanoid } from "nanoid"
import { db } from "../db"
import { files, storageConfig, downloadTokens, fileDirectLinks, directLinkAccessLogs, oneDriveMountPoints, oneDriveAuth } from "../db/schema"
import { and, eq } from "drizzle-orm"
import { StorageService } from "../services/storage"
import { IPLocationService } from "../services/ip-location"
import { IPBanService } from "../services/ip-ban"
import { logger } from "../utils/logger"

// 解析 OneDrive 配置字段（兼容全局 storage_config 与策略风格字段名）
function resolveOneDriveConfig(cfg: any) {
  return {
    clientId: cfg.oneDriveClientId || cfg.clientId,
    clientSecret: cfg.oneDriveClientSecret || cfg.clientSecret,
    tenantId: cfg.oneDriveTenantId || cfg.tenantId,
  }
}

// 辅助函数：获取客户端IP地址
function getClientIP(headers: Record<string, string | undefined>): string {
  return headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         headers['x-real-ip'] ||
         headers['cf-connecting-ip'] ||
         '127.0.0.1'
}

export const downloadRoutes = new Elysia({ prefix: "/files" })
  // 实际文件下载路由（使用一次性令牌，无需认证）
  .get("/download/:token", async ({ params, set }) => {
    try {
      logger.debug(`使用令牌下载文件: ${params.token}`)

      // 查找下载令牌
      const tokenRecord = await db
        .select()
        .from(downloadTokens)
        .where(eq(downloadTokens.token, params.token))
        .get()

      if (!tokenRecord) {
        logger.warn(`下载令牌无效: ${params.token}`)
        set.status = 404
        return { error: "Invalid download token" }
      }

      // 检查令牌使用次数
      const usageCount = tokenRecord.usageCount ?? 0
      const maxUsage = tokenRecord.maxUsage ?? 2

      // 兼容旧数据：如果 used=true 但 usageCount=0，说明是旧数据，已经用完
      if (tokenRecord.used && usageCount === 0) {
        logger.warn(`下载令牌已使用（旧数据）: ${params.token}`)
        set.status = 410
        return { error: "Download token already used" }
      }

      if (usageCount >= maxUsage) {
        logger.warn(`下载令牌使用次数已达上限: ${params.token} (${usageCount}/${maxUsage})`)
        set.status = 410
        return { error: "Download token usage limit exceeded" }
      }

      // 检查令牌是否过期
      if (Date.now() > tokenRecord.expiresAt) {
        logger.warn(`下载令牌已过期: ${params.token}`)
        set.status = 410
        return { error: "Download token expired" }
      }

      // 获取文件信息
      const file = await db
        .select()
        .from(files)
        .where(eq(files.id, tokenRecord.fileId))
        .get()

      if (!file) {
        logger.warn(`令牌对应的文件未找到: ${tokenRecord.fileId}`)
        set.status = 404
        return { error: "File not found" }
      }

      // 增加使用次数计数器
      const newUsageCount = usageCount + 1
      await db
        .update(downloadTokens)
        .set({
          usageCount: newUsageCount,
          used: newUsageCount >= maxUsage // 兼容旧字段：达到最大次数时设为true
        })
        .where(eq(downloadTokens.id, tokenRecord.id))

      // 获取存储配置
      const config = await db.select().from(storageConfig).get()
      if (!config) {
        logger.error("存储配置未找到")
        set.status = 500
        return { error: "Storage not configured" }
      }

            logger.file('DOWNLOAD', file.originalName, file.size, true)
      
      // 检查文件是否存储在OneDrive挂载点中
      
      // 查找文件所在文件夹的OneDrive挂载点
      const oneDriveMount = await db
        .select()
        .from(oneDriveMountPoints)
        .where(and(
          eq(oneDriveMountPoints.folderId, file.folderId || ""),
          eq(oneDriveMountPoints.enabled, true)
        ))
        .get()

      if (oneDriveMount) {
        // 文件存储在OneDrive挂载点中，使用管理员 OneDrive 账号下载（直链重定向）
        logger.debug(`文件存储在OneDrive挂载点中: ${oneDriveMount.mountName}`)
        try {
          const { users } = require("../db/schema")
          const { OneDriveService } = require("../services/onedrive")

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
            logger.error(`管理员OneDrive认证信息未找到`)
            set.status = 401
            return { error: "OneDrive not configured" }
          }

          // 刷新过期令牌
          let accessToken = adminAuth.accessToken
          if (adminAuth.expiresAt <= Date.now()) {
            try {
              const od = resolveOneDriveConfig(config)
              const oneDriveService = new OneDriveService({
                clientId: od.clientId,
                clientSecret: od.clientSecret,
                tenantId: od.tenantId,
              })
              const refreshed = await oneDriveService.refreshToken(adminAuth.refreshToken)
              accessToken = refreshed.accessToken
              await db.update(oneDriveAuth).set({
                accessToken: refreshed.accessToken,
                refreshToken: refreshed.refreshToken,
                expiresAt: refreshed.expiresAt,
                updatedAt: Date.now(),
              }).where(eq(oneDriveAuth.id, adminAuth.id))
              logger.info(`管理员OneDrive访问令牌刷新成功`)
            } catch (e) {
              logger.error(`管理员OneDrive访问令牌刷新失败`, e)
              set.status = 401
              return { error: "OneDrive access token expired, please re-authenticate in admin panel" }
            }
          }

          const storageService = new StorageService(config)
          storageService.setOneDriveAccessToken(accessToken)

          // 获取直链并重定向
          const downloadUrl = await storageService.getDownloadUrl(file.storagePath)
          set.status = 302
          set.headers["Location"] = downloadUrl
          return
        } catch (error) {
          logger.error("OneDrive文件下载失败:", error)
          set.status = 500
          return { error: "OneDrive download failed" }
        }
      }

      // 非OneDrive挂载点文件，使用原有逻辑
      const storageService = new StorageService(config)
      
      if (config.storageType === "r2" || file.storageType === "r2") {
        // 对于R2存储，返回预签名URL进行重定向
        const downloadUrl = await storageService.getDownloadUrl(file.storagePath)
        set.status = 302
        set.headers["Location"] = downloadUrl
        return
      } else if (config.storageType === "onedrive" || file.storageType === "onedrive") {
        // OneDrive存储 - 始终使用管理员认证（并在过期时自动刷新），返回直链重定向
        try {
          const { users } = require("../db/schema")
          const { OneDriveService } = require("../services/onedrive")

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

          let accessToken = adminAuth.accessToken
          if (adminAuth.expiresAt <= Date.now()) {
            try {
              const od = resolveOneDriveConfig(config)
              const oneDriveService = new OneDriveService({
                clientId: od.clientId,
                clientSecret: od.clientSecret,
                tenantId: od.tenantId,
              })
              const refreshed = await oneDriveService.refreshToken(adminAuth.refreshToken)
              accessToken = refreshed.accessToken
              await db.update(oneDriveAuth).set({
                accessToken: refreshed.accessToken,
                refreshToken: refreshed.refreshToken,
                expiresAt: refreshed.expiresAt,
                updatedAt: Date.now(),
              }).where(eq(oneDriveAuth.id, adminAuth.id))
              logger.info(`管理员OneDrive访问令牌刷新成功`)
            } catch (e) {
              logger.error(`管理员OneDrive访问令牌刷新失败`, e)
              set.status = 401
              return { error: "OneDrive access token expired, please re-authenticate in admin panel" }
            }
          }

          const storageService = new StorageService(config)
          storageService.setOneDriveAccessToken(accessToken)

          // 优先按 itemId，失败则按路径回退，最终设置重定向
          try {
            const directUrl = await storageService.getDownloadUrl(file.storagePath)
            set.status = 302
            set.headers["Location"] = directUrl
            return
          } catch (e) {
            logger.warn(`按 itemId 获取下载URL失败，尝试按路径回退: ${file.storagePath}`)
            const { UserStorageStrategyService } = require("../services/user-storage-strategy")
            const { assignment } = await UserStorageStrategyService.getUserEffectiveStorageStrategy(file.userId)
            const path = assignment ? `${assignment.userFolder}/${file.filename}` : `users/${file.userId}/${file.filename}`
            const od = resolveOneDriveConfig(config)
            const { OneDriveService } = require("../services/onedrive")
            const oneDriveService = new OneDriveService({ clientId: od.clientId, clientSecret: od.clientSecret, tenantId: od.tenantId })
            oneDriveService.setAccessToken(accessToken)
            const directUrl = await oneDriveService.getDownloadUrlByPath(path)
            set.status = 302
            set.headers["Location"] = directUrl
            return
          }
        } catch (error) {
          logger.error("OneDrive下载认证失败:", error)
          set.status = 500
          return { error: "OneDrive authentication failed" }
        }
      } else {
        // 对于本地存储，直接返回文件流（若本地不存在，尝试 OneDrive 回退）
        const fs = await import("fs")
        const path = await import("path")
        
        if (!fs.existsSync(file.storagePath)) {
          try {
            const od = resolveOneDriveConfig(config)
            const { OneDriveService } = require("../services/onedrive")
            const oneDriveService = new OneDriveService({ clientId: od.clientId, clientSecret: od.clientSecret, tenantId: od.tenantId })
            const { users, oneDriveAuth } = require("../db/schema")
            const { eq } = require("drizzle-orm")
            // 管理员令牌
            const adminAuth = await db
              .select({ id: oneDriveAuth.id, accessToken: oneDriveAuth.accessToken, refreshToken: oneDriveAuth.refreshToken, expiresAt: oneDriveAuth.expiresAt })
              .from(oneDriveAuth)
              .innerJoin(users, eq(oneDriveAuth.userId, users.id))
              .where(eq(users.role, 'admin'))
              .get()
            if (adminAuth) {
              let accessToken = adminAuth.accessToken
              if (adminAuth.expiresAt <= Date.now()) {
                const refreshed = await oneDriveService.refreshToken(adminAuth.refreshToken)
                accessToken = refreshed.accessToken
                await db.update(oneDriveAuth).set({ accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken, expiresAt: refreshed.expiresAt, updatedAt: Date.now() }).where(eq(oneDriveAuth.id, adminAuth.id))
              }
              oneDriveService.setAccessToken(accessToken)
              // 先按 itemId
              try {
                const directUrl = await oneDriveService.getDownloadUrl(file.storagePath)
                set.status = 302
                set.headers["Location"] = directUrl
                return
              } catch {}
              // 再按路径
              const { UserStorageStrategyService } = require("../services/user-storage-strategy")
              const { assignment } = await UserStorageStrategyService.getUserEffectiveStorageStrategy(file.userId)
              const fallbackPath = assignment ? `${assignment.userFolder}/${file.filename}` : `users/${file.userId}/${file.filename}`
              const directUrl = await oneDriveService.getDownloadUrlByPath(fallbackPath)
              set.status = 302
              set.headers["Location"] = directUrl
              return
            }
          } catch (e) {
            logger.warn(`本地文件不存在且 OneDrive 回退失败: ${file.storagePath}`, e)
          }
          logger.error(`本地文件不存在: ${file.storagePath}`)
          set.status = 404
          return { error: "File not found on storage" }
        }

        const fileBuffer = fs.readFileSync(file.storagePath)
        
        // 设置响应头，避免创建新的Response对象
        set.headers["Content-Type"] = file.mimeType || "application/octet-stream"
        set.headers["Content-Disposition"] = `attachment; filename=\"${encodeURIComponent(file.originalName)}\"`
        set.headers["Content-Length"] = file.size.toString()
        
        // 直接返回Buffer，让Elysia处理响应
        return fileBuffer
      }
    } catch (error) {
      logger.error("文件下载失败:", error)
      set.status = 500
      return { error: "Download failed" }
    }
  })
  // 文件直链访问路由（无需认证，可多次使用）
  .get("/direct/:filename", async ({ params, set, headers }) => {
    try {
      logger.debug(`使用直链访问文件: ${params.filename}`)

      // 查找直链记录
      const linkRecord = await db
        .select()
        .from(fileDirectLinks)
        .where(eq(fileDirectLinks.directName, params.filename))
        .get()

      if (!linkRecord) {
        logger.warn(`直链文件未找到: ${params.filename}`)
        set.status = 404
        return { error: "Direct link not found" }
      }

      // 检查直链是否启用
      if (!linkRecord.enabled) {
        logger.warn(`直链已禁用: ${params.filename}`)
        set.status = 403
        return { error: "Direct link disabled" }
      }

      // 检查IP是否被封禁
      const clientIP = getClientIP(headers)
      const isIPBanned = await IPBanService.isIPBanned(clientIP, linkRecord.id)

      if (isIPBanned) {
        logger.warn(`IP已被封禁，拒绝访问: ${clientIP} - 直链: ${params.filename}`)
        set.status = 403
        return { error: "Access denied: IP banned" }
      }

      // 获取文件信息
      const file = await db
        .select()
        .from(files)
        .where(eq(files.id, linkRecord.fileId))
        .get()

      if (!file) {
        logger.warn(`直链对应的文件未找到: ${linkRecord.fileId}`)
        set.status = 404
        return { error: "File not found" }
      }

      // 记录访问日志
      const userAgent = headers['user-agent'] || ''

      // 异步查询IP归属地信息
      IPLocationService.getIPLocation(clientIP).then(async (locationInfo) => {
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
        } catch (error) {
          logger.error('记录直链访问日志失败:', error)
        }
      }).catch(error => {
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

            logger.file('DIRECT_DOWNLOAD', file.originalName, file.size, true)
      logger.info(`文件直链访问: ${file.originalName} - 用户: ${linkRecord.userId} - 访问次数: ${linkRecord.accessCount + 1}`)
      
      // 检查文件是否存储在OneDrive挂载点中
      
      // 查找文件所在文件夹的OneDrive挂载点
      const oneDriveMount = await db
        .select()
        .from(oneDriveMountPoints)
        .where(and(
          eq(oneDriveMountPoints.folderId, file.folderId || ""),
          eq(oneDriveMountPoints.enabled, true)
        ))
        .get()

      if (oneDriveMount) {
        // 直链：文件存储在OneDrive挂载点中，使用管理员 OneDrive 账号下载（直链重定向）
        logger.debug(`直链文件存储在OneDrive挂载点中: ${oneDriveMount.mountName}`)
        try {
          const { users } = require("../db/schema")
          const { OneDriveService } = require("../services/onedrive")

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
            logger.error(`管理员OneDrive认证信息未找到`)
            set.status = 401
            return { error: "OneDrive not configured" }
          }

          // 刷新过期令牌
          let accessToken = adminAuth.accessToken
          if (adminAuth.expiresAt <= Date.now()) {
            try {
              const od = resolveOneDriveConfig(config)
              const oneDriveService = new OneDriveService({
                clientId: od.clientId,
                clientSecret: od.clientSecret,
                tenantId: od.tenantId,
              })
              const refreshed = await oneDriveService.refreshToken(adminAuth.refreshToken)
              accessToken = refreshed.accessToken
              await db.update(oneDriveAuth).set({
                accessToken: refreshed.accessToken,
                refreshToken: refreshed.refreshToken,
                expiresAt: refreshed.expiresAt,
                updatedAt: Date.now(),
              }).where(eq(oneDriveAuth.id, adminAuth.id))
              logger.info(`管理员OneDrive访问令牌刷新成功`)
            } catch (e) {
              logger.error(`管理员OneDrive访问令牌刷新失败`, e)
              set.status = 401
              return { error: "OneDrive access token expired, please re-authenticate in admin panel" }
            }
          }

          const storageService = new StorageService(config)
          storageService.setOneDriveAccessToken(accessToken)

          // 获取直链并重定向
          const downloadUrl = await storageService.getDownloadUrl(file.storagePath)
          set.status = 302
          set.headers["Location"] = downloadUrl
          return
        } catch (error) {
          logger.error("OneDrive直链文件下载失败:", error)
          set.status = 500
          return { error: "OneDrive download failed" }
        }
      }

      // 非OneDrive挂载点文件，根据文件记录优先选择策略
      const storageService = new StorageService(config)

      // 新增：依据用户“有效存储策略”决定直链分流，避免误判为本地
      const { UserStorageStrategyService } = require("../services/user-storage-strategy")
      const { assignment, strategy } = await UserStorageStrategyService.getUserEffectiveStorageStrategy(file.userId)
      const effectiveStorageType = (strategy?.type || file.storageType || config.storageType || "").toLowerCase()

      if (effectiveStorageType === "onedrive") {
        // OneDrive 存储：始终使用管理员令牌返回 Graph 直链
        try {
          const { users } = require("../db/schema")
          const { OneDriveService } = require("../services/onedrive")

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
            set.status = 401
            return { error: "OneDrive not configured" }
          }

          let accessToken = adminAuth.accessToken
          if (adminAuth.expiresAt <= Date.now()) {
            const od = resolveOneDriveConfig(config)
            const oneDriveService = new OneDriveService({ clientId: od.clientId, clientSecret: od.clientSecret, tenantId: od.tenantId })
            const refreshed = await oneDriveService.refreshToken(adminAuth.refreshToken)
            accessToken = refreshed.accessToken
            await db.update(oneDriveAuth).set({ accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken, expiresAt: refreshed.expiresAt, updatedAt: Date.now() }).where(eq(oneDriveAuth.id, adminAuth.id))
          }

          const od = resolveOneDriveConfig(config)
          const { OneDriveService: OD } = require("../services/onedrive")
          const svc = new OD({ clientId: od.clientId, clientSecret: od.clientSecret, tenantId: od.tenantId })
          svc.setAccessToken(accessToken)
          try {
            const directUrl = await svc.getDownloadUrl(file.storagePath)
            set.status = 302
            set.headers["Location"] = directUrl
            return
          } catch {
            const { UserStorageStrategyService } = require("../services/user-storage-strategy")
            const { assignment } = await UserStorageStrategyService.getUserEffectiveStorageStrategy(file.userId)
            const path = assignment ? `${assignment.userFolder}/${file.filename}` : `users/${file.userId}/${file.filename}`
            const directUrl = await svc.getDownloadUrlByPath(path)
            set.status = 302
            set.headers["Location"] = directUrl
            return
          }
        } catch (error) {
          logger.error("OneDrive直链生成失败:", error)
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

      // 其他（本地）存储：直接返回文件，若不存在可做 OneDrive 回退尝试
      const fs = await import("fs")
      const path = await import("path")

      if (!fs.existsSync(file.storagePath)) {
        try {
          const od = resolveOneDriveConfig(config)
          const { OneDriveService } = require("../services/onedrive")
          const oneDriveService = new OneDriveService({ clientId: od.clientId, clientSecret: od.clientSecret, tenantId: od.tenantId })
          const { users, oneDriveAuth } = require("../db/schema")
          const { eq } = require("drizzle-orm")
          const adminAuth = await db
            .select({ id: oneDriveAuth.id, accessToken: oneDriveAuth.accessToken, refreshToken: oneDriveAuth.refreshToken, expiresAt: oneDriveAuth.expiresAt })
            .from(oneDriveAuth)
            .innerJoin(users, eq(oneDriveAuth.userId, users.id))
            .where(eq(users.role, 'admin'))
            .get()
          if (adminAuth) {
            let accessToken = adminAuth.accessToken
            if (adminAuth.expiresAt <= Date.now()) {
              const refreshed = await oneDriveService.refreshToken(adminAuth.refreshToken)
              accessToken = refreshed.accessToken
              await db.update(oneDriveAuth).set({ accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken, expiresAt: refreshed.expiresAt, updatedAt: Date.now() }).where(eq(oneDriveAuth.id, adminAuth.id))
            }
            oneDriveService.setAccessToken(accessToken)
            try {
              const directUrl = await oneDriveService.getDownloadUrl(file.storagePath)
              set.status = 302
              set.headers["Location"] = directUrl
              return
            } catch {}
            const { UserStorageStrategyService } = require("../services/user-storage-strategy")
            const { assignment } = await UserStorageStrategyService.getUserEffectiveStorageStrategy(file.userId)
            const fallbackPath = assignment ? `${assignment.userFolder}/${file.filename}` : `users/${file.userId}/${file.filename}`
            const directUrl = await oneDriveService.getDownloadUrlByPath(fallbackPath)
            set.status = 302
            set.headers["Location"] = directUrl
            return
          }
        } catch (e) {
          logger.warn(`本地文件不存在且 OneDrive 回退失败: ${file.storagePath}`, e)
        }
        logger.error(`本地文件不存在: ${file.storagePath}`)
        set.status = 404
        return { error: "File not found on storage" }
      }

      const fileBuffer = fs.readFileSync(file.storagePath)

      // 设置响应头，避免创建新的Response对象
      set.headers["Content-Type"] = file.mimeType || "application/octet-stream"
      set.headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(file.originalName)}"`
      set.headers["Content-Length"] = file.size.toString()

      // 直接返回Buffer，让Elysia处理响应
      return fileBuffer
    } catch (error) {
      logger.error("文件直链访问失败:", error)
      set.status = 500
      return { error: "Direct link access failed" }
    }
  })
