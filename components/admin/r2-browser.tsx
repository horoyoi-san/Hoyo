"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Folder,
  File as FileIcon,
  ArrowLeft,
  Home,
  RefreshCw,
  FolderOpen,
  Cloud,
  AlertCircle,
  CheckCircle,
} from "lucide-react"

interface R2Object {
  key: string
  size: number
  lastModified: string
  etag: string
}

interface R2BrowserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectPath: (path: string) => void
  title?: string
  description?: string
}

export function R2Browser({ open, onOpenChange, onSelectPath, title, description }: R2BrowserProps) {
  const [currentPath, setCurrentPath] = useState("")
  const [files, setFiles] = useState<R2Object[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedPath, setSelectedPath] = useState("")
  const { token } = useAuth()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    if (open) {
      fetchR2Contents("")
      setSelectedPath("") // 重置选择的路径
    }
  }, [open])

  const fetchR2Contents = async (path: string) => {
    if (!token) return

    setLoading(true)
    setError("")

    try {
      // 只在客户端使用URLSearchParams
      let queryString = ""
      if (typeof URLSearchParams !== 'undefined') {
        const params = new URLSearchParams()
        if (path) {
          params.append("prefix", path)
        }
        queryString = params.toString()
      } else {
        // 服务器端回退方案
        queryString = path ? `prefix=${encodeURIComponent(path)}` : ""
      }

      const response = await fetch(`${API_URL}/storage/r2/browse${queryString ? `?${queryString}` : ""}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setFiles(data.files || [])
        setFolders(data.folders || [])
        setCurrentPath(path)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to browse R2 storage")
      }
    } catch (error) {
      console.error("Failed to fetch R2 contents:", error)
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const navigateToFolder = (folderPath: string) => {
    fetchR2Contents(folderPath)
  }

  const navigateUp = () => {
    const pathParts = currentPath.split("/").filter(Boolean)
    pathParts.pop()
    const parentPath = pathParts.join("/")
    fetchR2Contents(parentPath)
  }

  const navigateToRoot = () => {
    fetchR2Contents("")
  }

  const handleSelectPath = () => {
    // 使用选择的路径或当前路径
    // 注意：保留空字符串作为根路径值传递给后端
    const finalPath = selectedPath !== undefined ? selectedPath : currentPath
    onSelectPath(finalPath)
    onOpenChange(false)
  }

  const handleUseCurrentPath = () => {
    // 保存实际路径值，不做特殊处理
    setSelectedPath(currentPath)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    // 只在客户端使用toLocaleString
    if (typeof window !== 'undefined') {
      return new Date(dateString).toLocaleString()
    }
    // 服务器端回退方案
    return new Date(dateString).toISOString()
  }

  const getBreadcrumbPath = () => {
    if (!currentPath) return []
    return currentPath.split("/").filter(Boolean)
  }

  // 获取显示用的路径（根路径显示为 "/"），仅用于UI显示
  const getDisplayPath = (path: string) => {
    return path || "/"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            {title || "浏览 R2 存储桶"}
          </DialogTitle>
          <DialogDescription>
            {description || "选择要挂载的 R2 目录路径"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 导航栏 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={navigateToRoot}
                disabled={loading || !currentPath}
              >
                <Home className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={navigateUp}
                disabled={loading || !currentPath}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchR2Contents(currentPath)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* 面包屑导航 */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    navigateToRoot()
                  }}
                  className="flex items-center gap-1"
                >
                  <Home className="h-4 w-4" />
                  根目录
                </BreadcrumbLink>
              </BreadcrumbItem>
              {getBreadcrumbPath().map((part, index, array) => (
                <div key={index} className="flex items-center">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {index === array.length - 1 ? (
                      <BreadcrumbPage className="flex items-center gap-1">
                        <Folder className="h-4 w-4" />
                        {part}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          const pathToNavigate = array.slice(0, index + 1).join("/")
                          navigateToFolder(pathToNavigate)
                        }}
                        className="flex items-center gap-1"
                      >
                        <Folder className="h-4 w-4" />
                        {part}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          {/* 当前路径选择 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">当前选择的路径</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input
                  value={selectedPath}
                  onChange={(e) => setSelectedPath(e.target.value)}
                  placeholder={getDisplayPath(currentPath)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentPath}
                >
                  使用当前路径
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                当前浏览路径: {getDisplayPath(currentPath)}
              </div>
              <div className="text-xs text-blue-500 mt-2 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                提示：若要挂载根路径，请填入"/"或使用根目录按钮导航后选择
              </div>
            </CardContent>
          </Card>

          {/* 文件和文件夹列表 */}
          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>大小</TableHead>
                  <TableHead>修改时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        加载中...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {folders.map((folder) => {
                      // 修复根目录下的文件夹名称显示
                      let folderName = folder
                      if (currentPath) {
                        folderName = folder.replace(currentPath, "").replace(/\/$/, "")
                      } else {
                        // 根目录下，取文件夹名称（去掉末尾的斜杠）
                        folderName = folder.replace(/\/$/, "").split("/").pop() || folder
                      }
                      return (
                        <TableRow
                          key={folder}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigateToFolder(folder)}
                        >
                          <TableCell className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4 text-blue-500" />
                            {folderName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">文件夹</Badge>
                          </TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                      )
                    })}
                    {files.map((file) => {
                      // 修复根目录下的文件名称显示
                      let fileName = file.key
                      if (currentPath) {
                        fileName = file.key.replace(currentPath, "")
                      } else {
                        // 根目录下，取文件名（去掉路径部分）
                        fileName = file.key.split("/").pop() || file.key
                      }
                      return (
                        <TableRow key={file.key}>
                          <TableCell className="flex items-center gap-2">
                            <FileIcon className="h-4 w-4 text-gray-500" />
                            {fileName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">文件</Badge>
                          </TableCell>
                          <TableCell>{formatFileSize(file.size)}</TableCell>
                          <TableCell>{formatDate(file.lastModified)}</TableCell>
                        </TableRow>
                      )
                    })}
                    {folders.length === 0 && files.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          此目录为空
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSelectPath} disabled={loading}>
            <CheckCircle className="h-4 w-4 mr-2" />
            选择此路径
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
