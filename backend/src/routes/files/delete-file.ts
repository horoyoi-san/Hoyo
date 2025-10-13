import { Elysia } from "elysia"
import { db } from "../../db"
import { files, storageConfig, oneDriveAuth, oneDriveMountPoints, folders } from "../../db/schema"
import { and, eq } from "drizzle-orm"
import { StorageService } from "../../services/storage"
import { OneDriveService } from "../../services/onedrive"
import { QuotaService } from "../../services/quota"
import { logger } from "../../utils/logger"

// 工具函数：检测是否为OneDrive文件ID
function isOneDriveFileId(id: string): boolean {
	// OneDrive文件ID通常包含感叹号，格式类似：20236B000B26DA17!s36871feb50624ea49a98f64de8d9c934
	return id.includes('!') && (id.includes('s') || id.includes('f'))
}

export const deleteFileRoutes = new Elysia()
	.delete("/:id", async (ctx) => {
		const { params, set } = ctx as any
		const { user } = ctx as any
		try {
			logger.debug(`请求删除文件: ${params.id} - 用户: ${user.userId}`)
			
			// 检查是否为OneDrive文件ID
			if (isOneDriveFileId(params.id)) {
				logger.info(`检测到OneDrive文件ID，使用Graph API删除: ${params.id}`)
				
				// 获取用户的OneDrive认证信息
				const auth = await db
					.select()
					.from(oneDriveAuth)
					.where(eq(oneDriveAuth.userId, user.userId))
					.get()
				
				if (!auth) {
					logger.warn(`OneDrive认证信息未找到 - 用户: ${user.userId}`)
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

						logger.info(`OneDrive访问令牌刷新成功 - 用户: ${user.userId}`)
					} catch (e) {
						logger.error(`OneDrive访问令牌刷新失败 - 用户: ${user.userId}`, e)
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
					// 先获取文件信息以便日志记录
					let fileName = "unknown"
					let fileSize = 0
					try {
						const fileInfo = await oneDriveService.getItemById(params.id)
						fileName = fileInfo.name || "unknown"
						fileSize = fileInfo.size || 0
					} catch (e) {
						logger.warn(`无法获取OneDrive文件信息: ${params.id}`)
					}

					// 删除OneDrive文件
					await oneDriveService.deleteItem(params.id)
					
					logger.file('DELETE', fileName, fileSize, true)
					logger.info(`OneDrive文件删除成功: ${fileName} (${params.id}) - 用户: ${user.userId}`)
					
					return { message: "OneDrive file deleted successfully" }
				} catch (error) {
					logger.error(`OneDrive文件删除失败: ${params.id}`, error)
					logger.file('DELETE', 'unknown', 0, false, error instanceof Error ? error : undefined)
					set.status = 500
					return { error: "Failed to delete OneDrive file" }
				}
			}

			// 原有的本地文件删除逻辑
			const file = await db.select().from(files).where(and(eq(files.id, params.id), eq(files.userId, user.userId))).get()
			if (!file) {
				logger.warn(`删除失败，文件未找到: ${params.id} - 用户: ${user.userId}`)
				set.status = 404
				return { error: "File not found" }
			}
			const config = await db.select().from(storageConfig).get()
			if (!config) {
				logger.error("存储配置未找到")
				set.status = 500
				return { error: "Storage not configured" }
			}
			const storageService = new StorageService(config)
			await storageService.deleteFile(file.storagePath)
			logger.file('DELETE', file.originalName, file.size, true)
			await QuotaService.updateUserStorage(user.userId, -file.size)
			await db.delete(files).where(eq(files.id, params.id))
			logger.database('DELETE', 'files')
			logger.info(`文件删除成功: ${file.originalName} - 用户: ${user.userId}`)
			return { message: "File deleted successfully" }
		} catch (error) {
			logger.error("文件删除失败:", error)
			logger.file('DELETE', 'unknown', 0, false, error instanceof Error ? error : undefined)
			set.status = 500
			return { error: "Delete failed" }
		}
	}) 