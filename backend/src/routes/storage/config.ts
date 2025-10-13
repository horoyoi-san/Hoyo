import { Elysia, t } from "elysia"
import { db } from "../../db"
import { storageConfig } from "../../db/schema"
import { logger } from "../../utils/logger"
import { eq } from "drizzle-orm"

export const configRoutes = new Elysia()
	.get("/config", async () => {
		logger.debug("获取存储配置")
		const config = await db.select().from(storageConfig).get()
		logger.info(`存储配置查询完成: ${config?.storageType || "local"}`)
		return {
			config: {
				storageType: config?.storageType || "local",
				r2Endpoint: config?.r2Endpoint || "",
				r2Bucket: config?.r2Bucket || "",
				r2AccessKey: (config as any)?.r2AccessKey || "",
				r2SecretKey: (config as any)?.r2SecretKey || "",
				oneDriveClientId: config?.oneDriveClientId || "",
				oneDriveTenantId: config?.oneDriveTenantId || "",
				oneDriveWebDavUrl: (config as any)?.oneDriveWebDavUrl || "",
				oneDriveWebDavUser: (config as any)?.oneDriveWebDavUser || "",
				oneDriveWebDavPass: (config as any)?.oneDriveWebDavPass || "",
				enableMixedMode: config?.enableMixedMode || false,
			},
		}
	})
	.put(
		"/config",
		async (ctx) => {
			const { body, set } = ctx as any
			try {
				const { storageType, r2Endpoint, r2AccessKey, r2SecretKey, r2Bucket, oneDriveClientId, oneDriveClientSecret, oneDriveTenantId, oneDriveWebDavUrl, oneDriveWebDavUser, oneDriveWebDavPass, enableMixedMode } = body
				logger.info(`更新存储配置: ${storageType}, 混合模式: ${enableMixedMode}`)
				logger.debug("存储配置详情:", { storageType, r2Endpoint, r2Bucket, oneDriveClientId, oneDriveTenantId, enableMixedMode, oneDriveWebDavUrl })
				const existingConfig = await db.select().from(storageConfig).get()
				if (existingConfig) {
					await db
						.update(storageConfig)
						.set({
							storageType,
							r2Endpoint,
							r2AccessKey,
							r2SecretKey,
							r2Bucket,
							oneDriveClientId,
							oneDriveClientSecret,
							oneDriveTenantId,
							oneDriveWebDavUrl,
							oneDriveWebDavUser,
							oneDriveWebDavPass,
							enableMixedMode: enableMixedMode || false,
							updatedAt: Date.now(),
						} as any)
						.where(eq(storageConfig.id, 1))
				} else {
					await db.insert(storageConfig).values({
						id: 1,
						storageType,
						r2Endpoint,
						r2AccessKey,
						r2SecretKey,
						r2Bucket,
						oneDriveClientId,
						oneDriveClientSecret,
						oneDriveTenantId,
						oneDriveWebDavUrl,
						oneDriveWebDavUser,
						oneDriveWebDavPass,
						enableMixedMode: enableMixedMode || false,
						updatedAt: Date.now(),
					} as any)
				}
				logger.info(`存储配置更新成功: ${storageType}`)
				return { message: "Storage config updated successfully" }
			} catch (error) {
				logger.error("存储配置更新失败:", error)
				set.status = 500
				return { error: "Config update failed" }
			}
		},
		{
			body: t.Object({
				storageType: t.Union([t.Literal("local"), t.Literal("r2"), t.Literal("onedrive"), t.Literal("webdav")]),
				r2Endpoint: t.Optional(t.String()),
				r2AccessKey: t.Optional(t.String()),
				r2SecretKey: t.Optional(t.String()),
				r2Bucket: t.Optional(t.String()),
				oneDriveClientId: t.Optional(t.String()),
				oneDriveClientSecret: t.Optional(t.String()),
				oneDriveTenantId: t.Optional(t.String()),
				oneDriveWebDavUrl: t.Optional(t.String()),
				oneDriveWebDavUser: t.Optional(t.String()),
				oneDriveWebDavPass: t.Optional(t.String()),
				enableMixedMode: t.Optional(t.Boolean()),
			}),
		}
	) 