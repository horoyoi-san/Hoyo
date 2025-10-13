import { Elysia } from "elysia"
import { db } from "../../db"
import { files, fileDirectLinks, oneDriveAuth, storageConfig } from "../../db/schema"
import { and, eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getBaseUrl } from "../../utils/url"
import { OneDriveService } from "../../services/onedrive"
import { logger } from "../../utils/logger"

// 工具函数：检测是否为OneDrive文件ID
function isOneDriveFileId(id: string): boolean {
	// OneDrive文件ID通常包含感叹号，格式类似：20236B000B26DA17!s36871feb50624ea49a98f64de8d9c934
	return id.includes('!') && (id.includes('s') || id.includes('f'))
}

export const directLinkRoutes = new Elysia()
	.get("/:id/direct-link", async (ctx) => {
		const { params, set, headers } = ctx as any
		const { user } = ctx as any
		try {
			logger.debug(`รับลิงค์โดยตรงไปยังไฟล์: ${params.id} - ผู้ใช้: ${user.userId}`)
			
			// 检查是否为OneDrive文件ID
			if (isOneDriveFileId(params.id)) {
				logger.info(`ตรวจจับ ID ไฟล์ OneDrive และใช้ Graph API เพื่อรับข้อมูลไฟล์: ${params.id}`)
				
				// 获取ผู้ใช้的OneDrive认证信息
				const auth = await db
					.select()
					.from(oneDriveAuth)
					.where(eq(oneDriveAuth.userId, user.userId))
					.get()
				
				if (!auth) {
					logger.warn(`ไม่พบข้อมูลการรับรองความถูกต้องของ OneDrive - ผู้ใช้: ${user.userId}`)
					set.status = 400
					return { error: "OneDrive not authenticated" }
				}

				// 获取存储配置
				const config = await db.select().from(storageConfig).get()
				if (!config) {
					logger.error("ไม่พบการกำหนดค่าการจัดเก็บข้อมูล")
					set.status = 500
					return { error: "Storage not configured" }
				}

				// 检查访问令牌是否过期并刷新
				let accessToken = auth.accessToken
				if (auth.expiresAt <= Date.now()) {
					try {
						if (!config.oneDriveClientId) {
							set.status = 400
							return { error: "OneDrive OAuth not configured" }
						}

						const oneDriveService = new OneDriveService({
							clientId: config.oneDriveClientId,
							clientSecret: config.oneDriveClientSecret || "",
							tenantId: config.oneDriveTenantId || "common",
						})

						const newTokens = await oneDriveService.refreshToken(auth.refreshToken)
						accessToken = newTokens.accessToken

						// 更新数据库中的令牌
						await db.update(oneDriveAuth).set({
							accessToken: newTokens.accessToken,
							refreshToken: newTokens.refreshToken,
							expiresAt: newTokens.expiresAt,
							updatedAt: Date.now(),
						}).where(eq(oneDriveAuth.id, auth.id))

						logger.info(`โทเค็นการเข้าถึง OneDrive รีเฟรชสำเร็จแล้ว - ผู้ใช้: ${user.userId}`)
					} catch (e) {
						logger.error(`การรีเฟรชโทเค็นการเข้าถึง OneDrive ล้มเหลว - ผู้ใช้: ${user.userId}`, e)
						set.status = 401
						return { error: "OneDrive access token expired, please re-authenticate" }
					}
				}

				// 创建OneDrive服务实例并设置访问令牌
				const oneDriveService = new OneDriveService({
					clientId: config.oneDriveClientId!,
					clientSecret: config.oneDriveClientSecret || "",
					tenantId: config.oneDriveTenantId || "common",
				})
				oneDriveService.setAccessToken(accessToken)

				try {
					// 获取OneDrive文件信息
					const fileInfo = await oneDriveService.getItemById(params.id)
					if (!fileInfo || !fileInfo.name) {
						logger.warn(`ข้อมูลไฟล์ OneDrive ไม่ถูกต้อง: ${params.id}`)
						set.status = 404
						return { error: "OneDrive file not found" }
					}

					// 检查是否已有直链记录（使用OneDrive文件ID作为特殊标识）
					const existingDirectLink = await db
						.select()
						.from(fileDirectLinks)
						.where(eq(fileDirectLinks.fileId, params.id))
						.get()

					let directLink = existingDirectLink
					if (!directLink) {
						// 创建新的直链记录
						let directName = fileInfo.name
						let counter = 1
						// 确保直链名称唯一
						while (true) {
							const existing = await db
								.select()
								.from(fileDirectLinks)
								.where(eq(fileDirectLinks.directName, directName))
								.get()
							if (!existing) break
							
							const lastDotIndex = fileInfo.name.lastIndexOf('.')
							if (lastDotIndex > 0) {
								const nameWithoutExt = fileInfo.name.substring(0, lastDotIndex)
								const extension = fileInfo.name.substring(lastDotIndex)
								directName = `${nameWithoutExt}_${counter}${extension}`
							} else {
								directName = `${fileInfo.name}_${counter}`
							}
							counter++
						}

						const linkId = nanoid()
						const token = nanoid(32)
						const now = Date.now()

						// 为OneDrive文件创建直链记录
						await db.insert(fileDirectLinks).values({
							id: linkId,
							fileId: params.id, // 使用OneDrive文件ID
							userId: user.userId,
							directName,
							token,
							enabled: true,
							adminDisabled: false,
							accessCount: 0,
							createdAt: now,
							updatedAt: now,
						})

						directLink = {
							id: linkId,
							fileId: params.id,
							userId: user.userId,
							directName,
							token,
							enabled: true,
							adminDisabled: false,
							accessCount: 0,
							createdAt: now,
							updatedAt: now
						}

						logger.info(`สร้างลิงก์โดยตรงไปยังไฟล์ OneDrive: ${fileInfo.name} -> ${directName} - ผู้ใช้: ${user.userId}`)
					}

					// 确保directLink不为null
					if (!directLink) {
						throw new Error("Failed to create or retrieve direct link")
					}

					const baseUrl = getBaseUrl(headers)
					const directUrl = `${baseUrl}/dl/${directLink.directName}?token=${directLink.token}`
					
					return {
						directUrl,
						enabled: directLink.enabled,
						accessCount: directLink.accessCount,
						createdAt: directLink.createdAt
					}
				} catch (error) {
					logger.error(`ไม่สามารถรับลิงก์โดยตรงไปยังไฟล์ OneDrive ได้: ${params.id}`, error)
					set.status = 500
					return { error: "Failed to get OneDrive file direct link" }
				}
			}

			// 原有的本地文件直链逻辑
			const file = await db.select().from(files).where(and(eq(files.id, params.id), eq(files.userId, user.userId))).get()
			if (!file) {
				logger.warn(`ไม่พบไฟล์: ${params.id} - ผู้ใช้: ${user.userId}`)
				set.status = 404
				return { error: "File not found" }
			}
			let directLink = await db.select().from(fileDirectLinks).where(eq(fileDirectLinks.fileId, file.id)).get()
			if (!directLink) {
				let directName = file.originalName
				let counter = 1
				while (true) {
					const existing = await db.select().from(fileDirectLinks).where(eq(fileDirectLinks.directName, directName)).get()
					if (!existing) break
					const lastDotIndex = file.originalName.lastIndexOf('.')
					if (lastDotIndex > 0) {
						const nameWithoutExt = file.originalName.substring(0, lastDotIndex)
						const extension = file.originalName.substring(lastDotIndex)
						directName = `${nameWithoutExt}_${counter}${extension}`
					} else {
						directName = `${file.originalName}_${counter}`
					}
					counter++
				}
				const linkId = nanoid()
				const token = nanoid(32)
				const now = Date.now()
				await db.insert(fileDirectLinks).values({
					id: linkId,
					fileId: file.id,
					userId: user.userId,
					directName,
					token,
					enabled: true,
					adminDisabled: false,
					accessCount: 0,
					createdAt: now,
					updatedAt: now,
				})
				directLink = { id: linkId, fileId: file.id, userId: user.userId, directName, token, enabled: true, adminDisabled: false, accessCount: 0, createdAt: now, updatedAt: now } as any
				logger.info(`สร้างลิงก์โดยตรงไปยังไฟล์: ${file.originalName} -> ${directName} - ผู้ใช้: ${user.userId}`)
			}
			const baseUrl = getBaseUrl(headers)
			const directUrl = `${baseUrl}/dl/${(directLink as any).directName}?token=${(directLink as any).token}`
			return { directUrl, enabled: (directLink as any).enabled, accessCount: (directLink as any).accessCount, createdAt: (directLink as any).createdAt }
		} catch (error) {
			logger.error("ไม่สามารถรับลิงก์ไฟล์โดยตรงได้:", error)
			set.status = 500
			return { error: "Get direct link failed" }
		}
	})
	.put("/:id/direct-link", async (ctx) => {
		const { params, set, body } = ctx as any
		const { user } = ctx as any
		try {
			logger.debug(`อัปเดตสถานะลิงก์ไฟล์โดยตรง: ${params.id} - ผู้ใช้: ${user.userId}`)
			
			// 检查是否为OneDrive文件ID
			if (isOneDriveFileId(params.id)) {
				// 对于OneDrive文件，直接通过fileId更新直链状态
				const { enabled } = body as { enabled: boolean }
				const result = await db.update(fileDirectLinks)
					.set({ enabled, updatedAt: Date.now() })
					.where(and(
						eq(fileDirectLinks.fileId, params.id),
						eq(fileDirectLinks.userId, user.userId)
					))
				
				logger.info(`อัปเดตสถานะลิงก์โดยตรงของไฟล์ OneDrive: ${params.id} - เปิดใช้งาน: ${enabled} - ผู้ใช้: ${user.userId}`)
				return { success: true, enabled }
			}

			// 原有的本地文件直链状态更新逻辑
			const file = await db.select().from(files).where(and(eq(files.id, params.id), eq(files.userId, user.userId))).get()
			if (!file) {
				logger.warn(`ไม่พบไฟล์: ${params.id} - ผู้ใช้: ${user.userId}`)
				set.status = 404
				return { error: "File not found" }
			}
			const { enabled } = body as { enabled: boolean }
			await db.update(fileDirectLinks).set({ enabled, updatedAt: Date.now() }).where(and(eq(fileDirectLinks.fileId, file.id), eq(fileDirectLinks.userId, user.userId)))
			logger.info(`อัปเดตสถานะลิงก์ไฟล์โดยตรง: ${file.originalName} - เปิดใช้งาน: ${enabled} - ผู้ใช้: ${user.userId}`)
			return { success: true, enabled }
		} catch (error) {
			logger.error("ไม่สามารถอัปเดตสถานะลิงก์โดยตรงของไฟล์ได้:", error)
			set.status = 500
			return { error: "Update direct link failed" }
		}
	}) 