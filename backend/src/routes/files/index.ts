import { Elysia, t } from "elysia"
import { jwt } from "@elysiajs/jwt"
import { bearer } from "@elysiajs/bearer"

import { listRoutes } from "./list"
import { uploadRoutes } from "./upload"
import { downloadTokenRoutes } from "./download-token"
import { contentRoutes } from "./content"
import { directLinkRoutes } from "./direct-link"
import { shareCreateRoutes } from "./share"
import { sharesMgmtRoutes } from "./shares"
import { deleteFileRoutes } from "./delete-file"
import { onedriveDirectUploadRoutes } from "./onedrive-direct-upload"

export const fileRoutes = new Elysia({ prefix: "/files" })
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
		if (!payload) {
			set.status = 401
			throw new Error("Invalid token")
		}

		return { user: payload as { userId: string; email: string; role: string } }
	})
	.use(listRoutes)
	.use(uploadRoutes)
	.use(downloadTokenRoutes)
	.use(contentRoutes)
	.use(directLinkRoutes)
	.use(shareCreateRoutes)
	.use(sharesMgmtRoutes)
	.use(deleteFileRoutes)
	.use(onedriveDirectUploadRoutes) 