import { Elysia } from "elysia"
import { db } from "../../db"
import { files, fileShares } from "../../db/schema"
import { and, eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { logger } from "../../utils/logger"
import { getFrontendUrl } from "../../utils/url"

export const shareCreateRoutes = new Elysia()
	.post("/:id/share", async (ctx) => {
		const { params, set, headers, body } = ctx as any
		const { user } = ctx as any
		try {
			logger.debug(`创建文件分享: ${params.id} - 用户: ${user.userId}`)
			const file = await db
				.select()
				.from(files)
				.where(and(eq(files.id, params.id), eq(files.userId, user.userId)))
				.get()
			if (!file) {
				logger.warn(`文件未找到: ${params.id} - 用户: ${user.userId}`)
				set.status = 404
				return { error: "File not found" }
			}
			const { requireLogin, usePickupCode, expiresAt, gatekeeper, customFileName, customFileExtension, customFileSize } = body as any
			const shareId = nanoid()
			const now = Date.now()
			if (usePickupCode) {
				const pickupCode = Math.floor(100000 + Math.random() * 900000).toString()
				await db.insert(fileShares).values({
					id: shareId,
					fileId: file.id,
					userId: user.userId,
					shareToken: null,
					pickupCode,
					requireLogin,
					enabled: true,
					accessCount: 0,
					expiresAt: expiresAt,
					createdAt: now,
					updatedAt: now,
					gatekeeper: gatekeeper || false,
					customFileName: gatekeeper ? customFileName : null,
					customFileExtension: gatekeeper ? customFileExtension : null,
					customFileSize: gatekeeper ? customFileSize : null,
				})
				logger.info(`创建文件取件码: ${file.originalName} - 用户: ${user.userId} - 取件码: ${pickupCode}`)
				return { pickupCode, requireLogin, expiresAt, createdAt: now, usePickupCode: true }
			} else {
				const shareToken = nanoid(32)
				await db.insert(fileShares).values({
					id: shareId,
					fileId: file.id,
					userId: user.userId,
					shareToken,
					pickupCode: null,
					requireLogin,
					enabled: true,
					accessCount: 0,
					expiresAt: expiresAt,
					createdAt: now,
					updatedAt: now,
					gatekeeper: gatekeeper || false,
					customFileName: gatekeeper ? customFileName : null,
					customFileExtension: gatekeeper ? customFileExtension : null,
					customFileSize: gatekeeper ? customFileSize : null,
				})
				const frontendUrl = getFrontendUrl(headers)
				const shareUrl = `${frontendUrl}/share/${shareToken}`
				logger.info(`创建文件分享链接: ${file.originalName} - 用户: ${user.userId} - 分享ID: ${shareId}`)
				return { shareUrl, shareToken, requireLogin, expiresAt, createdAt: now, usePickupCode: false }
			}
		} catch (error) {
			logger.error("创建文件分享失败:", error)
			set.status = 500
			return { error: "Create share failed" }
		}
	}) 