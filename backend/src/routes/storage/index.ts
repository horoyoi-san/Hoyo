import { Elysia } from "elysia"
import { jwt } from "@elysiajs/jwt"
import { bearer } from "@elysiajs/bearer"

import { configRoutes } from "./config.ts"
import { strategiesRoutes } from "./strategies.ts"
import { onedriveAuthRoutes } from "./onedrive-auth.ts"
import { onedriveMountRoutes } from "./onedrive-mounts.ts"
import { r2Routes } from "./r2.ts"

export const storageRoutes = new Elysia({ prefix: "/storage" })
	.use(
		jwt({
			name: "jwt",
			secret: process.env.JWT_SECRET || "your-secret-key",
		}),
	)
	.use(bearer())
	.derive(async ({ jwt, bearer, set }) => {
		if (!bearer) {
			set.status = 401
			throw new Error("No token provided")
		}

		const payload = await jwt.verify(bearer)
		if (!payload || payload.role !== "admin") {
			set.status = 403
			throw new Error("Admin access required")
		}

		return { user: payload }
	})
	.use(configRoutes)
	.use(strategiesRoutes)
	.use(onedriveAuthRoutes)
	.use(onedriveMountRoutes)
	.use(r2Routes) 