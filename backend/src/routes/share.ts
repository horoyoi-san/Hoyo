import { Elysia } from "elysia"
import { jwt } from "@elysiajs/jwt"
import { bearer } from "@elysiajs/bearer"
import { db } from "../db"
import { files, storageConfig, fileShares, downloadTokens } from "../db/schema"
import { eq, and } from "drizzle-orm"
import { StorageService } from "../services/storage"
import { nanoid } from "nanoid"
import { logger } from "../utils/logger"
import { getBaseUrl } from "../utils/url"

export const shareRoutes = new Elysia({ prefix: "/share" })
  // 获取分享信息（无需认证）
  .get("/:token", async ({ params, set }) => {
    try {
      logger.debug(`获取分享信息: ${params.token}`)

      // 查找分享记录
      const shareRecord = await db
        .select()
        .from(fileShares)
        .where(eq(fileShares.shareToken, params.token))
        .get()

      if (!shareRecord) {
        logger.warn(`分享链接无效: ${params.token}`)
        set.status = 404
        return { error: "Share not found" }
      }

      // 检查分享是否启用
      if (!shareRecord.enabled) {
        logger.warn(`分享已禁用: ${params.token}`)
        set.status = 403
        return { error: "Share disabled" }
      }

      // 检查是否过期
      if (shareRecord.expiresAt && Date.now() > shareRecord.expiresAt) {
        logger.warn(`分享已过期: ${params.token}`)
        set.status = 410
        return { error: "Share expired" }
      }

      // 获取文件信息
      const file = await db
        .select()
        .from(files)
        .where(eq(files.id, shareRecord.fileId))
        .get()

      if (!file) {
        logger.warn(`分享对应的文件未找到: ${shareRecord.fileId}`)
        set.status = 404
        return { error: "File not found" }
      }

      logger.info(`获取分享信息成功: ${file.originalName} - 分享ID: ${shareRecord.id}`)

      // 如果启用了守门模式且有自定义信息，则使用自定义信息
      const displayFile = shareRecord.gatekeeper && (
        shareRecord.customFileName ||
        shareRecord.customFileExtension ||
        shareRecord.customFileSize !== null
      ) ? {
        id: file.id,
        originalName: shareRecord.customFileName || file.originalName,
        size: shareRecord.customFileSize !== null ? shareRecord.customFileSize : file.size,
        mimeType: shareRecord.customFileExtension ?
          `application/${shareRecord.customFileExtension}` : file.mimeType,
        createdAt: file.createdAt,
      } : {
        id: file.id,
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        createdAt: file.createdAt,
      }

      return {
        file: displayFile,
        share: {
          requireLogin: shareRecord.requireLogin,
          hasPickupCode: false, // 分享链接不使用取件码
          accessCount: shareRecord.accessCount,
          createdAt: shareRecord.createdAt,
          expiresAt: shareRecord.expiresAt,
          gatekeeper: shareRecord.gatekeeper,
          customInfo: shareRecord.gatekeeper ? {
            customFileName: shareRecord.customFileName,
            customFileExtension: shareRecord.customFileExtension,
            customFileSize: shareRecord.customFileSize
          } : null
        }
      }
    } catch (error) {
      logger.error("获取分享信息失败:", error)
      set.status = 500
      return { error: "Get share info failed" }
    }
  })
  // 下载分享文件
  .post("/:token/download", async ({ params, body, set, headers }) => {
    try {
      logger.debug(`下载分享文件: ${params.token}`)

      // 查找分享记录
      const shareRecord = await db
        .select()
        .from(fileShares)
        .where(eq(fileShares.shareToken, params.token))
        .get()

      if (!shareRecord) {
        logger.warn(`分享链接无效: ${params.token}`)
        set.status = 404
        return { error: "Share not found" }
      }

      // 检查分享是否启用
      if (!shareRecord.enabled) {
        logger.warn(`分享已禁用: ${params.token}`)
        set.status = 403
        return { error: "Share disabled" }
      }

      // 检查是否过期
      if (shareRecord.expiresAt && Date.now() > shareRecord.expiresAt) {
        logger.warn(`分享已过期: ${params.token}`)
        set.status = 410
        return { error: "Share expired" }
      }

      // 检查守门模式
      if (shareRecord.gatekeeper) {
        logger.warn(`分享启用了守门模式，禁止下载: ${params.token}`)
        set.status = 403
        return { error: "Download forbidden in gatekeeper mode" }
      }

      // 分享链接不需要验证取件码，直接允许下载

      // 获取文件信息
      const file = await db
        .select()
        .from(files)
        .where(eq(files.id, shareRecord.fileId))
        .get()

      if (!file) {
        logger.warn(`分享对应的文件未找到: ${shareRecord.fileId}`)
        set.status = 404
        return { error: "File not found" }
      }

      // 增加访问计数
      await db
        .update(fileShares)
        .set({ 
          accessCount: shareRecord.accessCount + 1,
          updatedAt: Date.now()
        })
        .where(eq(fileShares.id, shareRecord.id))

      // 生成一次性下载令牌
      const tokenId = nanoid()
      const downloadToken = nanoid(32)
      const expiresAt = Date.now() + 5 * 60 * 1000 // 5分钟过期

      await db.insert(downloadTokens).values({
        id: tokenId,
        fileId: file.id,
        userId: shareRecord.userId,
        token: downloadToken,
        used: false,
        usageCount: 0, // 初始使用次数为0
        maxUsage: 2,   // 允许使用2次
        expiresAt,
        createdAt: Date.now(),
      })

      logger.info(`生成分享文件下载令牌: ${file.originalName} - 分享ID: ${shareRecord.id}`)

      // 返回下载URL - 自动获取域名
      const baseUrl = getBaseUrl(headers)
      const downloadUrl = `${baseUrl}/files/download/${downloadToken}`

      return { downloadUrl }
    } catch (error) {
      logger.error("下载分享文件失败:", error)
      set.status = 500
      return { error: "Download share failed" }
    }
  })
