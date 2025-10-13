import { writeFile, unlink, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { logger } from "../../utils/logger"

export async function uploadToLocal(file: File, filename: string): Promise<string> {
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

export async function uploadToLocalUserFolder(file: File, userFilePath: string): Promise<string> {
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

export async function localDownloadFile(storagePath: string): Promise<Buffer> {
	const fs = await import("fs/promises")
	const filePath = path.isAbsolute(storagePath) ? storagePath : path.join(process.cwd(), "uploads", storagePath)
	const buffer = await fs.readFile(filePath)
	logger.info(`成功从本地读取文件: ${storagePath}, 大小: ${buffer.length} bytes`)
	return buffer
}

export async function deleteLocalFile(storagePath: string): Promise<void> {
	await unlink(storagePath)
	logger.info(`文件从本地删除成功: ${storagePath}`)
} 