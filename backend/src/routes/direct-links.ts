import { Elysia } from "elysia"
import { jwt } from "@elysiajs/jwt"
import { bearer } from "@elysiajs/bearer"
import { db } from "../db"
import { fileDirectLinks, files, directLinkAccessLogs } from "../db/schema"
import { eq, desc, and, sql } from "drizzle-orm"
import { IPLocationService } from "../services/ip-location"
import { IPBanService } from "../services/ip-ban"
import { logger } from "../utils/logger"

export const directLinksRoutes = new Elysia({ prefix: "/direct-links" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET!,
    })
  )
  .use(bearer())
  .derive(async ({ bearer, jwt, set }) => {
    if (!bearer) {
      set.status = 401
      return { error: "Unauthorized" }
    }

    const payload = await jwt.verify(bearer)
    if (!payload) {
      set.status = 401
      return { error: "Invalid token" }
    }

    return {
      user: payload as { userId: string; role: string }
    }
  })
  // 获取用户的所有直链
  .get("/", async ({ user, set }) => {
    try {
      logger.debug(`获取用户直链列表: ${user.userId}`)

      const directLinks = await db
        .select({
          id: fileDirectLinks.id,
          fileId: fileDirectLinks.fileId,
          directName: fileDirectLinks.directName,
          token: fileDirectLinks.token,
          enabled: fileDirectLinks.enabled,
          adminDisabled: fileDirectLinks.adminDisabled,
          accessCount: fileDirectLinks.accessCount,
          createdAt: fileDirectLinks.createdAt,
          updatedAt: fileDirectLinks.updatedAt,
          fileName: files.originalName,
          fileSize: files.size,
          mimeType: files.mimeType,
        })
        .from(fileDirectLinks)
        .leftJoin(files, eq(fileDirectLinks.fileId, files.id))
        .where(eq(fileDirectLinks.userId, user.userId))
        .orderBy(desc(fileDirectLinks.createdAt))

      return {
        directLinks: directLinks.map(link => ({
          id: link.id,
          fileId: link.fileId,
          directName: link.directName,
          token: link.token,
          enabled: link.enabled,
          adminDisabled: link.adminDisabled,
          accessCount: link.accessCount,
          createdAt: link.createdAt,
          updatedAt: link.updatedAt,
          file: {
            name: link.fileName,
            size: link.fileSize,
            mimeType: link.mimeType,
          }
        }))
      }
    } catch (error) {
      logger.error("获取用户直链列表失败:", error)
      set.status = 500
      return { error: "Failed to get direct links" }
    }
  })
  // 获取指定直链的访问日志
  .get("/:linkId/logs", async ({ params, user, set, query }) => {
    try {
      const { linkId } = params
      const { page = "1", limit = "20" } = query as { page?: string; limit?: string }
      
      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      const offset = (pageNum - 1) * limitNum

      logger.debug(`获取直链访问日志: ${linkId} - 用户: ${user.userId}`)

      // 验证直链是否属于当前用户
      const directLink = await db
        .select()
        .from(fileDirectLinks)
        .where(and(eq(fileDirectLinks.id, linkId), eq(fileDirectLinks.userId, user.userId)))
        .get()

      if (!directLink) {
        logger.warn(`直链未找到或无权限: ${linkId} - 用户: ${user.userId}`)
        set.status = 404
        return { error: "Direct link not found" }
      }

      // 获取访问日志
      const logs = await db
        .select()
        .from(directLinkAccessLogs)
        .where(eq(directLinkAccessLogs.directLinkId, linkId))
        .orderBy(desc(directLinkAccessLogs.accessedAt))
        .limit(limitNum)
        .offset(offset)

      // 获取总数
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(directLinkAccessLogs)
        .where(eq(directLinkAccessLogs.directLinkId, linkId))
        .get()

      const total = totalResult?.count || 0

      return {
        logs: logs.map(log => ({
          id: log.id,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          location: {
            country: log.country,
            province: log.province,
            city: log.city,
            isp: log.isp,
          },
          accessedAt: log.accessedAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        }
      }
    } catch (error) {
      logger.error("获取直链访问日志失败:", error)
      set.status = 500
      return { error: "Failed to get access logs" }
    }
  })
  // 获取直链统计信息
  .get("/:linkId/stats", async ({ params, user, set }) => {
    try {
      const { linkId } = params

      logger.debug(`获取直链统计信息: ${linkId} - 用户: ${user.userId}`)

      // 验证直链是否属于当前用户
      const directLink = await db
        .select()
        .from(fileDirectLinks)
        .where(and(eq(fileDirectLinks.id, linkId), eq(fileDirectLinks.userId, user.userId)))
        .get()

      if (!directLink) {
        logger.warn(`直链未找到或无权限: ${linkId} - 用户: ${user.userId}`)
        set.status = 404
        return { error: "Direct link not found" }
      }

      // 获取访问统计
      const totalAccess = await db
        .select({ count: sql<number>`count(*)` })
        .from(directLinkAccessLogs)
        .where(eq(directLinkAccessLogs.directLinkId, linkId))
        .get()

      // 获取今日访问量
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTimestamp = today.getTime()

      const todayAccess = await db
        .select({ count: sql<number>`count(*)` })
        .from(directLinkAccessLogs)
        .where(and(
          eq(directLinkAccessLogs.directLinkId, linkId),
          // 使用时间戳比较，获取今日访问量
          sql`${directLinkAccessLogs.accessedAt} >= ${todayTimestamp}`
        ))
        .get()

      // 获取独立IP数量
      const uniqueIPs = await db
        .select({ ip: directLinkAccessLogs.ipAddress })
        .from(directLinkAccessLogs)
        .where(eq(directLinkAccessLogs.directLinkId, linkId))
        .groupBy(directLinkAccessLogs.ipAddress)

      // 获取最近访问记录
      const recentAccess = await db
        .select()
        .from(directLinkAccessLogs)
        .where(eq(directLinkAccessLogs.directLinkId, linkId))
        .orderBy(desc(directLinkAccessLogs.accessedAt))
        .limit(1)
        .get()

      logger.info(`获取直链统计信息成功: ${linkId}`)

      return {
        totalAccess: totalAccess?.count || 0,
        todayAccess: todayAccess?.count || 0,
        uniqueIPs: uniqueIPs.length,
        lastAccess: recentAccess?.accessedAt || null,
        enabled: directLink.enabled,
        createdAt: directLink.createdAt,
      }
    } catch (error) {
      logger.error("获取直链统计信息失败:", error)
      set.status = 500
      return { error: "Failed to get stats" }
    }
  })
  // 销毁直链
  .delete("/:linkId", async ({ params, user, set }) => {
    try {
      const { linkId } = params

      logger.debug(`销毁直链: ${linkId} - 用户: ${user.userId}`)

      // 验证直链是否属于当前用户
      const directLink = await db
        .select()
        .from(fileDirectLinks)
        .where(and(eq(fileDirectLinks.id, linkId), eq(fileDirectLinks.userId, user.userId)))
        .get()

      if (!directLink) {
        logger.warn(`直链未找到或无权限: ${linkId} - 用户: ${user.userId}`)
        set.status = 404
        return { error: "Direct link not found" }
      }

      // 删除直链记录（访问日志会通过外键级联删除）
      await db
        .delete(fileDirectLinks)
        .where(eq(fileDirectLinks.id, linkId))

      logger.info(`直链销毁成功: ${linkId} - 用户: ${user.userId}`)

      return { success: true, message: "Direct link destroyed successfully" }
    } catch (error) {
      logger.error("销毁直链失败:", error)
      set.status = 500
      return { error: "Failed to destroy direct link" }
    }
  })
  // 启用/禁用直链
  .put("/:linkId/toggle", async ({ params, user, body, set }) => {
    try {
      const { linkId } = params
      const { enabled } = body as { enabled: boolean }

      logger.debug(`切换直链状态: ${linkId} - 用户: ${user.userId} - 启用: ${enabled}`)

      // 验证直链是否属于当前用户
      const directLink = await db
        .select()
        .from(fileDirectLinks)
        .where(and(eq(fileDirectLinks.id, linkId), eq(fileDirectLinks.userId, user.userId)))
        .get()

      if (!directLink) {
        logger.warn(`直链未找到或无权限: ${linkId} - 用户: ${user.userId}`)
        set.status = 404
        return { error: "Direct link not found" }
      }

      // 如果被管理员禁用，普通用户不可启用
      if (directLink.adminDisabled && enabled) {
        set.status = 403
        return { error: "该直链因违规已被管理员禁用，无法启用" }
      }

      // 更新直链状态
      await db
        .update(fileDirectLinks)
        .set({
          enabled,
          updatedAt: Date.now()
        })
        .where(eq(fileDirectLinks.id, linkId))

      logger.info(`直链状态切换成功: ${linkId} - 启用: ${enabled}`)

      return { success: true, enabled }
    } catch (error) {
      logger.error("切换直链状态失败:", error)
      set.status = 500
      return { error: "Failed to toggle direct link" }
    }
  })
  // 封禁IP
  .post("/:linkId/ban-ip", async ({ params, user, body, set }) => {
    try {
      const { linkId } = params
      const { ipAddress, reason } = body as { ipAddress: string; reason?: string }

      logger.debug(`封禁IP: ${ipAddress} - 直链: ${linkId} - 用户: ${user.userId}`)

      // 验证直链是否属于当前用户
      const directLink = await db
        .select()
        .from(fileDirectLinks)
        .where(and(eq(fileDirectLinks.id, linkId), eq(fileDirectLinks.userId, user.userId)))
        .get()

      if (!directLink) {
        logger.warn(`直链未找到或无权限: ${linkId} - 用户: ${user.userId}`)
        set.status = 404
        return { error: "Direct link not found" }
      }

      // 执行IP封禁
      const banRecord = await IPBanService.banIP(user.userId, ipAddress, linkId, reason)

      logger.info(`IP封禁成功: ${ipAddress} - 直链: ${linkId}`)

      return {
        success: true,
        ban: {
          id: banRecord.id,
          ipAddress: banRecord.ipAddress,
          reason: banRecord.reason,
          createdAt: banRecord.createdAt
        }
      }
    } catch (error) {
      logger.error("封禁IP失败:", error)
      set.status = 500
      return { error: "Failed to ban IP" }
    }
  })
  // 解封IP
  .delete("/:linkId/ban-ip/:banId", async ({ params, user, set }) => {
    try {
      const { linkId, banId } = params

      logger.debug(`解封IP: ${banId} - 直链: ${linkId} - 用户: ${user.userId}`)

      // 验证直链是否属于当前用户
      const directLink = await db
        .select()
        .from(fileDirectLinks)
        .where(and(eq(fileDirectLinks.id, linkId), eq(fileDirectLinks.userId, user.userId)))
        .get()

      if (!directLink) {
        logger.warn(`直链未找到或无权限: ${linkId} - 用户: ${user.userId}`)
        set.status = 404
        return { error: "Direct link not found" }
      }

      // 执行IP解封
      const success = await IPBanService.unbanIP(banId, user.userId)

      if (!success) {
        set.status = 404
        return { error: "Ban record not found" }
      }

      logger.info(`IP解封成功: ${banId}`)

      return { success: true }
    } catch (error) {
      logger.error("解封IP失败:", error)
      set.status = 500
      return { error: "Failed to unban IP" }
    }
  })
  // 获取直链的IP封禁列表
  .get("/:linkId/banned-ips", async ({ params, user, set }) => {
    try {
      const { linkId } = params

      logger.debug(`获取直链IP封禁列表: ${linkId} - 用户: ${user.userId}`)

      // 验证直链是否属于当前用户
      const directLink = await db
        .select()
        .from(fileDirectLinks)
        .where(and(eq(fileDirectLinks.id, linkId), eq(fileDirectLinks.userId, user.userId)))
        .get()

      if (!directLink) {
        logger.warn(`直链未找到或无权限: ${linkId} - 用户: ${user.userId}`)
        set.status = 404
        return { error: "Direct link not found" }
      }

      // 获取IP封禁列表
      const bans = await IPBanService.getUserIPBans(user.userId, linkId)

      logger.info(`获取直链IP封禁列表成功: ${linkId} - 共 ${bans.length} 条记录`)

      return {
        bans: bans.map(ban => ({
          id: ban.id,
          ipAddress: ban.ipAddress,
          reason: ban.reason,
          enabled: ban.enabled,
          createdAt: ban.createdAt,
          updatedAt: ban.updatedAt
        }))
      }
    } catch (error) {
      logger.error("获取IP封禁列表失败:", error)
      set.status = 500
      return { error: "Failed to get banned IPs" }
    }
  })
