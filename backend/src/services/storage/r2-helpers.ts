import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { logger } from "../../utils/logger"

// 缓存结构与全局缓存（与原实现一致）
interface R2StorageCache {
	data: { totalSize: number; totalFiles: number; error?: string }
	timestamp: number
	ttl: number
}
const r2StorageCache = new Map<string, R2StorageCache>()

export interface R2Context {
	s3Client?: S3Client
	config: any
}

export function sanitizeR2Path(pathStr: string): string {
	return pathStr
		.replace(/[^\w\-_.\/\u4e00-\u9fff]/g, '_')
		.replace(/\/+/, '/')
		.replace(/^\//, '')
		.replace(/\/$/, '')
}

export async function uploadToR2(ctx: R2Context, file: File, filename: string): Promise<string> {
	if (!ctx.s3Client) throw new Error("R2 client not configured")
	const cleanFilename = sanitizeR2Path(filename)
	logger.debug(`上传文件到 R2: ${cleanFilename}`)
	const buffer = await file.arrayBuffer()
	const command = new PutObjectCommand({
		Bucket: ctx.config.r2Bucket,
		Key: cleanFilename,
		Body: new Uint8Array(buffer),
		ContentType: file.type || 'application/octet-stream',
	})
	await ctx.s3Client.send(command)
	logger.info(`文件成功上传到 R2: ${cleanFilename}`)
	return cleanFilename
}

export async function uploadToR2Direct(ctx: R2Context, file: File, r2Path: string): Promise<string> {
	if (!ctx.s3Client) throw new Error("R2 client not configured")
	if (!ctx.config.r2Bucket) throw new Error("R2 bucket not configured")
	if (!ctx.config.r2AccessKey || !ctx.config.r2SecretKey) throw new Error("R2 credentials not configured")
	const cleanPath = sanitizeR2Path(r2Path)
	logger.debug(`直接上传文件到 R2: ${cleanPath}`)
	logger.debug(`R2 配置 - Bucket: ${ctx.config.r2Bucket}, Endpoint: ${ctx.config.r2Endpoint}`)
	const buffer = await file.arrayBuffer()
	const command = new PutObjectCommand({
		Bucket: ctx.config.r2Bucket,
		Key: cleanPath,
		Body: new Uint8Array(buffer),
		ContentType: file.type || 'application/octet-stream',
	})
	await ctx.s3Client.send(command)
	logger.info(`文件成功直接上传到 R2: ${cleanPath}`)
	return cleanPath
}

export async function uploadFileToR2Mount(
	ctx: R2Context,
	file: File,
	filename: string,
	r2Path: string,
	targetFolderId: string,
	currentFolderId: string,
	calculateRelativePath: (mountFolderId: string, targetFolderId: string) => Promise<string>
): Promise<string> {
	if (!ctx.s3Client) throw new Error("R2 client not configured")
	let relativePath = ""
	if (currentFolderId !== targetFolderId) {
		relativePath = await calculateRelativePath(targetFolderId, currentFolderId)
	}
	const fullR2Path = r2Path ? (relativePath ? `${r2Path}/${relativePath}/${filename}` : `${r2Path}/${filename}`) : (relativePath ? `${relativePath}/${filename}` : filename)
	logger.debug(`上传文件到 R2 挂载点: ${fullR2Path}`)
	const buffer = await file.arrayBuffer()
	const command = new PutObjectCommand({
		Bucket: ctx.config.r2Bucket,
		Key: fullR2Path,
		Body: new Uint8Array(buffer),
		ContentType: file.type,
	})
	await ctx.s3Client.send(command)
	logger.info(`文件成功上传到 R2 挂载点: ${fullR2Path}`)
	return fullR2Path
}

export async function listR2Objects(ctx: R2Context, prefix: string = ""): Promise<{ files: any[]; folders: string[]; folderCounts: Record<string, { files: number; folders: number }> }> {
	if (!ctx.s3Client) throw new Error("R2 client not configured")
	if (prefix === "/") prefix = ""
	const normalizedPrefix = prefix ? (prefix.endsWith('/') ? prefix : `${prefix}/`) : ""
	logger.debug(`浏览 R2 目录: ${normalizedPrefix || "根目录"}`)
	const command = new ListObjectsV2Command({ Bucket: ctx.config.r2Bucket, Prefix: normalizedPrefix, Delimiter: "/" })
	const response = await ctx.s3Client.send(command)
	const files = (response.Contents || [])
		.filter(obj => obj.Key && obj.Key !== normalizedPrefix && !(obj.Key!.slice(normalizedPrefix.length).includes('/')))
		.map(obj => ({ key: obj.Key || "", size: obj.Size || 0, lastModified: obj.LastModified || new Date(), etag: obj.ETag || "" }))
	const folders = (response.CommonPrefixes || []).map(p => p.Prefix || "").filter(p => p !== "")
	logger.info(`R2 目录 ${normalizedPrefix || "根目录"} 包含 ${files.length} 个文件和 ${folders.length} 个文件夹`)
	const folderCounts: Record<string, { files: number; folders: number }> = {}
	folders.forEach(f => { folderCounts[f] = { files: 0, folders: 0 } })
	try {
		const listAllCommand = new ListObjectsV2Command({ Bucket: ctx.config.r2Bucket, Prefix: normalizedPrefix })
		const allObjectsResponse = await ctx.s3Client.send(listAllCommand)
		const allObjects = allObjectsResponse.Contents || []
		const folderSet = new Set(folders)
		allObjects.forEach(obj => {
			if (!obj.Key || obj.Key === normalizedPrefix) return
			const relativePath = obj.Key.slice(normalizedPrefix.length)
			const parts = relativePath.split('/')
			if (parts.length <= 1) return
			let currentPath = normalizedPrefix
			for (let i = 0; i < parts.length - 1; i++) {
				if (!parts[i]) continue
				const folderPath = currentPath + parts[i] + '/'
				if (folderSet.has(folderPath)) {
					if (!folderCounts[folderPath]) folderCounts[folderPath] = { files: 0, folders: 0 }
					folderCounts[folderPath].files++
					break
				}
				currentPath = folderPath
			}
		})
		folders.forEach(folder => {
			const subFolders = folders.filter(f => f !== folder && f.startsWith(folder))
			if (folderCounts[folder]) folderCounts[folder].folders = subFolders.length
		})
		logger.debug(`已计算文件夹项目数量: ${JSON.stringify(folderCounts)}`)
	} catch (error) {
		logger.error('计算文件夹项目数量时出错:', error)
	}
	return { files, folders, folderCounts }
}

export async function getR2PublicUrl(ctx: R2Context, key: string): Promise<string> {
	if (!ctx.s3Client) throw new Error("R2 client not configured")
	const command = new GetObjectCommand({ Bucket: ctx.config.r2Bucket, Key: key })
	const url = await getSignedUrl(ctx.s3Client, command, { expiresIn: 3600 })
	logger.info(`生成 R2 公共下载链接: ${key}`)
	return url
}

export async function getR2DownloadUrl(ctx: R2Context, storagePath: string): Promise<string> {
	if (!ctx.s3Client) throw new Error("R2 client not configured")
	const command = new GetObjectCommand({ Bucket: ctx.config.r2Bucket, Key: storagePath })
	const url = await getSignedUrl(ctx.s3Client, command, { expiresIn: 3600 })
	logger.info(`生成 R2 下载链接: ${storagePath}`)
	return url
}

export async function r2DownloadFile(ctx: R2Context, storagePath: string): Promise<Buffer> {
	if (!ctx.s3Client) throw new Error("R2 client not configured")
	const command = new GetObjectCommand({ Bucket: ctx.config.r2Bucket, Key: storagePath })
	const response = await ctx.s3Client.send(command)
	if (!response.Body) throw new Error("Empty response body from R2")
	const chunks: Uint8Array[] = []
	if (response.Body instanceof ReadableStream) {
		const reader = response.Body.getReader()
		while (true) {
			const { done, value } = await reader.read()
			if (done) break
			chunks.push(value)
		}
	} else {
		const stream = response.Body as any
		for await (const chunk of stream) chunks.push(chunk)
	}
	const buffer = Buffer.concat(chunks)
	logger.info(`成功从 R2 下载文件: ${storagePath}, 大小: ${buffer.length} bytes`)
	return buffer
}

export async function calculateR2StorageUsage(ctx: R2Context, useCache: boolean = true): Promise<{ totalSize: number; totalFiles: number; error?: string; fromCache?: boolean }> {
	if (!ctx.s3Client) return { totalSize: 0, totalFiles: 0, error: "R2 client not configured" }
	const cacheKey = `${ctx.config.r2Bucket}_storage_usage`
	const cacheTTL = 5 * 60 * 1000
	if (useCache) {
		const cached = r2StorageCache.get(cacheKey)
		if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
			logger.debug("使用R2存储统计缓存数据")
			return { ...cached.data, fromCache: true }
		}
	}
	try {
		logger.debug("开始计算R2存储桶使用量")
		let totalSize = 0
		let totalFiles = 0
		let continuationToken: string | undefined
		do {
			const command = new ListObjectsV2Command({ Bucket: ctx.config.r2Bucket, ContinuationToken: continuationToken, MaxKeys: 1000 })
			const response = await ctx.s3Client.send(command)
			if (response.Contents) {
				for (const object of response.Contents) {
					if (object.Size) { totalSize += object.Size; totalFiles++ }
				}
			}
			continuationToken = response.NextContinuationToken
			if (response.Contents && response.Contents.length > 0) {
				logger.debug(`已处理 ${totalFiles} 个文件，当前总大小: ${totalSize} 字节`)
			}
		} while (continuationToken)
		logger.info(`R2存储桶使用量计算完成: ${totalFiles} 个文件，总大小: ${totalSize} 字节`)
		const result = { totalSize, totalFiles }
		if (useCache) {
			r2StorageCache.set(cacheKey, { data: result, timestamp: Date.now(), ttl: cacheTTL })
			logger.debug("R2存储统计数据已缓存")
		}
		return result
	} catch (error) {
		logger.error("计算R2存储桶使用量失败:", error)
		const errorResult = { totalSize: 0, totalFiles: 0, error: error instanceof Error ? error.message : "Unknown error" }
		if (useCache) {
			const cached = r2StorageCache.get(cacheKey)
			if (cached) {
				logger.warn("R2查询失败，使用过期缓存数据")
				return { ...cached.data, fromCache: true, error: `${errorResult.error} (using cached data)` }
			}
		}
		return errorResult
	}
}

export function clearR2StorageCache(ctx: R2Context): void {
	const cacheKey = `${ctx.config.r2Bucket}_storage_usage`
	r2StorageCache.delete(cacheKey)
	logger.debug("R2存储统计缓存已清除")
}

export async function getR2StorageStats(ctx: R2Context): Promise<{ totalSize: number; totalFiles: number; averageFileSize: number; largestFile: { key: string; size: number } | null; smallestFile: { key: string; size: number } | null; error?: string }> {
	if (!ctx.s3Client) return { totalSize: 0, totalFiles: 0, averageFileSize: 0, largestFile: null, smallestFile: null, error: "R2 client not configured" }
	try {
		logger.debug("开始获取R2存储桶详细统计")
		let totalSize = 0
		let totalFiles = 0
		let largestFile: { key: string; size: number } | null = null
		let smallestFile: { key: string; size: number } | null = null
		let continuationToken: string | undefined
		do {
			const command = new ListObjectsV2Command({ Bucket: ctx.config.r2Bucket, ContinuationToken: continuationToken, MaxKeys: 1000 })
			const response = await ctx.s3Client.send(command)
			if (response.Contents) {
				for (const object of response.Contents) {
					if (object.Size && object.Key) {
						totalSize += object.Size
						totalFiles++
						if (!largestFile || object.Size > largestFile.size) largestFile = { key: object.Key, size: object.Size }
						if (!smallestFile || object.Size < smallestFile.size) smallestFile = { key: object.Key, size: object.Size }
					}
				}
			}
			continuationToken = response.NextContinuationToken
		} while (continuationToken)
		const averageFileSize = totalFiles > 0 ? Math.round(totalSize / totalFiles) : 0
		logger.info(`R2存储桶详细统计完成: ${totalFiles} 个文件，总大小: ${totalSize} 字节，平均大小: ${averageFileSize} 字节`)
		return { totalSize, totalFiles, averageFileSize, largestFile, smallestFile }
	} catch (error) {
		logger.error("获取R2存储桶详细统计失败:", error)
		return { totalSize: 0, totalFiles: 0, averageFileSize: 0, largestFile: null, smallestFile: null, error: error instanceof Error ? error.message : "Unknown error" }
	}
} 