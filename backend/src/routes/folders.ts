import { Elysia, t } from "elysia"
import { jwt } from "@elysiajs/jwt"
import { bearer } from "@elysiajs/bearer"
import { nanoid } from "nanoid"
import { db } from "../db"
import { folders, files, r2MountPoints, oneDriveMountPoints, oneDriveAuth, storageConfig } from "../db/schema"
import { eq, and, like, isNull } from "drizzle-orm"
import { logger } from "../utils/logger"
import { StorageService } from "../services/storage"
import { OneDriveService } from "../services/onedrive"

export const folderRoutes = new Elysia({ prefix: "/folders" })
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
  // 获取用户的文件夹树结构
  .get("/", async ({ user }) => {
    logger.debug(`获取用户文件夹列表: ${user.userId}`)
    
    const userFolders = await db
      .select()
      .from(folders)
      .where(eq(folders.userId, user.userId))
      .orderBy(folders.path)
    
    return { folders: userFolders }
  })
  // 获取指定文件夹的内容（子文件夹和文件）
  .get("/:id/contents", async ({ params, user }) => {
    const folderId = params.id === "root" ? null : params.id
    
    logger.debug(`获取文件夹内容: ${folderId || "root"} - 用户: ${user.userId}`)
    
    // 获取子文件夹
    const subFolders = await db
      .select()
      .from(folders)
      .where(
        and(
          eq(folders.userId, user.userId),
          folderId ? eq(folders.parentId, folderId) : isNull(folders.parentId)
        )
      )
      .orderBy(folders.name)
    
    // 获取文件
    const folderFiles = await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.userId, user.userId),
          folderId ? eq(files.folderId, folderId) : isNull(files.folderId)
        )
      )
      .orderBy(files.originalName)
    
    return {
      folders: subFolders,
      files: folderFiles
    }
  })
  // 创建新文件夹
  .post(
    "/",
    async ({ body, user, set }) => {
      try {
        logger.debug(`收到创建文件夹请求，body:`, JSON.stringify(body))
        const { name, parentId } = body

        // 手动验证
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          set.status = 422
          return { error: "Name is required and must be a non-empty string" }
        }

        if (name.length > 255) {
          set.status = 422
          return { error: "Name must be less than 255 characters" }
        }

        logger.info(`创建文件夹: ${name} - 父文件夹: ${parentId || "root"} - 用户: ${user.userId}`)
        
        // 验证父文件夹是否存在且属于当前用户
        if (parentId) {
          const parentFolder = await db
            .select()
            .from(folders)
            .where(and(eq(folders.id, parentId), eq(folders.userId, user.userId)))
            .get()
          
          if (!parentFolder) {
            logger.warn(`父文件夹不存在: ${parentId} - 用户: ${user.userId}`)
            set.status = 404
            return { error: "Parent folder not found" }
          }
        }
        
        // 检查同级文件夹名称是否重复
        const existingFolder = await db
          .select()
          .from(folders)
          .where(
            and(
              eq(folders.userId, user.userId),
              eq(folders.name, name),
              parentId ? eq(folders.parentId, parentId) : isNull(folders.parentId)
            )
          )
          .get()
        
        if (existingFolder) {
          logger.warn(`文件夹名称已存在: ${name} - 用户: ${user.userId}`)
          set.status = 400
          return { error: "Folder name already exists" }
        }
        
        // 构建文件夹路径
        let folderPath = name
        if (parentId) {
          const parentFolder = await db
            .select()
            .from(folders)
            .where(eq(folders.id, parentId))
            .get()
          
          if (parentFolder) {
            folderPath = `${parentFolder.path}/${name}`
          }
        }
        
        const folderId = nanoid()
        const now = Date.now()
        
        // 创建文件夹
        await db.insert(folders).values({
          id: folderId,
          userId: user.userId,
          name,
          parentId: parentId || null,
          path: folderPath,
          createdAt: now,
          updatedAt: now,
        })
        
        logger.database('INSERT', 'folders')

        return {
          message: "Folder created successfully",
          folder: {
            id: folderId,
            name,
            parentId: parentId || null,
            path: folderPath,
            createdAt: now,
            updatedAt: now,
          },
        }
      } catch (error) {
        logger.error("文件夹创建失败:", error)
        if (error instanceof Error) {
          logger.error("错误详情:", error.message)
          logger.error("错误堆栈:", error.stack)
        }
        set.status = 500
        return { error: "Failed to create folder", details: error instanceof Error ? error.message : String(error) }
      }
    },
    {
      body: t.Object({
        name: t.String(),
        parentId: t.Optional(t.String()),
      }),
    },
  )
  // 重命名文件夹
  .put(
    "/:id",
    async ({ params, body, user, set }) => {
      try {
        const { name } = body
        const folderId = params.id
        
        logger.info(`重命名文件夹: ${folderId} -> ${name} - 用户: ${user.userId}`)
        
        // 验证文件夹是否存在且属于当前用户
        const folder = await db
          .select()
          .from(folders)
          .where(and(eq(folders.id, folderId), eq(folders.userId, user.userId)))
          .get()
        
        if (!folder) {
          logger.warn(`文件夹不存在: ${folderId} - 用户: ${user.userId}`)
          set.status = 404
          return { error: "Folder not found" }
        }
        
        // 检查同级文件夹名称是否重复
        const existingFolder = await db
          .select()
          .from(folders)
          .where(
            and(
              eq(folders.userId, user.userId),
              eq(folders.name, name),
              folder.parentId ? eq(folders.parentId, folder.parentId) : isNull(folders.parentId),
              // 排除当前文件夹
              eq(folders.id, folderId)
            )
          )
          .get()
        
        if (existingFolder && existingFolder.id !== folderId) {
          logger.warn(`文件夹名称已存在: ${name} - 用户: ${user.userId}`)
          set.status = 400
          return { error: "Folder name already exists" }
        }
        
        // 构建新的路径
        const oldPath = folder.path
        let newPath = name
        if (folder.parentId) {
          const parentFolder = await db
            .select()
            .from(folders)
            .where(eq(folders.id, folder.parentId))
            .get()
          
          if (parentFolder) {
            newPath = `${parentFolder.path}/${name}`
          }
        }
        
        const now = Date.now()
        
        // 更新文件夹
        await db
          .update(folders)
          .set({
            name,
            path: newPath,
            updatedAt: now,
          })
          .where(eq(folders.id, folderId))
        
        // 更新所有子文件夹的路径
        const subFolders = await db
          .select()
          .from(folders)
          .where(like(folders.path, `${oldPath}/%`))
        
        for (const subFolder of subFolders) {
          const updatedPath = subFolder.path.replace(oldPath, newPath)
          await db
            .update(folders)
            .set({
              path: updatedPath,
              updatedAt: now,
            })
            .where(eq(folders.id, subFolder.id))
        }
        
        logger.database('UPDATE', 'folders')
        logger.info(`文件夹重命名成功: ${folderId}`)
        
        return {
          message: "Folder renamed successfully",
          folder: {
            ...folder,
            name,
            path: newPath,
            updatedAt: now,
          },
        }
      } catch (error) {
        logger.error("文件夹重命名失败:", error)
        set.status = 500
        return { error: "Failed to rename folder" }
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
      }),
    },
  )
  // 删除文件夹
  .delete("/:id", async ({ params, user, set }) => {
    try {
      const folderId = params.id
      
      logger.info(`删除文件夹: ${folderId} - 用户: ${user.userId}`)
      
      // 验证文件夹是否存在且属于当前用户
      const folder = await db
        .select()
        .from(folders)
        .where(and(eq(folders.id, folderId), eq(folders.userId, user.userId)))
        .get()
      
      if (!folder) {
        logger.warn(`文件夹不存在: ${folderId} - 用户: ${user.userId}`)
        set.status = 404
        return { error: "Folder not found" }
      }
      
      // 检查文件夹是否为空（包含子文件夹或文件）
      const subFolders = await db
        .select()
        .from(folders)
        .where(eq(folders.parentId, folderId))
        .limit(1)
      
      const folderFiles = await db
        .select()
        .from(files)
        .where(eq(files.folderId, folderId))
        .limit(1)
      
      if (subFolders.length > 0 || folderFiles.length > 0) {
        logger.warn(`文件夹不为空，无法删除: ${folderId} - 用户: ${user.userId}`)
        set.status = 400
        return { error: "Folder is not empty" }
      }
      
      // 删除文件夹
      await db.delete(folders).where(eq(folders.id, folderId))
      
      logger.database('DELETE', 'folders')
      logger.info(`文件夹删除成功: ${folderId}`)
      
      return { message: "Folder deleted successfully" }
    } catch (error) {
      logger.error("文件夹删除失败:", error)
      set.status = 500
      return { error: "Failed to delete folder" }
    }
  })
  // 获取文件夹的 R2 挂载内容
  .get("/:id/r2-contents", async ({ params, user, set, query }) => {
    // 添加查询参数类型支持
    const { r2Path } = query as { r2Path?: string };
    try {
      const folderId = params.id

      logger.debug(`获取文件夹 R2 挂载内容: ${folderId} - 用户: ${user.userId}`)

      // 检查文件夹是否有 R2 挂载点
      const mountPoint = await db
        .select()
        .from(r2MountPoints)
        .where(
          and(
            eq(r2MountPoints.folderId, folderId),
            eq(r2MountPoints.userId, user.userId),
            eq(r2MountPoints.enabled, true)
          )
        )
        .get()

      if (!mountPoint) {
        set.status = 404
        return { error: "No R2 mount point found for this folder" }
      }

      // 获取存储配置
      const config = await db.select().from(storageConfig).get()
      if (!config || (!config.enableMixedMode && config.storageType !== "r2")) {
        set.status = 400
        return { error: "R2 storage not configured" }
      }

      // 使用存储服务获取 R2 内容
      const storageService = new StorageService(config)
      // 使用查询参数中的r2Path覆盖挂载点路径，用于导航到子目录
      const targetR2Path = r2Path || mountPoint.r2Path
      const r2Contents = await storageService.listR2Objects(targetR2Path)

              // 转换为文件夹和文件格式
      const r2Folders = r2Contents.folders.map(folderPath => {
        // 处理文件夹名称
        let folderName = ""
        if (targetR2Path) {
          // 如果当前路径有值，去掉前缀
          folderName = folderPath.replace(targetR2Path, "").replace(/\/$/, "").split("/").pop() || ""
        } else {
          // 根路径挂载时，直接获取最后一个部分
          folderName = folderPath.replace(/\/$/, "").split("/").pop() || ""
        }
        
        // 获取该文件夹的文件和子文件夹计数
        const folderCount = r2Contents.folderCounts[folderPath] || { files: 0, folders: 0 };
        // 即使未获取到准确计数，我们也默认至少有1个项目（用于更好的用户体验）
        const totalItems = Math.max(1, folderCount.files + folderCount.folders);
        
        return {
          id: `r2-${Buffer.from(folderPath).toString('base64')}`,
          name: folderName,
          path: folderPath,
          isR2Mount: true,
          mountPointId: mountPoint.id,
          itemCount: totalItems, // 添加文件夹中的项目计数
        }
      })

      const r2Files = r2Contents.files.map(file => {
        // 正确处理根路径和子目录的文件名
        let fileName = ""
        if (targetR2Path) {
          // 有路径的情况
          fileName = file.key.replace(targetR2Path, "").split("/").pop() || ""
        } else {
          // 根路径的情况
          fileName = file.key.split("/").pop() || ""
        }

        return {
          id: `r2-${Buffer.from(file.key).toString('base64')}`,
          filename: fileName,
          originalName: fileName,
          size: file.size,
          mimeType: "application/octet-stream", // 默认类型，可以根据扩展名推断
          storageType: "r2",
          storagePath: file.key,
          isR2File: true,
          r2Key: file.key,
          lastModified: file.lastModified,
          etag: file.etag,
          createdAt: new Date(file.lastModified).getTime(),
        }
      })

      logger.info(`文件夹 ${folderId} R2 挂载内容: ${r2Folders.length} 个文件夹, ${r2Files.length} 个文件`)

      return {
        folders: r2Folders,
        files: r2Files,
        mountPoint: {
          id: mountPoint.id,
          r2Path: r2Path, // 返回当前使用的r2Path而不是挂载点的原始路径
          mountName: mountPoint.mountName,
          originalMountPath: mountPoint.r2Path, // 保留原始挂载路径以便需要时返回
        }
      }
    } catch (error) {
      logger.error("获取 R2 挂载内容失败:", error)
      set.status = 500
      return { error: "Failed to get R2 mount contents" }
    }
  })

  // 获取文件夹的 OneDrive 挂载内容
  .get("/:id/onedrive-contents", async ({ params, user, set, query }) => {
    const { oneDrivePath } = query as { oneDrivePath?: string };
    try {
      const folderId = params.id

      logger.debug(`获取文件夹 OneDrive 挂载内容: ${folderId} - 用户: ${user.userId}`)

      // 检查文件夹是否有 OneDrive 挂载点
      const mountPoint = await db
        .select()
        .from(oneDriveMountPoints)
        .where(
          and(
            eq(oneDriveMountPoints.folderId, folderId),
            eq(oneDriveMountPoints.userId, user.userId),
            eq(oneDriveMountPoints.enabled, true)
          )
        )
        .get()

      if (!mountPoint) {
        set.status = 404
        return { error: "No OneDrive mount point found for this folder" }
      }

      // 获取存储配置，检查是否配置了WebDAV或OAuth
      const storageConfiguration = await db.select().from(storageConfig).get()
      if (!storageConfiguration) {
        set.status = 400
        return { error: "OneDrive not configured" }
      }

      // 检查是否配置了WebDAV
      const hasWebDAV = storageConfiguration.oneDriveWebDavUrl && storageConfiguration.oneDriveWebDavUser && storageConfiguration.oneDriveWebDavPass
      
      // 获取用户的OneDrive认证信息（OAuth模式）
      const auth = await db
        .select()
        .from(oneDriveAuth)
        .where(eq(oneDriveAuth.userId, user.userId))
        .get()

      // 如果既没有OAuth认证也没有WebDAV配置，返回错误
      if (!auth && !hasWebDAV) {
        set.status = 400
        return { error: "OneDrive not authenticated and WebDAV not configured" }
      }

      // 确定要列出的路径
      const targetOnedrivePath = oneDrivePath || mountPoint.oneDrivePath

      // 如果有WebDAV配置，优先使用WebDAV模式
      if (hasWebDAV) {
        try {
          logger.info(`OneDrive挂载点 ${mountPoint.id} 使用WebDAV模式获取内容: ${targetOnedrivePath}`)
          
          // 动态引入 webdav 客户端
          const { createClient } = await import("webdav")
          const client = createClient(storageConfiguration.oneDriveWebDavUrl!, {
            username: storageConfiguration.oneDriveWebDavUser!,
            password: storageConfiguration.oneDriveWebDavPass!,
          })

          // 获取目录内容
          const contents = await client.getDirectoryContents(targetOnedrivePath) as any[]

          // 分离文件和文件夹
          const webdavFolders = contents
            .filter(item => item.type === "directory")
            .map(item => ({
              id: `webdav-${Buffer.from(item.filename).toString('base64')}`,
              name: item.basename,
              path: item.filename,
              mountPointId: mountPoint.id,
              itemCount: 0, // WebDAV 不提供子项计数
              createdAt: new Date(item.lastmod).getTime(),
              lastModified: new Date(item.lastmod).getTime(),
            }))

          const webdavFiles = contents
            .filter(item => item.type === "file")
            .map(item => ({
              id: `webdav-${Buffer.from(item.filename).toString('base64')}`,
              userId: user.userId,
              folderId: folderId,
              filename: item.basename,
              originalName: item.basename,
              size: item.size || 0,
              mimeType: item.mime || "application/octet-stream",
              storageType: "onedrive",
              storagePath: item.filename, // 使用WebDAV路径作为存储路径
              createdAt: new Date(item.lastmod).getTime(),
              lastModified: new Date(item.lastmod).getTime(),
            }))

          logger.info(`WebDAV获取成功: ${webdavFolders.length} 个文件夹, ${webdavFiles.length} 个文件`)

          return {
            folders: webdavFolders,
            files: webdavFiles,
            mountPoint: {
              id: mountPoint.id,
              oneDrivePath: targetOnedrivePath,
              mountName: mountPoint.mountName,
              originalMountPath: mountPoint.oneDrivePath,
            }
          }
        } catch (webdavError) {
          logger.error("WebDAV获取OneDrive内容失败:", webdavError)
          // WebDAV失败时返回空列表，而不是抛出错误
          return {
            folders: [],
            files: [],
            mountPoint: {
              id: mountPoint.id,
              oneDrivePath: targetOnedrivePath,
              mountName: mountPoint.mountName,
              originalMountPath: mountPoint.oneDrivePath,
            }
          }
        }
      }

      if (!auth) {
        set.status = 400
        return { error: "OneDrive not authenticated" }
      }

      // 检查访问令牌是否过期
      if (auth.expiresAt <= Date.now()) {
        // 尝试刷新令牌
        if (!storageConfiguration.oneDriveClientId) {
          set.status = 400
          return { error: "OneDrive OAuth not configured" }
        }

        const refreshOneDriveService = new OneDriveService({
          clientId: storageConfiguration.oneDriveClientId,
          clientSecret: storageConfiguration.oneDriveClientSecret || "",
          tenantId: storageConfiguration.oneDriveTenantId || "common",
        })

        try {
          const newTokens = await refreshOneDriveService.refreshToken(auth.refreshToken)

          // 更新数据库中的令牌
          await db
            .update(oneDriveAuth)
            .set({
              accessToken: newTokens.accessToken,
              refreshToken: newTokens.refreshToken,
              expiresAt: newTokens.expiresAt,
              updatedAt: Date.now(),
            })
            .where(eq(oneDriveAuth.id, auth.id))

          auth.accessToken = newTokens.accessToken
          logger.info("OneDrive访问令牌已刷新")
        } catch (refreshError) {
          logger.error("刷新OneDrive访问令牌失败:", refreshError)
          set.status = 401
          return { error: "OneDrive authentication expired, please re-authenticate" }
        }
      }

      const oneDriveService = new OneDriveService({
        clientId: storageConfiguration.oneDriveClientId!,
        clientSecret: storageConfiguration.oneDriveClientSecret || "",
        tenantId: storageConfiguration.oneDriveTenantId || "common",
      })

      oneDriveService.setAccessToken(auth.accessToken)

      let items: any[] = []

      if (mountPoint.oneDriveItemId && targetOnedrivePath === mountPoint.oneDrivePath) {
        // 如果有itemId且是挂载点根路径，使用itemId获取内容
        items = await oneDriveService.listItemsById(mountPoint.oneDriveItemId)
      } else {
        // 否则使用路径获取内容
        items = await oneDriveService.listItems(targetOnedrivePath)
      }

      // 分离文件和文件夹
      const oneDriveFolders = items
        .filter(item => item.folder)
        .map(item => ({
          id: item.id,
          name: item.name,
          path: targetOnedrivePath === "/" ? `/${item.name}` : `${targetOnedrivePath}/${item.name}`,
          mountPointId: mountPoint.id,
          itemCount: item.folder?.childCount || 0,
          createdAt: new Date(item.createdDateTime).getTime(),
          lastModified: new Date(item.lastModifiedDateTime).getTime(),
        }))

      const oneDriveFiles = items
        .filter(item => item.file)
        .map(item => ({
          id: item.id,
          userId: user.userId,
          folderId: folderId,
          filename: item.name,
          originalName: item.name,
          size: item.size || 0,
          mimeType: item.file?.mimeType || "application/octet-stream",
          storageType: "onedrive",
          storagePath: item.id, // 使用OneDrive的itemId作为存储路径
          createdAt: new Date(item.createdDateTime).getTime(),
          lastModified: new Date(item.lastModifiedDateTime).getTime(),
          downloadUrl: item.downloadUrl,
        }))

      logger.info(`文件夹 ${folderId} OneDrive 挂载内容: ${oneDriveFolders.length} 个文件夹, ${oneDriveFiles.length} 个文件`)

      return {
        folders: oneDriveFolders,
        files: oneDriveFiles,
        mountPoint: {
          id: mountPoint.id,
          oneDrivePath: targetOnedrivePath,
          mountName: mountPoint.mountName,
          originalMountPath: mountPoint.oneDrivePath,
        }
      }
    } catch (error) {
      logger.error("获取 OneDrive 挂载内容失败:", error)
      set.status = 500
      return { error: "Failed to get OneDrive mount contents" }
    }
  })
