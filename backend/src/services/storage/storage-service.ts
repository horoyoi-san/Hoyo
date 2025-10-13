import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { writeFile, unlink, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { logger } from "../../utils/logger"
import { OneDriveService } from "../onedrive"
import {
	uploadToR2,
	uploadToR2Direct,
	uploadFileToR2Mount as uploadFileToR2MountHelper,
	listR2Objects as listR2ObjectsHelper,
	getR2PublicUrl as getR2PublicUrlHelper,
	getR2DownloadUrl as getR2DownloadUrlHelper,
	r2DownloadFile as r2DownloadFileHelper,
	calculateR2StorageUsage as calculateR2StorageUsageHelper,
	clearR2StorageCache as clearR2StorageCacheHelper,
	getR2StorageStats as getR2StorageStatsHelper
} from "./r2-helpers"

export class StorageService {
	private s3Client?: S3Client
	private oneDriveService?: OneDriveService
	private config: any

	constructor(config: any) {
		this.config = config

		if ((config.storageType === "r2" || config.enableMixedMode) && config.r2Endpoint) {
			logger.debug(`初始化R2客户端 - Endpoint: ${config.r2Endpoint}, Bucket: ${config.r2Bucket}`)

			if (!config.r2AccessKey || !config.r2SecretKey) {
				logger.error("R2 Access Key 或 Secret Key 未配置")
				throw new Error("R2 credentials not configured")
			}

			this.s3Client = new S3Client({
				region: "auto",
				endpoint: config.r2Endpoint,
				credentials: {
					accessKeyId: config.r2AccessKey,
					secretAccessKey: config.r2SecretKey,
				},
				forcePathStyle: true,
			})

			logger.info("R2客户端初始化成功")
		}

		if ((config.storageType === "onedrive" || config.enableMixedMode) && (config.oneDriveClientId || config.clientId)) {
			this.oneDriveService = new OneDriveService({
				clientId: config.oneDriveClientId || config.clientId,
				clientSecret: config.oneDriveClientSecret || config.clientSecret,
				tenantId: config.oneDriveTenantId || config.tenantId,
			})
		}
	}

	// 设置OneDrive访问令牌
	setOneDriveAccessToken(accessToken: string) {
		if (this.oneDriveService) {
			this.oneDriveService.setAccessToken(accessToken)
		}
	}

	// 获取OneDrive服务实例
	getOneDriveService(): OneDriveService | undefined {
		return this.oneDriveService
	}

	// 规范化 OneDrive 路径，强制位于 /users 下
	private normalizeOneDriveFolderPath(folderPath: string): string {
		const withoutLeading = folderPath.startsWith("/") ? folderPath.slice(1) : folderPath
		if (withoutLeading.startsWith("users/")) {
			return "/" + withoutLeading
		}
		return "/users/" + withoutLeading
	}

	// 使用管理员OneDrive认证设置访问令牌（带自动刷新）
	private async useAdminOneDriveAuth(): Promise<void> {
		if (!this.oneDriveService) throw new Error("OneDrive service not configured")
		const { db } = require("../../db")
		const { oneDriveAuth, users } = require("../../db/schema")
		const { eq } = require("drizzle-orm")
		let adminAuth = await db
			.select({ id: oneDriveAuth.id, accessToken: oneDriveAuth.accessToken, refreshToken: oneDriveAuth.refreshToken, expiresAt: oneDriveAuth.expiresAt })
			.from(oneDriveAuth)
			.innerJoin(users, eq(oneDriveAuth.userId, users.id))
			.where(eq(users.role, 'admin'))
			.get()
		if (!adminAuth) throw new Error("管理员OneDrive认证信息未找到，请先在管理面板中完成OneDrive认证")
		if (adminAuth.expiresAt <= Date.now()) {
			logger.warn(`管理员OneDrive访问令牌已过期，开始自动刷新`)
			const refreshedTokens = await this.oneDriveService.refreshToken(adminAuth.refreshToken)
			await db.update(oneDriveAuth).set({ accessToken: refreshedTokens.accessToken, refreshToken: refreshedTokens.refreshToken, expiresAt: refreshedTokens.expiresAt, updatedAt: Date.now() }).where(eq(oneDriveAuth.id, adminAuth.id))
			adminAuth.accessToken = refreshedTokens.accessToken
			adminAuth.refreshToken = refreshedTokens.refreshToken
			adminAuth.expiresAt = refreshedTokens.expiresAt
			logger.info(`管理员OneDrive访问令牌刷新成功`)
		}
		this.oneDriveService.setAccessToken(adminAuth.accessToken)
		logger.debug(`已设置管理员OneDrive访问令牌(回退)`)
	}

	async uploadFile(file: File, filename: string, userId?: string): Promise<string> {
		logger.debug(`开始上传文件: ${filename} 到 ${this.config.storageType} 存储`)
		if (this.config.storageType === "r2" && this.s3Client) {
			return uploadToR2({ s3Client: this.s3Client, config: this.config }, file, filename)
		} else if (this.config.storageType === "onedrive" && this.oneDriveService) {
			return this.uploadToOneDrive(file, filename, userId)
		} else {
			return this.uploadToLocal(file, filename)
		}
	}

	// 上传文件到用户专属文件夹
	async uploadFileToUserFolder(file: File, userFilePath: string, userId?: string): Promise<string> {
		logger.debug(`开始上传文件到用户专属文件夹: ${userFilePath} (${this.config.storageType})`)
		if (this.config.storageType === "r2" && this.s3Client) {
			return uploadToR2Direct({ s3Client: this.s3Client, config: this.config }, file, userFilePath)
		} else if (this.config.storageType === "onedrive" && this.oneDriveService) {
			return this.uploadToOneDriveUserFolder(file, userFilePath, userId)
		} else if (this.config.storageType === "webdav") {
			return this.uploadToWebDAVUserFolder(file, userFilePath)
		} else {
			return this.uploadToLocalUserFolder(file, userFilePath)
		}
	}

	// 保持原有API：直接上传R2指定路径
	async uploadToR2Direct(file: File, r2Path: string): Promise<string> {
		if (!(this.config.storageType === "r2" && this.s3Client)) {
			throw new Error("R2 client not configured")
		}
		return uploadToR2Direct({ s3Client: this.s3Client, config: this.config }, file, r2Path)
	}

	// OneDrive用户文件夹上传（从原实现迁移）
	private async uploadToOneDriveUserFolder(file: File, userFilePath: string, userId?: string): Promise<string> {
		if (!this.oneDriveService) throw new Error("OneDrive service not configured")
		logger.debug(`上传文件到 OneDrive 用户文件夹: ${userFilePath}`)
		// 始终使用管理员 OneDrive 认证，确保之后下载也能通过管理员访问
		await this.useAdminOneDriveAuth()
		const pathParts = userFilePath.split('/')
		const filename = pathParts.pop() || file.name
		const folderPath = this.normalizeOneDriveFolderPath(pathParts.join('/'))
		logger.debug(`OneDrive 目标文件夹: ${folderPath}, 文件名: ${filename}`)
		await this.oneDriveService.ensureFolderExists(folderPath)
		const result = await this.oneDriveService.uploadFile(file, folderPath, filename)
		logger.info(`文件成功上传到 OneDrive（管理员账号）: ${folderPath}/${filename}`)
		return result.id
	}

	private async uploadToWebDAVUserFolder(_file: File, _userFilePath: string): Promise<string> {
		logger.warn("WebDAV用户文件夹上传功能尚未实现")
		throw new Error("WebDAV user folder upload not implemented yet")
	}

	private async uploadToLocalUserFolder(file: File, userFilePath: string): Promise<string> {
		logger.debug(`上传文件到本地用户文件夹: ${userFilePath}`)
		const uploadsDir = path.join(process.cwd(), "uploads")
		const fullPath = path.join(uploadsDir, userFilePath)
		const dirPath = path.dirname(fullPath)
		if (!existsSync(dirPath)) {
			await mkdir(dirPath, { recursive: true })
			logger.debug(`创建用户文件夹: ${dirPath}`)
		}
		const buffer = await file.arrayBuffer()
		await writeFile(fullPath, new Uint8Array(buffer))
		logger.info(`文件成功上传到本地用户文件夹: ${fullPath}`)
		return fullPath
	}

	async uploadFileToR2Mount(file: File, filename: string, r2Path: string, targetFolderId: string, currentFolderId: string): Promise<string> {
		if (!this.s3Client) throw new Error("R2 client not configured")
		return uploadFileToR2MountHelper(
			{ s3Client: this.s3Client, config: this.config },
			file,
			filename,
			r2Path,
			targetFolderId,
			currentFolderId,
			this.calculateRelativePath.bind(this)
		)
	}

	private async calculateRelativePath(_mountFolderId: string, _targetFolderId: string): Promise<string> {
		// TODO: 实现完整的文件夹路径计算逻辑
		return ""
	}

	private async uploadToLocal(file: File, filename: string): Promise<string> {
		logger.debug(`上传文件到本地存储: ${filename}`)
		const uploadsDir = path.join(process.cwd(), "uploads")
		if (!existsSync(uploadsDir)) {
			await mkdir(uploadsDir, { recursive: true })
			logger.debug(`创建上传目录: ${uploadsDir}`)
		}
		const filePath = path.join(uploadsDir, filename)
		const buffer = await file.arrayBuffer()
		await writeFile(filePath, new Uint8Array(buffer))
		logger.info(`文件成功上传到本地: ${filePath}`)
		return filePath
	}

	private async uploadToOneDrive(file: File, filename: string, userId?: string): Promise<string> {
		if (!this.oneDriveService) throw new Error("OneDrive service not configured")
		logger.debug(`上传文件到 OneDrive: ${filename}`)
		try {
			const { db } = require("../../db")
			const { oneDriveAuth, users } = require("../../db/schema")
			const { eq } = require("drizzle-orm")
			let adminAuth = await db
				.select({ id: oneDriveAuth.id, accessToken: oneDriveAuth.accessToken, refreshToken: oneDriveAuth.refreshToken, expiresAt: oneDriveAuth.expiresAt })
				.from(oneDriveAuth)
				.innerJoin(users, eq(oneDriveAuth.userId, users.id))
				.where(eq(users.role, 'admin'))
				.get()
			if (!adminAuth) throw new Error("管理员OneDrive认证信息未找到，请先在管理面板中完成OneDrive认证")
			if (adminAuth.expiresAt <= Date.now()) {
				logger.warn(`管理员OneDrive访问令牌已过期，开始自动刷新`)
				try {
					const refreshedTokens = await this.oneDriveService.refreshToken(adminAuth.refreshToken)
					const { oneDriveAuth } = require("../../db/schema")
					await db.update(oneDriveAuth).set({ accessToken: refreshedTokens.accessToken, refreshToken: refreshedTokens.refreshToken, expiresAt: refreshedTokens.expiresAt, updatedAt: Date.now() }).where(eq(oneDriveAuth.id, adminAuth.id))
					adminAuth.accessToken = refreshedTokens.accessToken
					adminAuth.refreshToken = refreshedTokens.refreshToken
					adminAuth.expiresAt = refreshedTokens.expiresAt
					logger.info(`管理员OneDrive访问令牌刷新成功`)
				} catch (refreshError) {
					logger.error(`刷新管理员OneDrive访问令牌失败:`, refreshError)
					throw new Error("管理员OneDrive访问令牌已过期且刷新失败，请重新认证")
				}
			}
			this.oneDriveService.setAccessToken(adminAuth.accessToken)
			logger.debug(`已设置管理员OneDrive访问令牌`)
		} catch (error) {
			logger.error(`获取管理员OneDrive访问令牌失败:`, error)
			throw error
		}
		let userFolder = "/"
		if (userId) {
			try {
				const { users } = require("../../db/schema")
				const { eq } = require("drizzle-orm")
				const { db } = require("../../db")
				const user = await db.select().from(users).where(eq(users.id, userId)).get()
				if (user) {
					userFolder = this.normalizeOneDriveFolderPath(`${user.email.replace('@', '_at_')}_${userId.slice(-8)}`)
					await this.oneDriveService.ensureFolderExists(userFolder)
					logger.info(`为用户创建/确认OneDrive专属文件夹: ${userFolder}`)
				}
			} catch (folderError) {
				logger.error(`创建用户专属文件夹失败，使用根目录:`, folderError)
				userFolder = "/users"
			}
		}
		const result = await this.oneDriveService.uploadFile(file, userFolder, filename)
		logger.info(`文件成功上传到 OneDrive 用户文件夹: ${userFolder}/${filename}`)
		return result.id
	}

	async getDownloadUrl(storagePath: string): Promise<string> {
		logger.debug(`生成下载链接: ${storagePath} (${this.config.storageType})`)
		if (this.config.storageType === "r2" && this.s3Client) {
			return getR2DownloadUrlHelper({ s3Client: this.s3Client, config: this.config }, storagePath)
		} else if (this.config.storageType === "onedrive" && this.oneDriveService) {
			const url = await this.oneDriveService.getDownloadUrl(storagePath)
			logger.info(`生成 OneDrive 下载链接: ${storagePath}`)
			return url
		} else {
			const url = `/api/files/serve/${path.basename(storagePath)}`
			logger.info(`生成本地下载链接: ${storagePath}`)
			return url
		}
	}

	async deleteFile(storagePath: string): Promise<void> {
		logger.debug(`删除文件: ${storagePath} (${this.config.storageType})`)
		if (this.config.storageType === "r2" && this.s3Client) {
			const command = new DeleteObjectCommand({ Bucket: this.config.r2Bucket, Key: storagePath })
			await this.s3Client.send(command)
			logger.info(`文件从 R2 删除成功: ${storagePath}`)
		} else if (this.config.storageType === "onedrive" && this.oneDriveService) {
			await this.useAdminOneDriveAuth()
			await this.oneDriveService.deleteItem(storagePath)
			logger.info(`文件从 OneDrive 删除成功: ${storagePath}`)
		} else {
			await unlink(storagePath)
			logger.info(`文件从本地删除成功: ${storagePath}`)
		}
	}

	async listR2Objects(prefix: string = ""): Promise<{ files: any[]; folders: string[]; folderCounts: Record<string, { files: number; folders: number }> }> {
		return listR2ObjectsHelper({ s3Client: this.s3Client, config: this.config }, prefix)
	}

	async getR2PublicUrl(key: string): Promise<string> {
		return getR2PublicUrlHelper({ s3Client: this.s3Client, config: this.config }, key)
	}

	async downloadFile(storagePath: string): Promise<Buffer> {
		logger.debug(`下载文件内容: ${storagePath} (${this.config.storageType})`)
		if (this.config.storageType === "r2" && this.s3Client) {
			return r2DownloadFileHelper({ s3Client: this.s3Client, config: this.config }, storagePath)
		} else if (this.config.storageType === "onedrive" && this.oneDriveService) {
			const buffer = await this.oneDriveService.downloadFile(storagePath)
			logger.info(`成功从 OneDrive 下载文件: ${storagePath}, 大小: ${buffer.length} bytes`)
			return buffer
		} else {
			const fs = await import("fs/promises")
			const filePath = path.isAbsolute(storagePath) ? storagePath : path.join(process.cwd(), "uploads", storagePath)
			const buffer = await fs.readFile(filePath)
			logger.info(`成功从本地读取文件: ${storagePath}, 大小: ${buffer.length} bytes`)
			return buffer
		}
	}

	async calculateR2StorageUsage(useCache: boolean = true): Promise<{ totalSize: number; totalFiles: number; error?: string; fromCache?: boolean }> {
		return calculateR2StorageUsageHelper({ s3Client: this.s3Client, config: this.config }, useCache)
	}

	clearR2StorageCache(): void {
		return clearR2StorageCacheHelper({ s3Client: this.s3Client, config: this.config })
	}

	async getR2StorageStats(): Promise<{ totalSize: number; totalFiles: number; averageFileSize: number; largestFile: { key: string; size: number } | null; smallestFile: { key: string; size: number } | null; error?: string }> {
		return getR2StorageStatsHelper({ s3Client: this.s3Client, config: this.config })
	}
}
