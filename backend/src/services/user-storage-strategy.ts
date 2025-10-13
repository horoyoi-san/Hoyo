import { db } from "../db"
import { users, storageStrategies, userStorageAssignments, roleStorageDefaults } from "../db/schema"
import { eq, and } from "drizzle-orm"
import { nanoid } from "nanoid"
import { logger } from "../utils/logger"

export interface StorageStrategy {
  id: string
  name: string
  type: string
  config: any
  isActive: boolean
}

export interface UserStorageAssignment {
  id: string
  userId: string
  strategyId: string
  userFolder: string
  createdAt: number
  updatedAt: number
}

export interface RoleStorageDefault {
  id: string
  role: string
  strategyId: string
  createdAt: number
  updatedAt: number
}

export class UserStorageStrategyService {
  /**
   * 获取所有活跃的存储策略
   */
  static async getActiveStrategies(): Promise<StorageStrategy[]> {
    try {
      const strategies = await db
        .select()
        .from(storageStrategies)
        .where(eq(storageStrategies.isActive, true))
        .all()

      return strategies.map(strategy => ({
        ...strategy,
        config: JSON.parse(strategy.config)
      }))
    } catch (error) {
      logger.error("获取活跃存储策略失败:", error)
      throw new Error("Failed to get active storage strategies")
    }
  }

  /** 确保用户文件夹统一位于 users/ 下（不带开头斜杠） */
  private static normalizeUserFolder(userFolder: string): string {
    const withoutLeading = userFolder.startsWith('/') ? userFolder.slice(1) : userFolder
    return withoutLeading.startsWith('users/') ? withoutLeading : `users/${withoutLeading}`
  }

  /**
   * 获取用户的存储策略分配
   */
  static async getUserStorageAssignment(userId: string): Promise<UserStorageAssignment | null> {
    try {
      const assignment = await db
        .select()
        .from(userStorageAssignments)
        .where(eq(userStorageAssignments.userId, userId))
        .get()

      return assignment || null
    } catch (error) {
      logger.error("获取用户存储策略分配失败:", error)
      throw new Error("Failed to get user storage assignment")
    }
  }

  /**
   * 为用户分配存储策略
   */
  static async assignStorageToUser(
    userId: string, 
    strategyId: string, 
    userFolder?: string
  ): Promise<UserStorageAssignment> {
    try {
      // 检查用户是否存在
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .get()

      if (!user) {
        throw new Error("User not found")
      }

      // 检查存储策略是否存在且活跃
      const strategy = await db
        .select()
        .from(storageStrategies)
        .where(and(
          eq(storageStrategies.id, strategyId),
          eq(storageStrategies.isActive, true)
        ))
        .get()

      if (!strategy) {
        throw new Error("Storage strategy not found or inactive")
      }

      // 生成用户专属文件夹路径（统一归一化到 users/ 下）
      const rawUserFolder = userFolder || `users/${user.email.replace('@', '_at_')}_${userId.slice(-8)}`
      const finalUserFolder = this.normalizeUserFolder(rawUserFolder)

      // 在远程存储中创建用户专属文件夹
      await this.ensureUserFolderInRemoteStorage(strategy, finalUserFolder)

      // 检查是否已有分配
      const existingAssignment = await this.getUserStorageAssignment(userId)
      
      const now = Date.now()
      
      if (existingAssignment) {
        // 更新现有分配
        const updatedAssignment = {
          ...existingAssignment,
          strategyId,
          userFolder: finalUserFolder,
          updatedAt: now
        }

        await db
          .update(userStorageAssignments)
          .set({
            strategyId,
            userFolder: finalUserFolder,
            updatedAt: now
          })
          .where(eq(userStorageAssignments.id, existingAssignment.id))

        logger.info(`更新用户存储策略分配: ${user.email} -> ${strategy.name}`)
        return updatedAssignment
      } else {
        // 创建新分配
        const newAssignment: UserStorageAssignment = {
          id: nanoid(),
          userId,
          strategyId,
          userFolder: finalUserFolder,
          createdAt: now,
          updatedAt: now
        }

        await db.insert(userStorageAssignments).values(newAssignment)

        logger.info(`创建用户存储策略分配: ${user.email} -> ${strategy.name}`)
        return newAssignment
      }
    } catch (error) {
      logger.error("分配用户存储策略失败:", error)
      throw error
    }
  }

  /**
   * 在远程存储中确保用户文件夹存在
   */
  private static async ensureUserFolderInRemoteStorage(strategy: any, userFolder: string): Promise<void> {
    try {
      const config = JSON.parse(strategy.config)
      
      if (strategy.type === 'onedrive') {
        // OneDrive 存储策略
        const { OneDriveService } = require("./onedrive")
        
        const oneDriveService = new OneDriveService({
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          tenantId: config.tenantId,
        })

        // 检查并刷新令牌
        if (config.expiresAt && config.expiresAt <= Date.now()) {
          logger.warn(`OneDrive存储策略访问令牌已过期，开始刷新`)
          
          if (!config.refreshToken) {
            throw new Error("OneDrive refresh token not found in storage strategy")
          }

          const refreshedTokens = await oneDriveService.refreshToken(config.refreshToken)
          
          // 更新存储策略配置
          config.accessToken = refreshedTokens.accessToken
          config.refreshToken = refreshedTokens.refreshToken
          config.expiresAt = refreshedTokens.expiresAt

          await db
            .update(storageStrategies)
            .set({
              config: JSON.stringify(config),
              updatedAt: Date.now()
            })
            .where(eq(storageStrategies.id, strategy.id))

          logger.info(`OneDrive存储策略访问令牌刷新成功`)
        }

        // 设置访问令牌并创建文件夹（归一化路径，确保在 /users 下）
        oneDriveService.setAccessToken(config.accessToken)
        const normalized = this.normalizeUserFolder(userFolder)
        await oneDriveService.ensureFolderExists(`/${normalized}`)
        
        logger.info(`OneDrive用户文件夹创建成功: /${normalized}`)
      } else if (strategy.type === 'r2') {
        // R2 存储不需要预创建文件夹，上传时会自动创建路径
        logger.info(`R2存储策略无需预创建用户文件夹: ${userFolder}`)
      } else if (strategy.type === 'local') {
        // 本地存储创建物理文件夹
        const fs = await import("fs/promises")
        const path = await import("path")
        
        const uploadsDir = path.join(process.cwd(), "uploads")
        const userFolderPath = path.join(uploadsDir, userFolder)
        
        try {
          await fs.mkdir(userFolderPath, { recursive: true })
          logger.info(`本地用户文件夹创建成功: ${userFolderPath}`)
        } catch (error: any) {
          if (error.code !== 'EEXIST') {
            throw error
          }
          logger.debug(`本地用户文件夹已存在: ${userFolderPath}`)
        }
      }
    } catch (error) {
      logger.error(`在远程存储中创建用户文件夹失败: ${userFolder}`, error)
      // 不抛出错误，避免影响用户分配流程，文件夹会在首次上传时创建
    }
  }

  /**
   * 获取角色默认存储策略
   */
  static async getRoleStorageDefault(role: string): Promise<RoleStorageDefault | null> {
    try {
      const defaultStrategy = await db
        .select()
        .from(roleStorageDefaults)
        .where(eq(roleStorageDefaults.role, role))
        .get()

      return defaultStrategy || null
    } catch (error) {
      logger.error("获取角色默认存储策略失败:", error)
      throw new Error("Failed to get role storage default")
    }
  }

  /**
   * 设置角色默认存储策略
   */
  static async setRoleStorageDefault(role: string, strategyId: string): Promise<RoleStorageDefault> {
    try {
      // 检查存储策略是否存在且活跃
      const strategy = await db
        .select()
        .from(storageStrategies)
        .where(and(
          eq(storageStrategies.id, strategyId),
          eq(storageStrategies.isActive, true)
        ))
        .get()

      if (!strategy) {
        throw new Error("Storage strategy not found or inactive")
      }

      const now = Date.now()
      
      // 检查是否已有默认策略
      const existingDefault = await this.getRoleStorageDefault(role)
      
      if (existingDefault) {
        // 更新现有默认策略
        const updatedDefault = {
          ...existingDefault,
          strategyId,
          updatedAt: now
        }

        await db
          .update(roleStorageDefaults)
          .set({
            strategyId,
            updatedAt: now
          })
          .where(eq(roleStorageDefaults.id, existingDefault.id))

        logger.info(`更新角色默认存储策略: ${role} -> ${strategy.name}`)
        return updatedDefault
      } else {
        // 创建新默认策略
        const newDefault: RoleStorageDefault = {
          id: nanoid(),
          role,
          strategyId,
          createdAt: now,
          updatedAt: now
        }

        await db.insert(roleStorageDefaults).values(newDefault)

        logger.info(`设置角色默认存储策略: ${role} -> ${strategy.name}`)
        return newDefault
      }
    } catch (error) {
      logger.error("设置角色默认存储策略失败:", error)
      throw error
    }
  }

  /**
   * 为新用户自动分配存储策略（基于角色默认策略）
   */
  static async autoAssignStorageForNewUser(userId: string): Promise<UserStorageAssignment | null> {
    try {
      // 获取用户信息
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .get()

      if (!user) {
        throw new Error("User not found")
      }

      // 获取角色默认存储策略
      const roleDefault = await this.getRoleStorageDefault(user.role)
      
      if (!roleDefault) {
        logger.info(`角色 ${user.role} 没有设置默认存储策略，跳过自动分配`)
        return null
      }

      // 为用户分配存储策略
      const assignment = await this.assignStorageToUser(userId, roleDefault.strategyId)
      
      logger.info(`为新用户自动分配存储策略: ${user.email} -> 角色默认策略`)
      return assignment
    } catch (error) {
      logger.error("为新用户自动分配存储策略失败:", error)
      // 不抛出错误，避免影响用户注册流程
      return null
    }
  }

  /**
   * 获取用户的有效存储策略（包含策略详情）
   */
  static async getUserEffectiveStorageStrategy(userId: string): Promise<{
    assignment: UserStorageAssignment | null
    strategy: StorageStrategy | null
  }> {
    try {
      const assignment = await this.getUserStorageAssignment(userId)
      
      if (!assignment) {
        return { assignment: null, strategy: null }
      }

      const strategy = await db
        .select()
        .from(storageStrategies)
        .where(eq(storageStrategies.id, assignment.strategyId))
        .get()

      if (!strategy) {
        logger.warn(`用户 ${userId} 的存储策略 ${assignment.strategyId} 不存在`)
        return { assignment, strategy: null }
      }

      return {
        assignment,
        strategy: {
          ...strategy,
          config: JSON.parse(strategy.config)
        }
      }
    } catch (error) {
      logger.error("获取用户有效存储策略失败:", error)
      throw error
    }
  }

  /**
   * 删除用户存储策略分配
   */
  static async removeUserStorageAssignment(userId: string): Promise<void> {
    try {
      await db
        .delete(userStorageAssignments)
        .where(eq(userStorageAssignments.userId, userId))

      logger.info(`删除用户存储策略分配: ${userId}`)
    } catch (error) {
      logger.error("删除用户存储策略分配失败:", error)
      throw error
    }
  }

  /**
   * 获取所有用户的存储策略分配（用于管理面板）
   */
  static async getAllUserStorageAssignments(): Promise<Array<{
    assignment: UserStorageAssignment
    user: { id: string; email: string; role: string }
    strategy: StorageStrategy
  }>> {
    try {
      const assignments = await db
        .select({
          assignment: userStorageAssignments,
          user: {
            id: users.id,
            email: users.email,
            role: users.role
          },
          strategy: storageStrategies
        })
        .from(userStorageAssignments)
        .leftJoin(users, eq(userStorageAssignments.userId, users.id))
        .leftJoin(storageStrategies, eq(userStorageAssignments.strategyId, storageStrategies.id))
        .all()

      return assignments
        .filter(item => item.user && item.strategy)
        .map(item => ({
          assignment: item.assignment,
          user: item.user!,
          strategy: {
            ...item.strategy!,
            config: JSON.parse(item.strategy!.config)
          }
        }))
    } catch (error) {
      logger.error("获取所有用户存储策略分配失败:", error)
      throw error
    }
  }
}