import { Elysia } from "elysia"
import { db } from "../../db"
import { fileShares, files } from "../../db/schema"
import { and, eq } from "drizzle-orm"
import { logger } from "../../utils/logger"

export const sharesMgmtRoutes = new Elysia()
	.get("/shares", async (ctx) => {
		const { user, set } = ctx as any
		try {
			logger.debug(`รับรายชื่อการแชร์ของผู้ใช้: ${user.userId}`)
			const userShares = await db
				.select({
					id: fileShares.id,
					fileId: fileShares.fileId,
					shareToken: fileShares.shareToken,
					pickupCode: fileShares.pickupCode,
					requireLogin: fileShares.requireLogin,
					enabled: fileShares.enabled,
					adminDisabled: fileShares.adminDisabled,
					accessCount: fileShares.accessCount,
					expiresAt: fileShares.expiresAt,
					createdAt: fileShares.createdAt,
					updatedAt: fileShares.updatedAt,
					gatekeeper: fileShares.gatekeeper,
					customFileName: fileShares.customFileName,
					customFileExtension: fileShares.customFileExtension,
					customFileSize: fileShares.customFileSize,
					fileName: files.originalName,
					fileSize: files.size,
					fileMimeType: files.mimeType,
				})
				.from(fileShares)
				.innerJoin(files, eq(fileShares.fileId, files.id))
				.where(eq(fileShares.userId, user.userId))
				.orderBy(fileShares.createdAt)
			return { shares: userShares }
		} catch (error) {
			logger.error("ไม่สามารถรับรายชื่อการแชร์ของผู้ใช้ได้:", error)
			set.status = 500
			return { error: "Get shares failed" }
		}
	})
	.put("/shares/:shareId/status", async (ctx) => {
		const { params, user, set, body } = ctx as any
		try {
			logger.debug(`更新分享状态: ${params.shareId} - ผู้ใช้: ${user.userId}`)
			const { enabled } = body as { enabled: boolean }
			const shareRecord = await db.select().from(fileShares).where(and(eq(fileShares.id, params.shareId), eq(fileShares.userId, user.userId))).get()
			if (!shareRecord) {
				logger.warn(`ไม่พบบันทึกการแชร์: ${params.shareId} - ผู้ใช้: ${user.userId}`)
				set.status = 404
				return { error: "Share not found" }
			}
			// 管理员禁用时，ผู้ใช้不能启用
			if (shareRecord.adminDisabled && enabled) {
				set.status = 403
				return { error: "การแชร์นี้ถูกปิดใช้งานโดยผู้ดูแลระบบเนื่องจากมีการละเมิดและไม่สามารถเปิดใช้งานได้" }
			}
			await db.update(fileShares).set({ enabled, updatedAt: Date.now() }).where(eq(fileShares.id, params.shareId))
			logger.info(`อัปเดตสถานะการแชร์: ${params.shareId} - เปิดใช้งาน: ${enabled} - ผู้ใช้: ${user.userId}`)
			return { success: true, enabled }
		} catch (error) {
			logger.error("ไม่สามารถอัปเดตสถานะการแชร์ได้:", error)
			set.status = 500
			return { error: "Update share status failed" }
		}
	})
	.put("/shares/:shareId/expiry", async (ctx) => {
		const { params, user, set, body } = ctx as any
		try {
			logger.debug(`อัปเดตระยะเวลาการแชร์ที่ถูกต้อง: ${params.shareId} - ผู้ใช้: ${user.userId}`)
			const { expiresAt } = body as { expiresAt: number | null }
			const shareRecord = await db.select().from(fileShares).where(and(eq(fileShares.id, params.shareId), eq(fileShares.userId, user.userId))).get()
			if (!shareRecord) {
				logger.warn(`ไม่พบบันทึกการแชร์: ${params.shareId} - ผู้ใช้: ${user.userId}`)
				set.status = 404
				return { error: "Share not found" }
			}
			await db.update(fileShares).set({ expiresAt, updatedAt: Date.now() }).where(eq(fileShares.id, params.shareId))
			logger.info(`อัปเดตระยะเวลาการแชร์ที่ถูกต้อง: ${params.shareId} - ระยะเวลาใช้งาน: ${expiresAt} - ผู้ใช้: ${user.userId}`)
			return { success: true, expiresAt }
		} catch (error) {
			logger.error("ไม่สามารถอัปเดตระยะเวลาการแชร์ที่ถูกต้องได้:", error)
			set.status = 500
			return { error: "Update share expiry failed" }
		}
	})
	.delete("/shares/:shareId", async (ctx) => {
		const { params, user, set } = ctx as any
		try {
			logger.debug(`ลบ แชร์: ${params.shareId} - ผู้ใช้: ${user.userId}`)
			const shareRecord = await db.select().from(fileShares).where(and(eq(fileShares.id, params.shareId), eq(fileShares.userId, user.userId))).get()
			if (!shareRecord) {
				logger.warn(`ไม่พบบันทึกการแชร์: ${params.shareId} - ผู้ใช้: ${user.userId}`)
				set.status = 404
				return { error: "Share not found" }
			}
			await db.delete(fileShares).where(eq(fileShares.id, params.shareId))
			logger.info(`ลบ แชร์: ${params.shareId} - ผู้ใช้: ${user.userId}`)
			return { success: true }
		} catch (error) {
			logger.error("ไม่สามารถลบการแชร์ได้:", error)
			set.status = 500
			return { error: "Delete share failed" }
		}
	}) 