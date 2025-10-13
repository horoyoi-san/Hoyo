import { Elysia } from "elysia"
import { db } from "../../db"
import { files } from "../../db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { logger } from "../../utils/logger"

export const listRoutes = new Elysia()
	.get("/", async (ctx) => {
		const { query } = ctx as any
		const { user } = ctx as any
		logger.debug(`获取用户文件列表: ${user.userId}`)
		let whereConditions = [eq(files.userId, user.userId)] as any[]
		if (query?.folderId !== undefined) {
			const folderId = query.folderId === "root" ? null : query.folderId
			whereConditions.push(
				folderId ? eq(files.folderId, folderId) : isNull(files.folderId)
			)
		}
		const userFiles = await db
			.select()
			.from(files)
			.where(and(...whereConditions))
		return { files: userFiles }
	}) 