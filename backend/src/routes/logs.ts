import { Elysia } from "elysia"
import { jwt } from "@elysiajs/jwt"
import { bearer } from "@elysiajs/bearer"
import { addLogWebSocketConnection, removeLogWebSocketConnection } from "../utils/logger"
import { nanoid } from "nanoid"

export const logsRoutes = new Elysia({ prefix: "/logs" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "your-secret-key",
    }),
  )
  .use(bearer())
  // 添加一个测试路由
  .get("/test", () => {
    console.log("日志路由测试")
    return { message: "Logs route is working" }
  })
  // 添加token验证路由
  .get("/verify", async ({ jwt, query, set }) => {
    const token = query.token as string
    if (!token) {
      set.status = 401
      return { error: "No token provided" }
    }

    try {
      const payload = await jwt.verify(token)
      if (!payload || payload.role !== "admin") {
        set.status = 403
        return { error: "Admin access required" }
      }
      return { valid: true, user: payload }
    } catch (error) {
      set.status = 401
      return { error: "Invalid token" }
    }
  })
  .ws("/stream", {
    // WebSocket连接打开
    open(ws) {
      console.log("WebSocket连接尝试建立...")

      // 暂时跳过验证，先建立连接
      const connectionId = nanoid()
      addLogWebSocketConnection(connectionId, ws)

      // 存储连接ID到WebSocket对象中，用于关闭时清理
      ws.data = { connectionId }

      // 发送连接成功消息
      ws.send(JSON.stringify({
        type: "connection",
        message: "日志流连接已建立",
        timestamp: Date.now()
      }))

      console.log(`日志WebSocket连接已建立: ${connectionId}`)
    },
    
    // WebSocket连接关闭
    close(ws) {
      console.log("WebSocket连接关闭")
      if (ws.data?.connectionId) {
        removeLogWebSocketConnection(ws.data.connectionId)
        console.log(`日志WebSocket连接已清理: ${ws.data.connectionId}`)
      }
    },

    // WebSocket消息处理
    message(ws, message) {
      try {
        const data = JSON.parse(message.toString())

        // 处理ping消息
        if (data.type === "ping") {
          ws.send(JSON.stringify({
            type: "pong",
            timestamp: Date.now()
          }))
        }
      } catch (error) {
        console.error("WebSocket消息处理错误:", error)
      }
    },

    // WebSocket错误处理
    error(ws, error) {
      console.error("WebSocket错误:", error)
      if (ws.data?.connectionId) {
        removeLogWebSocketConnection(ws.data.connectionId)
        console.log(`日志WebSocket连接因错误清理: ${ws.data.connectionId}`)
      }
    }
  })
