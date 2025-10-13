import { db } from "../db"
import { users, files, userQuotas, roleQuotaConfig } from "../db/schema"
import { eq, and } from "drizzle-orm"
import { logger } from "../utils/logger"
import { nanoid } from "nanoid"

export class QuotaService {
  // 检查用户是否有足够的存储空间
  static async checkUserQuota(userId: string, additionalSize: number): Promise<{
    allowed: boolean
    currentUsed: number
    maxStorage: number
    availableSpace: number
    error?: string
  }> {
    try {
      // 获取用户配额信息
      const quota = await db
        .select()
        .from(userQuotas)
        .where(eq(userQuotas.userId, userId))
        .get()

      if (!quota) {
        // 如果没有配额记录，创建一个
        const user = await db.select().from(users).where(eq(users.id, userId)).get()
        if (!user) {
          return {
            allowed: false,
            currentUsed: 0,
            maxStorage: 0,
            availableSpace: 0,
            error: "User not found"
          }
        }

        const newQuota = await this.createUserQuota(userId, user.role)
        if (!newQuota) {
          return {
            allowed: false,
            currentUsed: 0,
            maxStorage: 0,
            availableSpace: 0,
            error: "Failed to create user quota"
          }
        }

        return this.checkUserQuota(userId, additionalSize)
      }

      // 实时计算用户当前实际使用量（本地存储 + R2实际存储）
      const userFiles = await db
        .select()
        .from(files)
        .where(eq(files.userId, userId))
        .all()

      logger.debug(`用户 ${userId} 配额检查: 找到 ${userFiles.length} 个文件`)

      // 计算本地存储使用量（数据库中storageType='local'的文件）
      let localStorage = 0
      let localCount = 0

      userFiles.forEach(file => {
        if (file.storageType === 'local') {
          localStorage += file.size
          localCount++
        }
      })

      // 获取R2实际存储使用量（类似管理面板的方式）
      let r2Storage = 0
      let r2Count = 0

      // 获取存储配置
      const { storageConfig } = await import("../db/schema")
      const config = await db.select().from(storageConfig).get()

      if (config && (config.storageType === "r2" || config.enableMixedMode) && config.r2Endpoint) {
        try {
          const { StorageService } = await import("./storage")
          const storageService = new StorageService(config)
          const r2Stats = await storageService.calculateR2StorageUsage()

          if (!r2Stats.error) {
            r2Storage = r2Stats.totalSize
            r2Count = r2Stats.totalFiles
            logger.debug(`用户 ${userId} R2实际使用量: ${r2Count} 个文件，${r2Storage} 字节`)
          } else {
            logger.warn(`用户 ${userId} R2存储查询失败: ${r2Stats.error}`)
          }
        } catch (error) {
          logger.error(`用户 ${userId} R2存储查询异常:`, error)
        }
      }

      // 计算 OneDrive 存储使用量（按数据库记录汇总）
      let oneDriveStorage = 0
      let oneDriveCount = 0
      userFiles.forEach(file => {
        if (file.storageType === 'onedrive') {
          oneDriveStorage += file.size
          oneDriveCount++
        }
      })

      const currentUsed = localStorage + r2Storage + oneDriveStorage
      const maxStorage = quota.customQuota || quota.maxStorage
      const availableSpace = maxStorage - currentUsed

      const allowed = availableSpace >= additionalSize

      // 如果实际使用量与数据库记录不一致，更新数据库记录
      if (currentUsed !== quota.usedStorage) {
        await db
          .update(userQuotas)
          .set({
            usedStorage: currentUsed,
            updatedAt: Date.now(),
          })
          .where(eq(userQuotas.userId, userId))
        logger.database('UPDATE', 'user_quotas')
      } else {
        logger.debug(`用户 ${userId} 配额数据一致: ${currentUsed}`)
      }

      return {
        allowed,
        currentUsed,
        maxStorage,
        availableSpace
      }

    } catch (error) {
      logger.error("检查用户配额失败:", error)
      return {
        allowed: false,
        currentUsed: 0,
        maxStorage: 0,
        availableSpace: 0,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  // 更新用户存储使用量
  static async updateUserStorage(userId: string, sizeChange: number): Promise<boolean> {
    try {
      const quota = await db
        .select()
        .from(userQuotas)
        .where(eq(userQuotas.userId, userId))
        .get()

      if (!quota) {
        logger.warn(`用户 ${userId} 没有配额记录，无法更新存储使用量`)
        return false
      }

      const newUsedStorage = Math.max(0, quota.usedStorage + sizeChange)

      await db
        .update(userQuotas)
        .set({
          usedStorage: newUsedStorage,
          updatedAt: Date.now(),
        })
        .where(eq(userQuotas.userId, userId))

      logger.database('UPDATE', 'user_quotas')
      logger.debug(`用户 ${userId} 存储使用量更新: ${quota.usedStorage} -> ${newUsedStorage} (变化: ${sizeChange})`)

      return true
    } catch (error) {
      logger.error("更新用户存储使用量失败:", error)
      return false
    }
  }

  // 重新计算用户实际存储使用量（包括本地存储和R2存储）
  static async recalculateUserStorage(userId: string): Promise<{
    success: boolean
    oldUsed: number
    newUsed: number
    fileCount: number
    localStorage: number
    r2Storage: number
    localFiles: number
    r2Files: number
    error?: string
  }> {
    try {
      // 获取当前配额记录
      const quota = await db
        .select()
        .from(userQuotas)
        .where(eq(userQuotas.userId, userId))
        .get()

      if (!quota) {
        return {
          success: false,
          oldUsed: 0,
          newUsed: 0,
          fileCount: 0,
          localStorage: 0,
          r2Storage: 0,
          localFiles: 0,
          r2Files: 0,
          error: "User quota not found"
        }
      }

      // 获取用户所有文件
      const userFiles = await db
        .select()
        .from(files)
        .where(eq(files.userId, userId))
        .all()

      // 分别计算本地存储和R2存储的使用量
      let localStorage = 0
      let r2Storage = 0
      let oneDriveStorage = 0
      let localFiles = 0
      let r2Files = 0
      let oneDriveFiles = 0

      userFiles.forEach(file => {
        if (file.storageType === 'local') {
          localStorage += file.size
          localFiles++
        } else if (file.storageType === 'r2') {
          r2Storage += file.size
          r2Files++
        } else if (file.storageType === 'onedrive') {
          oneDriveStorage += file.size
          oneDriveFiles++
        }
      })

      // 总使用量 = 本地存储 + R2存储 + OneDrive存储
      const actualUsedStorage = localStorage + r2Storage + oneDriveStorage
      const oldUsed = quota.usedStorage

      // 更新配额记录
      await db
        .update(userQuotas)
        .set({
          usedStorage: actualUsedStorage,
          updatedAt: Date.now(),
        })
        .where(eq(userQuotas.userId, userId))

      logger.database('UPDATE', 'user_quotas')
      logger.info(`用户 ${userId} 存储使用量重新计算: ${oldUsed} -> ${actualUsedStorage} (总计: ${userFiles.length} 个文件, 本地: ${localFiles} 个/${localStorage} 字节, R2: ${r2Files} 个/${r2Storage} 字节, OneDrive: ${oneDriveFiles} 个/${oneDriveStorage} 字节)`)

      return {
        success: true,
        oldUsed,
        newUsed: actualUsedStorage,
        fileCount: userFiles.length,
        localStorage,
        r2Storage,
        localFiles,
        r2Files
      }

    } catch (error) {
      logger.error("重新计算用户存储使用量失败:", error)
      return {
        success: false,
        oldUsed: 0,
        newUsed: 0,
        fileCount: 0,
        localStorage: 0,
        r2Storage: 0,
        localFiles: 0,
        r2Files: 0,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  // 为用户创建配额记录
  static async createUserQuota(userId: string, userRole: string): Promise<boolean> {
    try {
      // 获取角色默认配额
      const roleConfig = await db
        .select()
        .from(roleQuotaConfig)
        .where(eq(roleQuotaConfig.role, userRole))
        .get()

      const defaultQuota = roleConfig ? roleConfig.defaultQuota :
        (userRole === 'admin' ? 10 * 1024 * 1024 * 1024 : 1 * 1024 * 1024 * 1024)

      // 计算用户当前使用量（包括本地存储和R2存储）
      const userFiles = await db
        .select()
        .from(files)
        .where(eq(files.userId, userId))
        .all()

      // 分别计算本地存储和R2存储，然后求和
      let localStorage = 0
      let r2Storage = 0

      userFiles.forEach(file => {
        if (file.storageType === 'local') {
          localStorage += file.size
        } else if (file.storageType === 'r2') {
          r2Storage += file.size
        }
      })

      const totalUsedStorage = localStorage + r2Storage

      const quotaId = nanoid()
      await db.insert(userQuotas).values({
        id: quotaId,
        userId,
        maxStorage: defaultQuota,
        usedStorage: totalUsedStorage,
        role: userRole,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      logger.database('INSERT', 'user_quotas')
      logger.info(`为用户 ${userId} (${userRole}) 创建配额记录: ${Math.round(defaultQuota / 1024 / 1024 / 1024)}GB，当前使用: ${Math.round(totalUsedStorage / 1024 / 1024)}MB (本地: ${Math.round(localStorage / 1024 / 1024)}MB, R2: ${Math.round(r2Storage / 1024 / 1024)}MB)`)

      return true
    } catch (error) {
      logger.error("创建用户配额记录失败:", error)
      return false
    }
  }

  // 获取用户配额信息
  static async getUserQuota(userId: string): Promise<{
    maxStorage: number
    usedStorage: number
    availableSpace: number
    role: string
    customQuota?: number
    error?: string
  } | null> {
    try {
      const quota = await db
        .select()
        .from(userQuotas)
        .where(eq(userQuotas.userId, userId))
        .get()

      if (!quota) {
        return null
      }

      // 实时计算用户当前实际使用量（本地存储 + R2实际存储）
      const userFiles = await db
        .select()
        .from(files)
        .where(eq(files.userId, userId))
        .all()

      logger.debug(`用户 ${userId} 文件查询结果: 找到 ${userFiles.length} 个文件`)

      // 计算本地存储使用量（数据库中storageType='local'的文件）
      let localStorage = 0
      let localCount = 0

      userFiles.forEach(file => {
        logger.debug(`文件: ${file.originalName}, 大小: ${file.size}, 存储类型: ${file.storageType}`)
        if (file.storageType === 'local') {
          localStorage += file.size
          localCount++
        }
      })

      // 获取R2实际存储使用量（类似管理面板的方式）
      let r2Storage = 0
      let r2Count = 0

      // 获取存储配置
      const { storageConfig } = await import("../db/schema")
      const config = await db.select().from(storageConfig).get()

      if (config && (config.storageType === "r2" || config.enableMixedMode) && config.r2Endpoint) {
        try {
          const { StorageService } = await import("./storage")
          const storageService = new StorageService(config)
          const r2Stats = await storageService.calculateR2StorageUsage()

          if (!r2Stats.error) {
            r2Storage = r2Stats.totalSize
            r2Count = r2Stats.totalFiles
            logger.debug(`用户 ${userId} R2实际使用量: ${r2Count} 个文件，${r2Storage} 字节`)
          } else {
            logger.warn(`用户 ${userId} R2存储查询失败: ${r2Stats.error}`)
          }
        } catch (error) {
          logger.error(`用户 ${userId} R2存储查询异常:`, error)
        }
      }

      // 计算 OneDrive 存储使用量（按数据库记录汇总）
      let oneDriveStorage = 0
      let oneDriveCount = 0
      userFiles.forEach(file => {
        if (file.storageType === 'onedrive') {
          oneDriveStorage += file.size
          oneDriveCount++
        }
      })

      const actualUsedStorage = localStorage + r2Storage + oneDriveStorage
      const maxStorage = quota.customQuota || quota.maxStorage
      const availableSpace = maxStorage - actualUsedStorage

      // 如果实际使用量与数据库记录不一致，更新数据库记录
      if (actualUsedStorage !== quota.usedStorage) {
        logger.info(`用户 ${userId} 配额数据不一致，更新: ${quota.usedStorage} -> ${actualUsedStorage}`)
        await db
          .update(userQuotas)
          .set({
            usedStorage: actualUsedStorage,
            updatedAt: Date.now(),
          })
          .where(eq(userQuotas.userId, userId))
        logger.database('UPDATE', 'user_quotas')
      } else {
        logger.debug(`用户 ${userId} 配额数据一致: ${actualUsedStorage}`)
      }

      return {
        maxStorage: maxStorage,
        usedStorage: actualUsedStorage,
        availableSpace,
        role: quota.role,
        customQuota: quota.customQuota || undefined
      }

    } catch (error) {
      logger.error("获取用户配额信息失败:", error)
      return {
        maxStorage: 0,
        usedStorage: 0,
        availableSpace: 0,
        role: "user",
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  // 格式化文件大小
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 字节"
    const k = 1024
    const sizes = ["字节", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 计算使用百分比
  static getUsagePercentage(used: number, total: number): number {
    if (total === 0) return 0
    return Math.round((used / total) * 100)
  }
}
