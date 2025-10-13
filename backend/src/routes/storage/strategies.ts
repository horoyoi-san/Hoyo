import { Elysia, t } from "elysia"
import { db } from "../../db"
import { storageConfig, storageStrategies } from "../../db/schema"
import { logger } from "../../utils/logger"
import { and, eq } from "drizzle-orm"

export const strategiesRoutes = new Elysia()
	// 获取所有存储策略
	.get("/strategies", async (ctx) => {
		const { user } = ctx as any
		try {
			logger.debug(`รับนโยบายการจัดเก็บข้อมูลของผู้ใช้: ${user.userId}`)
			const strategies = await db.select().from(storageStrategies).all()
			const safeStrategies = strategies
				.map((strategy) => ({
					...strategy,
					config: JSON.parse(strategy.config),
					createdAt: new Date(strategy.createdAt).toISOString(),
					updatedAt: new Date(strategy.updatedAt).toISOString(),
				}))
				.map((strategy) => ({
					...strategy,
					config: {
						...strategy.config,
						r2SecretKey: strategy.config.r2SecretKey ? "***" : undefined,
						webDavPass: strategy.config.webDavPass ? "***" : undefined,
						oneDriveClientSecret: strategy.config.oneDriveClientSecret ? "***" : undefined,
					},
				}))
			logger.info(`กลับ ${safeStrategies.length} นโยบายการจัดเก็บข้อมูล`)
			return { strategies: safeStrategies }
		} catch (error) {
			logger.error("ไม่สามารถรับนโยบายการจัดเก็บข้อมูลได้:", error)
			return { strategies: [] }
		}
	})
	// 创建存储策略
	.post(
		"/strategies",
		async (ctx) => {
			const { body, set } = ctx as any
			try {
				const { name, type, config, clientSecret } = body
				logger.info(`การสร้างนโยบายการจัดเก็บข้อมูล: ${name} (${type})`)
				const existingStrategy = await db
					.select()
					.from(storageStrategies)
					.where(eq(storageStrategies.name, name))
					.get()
				if (existingStrategy) {
					set.status = 400
					return { error: "ชื่อนโยบายมีอยู่แล้ว" }
				}
				if (type === "r2") {
					if (!config.r2Endpoint || !config.r2Bucket || !config.r2AccessKey || !config.r2SecretKey) {
						set.status = 400
						return { error: "ข้อมูลการกำหนดค่า R2 ไม่สมบูรณ์" }
					}
				} else if (type === "onedrive") {
					if (!config.oneDriveClientId || !config.oneDriveTenantId || !clientSecret) {
						set.status = 400
						return { error: "ข้อมูลการกำหนดค่า OneDrive ไม่สมบูรณ์" }
					}
				} else if (type === "webdav") {
					if (!config.webDavUrl || !config.webDavUser || !config.webDavPass) {
						set.status = 400
						return { error: "ข้อมูลการกำหนดค่า WebDAV ไม่สมบูรณ์" }
					}
				}
				const strategyId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
				const now = Date.now()
				const strategyConfig = {
					...config,
					...(type === "onedrive" && clientSecret && { oneDriveClientSecret: clientSecret }),
				}
				await db.insert(storageStrategies).values({
					id: strategyId,
					name,
					type,
					config: JSON.stringify(strategyConfig),
					isActive: false,
					createdAt: now,
					updatedAt: now,
				})
				logger.database("INSERT", "storage_strategies")
				logger.info(`สร้างนโยบายการจัดเก็บข้อมูลสำเร็จแล้ว: ${name}`)
				return { message: "สร้างนโยบายการจัดเก็บข้อมูลสำเร็จแล้ว", strategyId }
			} catch (error) {
				logger.error("ไม่สามารถสร้างนโยบายการจัดเก็บข้อมูลได้:", error)
				set.status = 500
				return { error: "ไม่สามารถสร้างนโยบายการจัดเก็บข้อมูลได้" }
			}
		},
		{
			body: t.Object({
				name: t.String(),
				type: t.Union([t.Literal("local"), t.Literal("r2"), t.Literal("onedrive"), t.Literal("webdav")]),
				config: t.Object({
					r2Endpoint: t.Optional(t.String()),
					r2Bucket: t.Optional(t.String()),
					r2AccessKey: t.Optional(t.String()),
					r2SecretKey: t.Optional(t.String()),
					oneDriveClientId: t.Optional(t.String()),
					oneDriveTenantId: t.Optional(t.String()),
					webDavUrl: t.Optional(t.String()),
					webDavUser: t.Optional(t.String()),
					webDavPass: t.Optional(t.String()),
				}),
				clientSecret: t.Optional(t.String()),
			}),
		}
	)
	// 更新存储策略
	.put(
		"/strategies/:id",
		async (ctx) => {
			const { params, body, set } = ctx as any
			try {
				const { id } = params
				const { name, type, config, clientSecret } = body
				logger.info(`อัปเดตนโยบายการจัดเก็บข้อมูล: ${id}`)
				const existingStrategy = await db
					.select()
					.from(storageStrategies)
					.where(eq(storageStrategies.id, id))
					.get()
				if (!existingStrategy) {
					set.status = 404
					return { error: "นโยบายการจัดเก็บข้อมูลไม่มีอยู่" }
				}
				const duplicateStrategy = await db
					.select()
					.from(storageStrategies)
					.where(and(eq(storageStrategies.name, name), eq(storageStrategies.id, id)))
					.get()
				if (duplicateStrategy && duplicateStrategy.id !== id) {
					set.status = 400
					return { error: "ชื่อนโยบายมีอยู่แล้ว" }
				}
				if (type === "r2") {
					if (!config.r2Endpoint || !config.r2Bucket || !config.r2AccessKey || !config.r2SecretKey) {
						set.status = 400
						return { error: "ข้อมูลการกำหนดค่า R2 ไม่สมบูรณ์" }
					}
				} else if (type === "onedrive") {
					if (!config.oneDriveClientId || !config.oneDriveTenantId || !clientSecret) {
						set.status = 400
						return { error: "ข้อมูลการกำหนดค่า OneDrive ไม่สมบูรณ์" }
					}
				} else if (type === "webdav") {
					if (!config.webDavUrl || !config.webDavUser || !config.webDavPass) {
						set.status = 400
						return { error: "ข้อมูลการกำหนดค่า WebDAV ไม่สมบูรณ์" }
					}
				}
				const strategyConfig = {
					...config,
					...(type === "onedrive" && clientSecret && { oneDriveClientSecret: clientSecret }),
				}
				await db
					.update(storageStrategies)
					.set({
						name,
						type,
						config: JSON.stringify(strategyConfig),
						updatedAt: Date.now(),
					})
					.where(eq(storageStrategies.id, id))
				logger.database("UPDATE", "storage_strategies")
				logger.info(`อัปเดตนโยบายการจัดเก็บข้อมูลสำเร็จแล้ว: ${id}`)
				return { message: "อัปเดตนโยบายการจัดเก็บข้อมูลสำเร็จแล้ว" }
			} catch (error) {
				logger.error("ไม่สามารถอัปเดตนโยบายการจัดเก็บข้อมูลได้:", error)
				set.status = 500
				return { error: "ไม่สามารถอัปเดตนโยบายการจัดเก็บข้อมูลได้" }
			}
		},
		{
			body: t.Object({
				name: t.String(),
				type: t.Union([t.Literal("local"), t.Literal("r2"), t.Literal("onedrive"), t.Literal("webdav")]),
				config: t.Object({
					r2Endpoint: t.Optional(t.String()),
					r2Bucket: t.Optional(t.String()),
					r2AccessKey: t.Optional(t.String()),
					r2SecretKey: t.Optional(t.String()),
					oneDriveClientId: t.Optional(t.String()),
					oneDriveTenantId: t.Optional(t.String()),
					webDavUrl: t.Optional(t.String()),
					webDavUser: t.Optional(t.String()),
					webDavPass: t.Optional(t.String()),
				}),
				clientSecret: t.Optional(t.String()),
			}),
		}
	)
	// 删除存储策略
	.delete("/strategies/:id", async (ctx) => {
		const { params, set } = ctx as any
		try {
			const { id } = params
			logger.info(`การลบนโยบายการจัดเก็บข้อมูล: ${id}`)
			const strategy = await db
				.select()
				.from(storageStrategies)
				.where(eq(storageStrategies.id, id))
				.get()
			if (!strategy) {
				set.status = 404
				return { error: "นโยบายการจัดเก็บข้อมูลไม่มีอยู่" }
			}
			if (strategy.isActive) {
				set.status = 400
				return { error: "ไม่สามารถลบนโยบายการจัดเก็บข้อมูลที่ถูกเปิดใช้งานได้ โปรดเปลี่ยนไปใช้นโยบายอื่นก่อน" }
			}
			await db.delete(storageStrategies).where(eq(storageStrategies.id, id))
			logger.database("DELETE", "storage_strategies")
			logger.info(`ลบนโยบายการจัดเก็บข้อมูลสำเร็จแล้ว: ${id}`)
			return { message: "ลบนโยบายการจัดเก็บข้อมูลสำเร็จแล้ว" }
		} catch (error) {
			logger.error("ไม่สามารถลบนโยบายการจัดเก็บข้อมูลได้:", error)
			set.status = 500
			return { error: "ไม่สามารถลบนโยบายการจัดเก็บข้อมูลได้" }
		}
	})
	// 切换存储策略状态
	.put(
		"/strategies/:id/toggle",
		async (ctx) => {
			const { params, body, set } = ctx as any
			try {
				const { id } = params
				const { isActive } = body
				logger.info(`การเปลี่ยนสถานะนโยบายการจัดเก็บข้อมูล: ${id} -> ${isActive}`)
				const strategy = await db
					.select()
					.from(storageStrategies)
					.where(eq(storageStrategies.id, id))
					.get()
				if (!strategy) {
					set.status = 404
					return { error: "นโยบายการจัดเก็บข้อมูลไม่มีอยู่" }
				}
				if (isActive) {
					await db.update(storageStrategies).set({ isActive: false }).where(eq(storageStrategies.isActive, true))
				}
				await db
					.update(storageStrategies)
					.set({ isActive, updatedAt: Date.now() })
					.where(eq(storageStrategies.id, id))
				if (isActive) {
					try {
						const activeStrategy = JSON.parse(strategy.config)
						const existingConfig = await db.select().from(storageConfig).get()
						const configData = {
							storageType: strategy.type,
							r2Endpoint: activeStrategy.r2Endpoint || "",
							r2AccessKey: activeStrategy.r2AccessKey || "",
							r2SecretKey: activeStrategy.r2SecretKey || "",
							r2Bucket: activeStrategy.r2Bucket || "",
							oneDriveClientId: activeStrategy.oneDriveClientId || "",
							oneDriveClientSecret: activeStrategy.oneDriveClientSecret || "",
							oneDriveTenantId: activeStrategy.oneDriveTenantId || "",
							oneDriveWebDavUrl: activeStrategy.webDavUrl || "",
							oneDriveWebDavUser: activeStrategy.webDavUser || "",
							oneDriveWebDavPass: activeStrategy.webDavPass || "",
							enableMixedMode: false,
							updatedAt: Date.now(),
						}
						if (existingConfig) {
							await db.update(storageConfig).set(configData as any).where(eq(storageConfig.id, 1))
						} else {
							await db.insert(storageConfig).values({ id: 1, ...configData } as any)
						}
						logger.info(`การกำหนดค่าการจัดเก็บข้อมูลแบบซิงโครไนซ์: ${strategy.type}`)
					} catch (dbError) {
						logger.error("ไม่สามารถซิงโครไนซ์การกำหนดค่าการจัดเก็บข้อมูลได้:", dbError)
					}
				}
				logger.database("UPDATE", "storage_strategies")
				logger.info(`เปลี่ยนสถานะนโยบายการจัดเก็บข้อมูลสำเร็จแล้ว: ${id}`)
				return { message: "เปลี่ยนสถานะนโยบายการจัดเก็บข้อมูลสำเร็จแล้ว" }
			} catch (error) {
				logger.error("ไม่สามารถเปลี่ยนสถานะนโยบายการจัดเก็บข้อมูลได้:", error)
				set.status = 500
				return { error: "ไม่สามารถเปลี่ยนสถานะนโยบายการจัดเก็บข้อมูลได้" }
			}
		},
		{
			body: t.Object({ isActive: t.Boolean() }),
		}
	) 