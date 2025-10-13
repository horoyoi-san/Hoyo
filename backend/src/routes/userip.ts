import { Elysia } from "elysia"
import { logger } from "../utils/logger"
import { IPLocationService } from "../services/ip-location"

// 获取客户端IP地址的辅助函数
function getClientIp(request: Request, headers: Record<string, string | undefined>): string {
  // 尝试从各种可能的头部获取真实IP
  const xForwardedFor = headers['x-forwarded-for']
  const cfConnectingIp = headers['cf-connecting-ip']
  const xRealIp = headers['x-real-ip']
  const xClientIp = headers['x-client-ip']

  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }
  if (cfConnectingIp) return cfConnectingIp
  if (xRealIp) return xRealIp
  if (xClientIp) return xClientIp

  // 尝试从URL获取（对于本地开发）
  try {
    const url = new URL(request.url)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return '127.0.0.1'
    }
    return url.hostname
  } catch {
    return '127.0.0.1' // 默认本地IP
  }
}

export const userIpRoutes = new Elysia({ prefix: "/api" })
  .get("/userip", async ({ request, headers }) => {
    try {
      // 获取客户端IP
      const clientIp = getClientIp(request, headers)
      logger.debug(`用户IP请求: ${clientIp}`)

      // 获取IP归属地信息
      const locationInfo = await IPLocationService.getIPLocation(clientIp)

      return {
        ip: clientIp,
        location: locationInfo || {
          addr: clientIp,
          country: "未知",
          province: "未知",
          city: "未知",
          isp: "未知",
          latitude: "",
          longitude: ""
        }
      }
    } catch (error) {
      logger.error("获取用户IP信息失败:", error)
      return {
        ip: "未知",
        location: {
          addr: "未知",
          country: "未知",
          province: "未知",
          city: "未知",
          isp: "未知",
          latitude: "",
          longitude: ""
        }
      }
    }
  })