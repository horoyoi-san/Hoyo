import { db } from "../db"
import { downloadTokens } from "../db/schema"
import { lt } from "drizzle-orm"
import { logger } from "./logger"

/**
 * 清理过期的下载令牌
 */
export async function cleanupExpiredTokens() {
  try {
    const now = Date.now()
    
    // 删除过期的令牌
    const result = await db
      .delete(downloadTokens)
      .where(lt(downloadTokens.expiresAt, now))
    
    logger.info(`清理过期下载令牌完成，删除了 ${result.changes} 个过期令牌`)
    
    return result.changes
  } catch (error) {
    logger.error("清理过期下载令牌失败:", error)
    throw error
  }
}

/**
 * 启动定期清理任务
 */
export function startCleanupScheduler() {
  // 每5分钟清理一次过期令牌
  const interval = 5 * 60 * 1000 // 5分钟
  
  setInterval(async () => {
    try {
      await cleanupExpiredTokens()
    } catch (error) {
      logger.error("定期清理任务失败:", error)
    }
  }, interval)
  
  logger.info("下载令牌清理调度器已启动，每5分钟执行一次清理")
}
