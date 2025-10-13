import { logger } from "./logger"

/**
 * 获取后端基础URL
 * 用于生成后端API的完整URL地址
 */
export function getBaseUrl(headers: Record<string, string | undefined>): string {
  // 1. 优先使用环境变量中的后端URL
  if (process.env.BACKEND_URL) {
    logger.debug(`使用环境变量 BACKEND_URL: ${process.env.BACKEND_URL}`)
    return process.env.BACKEND_URL
  }

  // 2. 从反向代理头信息构建后端URL
  const forwardedProto = headers['x-forwarded-proto'] || headers['x-forwarded-protocol']
  const forwardedHost = headers['x-forwarded-host'] || headers['x-forwarded-server']
  
  if (forwardedProto && forwardedHost) {
    const baseUrl = `${forwardedProto}://${forwardedHost}`
    logger.debug(`从反向代理头构建后端URL: ${baseUrl}`)
    return baseUrl
  }

  // 3. 从Host头构建后端URL（确保是后端自身的地址）
  const host = headers['host']
  if (host) {
    // 判断协议
    let protocol = 'http'
    if (headers['x-forwarded-ssl'] === 'on' || headers['x-forwarded-scheme'] === 'https') {
      protocol = 'https'
    }
    
    const baseUrl = `${protocol}://${host}`
    logger.debug(`从Host头构建后端URL: ${baseUrl}`)
    return baseUrl
  }

  // 4. 默认回退到开发环境地址
  const fallbackUrl = 'http://localhost:8080'
  logger.debug(`使用默认后端URL: ${fallbackUrl}`)
  return fallbackUrl
}

/**
 * 从请求头中获取前端URL
 * 用于CORS和重定向
 */
export function getFrontendUrl(headers: Record<string, string | undefined>): string {
  // 1. 优先从 Referer 头获取前端域名
  const referer = headers['referer'] || headers['origin']
  if (referer) {
    try {
      const url = new URL(referer)
      const frontendUrl = `${url.protocol}//${url.host}`
      logger.debug(`从 Referer/Origin 获取前端URL: ${frontendUrl}`)
      return frontendUrl
    } catch (error) {
      logger.warn(`解析 Referer/Origin 失败: ${referer}`)
    }
  }

  // 2. 使用环境变量作为回退
  if (process.env.FRONTEND_URL) {
    logger.debug(`使用环境变量 FRONTEND_URL: ${process.env.FRONTEND_URL}`)
    return process.env.FRONTEND_URL
  }

  // 3. 根据后端URL推测前端URL（开发环境）
  const backendUrl = getBaseUrl(headers)
  if (backendUrl.includes('localhost:8080')) {
    const frontendUrl = 'http://localhost:3000'
    logger.debug(`开发环境，推测前端URL: ${frontendUrl}`)
    return frontendUrl
  }

  // 4. 默认返回后端URL（生产环境可能前后端同域）
  logger.debug(`使用后端URL作为前端URL: ${backendUrl}`)
  return backendUrl
}