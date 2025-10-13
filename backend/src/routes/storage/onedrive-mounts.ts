import { Elysia, t } from "elysia"
import { db } from "../../db"
import { oneDriveMountPoints } from "../../db/schema"
import { logger } from "../../utils/logger"
import { and, eq } from "drizzle-orm"

export const onedriveMountRoutes = new Elysia()
	.get("/onedrive/mounts", async (ctx) => {
		const { user } = ctx as any
		try {
			logger.debug(`获取OneDrive挂载点: 用户 ${user.userId}`)
			const mounts = await db.select().from(oneDriveMountPoints).where(eq(oneDriveMountPoints.userId, user.userId)).all()
			logger.info(`返回 ${mounts.length} 个OneDrive挂载点`)
			return { mounts }
		} catch (error) {
			logger.error("获取OneDrive挂载点失败:", error)
			return { mounts: [] }
		}
	})
	.post("/onedrive/mount", async (ctx) => {
		const { body, user, set } = ctx as any
		try {
			const { folderId, oneDrivePath, oneDriveItemId, mountName } = body
			logger.info(`创建OneDrive挂载点: ${mountName}`)
			if (!folderId || !mountName?.trim()) {
				set.status = 400
				return { error: "缺少必填字段" }
			}
			const existingMount = await db
				.select()
				.from(oneDriveMountPoints)
				.where(eq(oneDriveMountPoints.mountName, mountName.trim()))
				.get()
			if (existingMount) {
				set.status = 400
				return { error: "挂载点名称已存在" }
			}
			const mountId = crypto.randomUUID?.() || `${Date.now()}`
			const now = Date.now()
			await db.insert(oneDriveMountPoints).values({
				id: mountId,
				userId: user.userId,
				folderId,
				oneDrivePath: oneDrivePath || "/",
				oneDriveItemId: oneDriveItemId || null,
				mountName: mountName.trim(),
				enabled: true,
				createdAt: now,
				updatedAt: now,
			})
			logger.database('INSERT', 'onedrive_mount_points')
			logger.info(`OneDrive挂载点创建成功: ${mountName}`)
			return { message: "OneDrive挂载点创建成功", mountId }
		} catch (error) {
			logger.error("创建OneDrive挂载点失败:", error)
			set.status = 500
			return { error: "创建挂载点失败" }
		}
	}, {
		body: t.Object({
			folderId: t.String(),
			oneDrivePath: t.Optional(t.String()),
			oneDriveItemId: t.Optional(t.String()),
			mountName: t.String(),
		}),
	})
	.delete("/onedrive/mounts/:id", async (ctx) => {
		const { params, user, set } = ctx as any
		try {
			const { id } = params
			logger.info(`删除OneDrive挂载点: ${id}`)
			const mount = await db
				.select()
				.from(oneDriveMountPoints)
				.where(and(eq(oneDriveMountPoints.id, id), eq(oneDriveMountPoints.userId, user.userId)))
				.get()
			if (!mount) {
				set.status = 404
				return { error: "挂载点不存在" }
			}
			await db.delete(oneDriveMountPoints).where(eq(oneDriveMountPoints.id, id))
			logger.database('DELETE', 'onedrive_mount_points')
			logger.info(`OneDrive挂载点删除成功: ${id}`)
			return { message: "挂载点删除成功" }
		} catch (error) {
			logger.error("删除OneDrive挂载点失败:", error)
			set.status = 500
			return { error: "删除挂载点失败" }
		}
	}) 