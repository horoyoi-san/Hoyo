import { logger } from "../utils/logger"

export interface IPLocationInfo {
  addr: string
  country: string
  province: string
  city: string
  isp: string
  latitude: string
  longitude: string
}

export interface IPLocationResponse {
  code: number
  msg: string
  message: string
  data: IPLocationInfo
}

/**
 * IP归属地查询服务
 */
export class IPLocationService {
  private static readonly API_URL = "https://api.live.bilibili.com/ip_service/v1/ip_service/get_ip_addr"
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时缓存
  private static cache = new Map<string, { data: IPLocationInfo; timestamp: number }>()

  /**
   * 查询IP归属地信息
   * @param ip IP地址
   * @returns IP归属地信息
   */
  static async getIPLocation(ip: string): Promise<IPLocationInfo | null> {
    try {
      // 检查缓存
      const cached = this.cache.get(ip)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        logger.debug(`使用缓存的IP归属地信息: ${ip}`)
        return cached.data
      }

      // 构建请求URL
      const url = new URL(this.API_URL)
      url.searchParams.append('ip', ip)

      logger.debug(`查询IP归属地: ${ip}`)

      // 发起请求
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        // 设置超时时间
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        logger.warn(`IP归属地查询请求失败: ${ip} - HTTP ${response.status}`)
        return null
      }

      const result: IPLocationResponse = await response.json()

      if (result.code !== 0) {
        logger.warn(`IP归属地查询API返回错误: ${ip} - ${result.msg || result.message}`)
        return null
      }

      // 缓存结果
      this.cache.set(ip, {
        data: result.data,
        timestamp: Date.now()
      })

      return result.data

    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        logger.warn(`IP归属地查询超时: ${ip}`)
      } else {
        logger.error(`IP归属地查询失败: ${ip}`, error)
      }
      return null
    }
  }

  /**
   * 批量查询IP归属地信息
   * @param ips IP地址数组
   * @returns IP归属地信息映射
   */
  static async batchGetIPLocation(ips: string[]): Promise<Map<string, IPLocationInfo | null>> {
    const results = new Map<string, IPLocationInfo | null>()
    
    // 并发查询，但限制并发数量
    const BATCH_SIZE = 5
    for (let i = 0; i < ips.length; i += BATCH_SIZE) {
      const batch = ips.slice(i, i + BATCH_SIZE)
      const promises = batch.map(async (ip) => {
        const location = await this.getIPLocation(ip)
        return { ip, location }
      })

      const batchResults = await Promise.all(promises)
      batchResults.forEach(({ ip, location }) => {
        results.set(ip, location)
      })

      // 批次间稍作延迟，避免请求过于频繁
      if (i + BATCH_SIZE < ips.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  }

  /**
   * 清理过期缓存
   */
  static cleanExpiredCache(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [ip, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= this.CACHE_DURATION) {
        this.cache.delete(ip)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.info(`清理过期IP归属地缓存: ${cleanedCount} 条`)
    }
  }

  /**
   * 获取缓存统计信息
   */
  static getCacheStats(): { size: number; memoryUsage: string } {
    const size = this.cache.size
    const memoryUsage = `${Math.round(JSON.stringify([...this.cache.entries()]).length / 1024)}KB`
    
    return { size, memoryUsage }
  }

  /**
   * 清空所有缓存
   */
  static clearCache(): void {
    const size = this.cache.size
    this.cache.clear()
    logger.info(`清空IP归属地缓存: ${size} 条`)
  }

  /**
   * 从User-Agent中提取客户端信息
   * @param userAgent User-Agent字符串
   * @returns 简化的客户端信息
   */
  static parseUserAgent(userAgent: string): string {
    if (!userAgent) return 'Unknown'

    // 简单的User-Agent解析
    if (userAgent.includes('Chrome')) {
      const match = userAgent.match(/Chrome\/([0-9.]+)/)
      return match ? `Chrome ${match[1]}` : 'Chrome'
    } else if (userAgent.includes('Firefox')) {
      const match = userAgent.match(/Firefox\/([0-9.]+)/)
      return match ? `Firefox ${match[1]}` : 'Firefox'
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      const match = userAgent.match(/Version\/([0-9.]+).*Safari/)
      return match ? `Safari ${match[1]}` : 'Safari'
    } else if (userAgent.includes('Edge')) {
      const match = userAgent.match(/Edge\/([0-9.]+)/)
      return match ? `Edge ${match[1]}` : 'Edge'
    } else if (userAgent.includes('curl')) {
      return 'curl'
    } else if (userAgent.includes('wget')) {
      return 'wget'
    } else if (userAgent.includes('Postman')) {
      return 'Postman'
    }

    // 移动端检测
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      if (userAgent.includes('Android')) {
        return 'Android Browser'
      } else if (userAgent.includes('iPhone')) {
        return 'iOS Browser'
      }
      return 'Mobile Browser'
    }

    return 'Unknown Browser'
  }
}

// 定期清理过期缓存
setInterval(() => {
  IPLocationService.cleanExpiredCache()
}, 60 * 60 * 1000) // 每小时清理一次
