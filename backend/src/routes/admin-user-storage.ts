import { Elysia, t } from "elysia"
import { jwt } from "@elysiajs/jwt"
import { bearer } from "@elysiajs/bearer"
import { UserStorageStrategyService } from "../services/user-storage-strategy"
import { logger } from "../utils/logger"

export const adminUserStorageRoutes = new Elysia({ prefix: "/admin" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET!,
    }),
  )
  .use(bearer())
  .derive(async ({ bearer, jwt, set }) => {
    if (!bearer) {
      set.status = 401
      return { user: null }
    }

    const payload = await jwt.verify(bearer)
    if (!payload || payload.role !== "admin") {
      set.status = 403
      return { user: null }
    }

    return { user: payload }
  })
  // 获取所有活跃的存储策略
  .get("/storage-strategies", async ({ user, set }) => {
    if (!user) return

    try {
      const strategies = await UserStorageStrategyService.getActiveStrategies()
      return { strategies }
    } catch (error) {
      logger.error("获取存储策略失败:", error)
      set.status = 500
      return { error: "Failed to get storage strategies" }
    }
  })
  // 获取所有用户的存储策略分配
  .get("/user-storage-assignments", async ({ user, set }) => {
    if (!user) return

    try {
      const assignments = await UserStorageStrategyService.getAllUserStorageAssignments()
      return { assignments }
    } catch (error) {
      logger.error("获取用户存储策略分配失败:", error)
      set.status = 500
      return { error: "Failed to get user storage assignments" }
    }
  })
  // 为用户分配存储策略
  .post("/assign-user-storage", async ({ user, body, set }) => {
    if (!user) return

    try {
      const { userId, strategyId, userFolder } = body as {
        userId: string
        strategyId: string
        userFolder?: string
      }

      if (!userId || !strategyId) {
        set.status = 400
        return { error: "Missing required fields" }
      }

      const assignment = await UserStorageStrategyService.assignStorageToUser(
        userId,
        strategyId,
        userFolder
      )

      return { assignment }
    } catch (error) {
      logger.error("分配用户存储策略失败:", error)
      set.status = 500
      return { error: error instanceof Error ? error.message : "Failed to assign storage" }
    }
  })
  // 删除用户存储策略分配
  .delete("/user-storage-assignment/:userId", async ({ user, params, set }) => {
    if (!user) return

    try {
      const { userId } = params

      await UserStorageStrategyService.removeUserStorageAssignment(userId)

      return { success: true }
    } catch (error) {
      logger.error("删除用户存储策略分配失败:", error)
      set.status = 500
      return { error: "Failed to remove user storage assignment" }
    }
  })
  // 获取角色默认存储策略
  .get("/role-storage-defaults", async ({ user, set }) => {
    if (!user) return

    try {
      const adminDefault = await UserStorageStrategyService.getRoleStorageDefault("admin")
      const userDefault = await UserStorageStrategyService.getRoleStorageDefault("user")

      return {
        defaults: {
          admin: adminDefault,
          user: userDefault
        }
      }
    } catch (error) {
      logger.error("获取角色默认存储策略失败:", error)
      set.status = 500
      return { error: "Failed to get role storage defaults" }
    }
  })
  // 设置角色默认存储策略
  .post("/role-storage-default", async ({ user, body, set }) => {
    if (!user) return

    try {
      const { role, strategyId } = body as {
        role: string
        strategyId: string
      }

      if (!role || !strategyId) {
        set.status = 400
        return { error: "Missing required fields" }
      }

      if (!["admin", "user"].includes(role)) {
        set.status = 400
        return { error: "Invalid role" }
      }

      const defaultStrategy = await UserStorageStrategyService.setRoleStorageDefault(role, strategyId)

      return { defaultStrategy }
    } catch (error) {
      logger.error("设置角色默认存储策略失败:", error)
      set.status = 500
      return { error: error instanceof Error ? error.message : "Failed to set role storage default" }
    }
  })