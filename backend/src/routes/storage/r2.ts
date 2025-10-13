import { Elysia, t } from "elysia"
import { db } from "../../db"
import { storageConfig } from "../../db/schema"
import { logger } from "../../utils/logger"
import { StorageService } from "../../services/storage"

export const r2Routes = new Elysia()
	.get("/r2/browse", async (ctx) => {
		const { query, set } = ctx as any
		try {
			const { prefix = "" } = query
			logger.debug(`เรียกดูแคตตาล็อก R2: ${prefix}`)
			const config = await db.select().from(storageConfig).get()
			if (!config || (!config.enableMixedMode && config.storageType !== "r2")) {
				set.status = 400
				return { error: "R2 storage not configured" }
			}
			const storageService = new StorageService(config)
			const result = await storageService.listR2Objects(prefix)
			logger.info(`การเรียกดูไดเรกทอรี R2 เสร็จสมบูรณ์: ${prefix}`)
			return result
		} catch (error) {
			logger.error("การเรียกดูไดเรกทอรี R2 ล้มเหลว:", error)
			set.status = 500
			return { error: "Failed to browse R2 directory" }
		}
	}, { query: t.Object({ prefix: t.Optional(t.String()) }) }) 