import { Elysia } from "elysia"
import { nanoid } from "nanoid"
import { db } from "../../db"
import { files, downloadTokens, storageConfig, oneDriveAuth } from "../../db/schema"
import { and, eq } from "drizzle-orm"
import { logger } from "../../utils/logger"
import { getBaseUrl } from "../../utils/url"
import { OneDriveService } from "../../services/onedrive"

export const downloadTokenRoutes = new Elysia()
	.get("/:id/download", async (ctx) => {
		const { params, set, headers } = ctx as any
		const { user } = ctx as any
		try {
			logger.debug(`请求下载令牌: ${params.id} - 用户: ${user.userId}`)
			const file = await db
				.select()
				.from(files)
				.where(and(eq(files.id, params.id), eq(files.userId, user.userId)))
				.get()
			if (!file) {
				// 本地未找到文件，尝试作为 OneDrive itemId 直接下载
				logger.warn(`文件未找到: ${params.id} - 用户: ${user.userId}，尝试按 OneDrive itemId 处理`)

				// 读取存储配置，确认已配置 OneDrive OAuth
				const config = await db.select().from(storageConfig).get()
				if (!config || !config.oneDriveClientId) {
					set.status = 404
					return { error: "File not found" }
				}

				// 获取用户 OneDrive 认证信息
				const auth = await db
					.select()
					.from(oneDriveAuth)
					.where(eq(oneDriveAuth.userId, user.userId))
					.get()

				if (!auth) {
					set.status = 401
					return { error: "OneDrive not authenticated" }
				}

				if (auth.expiresAt <= Date.now()) {
					set.status = 401
					return { error: "OneDrive access token expired, please re-authenticate" }
				}

				try {
					const oneDrive = new OneDriveService({
						clientId: config.oneDriveClientId,
						clientSecret: config.oneDriveClientSecret || "",
						tenantId: config.oneDriveTenantId || "common",
					})
					oneDrive.setAccessToken(auth.accessToken)

					// 直接获取 Graph 下载 URL（无需生成本地下载令牌）
					const downloadUrl = await oneDrive.getDownloadUrl(params.id)
					logger.info(`OneDrive直连下载URL生成成功: ${params.id}`)
					return { downloadUrl }
				} catch (err) {
					logger.error("获取OneDrive直连下载URL失败:", err)
					set.status = 404
					return { error: "File not found" }
				}
			}
			const tokenId = nanoid()
			const downloadToken = nanoid(32)
			const expiresAt = Date.now() + 5 * 60 * 1000
			await db.insert(downloadTokens).values({
				id: tokenId,
				fileId: file.id,
				userId: user.userId,
				token: downloadToken,
				used: false,
				usageCount: 0,
				maxUsage: 2,
				expiresAt,
				createdAt: Date.now(),
			})
			logger.info(`生成下载令牌: ${file.originalName} - 用户: ${user.userId} - 令牌: ${tokenId}`)
			const baseUrl = getBaseUrl(headers)
			const downloadUrl = `${baseUrl}/files/download/${downloadToken}`
			return { downloadUrl }
		} catch (error) {
			logger.error("生成下载令牌失败:", error)
			set.status = 500
			return { error: "Download token generation failed" }
		}
	}) 