import { Elysia, t } from "elysia"
import { db } from "../../db"
import { storageConfig, oneDriveAuth } from "../../db/schema"
import { logger } from "../../utils/logger"
import { eq } from "drizzle-orm"
import { OneDriveService } from "../../services/onedrive"

export const onedriveAuthRoutes = new Elysia()
	.get("/onedrive/auth-url", async (ctx) => {
		const { query, set } = ctx as any
		try {
			const { redirectUri } = query as { redirectUri?: string }
			if (!redirectUri) {
				set.status = 400
				return { error: "Missing redirectUri parameter" }
			}
			logger.debug(`รับ URL การตรวจสอบสิทธิ์ OneDrive: ${redirectUri}`)
			const config = await db.select().from(storageConfig).get()
			if (!config || !config.oneDriveClientId || !config.oneDriveTenantId) {
				set.status = 400
				return { error: "OneDrive not configured" }
			}
			const oneDriveService = new OneDriveService({
				clientId: config.oneDriveClientId,
				clientSecret: config.oneDriveClientSecret || '',
				tenantId: config.oneDriveTenantId,
			})
			const authUrl = oneDriveService.getAuthUrl(redirectUri)
			logger.info(`สร้าง URL การตรวจสอบสิทธิ์ OneDrive สำเร็จแล้ว`)
			return { authUrl }
		} catch (error) {
			logger.error("ไม่สามารถรับ URL การตรวจสอบสิทธิ์ OneDrive ได้:", error)
			set.status = 500
			return { error: "Failed to get OneDrive auth URL" }
		}
	}, { query: t.Object({ redirectUri: t.String() }) })
	.post("/onedrive/callback", async (ctx) => {
		const { body, user, set } = ctx as any
		try {
			const { code, redirectUri } = body
			logger.info(`การจัดการการโทรกลับการตรวจสอบสิทธิ์ OneDrive: ผู้ใช้ ${user.userId}`)
			const config = await db.select().from(storageConfig).get()
			if (!config || !config.oneDriveClientId || !config.oneDriveTenantId) {
				set.status = 400
				return { error: "OneDrive not configured" }
			}
			const oneDriveService = new OneDriveService({
				clientId: config.oneDriveClientId,
				clientSecret: config.oneDriveClientSecret || '',
				tenantId: config.oneDriveTenantId,
			})
			const tokenData = await oneDriveService.getTokenFromCode(code, redirectUri)
			const existingAuth = await db
				.select()
				.from(oneDriveAuth)
				.where(eq(oneDriveAuth.userId, user.userId))
				.get()
			const authId = existingAuth?.id || crypto.randomUUID?.() || `${Date.now()}`
			const now = Date.now()
			if (existingAuth) {
				await db
					.update(oneDriveAuth)
					.set({
						accessToken: tokenData.accessToken,
						refreshToken: tokenData.refreshToken,
						expiresAt: tokenData.expiresAt,
						scope: tokenData.scope || 'Files.ReadWrite.All',
						updatedAt: now,
					})
					.where(eq(oneDriveAuth.id, authId))
			} else {
				await db.insert(oneDriveAuth).values({
					id: authId,
					userId: user.userId,
					accessToken: tokenData.accessToken,
					refreshToken: tokenData.refreshToken,
					expiresAt: tokenData.expiresAt,
					scope: tokenData.scope || 'Files.ReadWrite.All',
					createdAt: now,
					updatedAt: now,
				})
			}
			logger.database('UPSERT', 'onedrive_auth')
			logger.info(`การตรวจสอบสิทธิ์ OneDrive สำเร็จ: ผู้ใช้ ${user.userId}`)
			return { message: "OneDrive authentication successful" }
		} catch (error) {
			logger.error("การประมวลผลการเรียกกลับการตรวจสอบสิทธิ์ OneDrive ล้มเหลว:", error)
			set.status = 500
			return { error: "OneDrive authentication failed" }
		}
	}, { body: t.Object({ code: t.String(), redirectUri: t.String() }) })
	.get("/onedrive/status", async (ctx) => {
		const { user } = ctx as any
		try {
			logger.debug(`ตรวจสอบสถานะการรับรองความถูกต้องของ OneDrive: ผู้ใช้ ${user.userId}`)
			let auth = await db
				.select()
				.from(oneDriveAuth)
				.where(eq(oneDriveAuth.userId, user.userId))
				.get()
			if (!auth) {
				return { connected: false, authenticated: false }
			}

			// 令牌过期或临近过期则自动刷新（5分钟阈值）
			const now = Date.now()
			const refreshThresholdMs = 5 * 60 * 1000
			let refreshed = false
			try {
				const config = await db.select().from(storageConfig).get()
				const shouldRefresh = auth.expiresAt <= now + refreshThresholdMs
				if (shouldRefresh && config?.oneDriveClientId) {
					const svc = new OneDriveService({
						clientId: config.oneDriveClientId,
						clientSecret: config.oneDriveClientSecret || '',
						tenantId: config.oneDriveTenantId || 'common',
					})
					const newTokens = await svc.refreshToken(auth.refreshToken)
					await db
						.update(oneDriveAuth)
						.set({
							accessToken: newTokens.accessToken,
							refreshToken: newTokens.refreshToken,
							expiresAt: newTokens.expiresAt,
							updatedAt: now,
						})
						.where(eq(oneDriveAuth.id, auth.id))
					// 更新内存中的 auth 以供后续使用
					auth = { ...auth, accessToken: newTokens.accessToken, refreshToken: newTokens.refreshToken, expiresAt: newTokens.expiresAt, updatedAt: now }
					refreshed = true
					logger.info(`โทเค็นการเข้าถึง OneDrive รีเฟรชโดยอัตโนมัติ: ผู้ใช้ ${user.userId}`)
				}
			} catch (e) {
				logger.warn("การรีเฟรชโทเค็น OneDrive อัตโนมัติล้มเหลว:", e)
			}

			// 如果仍然过期则视为未连接
			const isExpiredNow = auth.expiresAt <= Date.now()
			if (isExpiredNow) {
				return { connected: false, authenticated: false, expiresAt: auth.expiresAt, scope: auth.scope, lastUpdated: auth.updatedAt, refreshed }
			}

			// 已连接：尝试获取 OneDrive 存储配额信息
			let storageInfo: { total: number; used: number; available: number } | undefined
			try {
				const config = await db.select().from(storageConfig).get()
				if (config?.oneDriveClientId) {
					const svc = new OneDriveService({
						clientId: config.oneDriveClientId,
						clientSecret: config.oneDriveClientSecret || '',
						tenantId: config.oneDriveTenantId || 'common',
					})
					svc.setAccessToken(auth.accessToken)
					const drive = await svc.getDriveInfo()
					const quota = drive?.quota || {}
					const total = Number(quota.total || 0)
					const used = Number(quota.used || 0)
					const available = typeof quota.remaining === 'number' ? Number(quota.remaining) : Math.max(total - used, 0)
					storageInfo = { total, used, available }
					logger.info(`ข้อมูลพื้นที่เก็บข้อมูล OneDrive: total=${total}, used=${used}, available=${available}`)
				}
			} catch (e) {
				logger.warn("ไม่สามารถรับข้อมูลพื้นที่เก็บข้อมูล OneDrive ได้:", e)
			}

			return { connected: true, authenticated: true, expiresAt: auth.expiresAt, scope: auth.scope, lastUpdated: auth.updatedAt, refreshed, storageInfo }
		} catch (error) {
			logger.error("การตรวจสอบสถานะการรับรองความถูกต้องของ OneDrive ล้มเหลว:", error)
			return { authenticated: false }
		}
	}) 