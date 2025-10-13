/**
 * HTTP 请求日志中间件 - 为 Elysia 框架提供简洁的请求日志记录
 */

import { Elysia } from "elysia"
import { logger } from "../utils/logger"

// 请求日志配置接口
interface LoggingConfig {
  // 是否启用请求日志
  enabled: boolean
  // 是否记录用户代理
  logUserAgent: boolean
  // 是否记录IP地址
  logIpAddress: boolean
  // 需要跳过日志记录的路径
  skipPaths: string[]
  // 慢请求阈值（毫秒）
  slowRequestThreshold: number
}

// 默认配置
const defaultConfig: LoggingConfig = {
  enabled: true,
  logUserAgent: true,
  logIpAddress: true,
  skipPaths: [
    '/health',
    '/favicon.ico',
    '/robots.txt'
  ],
  slowRequestThreshold: 1000 // 1秒
}

// 获取客户端IP地址
function getClientIp(headers: Record<string, string | undefined>): string {
  // 尝试从各种可能的头部获取真实IP
  const xForwardedFor = headers['x-forwarded-for']
  const cfConnectingIp = headers['cf-connecting-ip'] // Cloudflare
  const xRealIp = headers['x-real-ip']
  const xClientIp = headers['x-client-ip']

  if (xForwardedFor) {
    // X-Forwarded-For 可能包含多个IP，取第一个
    return xForwardedFor.split(',')[0].trim()
  }

  if (cfConnectingIp) {
    return cfConnectingIp
  }

  if (xRealIp) {
    return xRealIp
  }

  if (xClientIp) {
    return xClientIp
  }

  return 'unknown'
}

// 创建日志中间件
export function createLoggingMiddleware(config: Partial<LoggingConfig> = {}) {
  const finalConfig: LoggingConfig = { ...defaultConfig, ...config }

  return new Elysia({ name: 'logging' })
    .onRequest(({ request, set }) => {
      if (!finalConfig.enabled) return

      // 记录请求开始时间
      const startTime = Date.now()
      const url = new URL(request.url)
      const path = url.pathname
      const headers = Object.fromEntries(request.headers.entries())
      const clientIp = getClientIp(headers)

      // 将信息存储在set中，这样可以在后续钩子中访问
      set.headers = set.headers || {}
      set.headers['x-start-time'] = startTime.toString()
      set.headers['x-client-ip'] = clientIp
      set.headers['x-request-path'] = path
    })
    .onAfterResponse(({ request, set }) => {
      if (!finalConfig.enabled) return

      const startTime = parseInt(set.headers?.['x-start-time'] as string || '0')
      const clientIp = set.headers?.['x-client-ip'] as string || 'unknown'
      const requestPath = set.headers?.['x-request-path'] as string || new URL(request.url).pathname

      // 检查是否需要跳过此路径
      if (finalConfig.skipPaths.some(skipPath => requestPath.startsWith(skipPath))) {
        return
      }

      // 计算响应时间
      const duration = Date.now() - startTime

      // 获取状态码
      const statusCode = set.status || 200

      // 获取用户代理
      const userAgent = finalConfig.logUserAgent ? request.headers.get('user-agent') : undefined

      // 使用简洁格式记录HTTP请求（INFO级别）
      logger.http(request.method, requestPath, statusCode, duration, userAgent, clientIp)

      // 如果是慢请求，记录警告
      if (duration > finalConfig.slowRequestThreshold) {
        logger.warn(`🐌 Slow request detected: ${request.method} ${requestPath} took ${duration}ms from ${clientIp}`)
      }
    })
    .onError(({ request, error, set }) => {
      if (!finalConfig.enabled) return

      const startTime = parseInt(set.headers?.['x-start-time'] as string || '0')
      const clientIp = set.headers?.['x-client-ip'] as string || 'unknown'
      const requestPath = set.headers?.['x-request-path'] as string || new URL(request.url).pathname

      // 检查是否需要跳过此路径
      if (finalConfig.skipPaths.some(skipPath => requestPath.startsWith(skipPath))) {
        return
      }

      // 计算响应时间
      const duration = startTime ? Date.now() - startTime : 0

      // 获取状态码
      const statusCode = set.status || 500

      // 获取用户代理
      const userAgent = request.headers.get('user-agent') || 'unknown'

      // 使用简洁格式记录HTTP请求（会显示错误状态码）
      logger.http(request.method, requestPath, statusCode, duration, userAgent, clientIp)

      // 在ERROR级别记录详细错误信息
      logger.error(`💥 Request failed: ${error.message}`)

      // 在开发环境下记录完整的错误堆栈
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('Error stack:', error.stack)
      }
    })
}

// 导出默认配置的中间件
export const loggingMiddleware = createLoggingMiddleware()

// 导出配置接口和默认配置
export { LoggingConfig, defaultConfig as defaultLoggingConfig }
