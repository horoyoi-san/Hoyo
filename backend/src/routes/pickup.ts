import { Elysia } from "elysia"
import { db } from "../db"
import { files, fileShares } from "../db/schema"
import { eq, and } from "drizzle-orm"
import { logger } from "../utils/logger"

export const pickupRoutes = new Elysia({ prefix: "/pickup" })
  // 通过取件码获取文件信息（无需认证）
  .get("/:pickupCode", async ({ params, set }) => {
    try {
      logger.debug(`通过取件码查询文件: ${params.pickupCode}`)

      // 验证取件码格式
      if (!/^\d{6}$/.test(params.pickupCode)) {
        logger.warn(`取件码格式无效: ${params.pickupCode}`)
        set.status = 400
        return { error: "Invalid pickup code format" }
      }

      // 查找取件码对应的分享记录
      const shareRecord = await db
        .select()
        .from(fileShares)
        .where(and(
          eq(fileShares.pickupCode, params.pickupCode),
          eq(fileShares.enabled, true)
        ))
        .get()

      if (!shareRecord) {
        logger.warn(`取件码无效: ${params.pickupCode}`)
        set.status = 404
        return { error: "Pickup code not found" }
      }

      // 检查分享是否过期
      if (shareRecord.expiresAt && Date.now() > shareRecord.expiresAt) {
        logger.warn(`取件码已过期: ${params.pickupCode}`)
        set.status = 410
        return { error: "Pickup code expired" }
      }

      // 获取文件信息
      const file = await db
        .select()
        .from(files)
        .where(eq(files.id, shareRecord.fileId))
        .get()

      if (!file) {
        logger.warn(`取件码对应的文件未找到: ${shareRecord.fileId}`)
        set.status = 404
        return { error: "File not found" }
      }

      logger.info(`取件码查询成功: ${file.originalName} - 取件码: ${params.pickupCode}`)

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
          hasPickupCode: true,
          accessCount: shareRecord.accessCount,
          createdAt: shareRecord.createdAt,
          expiresAt: shareRecord.expiresAt,
          gatekeeper: shareRecord.gatekeeper,
          customInfo: shareRecord.gatekeeper ? {
            customFileName: shareRecord.customFileName,
            customFileExtension: shareRecord.customFileExtension,
            customFileSize: shareRecord.customFileSize
          } : null
        },
        shareToken: shareRecord.shareToken, // 用于后续下载
      }
    } catch (error) {
      logger.error("取件码查询失败:", error)
      set.status = 500
      return { error: "Pickup code lookup failed" }
    }
  })
