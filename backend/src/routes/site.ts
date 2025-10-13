import { Elysia } from "elysia"
import { db } from "../db"
import { siteConfig } from "../db/schema"
import { logger } from "../utils/logger"

export const publicSiteRoutes = new Elysia()
  .get("/site-config", async ({ set }) => {
    try {
      const cfg = await db.select().from(siteConfig).get()
      return {
        title: cfg?.title || "FireflyCloud",
        description: cfg?.description || "云存储",
        allowUserRegistration: cfg?.allowUserRegistration ?? true
      }
    } catch (error) {
      logger.error("获取站点配置失败:", error as unknown as Error)
      set.status = 500
      return {
        title: "FireflyCloud",
        description: "云存储"
      }
    }
  }) 