import { Elysia, t } from "elysia"
import { db } from "../../db"
import { oneDriveMountPoints } from "../../db/schema"
import { logger } from "../../utils/logger"
import { and, eq } from "drizzle-orm"

export const onedriveMountRoutes = new Elysia()
	.get("/onedrive/mounts", async (ctx) => {
		const { user } = ctx as any
		try {
			logger.debug(`รับจุดเชื่อมต่อ OneDrive: ผู้ใช้ ${user.userId}`)
			const mounts = await db.select().from(oneDriveMountPoints).where(eq(oneDriveMountPoints.userId, user.userId)).all()
			logger.info(`กลับ ${mounts.length} จุดเชื่อมต่อ OneDrive`)
			return { mounts }
		} catch (error) {
			logger.error("ไม่สามารถรับจุดเชื่อมต่อ OneDrive ได้:", error)
			return { mounts: [] }
		}
	})
	.post("/onedrive/mount", async (ctx) => {
		const { body, user, set } = ctx as any
		try {
			const { folderId, oneDrivePath, oneDriveItemId, mountName } = body
			logger.info(`สร้างจุดเชื่อมต่อ OneDrive: ${mountName}`)
			if (!folderId || !mountName?.trim()) {
				set.status = 400
				return { error: "ขาดข้อมูลที่จำเป็น" }
			}
			const existingMount = await db
				.select()
				.from(oneDriveMountPoints)
				.where(eq(oneDriveMountPoints.mountName, mountName.trim()))
				.get()
			if (existingMount) {
				set.status = 400
				return { error: "ชื่อจุดเชื่อมต่อมีอยู่แล้ว" }
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
			logger.info(`สร้างจุดเชื่อมต่อ OneDrive สำเร็จแล้ว: ${mountName}`)
			return { message: "สร้างจุดเชื่อมต่อ OneDrive สำเร็จแล้ว", mountId }
		} catch (error) {
			logger.error("ไม่สามารถสร้างจุดเชื่อมต่อ OneDrive ได้:", error)
			set.status = 500
			return { error: "ไม่สามารถสร้างจุดเชื่อมต่อได้" }
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
			logger.info(`ลบจุดเชื่อมต่อ OneDrive: ${id}`)
			const mount = await db
				.select()
				.from(oneDriveMountPoints)
				.where(and(eq(oneDriveMountPoints.id, id), eq(oneDriveMountPoints.userId, user.userId)))
				.get()
			if (!mount) {
				set.status = 404
				return { error: "จุดเชื่อมต่อไม่มีอยู่" }
			}
			await db.delete(oneDriveMountPoints).where(eq(oneDriveMountPoints.id, id))
			logger.database('DELETE', 'onedrive_mount_points')
			logger.info(`ลบจุดเชื่อมต่อ OneDrive สำเร็จแล้ว: ${id}`)
			return { message: "จุดเชื่อมต่อถูกลบสำเร็จแล้ว" }
		} catch (error) {
			logger.error("ไม่สามารถลบจุดเชื่อมต่อ OneDrive ได้:", error)
			set.status = 500
			return { error: "การลบจุดเชื่อมต่อล้มเหลว" }
		}
	}) 