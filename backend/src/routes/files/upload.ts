import { Elysia, t } from "elysia"
import { nanoid } from "nanoid"
import { db } from "../../db"
import { files, folders, r2MountPoints, storageConfig } from "../../db/schema"
import { and, eq } from "drizzle-orm"
import { StorageService } from "../../services/storage"
import { UserStorageStrategyService } from "../../services/user-storage-strategy"
import { QuotaService } from "../../services/quota"
import { logger } from "../../utils/logger"

export const uploadRoutes = new Elysia()
	.post(
		"/upload",
		async (ctx) => {
			const { body, set } = ctx as any
			const { user } = ctx as any
			try {
				const { file, folderId, currentR2Path } = body as any
				if (!file || !(file instanceof File)) {
					logger.warn(`การอัพโหลดไฟล์ล้มเหลว: ผู้ใช้ ${user.userId} 未提供文件`)
					set.status = 400
					return { error: "No file provided" }
				}

				if (folderId) {
					const folder = await db
						.select()
						.from(folders)
						.where(and(eq(folders.id, folderId), eq(folders.userId, user.userId)))
						.get()
					if (!folder) {
						logger.warn(`文件夹不存在: ${folderId} - ผู้ใช้: ${user.userId}`)
						set.status = 404
						return { error: "Folder not found" }
					}
				}

				logger.info(`เริ่มอัพโหลดไฟล์: ${file.name} (${file.size} bytes) ไปที่โฟลเดอร์: ${folderId || "root"} - ผู้ใช้: ${user.userId}`)

				// 获取用户的存储策略
				const { assignment, strategy } = await UserStorageStrategyService.getUserEffectiveStorageStrategy(user.userId)
				
				let config: any
				let targetStorageType: string
				let userFolder = ""

				if (assignment && strategy) {
					// 使用用户分配的存储策略
					config = {
						...strategy.config,
						storageType: strategy.type
					}
					targetStorageType = strategy.type
					userFolder = assignment.userFolder
					logger.info(`การใช้นโยบายการจัดเก็บข้อมูลของผู้ใช้: ${strategy.name} (${strategy.type}) - โฟลเดอร์ผู้ใช้: ${userFolder}`)
				} else {
					// 回退到全局存储配置
					const globalConfig = await db.select().from(storageConfig).get()
					if (!globalConfig) {
						logger.error("ไม่พบการกำหนดค่าการจัดเก็บข้อมูล")
						set.status = 500
						return { error: "Storage not configured" }
					}
					config = globalConfig
					targetStorageType = globalConfig.storageType
					logger.info(`การใช้การกำหนดค่าการจัดเก็บข้อมูลทั่วโลก: ${targetStorageType}`)
				}

				let r2MountPoint: any = null
				if (folderId) {
					let currentFolderId: string | null | undefined = folderId
					while (currentFolderId) {
						const mountPoint = await db
							.select()
							.from(r2MountPoints)
							.where(and(
								eq(r2MountPoints.folderId, currentFolderId),
								eq(r2MountPoints.userId, user.userId),
								eq(r2MountPoints.enabled, true)
							))
							.get()
						if (mountPoint) {
							r2MountPoint = mountPoint
							targetStorageType = "r2"
							logger.info(`พบจุดติดตั้ง R2: ${mountPoint.mountName} -> ${mountPoint.r2Path}`)
							break
						}
						const parentFolder = await db
							.select({ parentId: folders.parentId })
							.from(folders)
							.where(eq(folders.id, currentFolderId))
							.get()
						currentFolderId = parentFolder?.parentId
					}
				}

				const quotaCheck = await QuotaService.checkUserQuota(user.userId, file.size)
				if (!quotaCheck.allowed) {
					logger.warn(`ผู้ใช้ ${user.userId} โควต้าไม่เพียงพอ: ความต้องการ ${file.size} ไบต์, มีอยู่ ${quotaCheck.availableSpace} ไบต์`)
					set.status = 413
					return { 
						error: "เกินขีดจำกัดโควต้าแล้ว กรุณาลบไฟล์หรือติดต่อผู้ดูแลระบบเพื่อขอโควต้าเพิ่ม", 
						details: {
							fileSize: file.size,
							currentUsed: quotaCheck.currentUsed,
							maxStorage: quotaCheck.maxStorage,
							availableSpace: quotaCheck.availableSpace
						}
					}
				}

				const storageService = new StorageService(config)
				const fileId = nanoid()
				// OneDrive 使用原始文件名保存，其他存储仍使用带前缀的唯一名
				const isOneDrive = targetStorageType === "onedrive"
				const filename = isOneDrive ? file.name : `${fileId}-${file.name}`

				let storagePath: string
				if (targetStorageType === "r2" && r2MountPoint) {
					// R2挂载点逻辑保持不变
					let targetR2Path = currentR2Path || r2MountPoint.r2Path
					const fullR2Path = targetR2Path ? `${targetR2Path}/${filename}` : filename
					const r2Config = { ...config, storageType: "r2" as const }
					const r2StorageService = new StorageService(r2Config)
					storagePath = await r2StorageService.uploadToR2Direct(file, fullR2Path)
					logger.info(`อัพโหลดไฟล์ไปยังจุดเชื่อมต่อ R2: ${r2MountPoint.mountName} -> ${fullR2Path}`)
					logger.info(`เส้นทาง R2 ปัจจุบัน: ${currentR2Path || 'หากไม่ได้ระบุ จะใช้เส้นทางจุดเชื่อมต่อ'}`)
				} else if (userFolder && targetStorageType !== "local") {
					// 使用用户专属文件夹上传到远程存储
					const userFilePath = `${userFolder}/${filename}`
					storagePath = await storageService.uploadFileToUserFolder(file, userFilePath, user.userId)
					logger.info(`อัปโหลดไฟล์ไปยังโฟลเดอร์เฉพาะผู้ใช้: ${userFolder}/${filename}`)
				} else {
					// 默认上传逻辑
					storagePath = await storageService.uploadFile(file, filename, user.userId)
				}
				logger.file('UPLOAD', file.name, file.size, true)

				await QuotaService.updateUserStorage(user.userId, file.size)

				await db.insert(files).values({
					id: fileId,
					userId: user.userId,
					folderId: folderId || null,
					filename,
					originalName: file.name,
					size: file.size,
					mimeType: file.type,
					storageType: targetStorageType,
					storagePath,
					createdAt: Date.now(),
				})

				return { message: "File uploaded successfully", file: {
					id: fileId,
					filename,
					originalName: file.name,
					size: file.size,
					mimeType: file.type,
					folderId: folderId || null,
				}}
			} catch (error) {
				logger.error("การอัพโหลดไฟล์ล้มเหลว:", error)
				logger.file('UPLOAD', (body as any)?.file?.name || 'unknown', (body as any)?.file?.size, false, error instanceof Error ? error : undefined)
				set.status = 500
				return { error: "Upload failed" }
			}
		},
		{
			body: t.Object({
				file: t.File(),
				folderId: t.Optional(t.String()),
				currentR2Path: t.Optional(t.String()),
			}),
		}
	) 