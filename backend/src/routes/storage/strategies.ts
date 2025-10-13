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
			logger.debug(`获取用户存储策略: ${user.userId}`)
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
			logger.info(`返回 ${safeStrategies.length} 个存储策略`)
			return { strategies: safeStrategies }
		} catch (error) {
			logger.error("获取存储策略失败:", error)
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
				logger.info(`创建存储策略: ${name} (${type})`)
				const existingStrategy = await db
					.select()
					.from(storageStrategies)
					.where(eq(storageStrategies.name, name))
					.get()
				if (existingStrategy) {
					set.status = 400
					return { error: "策略名称已存在" }
				}
				if (type === "r2") {
					if (!config.r2Endpoint || !config.r2Bucket || !config.r2AccessKey || !config.r2SecretKey) {
						set.status = 400
						return { error: "R2 配置信息不完整" }
					}
				} else if (type === "onedrive") {
					if (!config.oneDriveClientId || !config.oneDriveTenantId || !clientSecret) {
						set.status = 400
						return { error: "OneDrive 配置信息不完整" }
					}
				} else if (type === "webdav") {
					if (!config.webDavUrl || !config.webDavUser || !config.webDavPass) {
						set.status = 400
						return { error: "WebDAV 配置信息不完整" }
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
				logger.info(`存储策略创建成功: ${name}`)
				return { message: "存储策略创建成功", strategyId }
			} catch (error) {
				logger.error("创建存储策略失败:", error)
				set.status = 500
				return { error: "创建存储策略失败" }
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
				logger.info(`更新存储策略: ${id}`)
				const existingStrategy = await db
					.select()
					.from(storageStrategies)
					.where(eq(storageStrategies.id, id))
					.get()
				if (!existingStrategy) {
					set.status = 404
					return { error: "存储策略不存在" }
				}
				const duplicateStrategy = await db
					.select()
					.from(storageStrategies)
					.where(and(eq(storageStrategies.name, name), eq(storageStrategies.id, id)))
					.get()
				if (duplicateStrategy && duplicateStrategy.id !== id) {
					set.status = 400
					return { error: "策略名称已存在" }
				}
				if (type === "r2") {
					if (!config.r2Endpoint || !config.r2Bucket || !config.r2AccessKey || !config.r2SecretKey) {
						set.status = 400
						return { error: "R2 配置信息不完整" }
					}
				} else if (type === "onedrive") {
					if (!config.oneDriveClientId || !config.oneDriveTenantId || !clientSecret) {
						set.status = 400
						return { error: "OneDrive 配置信息不完整" }
					}
				} else if (type === "webdav") {
					if (!config.webDavUrl || !config.webDavUser || !config.webDavPass) {
						set.status = 400
						return { error: "WebDAV 配置信息不完整" }
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
				logger.info(`存储策略更新成功: ${id}`)
				return { message: "存储策略更新成功" }
			} catch (error) {
				logger.error("更新存储策略失败:", error)
				set.status = 500
				return { error: "更新存储策略失败" }
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
			logger.info(`删除存储策略: ${id}`)
			const strategy = await db
				.select()
				.from(storageStrategies)
				.where(eq(storageStrategies.id, id))
				.get()
			if (!strategy) {
				set.status = 404
				return { error: "存储策略不存在" }
			}
			if (strategy.isActive) {
				set.status = 400
				return { error: "无法删除激活的存储策略，请先切换到其他策略" }
			}
			await db.delete(storageStrategies).where(eq(storageStrategies.id, id))
			logger.database("DELETE", "storage_strategies")
			logger.info(`存储策略删除成功: ${id}`)
			return { message: "存储策略删除成功" }
		} catch (error) {
			logger.error("删除存储策略失败:", error)
			set.status = 500
			return { error: "删除存储策略失败" }
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
				logger.info(`切换存储策略状态: ${id} -> ${isActive}`)
				const strategy = await db
					.select()
					.from(storageStrategies)
					.where(eq(storageStrategies.id, id))
					.get()
				if (!strategy) {
					set.status = 404
					return { error: "存储策略不存在" }
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
						logger.info(`存储配置已同步: ${strategy.type}`)
					} catch (dbError) {
						logger.error("同步存储配置失败:", dbError)
					}
				}
				logger.database("UPDATE", "storage_strategies")
				logger.info(`存储策略状态切换成功: ${id}`)
				return { message: "存储策略状态切换成功" }
			} catch (error) {
				logger.error("切换存储策略状态失败:", error)
				set.status = 500
				return { error: "切换存储策略状态失败" }
			}
		},
		{
			body: t.Object({ isActive: t.Boolean() }),
		}
	) 