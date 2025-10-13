import { db } from "../db"
import { ipBans } from "../db/schema"
import { eq, and, or } from "drizzle-orm"
import { logger } from "../utils/logger"
import { nanoid } from "nanoid"

export interface IPBanInfo {
  id: string
  userId: string
  directLinkId: string | null
  ipAddress: string
  reason: string | null
  enabled: boolean
  createdAt: number
  updatedAt: number
}

export class IPBanService {
  /**
   * 检查IP是否被封禁
   * @param ipAddress IP地址
   * @param directLinkId 直链ID（可选，如果提供则检查特定直链的封禁）
   * @returns 是否被封禁
   */
  static async isIPBanned(ipAddress: string, directLinkId?: string): Promise<boolean> {
    try {
      logger.debug(`检查IP封禁状态: ${ipAddress} - 直链: ${directLinkId || '全局'}`)

      // 构建查询条件：检查全局封禁或特定直链封禁
      const conditions = [
        // 全局封禁（direct_link_id 为 null）
        and(
          eq(ipBans.ipAddress, ipAddress),
          eq(ipBans.enabled, true),
          eq(ipBans.directLinkId, null)
        )
      ]

      // 如果提供了直链ID，也检查特定直链的封禁
      if (directLinkId) {
        conditions.push(
          and(
            eq(ipBans.ipAddress, ipAddress),
            eq(ipBans.enabled, true),
            eq(ipBans.directLinkId, directLinkId)
          )
        )
      }

      const banRecord = await db
        .select()
        .from(ipBans)
        .where(or(...conditions))
        .get()

      const isBanned = !!banRecord
      logger.debug(`IP封禁检查结果: ${ipAddress} - ${isBanned ? '已封禁' : '未封禁'}`)

      return isBanned
    } catch (error) {
      logger.error('检查IP封禁状态失败:', error)
      // 出错时默认不封禁，避免影响正常访问
      return false
    }
  }

  /**
   * 封禁IP
   * @param userId 执行封禁的用户ID
   * @param ipAddress 要封禁的IP地址
   * @param directLinkId 直链ID（可选，如果不提供则为全局封禁）
   * @param reason 封禁原因
   * @returns 封禁记录
   */
  static async banIP(
    userId: string,
    ipAddress: string,
    directLinkId?: string,
    reason?: string
  ): Promise<IPBanInfo> {
    try {
      logger.info(`封禁IP: ${ipAddress} - 用户: ${userId} - 直链: ${directLinkId || '全局'} - 原因: ${reason || '无'}`)

      // 检查是否已存在相同的封禁记录
      const existingBan = await db
        .select()
        .from(ipBans)
        .where(
          and(
            eq(ipBans.ipAddress, ipAddress),
            directLinkId ? eq(ipBans.directLinkId, directLinkId) : eq(ipBans.directLinkId, null)
          )
        )
        .get()

      if (existingBan) {
        // 如果已存在，更新为启用状态
        const updatedBan = await db
          .update(ipBans)
          .set({
            enabled: true,
            reason: reason || existingBan.reason,
            updatedAt: Date.now()
          })
          .where(eq(ipBans.id, existingBan.id))
          .returning()
          .get()

        return updatedBan as IPBanInfo
      }

      // 创建新的封禁记录
      const banId = nanoid()
      const now = Date.now()

      const newBan = await db
        .insert(ipBans)
        .values({
          id: banId,
          userId,
          directLinkId: directLinkId || null,
          ipAddress,
          reason: reason || null,
          enabled: true,
          createdAt: now,
          updatedAt: now
        })
        .returning()
        .get()

      return newBan as IPBanInfo
    } catch (error) {
      logger.error('封禁IP失败:', error)
      throw error
    }
  }

  /**
   * 解封IP
   * @param banId 封禁记录ID
   * @param userId 执行解封的用户ID
   * @returns 是否成功
   */
  static async unbanIP(banId: string, userId: string): Promise<boolean> {
    try {
      logger.info(`解封IP: ${banId} - 用户: ${userId}`)

      // 验证封禁记录是否存在且属于该用户
      const banRecord = await db
        .select()
        .from(ipBans)
        .where(and(eq(ipBans.id, banId), eq(ipBans.userId, userId)))
        .get()

      if (!banRecord) {
        logger.warn(`封禁记录未找到或无权限: ${banId} - 用户: ${userId}`)
        return false
      }

      // 禁用封禁记录
      await db
        .update(ipBans)
        .set({
          enabled: false,
          updatedAt: Date.now()
        })
        .where(eq(ipBans.id, banId))

      logger.info(`IP解封成功: ${banRecord.ipAddress}`)
      return true
    } catch (error) {
      logger.error('解封IP失败:', error)
      throw error
    }
  }

  /**
   * 获取用户的IP封禁列表
   * @param userId 用户ID
   * @param directLinkId 直链ID（可选，如果提供则只返回该直链的封禁）
   * @returns 封禁列表
   */
  static async getUserIPBans(userId: string, directLinkId?: string): Promise<IPBanInfo[]> {
    try {
      logger.debug(`获取用户IP封禁列表: ${userId} - 直链: ${directLinkId || '全部'}`)

      let whereCondition = eq(ipBans.userId, userId)

      if (directLinkId) {
        whereCondition = and(whereCondition, eq(ipBans.directLinkId, directLinkId))
      }

      const bans = await db
        .select()
        .from(ipBans)
        .where(whereCondition)
        .orderBy(ipBans.createdAt)

      logger.debug(`获取到 ${bans.length} 条IP封禁记录`)
      return bans as IPBanInfo[]
    } catch (error) {
      logger.error('获取IP封禁列表失败:', error)
      throw error
    }
  }

  /**
   * 删除IP封禁记录
   * @param banId 封禁记录ID
   * @param userId 执行删除的用户ID
   * @returns 是否成功
   */
  static async deleteIPBan(banId: string, userId: string): Promise<boolean> {
    try {
      logger.info(`删除IP封禁记录: ${banId} - 用户: ${userId}`)

      // 验证封禁记录是否存在且属于该用户
      const banRecord = await db
        .select()
        .from(ipBans)
        .where(and(eq(ipBans.id, banId), eq(ipBans.userId, userId)))
        .get()

      if (!banRecord) {
        logger.warn(`封禁记录未找到或无权限: ${banId} - 用户: ${userId}`)
        return false
      }

      // 删除封禁记录
      await db
        .delete(ipBans)
        .where(eq(ipBans.id, banId))

      logger.info(`IP封禁记录删除成功: ${banRecord.ipAddress}`)
      return true
    } catch (error) {
      logger.error('删除IP封禁记录失败:', error)
      throw error
    }
  }
}
