import { Elysia } from "elysia"
import { db } from "../../db"
import { files, storageConfig } from "../../db/schema"
import { and, eq } from "drizzle-orm"
import { StorageService } from "../../services/storage"
import { QuotaService } from "../../services/quota"
import { logger } from "../../utils/logger"
import * as fs from "fs"
import * as path from "path"

export const contentRoutes = new Elysia()
	.get("/:id/content", async (ctx) => {
		const { params, set } = ctx as any
		const { user } = ctx as any
		try {
			logger.debug(`获取文件内容: ${params.id} - 用户: ${user.userId}`)
			const file = await db.select().from(files).where(and(eq(files.id, params.id), eq(files.userId, user.userId))).get()
			if (!file) {
				logger.warn(`文件未找到: ${params.id} - 用户: ${user.userId}`)
				set.status = 404
				return { error: "File not found" }
			}
			const ext = file.originalName.split('.').pop()?.toLowerCase() || ''
			const textExtensions = ['txt','md','json','js','ts','tsx','jsx','css','scss','sass','less','html','htm','xml','yaml','yml','ini','conf','config','log','sql','py','java','cpp','c','h','cs','php','rb','go','rs','sh','bash','bat','ps1','vue','svelte','astro','dockerfile','gitignore','env','toml','lock','makefile','cmake','gradle','properties','cfg','rc']
			const isTextFile = textExtensions.includes(ext) || file.mimeType.startsWith("text/") || file.mimeType === "application/json" || file.mimeType === "application/javascript" || file.mimeType === "application/xml"
			if (!isTextFile) {
				set.status = 400
				return { error: "File is not a text file" }
			}
			const config = await db.select().from(storageConfig).get()
			if (!config) {
				logger.error("存储配置未找到")
				set.status = 500
				return { error: "Storage not configured" }
			}
			try {
				const storageService = new StorageService(config)
				let content = ""
				if (config.storageType === "local") {
					const filePath = path.isAbsolute(file.storagePath) ? file.storagePath : path.join(process.cwd(), "uploads", file.storagePath)
					logger.debug(`尝试读取本地文件: ${filePath}`)
					if (fs.existsSync(filePath)) {
						content = fs.readFileSync(filePath, "utf8")
					} else {
						logger.error(`本地文件不存在: ${filePath}`)
						set.status = 404
						return { error: "File not found on storage" }
					}
				} else {
					logger.debug(`尝试从云存储下载文件: ${file.storagePath}`)
					const fileBuffer = await storageService.downloadFile(file.storagePath)
					content = fileBuffer.toString("utf8")
				}
				logger.info(`获取文件内容成功: ${file.originalName} - 用户: ${user.userId}, 内容长度: ${content.length}`)
				set.headers["Content-Type"] = "text/plain; charset=utf-8"
				return content
			} catch (error) {
				logger.error("读取文件内容失败:", error)
				set.status = 500
				return { error: "Failed to read file content" }
			}
		} catch (error) {
			logger.error("获取文件内容失败:", error)
			set.status = 500
			return { error: "Get file content failed" }
		}
	})
	.put("/:id/content", async (ctx) => {
		const { params, set, body } = ctx as any
		const { user } = ctx as any
		try {
			logger.debug(`保存文件内容: ${params.id} - 用户: ${user.userId}`)
			const file = await db.select().from(files).where(and(eq(files.id, params.id), eq(files.userId, user.userId))).get()
			if (!file) {
				logger.warn(`文件未找到: ${params.id} - 用户: ${user.userId}`)
				set.status = 404
				return { error: "File not found" }
			}
			const ext = file.originalName.split('.').pop()?.toLowerCase() || ''
			const textExtensions = ['txt','md','json','js','ts','tsx','jsx','css','scss','sass','less','html','htm','xml','yaml','yml','ini','conf','config','log','sql','py','java','cpp','c','h','cs','php','rb','go','rs','sh','bash','bat','ps1','vue','svelte','astro','dockerfile','gitignore','env','toml','lock','makefile','cmake','gradle','properties','cfg','rc']
			const isTextFile = textExtensions.includes(ext) || file.mimeType.startsWith("text/") || file.mimeType === "application/json" || file.mimeType === "application/javascript" || file.mimeType === "application/xml"
			if (!isTextFile) {
				set.status = 400
				return { error: "File is not a text file" }
			}
			const config = await db.select().from(storageConfig).get()
			if (!config) {
				logger.error("存储配置未找到")
				set.status = 500
				return { error: "Storage not configured" }
			}
			try {
				const content = typeof body === 'string' ? (body as any) : String(body)
				const contentBuffer = Buffer.from(content, 'utf8')
				
				const newSize = Buffer.byteLength(content, 'utf8')
				const oldSize = file.size
				const sizeChange = newSize - oldSize
				
				// 如果文件变大，检查配额
				if (sizeChange > 0) {
					const quotaCheck = await QuotaService.checkUserQuota(user.userId, sizeChange)
					if (!quotaCheck.allowed) {
						logger.warn(`用户 ${user.userId} 编辑文件配额不足: 需要额外 ${sizeChange} 字节, 可用 ${quotaCheck.availableSpace} 字节`)
						set.status = 413
						return { 
							error: "当前已超出配额限制，请删除文件或者联系管理员以获得更多的配额。",
							details: {
								sizeChange: sizeChange,
								currentUsed: quotaCheck.currentUsed,
								maxStorage: quotaCheck.maxStorage,
								availableSpace: quotaCheck.availableSpace
							}
						}
					}
				}
				
				const storageService = new StorageService(config)
				if (config.storageType === "local") {
					const filePath = path.join(process.cwd(), "uploads", file.storagePath)
					const dir = path.dirname(filePath)
					if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
					fs.writeFileSync(filePath, content, "utf8")
				} else {
					const fileObject = {
						name: file.originalName,
						type: file.mimeType,
						size: contentBuffer.length,
						lastModified: Date.now(),
						arrayBuffer: async () => contentBuffer.buffer.slice(contentBuffer.byteOffset, contentBuffer.byteOffset + contentBuffer.byteLength),
						stream: () => new ReadableStream({ start(controller) { controller.enqueue(contentBuffer); controller.close(); } }),
						text: async () => content
					} as File
					await storageService.uploadFile(fileObject, file.storagePath)
				}
				
				await db.update(files).set({ size: newSize, createdAt: Date.now() }).where(eq(files.id, params.id))
				if (sizeChange !== 0) {
					await QuotaService.updateUserStorage(user.userId, sizeChange)
					logger.info(`文件大小变化，更新配额: ${user.userId} - 变化: ${sizeChange} 字节`)
				}
				return { success: true, size: newSize, message: "File content saved successfully" }
			} catch (error) {
				logger.error("保存文件内容失败:", error)
				set.status = 500
				return { error: "Failed to save file content" }
			}
		} catch (error) {
			logger.error("保存文件内容失败:", error)
			set.status = 500
			return { error: "Save file content failed" }
		}
	}) 