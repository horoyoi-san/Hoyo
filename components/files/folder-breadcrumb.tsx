"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home, Folder, Cloud } from "lucide-react"

interface FolderItem {
  id: string
  name: string
  parentId: string | null
  path: string
}

interface R2MountInfo {
  id: string
  mountName: string
  r2Path: string
  folderId: string
  currentR2Path?: string
}

interface OneDriveMountInfo {
  id: string
  mountName: string
  oneDrivePath: string
  folderId: string
  currentOneDrivePath?: string
}

interface FolderBreadcrumbProps {
  currentFolderId: string | null
  onFolderSelect: (folderId: string | null) => void
  r2MountInfo?: R2MountInfo | null
  onR2Navigate?: (r2Path: string) => void
  oneDriveMountInfo?: OneDriveMountInfo | null
  onOneDriveNavigate?: (oneDrivePath: string) => void
}

export function FolderBreadcrumb({ currentFolderId, onFolderSelect, r2MountInfo, onR2Navigate, oneDriveMountInfo, onOneDriveNavigate }: FolderBreadcrumbProps) {
  const [breadcrumbPath, setBreadcrumbPath] = useState<FolderItem[]>([])
  const [loading, setLoading] = useState(false)
  const { token } = useAuth()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    if (currentFolderId) {
      fetchBreadcrumbPath()
    } else {
      setBreadcrumbPath([])
    }
  }, [currentFolderId])

  const fetchBreadcrumbPath = async () => {
    if (!token || !currentFolderId) return

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/folders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const folders = data.folders as FolderItem[]
        
        // 构建从根目录到当前文件夹的路径
        const path = buildPathToFolder(folders, currentFolderId)
        setBreadcrumbPath(path)
      }
    } catch (error) {
      console.error("Failed to fetch breadcrumb path:", error)
    } finally {
      setLoading(false)
    }
  }

  const buildPathToFolder = (folders: FolderItem[], targetId: string): FolderItem[] => {
    const folderMap = new Map<string, FolderItem>()
    folders.forEach(folder => folderMap.set(folder.id, folder))

    const path: FolderItem[] = []
    let currentFolder = folderMap.get(targetId)

    while (currentFolder) {
      path.unshift(currentFolder)
      currentFolder = currentFolder.parentId ? folderMap.get(currentFolder.parentId) || undefined : undefined
    }

    return path
  }

  // 解析R2路径为面包屑段
  const parseR2Path = (r2Path: string, mountR2Path: string): string[] => {
    if (!r2Path) return []

    // 如果当前R2路径与挂载点路径相同，返回空数组（表示在挂载点根目录）
    if (r2Path === mountR2Path) return []

    // 计算相对于挂载点的路径
    let relativePath = r2Path
    if (mountR2Path && r2Path.startsWith(mountR2Path)) {
      relativePath = r2Path.substring(mountR2Path.length)
      // 移除开头的斜杠
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.substring(1)
      }
    }

    // 分割路径并过滤空字符串
    return relativePath.split('/').filter(Boolean)
  }

  // 构建R2路径（从挂载点到指定段）
  const buildR2Path = (mountR2Path: string, segments: string[], endIndex: number): string => {
    const pathSegments = segments.slice(0, endIndex + 1)
    if (mountR2Path) {
      return mountR2Path + (pathSegments.length > 0 ? '/' + pathSegments.join('/') : '')
    }
    return pathSegments.join('/')
  }

  // 解析OneDrive路径为面包屑段
  const parseOneDrivePath = (oneDrivePath: string, mountOneDrivePath: string): string[] => {
    if (!oneDrivePath) return []

    // 如果当前OneDrive路径与挂载点路径相同，返回空数组（表示在挂载点根目录）
    if (oneDrivePath === mountOneDrivePath) return []

    // 计算相对于挂载点的路径
    let relativePath = oneDrivePath
    if (mountOneDrivePath && oneDrivePath.startsWith(mountOneDrivePath)) {
      relativePath = oneDrivePath.substring(mountOneDrivePath.length)
      // 移除开头的斜杠
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.substring(1)
      }
    }

    // 分割路径并过滤空字符串
    return relativePath.split('/').filter(Boolean)
  }

  // 构建OneDrive路径（从挂载点到指定段）
  const buildOneDrivePath = (mountOneDrivePath: string, segments: string[], endIndex: number): string => {
    const pathSegments = segments.slice(0, endIndex + 1)
    if (mountOneDrivePath) {
      return mountOneDrivePath + (pathSegments.length > 0 ? '/' + pathSegments.join('/') : '')
    }
    return pathSegments.join('/')
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse h-4 bg-muted rounded w-32"></div>
      </div>
    )
  }

  return (
    <Breadcrumb className="overflow-hidden">
      <BreadcrumbList className="flex-wrap">
        {/* 根目录 */}
        <BreadcrumbItem>
          <BreadcrumbLink
            href="#"
            onClick={(e) => {
              e.preventDefault()
              onFolderSelect(null)
            }}
            className="flex items-center gap-1 flex-shrink-0"
          >
            <Home className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">根目录</span>
            <span className="sm:hidden">根</span>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* 文件夹路径 */}
        {breadcrumbPath.map((folder, index) => (
          <div key={folder.id} className="flex items-center min-w-0">
            <BreadcrumbSeparator className="flex-shrink-0" />
            <BreadcrumbItem className="min-w-0">
              {index === breadcrumbPath.length - 1 && !r2MountInfo && !oneDriveMountInfo ? (
                <BreadcrumbPage className="flex items-center gap-1 min-w-0">
                  <Folder className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate max-w-[100px] sm:max-w-[150px] md:max-w-[200px]" title={folder.name}>
                    {folder.name}
                  </span>
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    onFolderSelect(folder.id)
                  }}
                  className="flex items-center gap-1 min-w-0"
                >
                  <Folder className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate max-w-[100px] sm:max-w-[150px] md:max-w-[200px]" title={folder.name}>
                    {folder.name}
                  </span>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}

        {/* R2挂载点显示 */}
        {r2MountInfo && (
          <>
            <BreadcrumbSeparator className="flex-shrink-0" />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbLink
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (onR2Navigate) {
                    onR2Navigate(r2MountInfo.r2Path)
                  }
                }}
                className="flex items-center gap-1 text-purple-600 min-w-0"
              >
                <Cloud className="h-4 w-4 flex-shrink-0" />
                <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-[150px]" title={r2MountInfo.mountName}>
                  {r2MountInfo.mountName}
                </span>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {/* R2内部路径 */}
            {(() => {
              const r2PathSegments = parseR2Path(r2MountInfo.currentR2Path || r2MountInfo.r2Path, r2MountInfo.r2Path)
              return r2PathSegments.map((segment, index) => (
                <div key={`r2-${index}`} className="flex items-center min-w-0">
                  <BreadcrumbSeparator className="flex-shrink-0" />
                  <BreadcrumbItem className="min-w-0">
                    {index === r2PathSegments.length - 1 ? (
                      <BreadcrumbPage className="flex items-center gap-1 text-purple-600 min-w-0">
                        <Folder className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-[150px]" title={segment}>
                          {segment}
                        </span>
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (onR2Navigate) {
                            const targetPath = buildR2Path(r2MountInfo.r2Path, r2PathSegments, index)
                            onR2Navigate(targetPath)
                          }
                        }}
                        className="flex items-center gap-1 text-purple-600 min-w-0"
                      >
                        <Folder className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-[150px]" title={segment}>
                          {segment}
                        </span>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              ))
            })()}
          </>
        )}

        {/* OneDrive挂载点显示 */}
        {oneDriveMountInfo && (
          <>
            <BreadcrumbSeparator className="flex-shrink-0" />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbLink
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (onOneDriveNavigate) {
                    onOneDriveNavigate(oneDriveMountInfo.oneDrivePath)
                  }
                }}
                className="flex items-center gap-1 text-blue-600 min-w-0"
              >
                <Cloud className="h-4 w-4 flex-shrink-0" />
                <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-[150px]" title={oneDriveMountInfo.mountName}>
                  {oneDriveMountInfo.mountName}
                </span>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {/* OneDrive内部路径 */}
            {(() => {
              const onedrivePathSegments = parseOneDrivePath(oneDriveMountInfo.currentOneDrivePath || oneDriveMountInfo.oneDrivePath, oneDriveMountInfo.oneDrivePath)
              return onedrivePathSegments.map((segment, index) => (
                <div key={`onedrive-${index}`} className="flex items-center min-w-0">
                  <BreadcrumbSeparator className="flex-shrink-0" />
                  <BreadcrumbItem className="min-w-0">
                    {index === onedrivePathSegments.length - 1 ? (
                      <BreadcrumbPage className="flex items-center gap-1 text-blue-600 min-w-0">
                        <Folder className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-[150px]" title={segment}>
                          {segment}
                        </span>
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (onOneDriveNavigate) {
                            const targetPath = buildOneDrivePath(oneDriveMountInfo.oneDrivePath, onedrivePathSegments, index)
                            onOneDriveNavigate(targetPath)
                          }
                        }}
                        className="flex items-center gap-1 text-blue-600 min-w-0"
                      >
                        <Folder className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-[150px]" title={segment}>
                          {segment}
                        </span>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              ))
            })()}
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
