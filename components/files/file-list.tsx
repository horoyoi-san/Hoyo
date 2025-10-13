"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FilePreview } from "./file-preview"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  File as FileIcon,
  Folder,
  Download,
  Trash2,
  MoreHorizontal,
  Share2,
  Link,
  Copy,
  Calendar,
  HardDrive,
  Cloud,
  CheckCircle,
  Shield,
  Hash,
  Eye,
  Clock,
} from "lucide-react"
import { getFileIcon } from "@/lib/file-icons"
import { DatePicker } from "@/components/ui/date-picker"
import { downloadFile } from "@/lib/utils"
import { useIsMobile } from "@/components/ui/use-mobile"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"

interface FileItem {
  id: string
  filename: string
  originalName: string
  size: number
  mimeType: string
  storageType: string
  createdAt: number
  isR2File?: boolean
  isR2Folder?: boolean
  r2Key?: string
  r2Path?: string
  isOneDriveFile?: boolean
  isOneDriveFolder?: boolean
  oneDrivePath?: string
  lastModified?: string
  etag?: string
  mountPointId?: string
  itemCount?: number
}

interface FileListProps {
  files: FileItem[]
  onDeleteSuccess: (deletedId: string) => void
}

export function FileList({ files, onDeleteSuccess, onFolderNavigate }: FileListProps & {
  onFolderNavigate?: (folderId: string | null, isR2Folder?: boolean, r2Path?: string, mountPointId?: string, isOneDriveFolder?: boolean, oneDrivePath?: string) => void
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; fileId: string; fileName: string }>({ open: false, fileId: "", fileName: "" })
  const [directLinkDialog, setDirectLinkDialog] = useState<{
    open: boolean
    fileId: string
    fileName: string
    directUrl: string
    loading: boolean
  }>({
    open: false,
    fileId: "",
    fileName: "",
    directUrl: "",
    loading: false,
  })
  const [copied, setCopied] = useState(false)
  const [shareDialog, setShareDialog] = useState<{
    open: boolean
    fileId: string
    fileName: string
    requireLogin: boolean
    usePickupCode: boolean
    expiresAt: Date | undefined
    loading: boolean
    shareUrl: string
    pickupCode: string | null
    gatekeeper: boolean
    customFileName: string
    customFileExtension: string
    customFileSize: string
  }>({
    open: false,
    fileId: "",
    fileName: "",
    requireLogin: false,
    usePickupCode: false,
    expiresAt: undefined,
    loading: false,
    shareUrl: "",
    pickupCode: null,
    gatekeeper: false,
    customFileName: "",
    customFileExtension: "",
    customFileSize: "",
  })
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const { token } = useAuth()
  const isMobile = useIsMobile()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 字节"
    const k = 1024
    const sizes = ["字节", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }



  const handleDownload = async (fileId: string, originalName: string, file?: FileItem) => {
    if (!token) return

    try {
      // 如果是 R2 文件，直接获取公共下载链接
      if (file?.isR2File && file?.r2Key) {
        try {
          const response = await fetch(`${API_URL}/storage/r2/download-url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ key: file.r2Key }),
          })

          if (response.ok) {
            const data = await response.json()
            // 使用通用下载函数直接下载文件，R2预签名URL不需要额外认证
            await downloadFile(data.downloadUrl, originalName)
            return
          }
        } catch (error) {
          console.error("R2 download failed:", error)
          // 如果 R2 下载失败，回退到常规下载
        }
      }

      // 常规文件下载或 R2 下载失败时的回退
      const response = await fetch(`${API_URL}/files/${fileId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // 使用通用下载函数直接下载文件，下载令牌URL不需要额外认证
        await downloadFile(data.downloadUrl, originalName)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Download failed:", response.status, errorData)
        alert(`下载失败: ${errorData.error || '未知错误'}`)
      }
    } catch (error) {
      console.error("Download failed:", error)
      alert("下载失败: 网络错误")
    }
  }

  const handleGetDirectLink = async (fileId: string, fileName: string) => {
    if (!token) return

    setDirectLinkDialog({
      open: true,
      fileId,
      fileName,
      directUrl: "",
      loading: true,
    })

    try {
      const response = await fetch(`${API_URL}/files/${fileId}/direct-link`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDirectLinkDialog(prev => ({
          ...prev,
          directUrl: data.directUrl,
          loading: false,
        }))
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Get direct link failed:", response.status, errorData)
        alert(`获取直链失败: ${errorData.error || '未知错误'}`)
        setDirectLinkDialog(prev => ({ ...prev, open: false, loading: false }))
      }
    } catch (error) {
      console.error("Get direct link failed:", error)
      alert("获取直链失败: 网络错误")
      setDirectLinkDialog(prev => ({ ...prev, open: false, loading: false }))
    }
  }

  const handleCopyDirectLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(directLinkDialog.directUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        // 回退方案：使用传统的复制方法
        const textArea = document.createElement('textarea')
        textArea.value = directLinkDialog.directUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      console.error("Copy failed:", error)
      alert("复制失败")
    }
  }

  const handleShare = (fileId: string, fileName: string) => {
    setShareDialog({
      open: true,
      fileId,
      fileName,
      requireLogin: false,
      usePickupCode: false,
      expiresAt: undefined,
      loading: false,
      shareUrl: "",
      pickupCode: null,
      gatekeeper: false,
      customFileName: "",
      customFileExtension: "",
      customFileSize: "",
    })
  }

  const handleCreateShare = async () => {
    if (!token) return

    setShareDialog(prev => ({ ...prev, loading: true }))

    try {
      const response = await fetch(`${API_URL}/files/${shareDialog.fileId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requireLogin: shareDialog.requireLogin,
          usePickupCode: shareDialog.usePickupCode,
          expiresAt: shareDialog.expiresAt ? shareDialog.expiresAt.getTime() : null,
          gatekeeper: shareDialog.gatekeeper,
          customFileName: shareDialog.gatekeeper ? shareDialog.customFileName : undefined,
          customFileExtension: shareDialog.gatekeeper ? shareDialog.customFileExtension : undefined,
          customFileSize: shareDialog.gatekeeper && shareDialog.customFileSize ?
            Math.round(parseFloat(shareDialog.customFileSize) * 1024 * 1024) : undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setShareDialog(prev => ({
          ...prev,
          shareUrl: data.shareUrl,
          pickupCode: data.pickupCode,
          loading: false,
        }))
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Create share failed:", response.status, errorData)
        alert(`创建分享失败: ${errorData.error || '未知错误'}`)
        setShareDialog(prev => ({ ...prev, loading: false }))
      }
    } catch (error) {
      console.error("Create share failed:", error)
      alert("创建分享失败: 网络错误")
      setShareDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareDialog.shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Copy failed:", error)
      alert("复制失败")
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!token) return

    setDeletingId(fileId)

    try {
      const response = await fetch(`${API_URL}/files/${fileId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        onDeleteSuccess(fileId)
      }
    } catch (error) {
      console.error("Delete failed:", error)
    } finally {
      setDeletingId(null)
      setDeleteConfirm({ open: false, fileId: "", fileName: "" })
    }
  }

  // 处理文件夹点击导航
  const handleFolderClick = (file: FileItem) => {
    if (!onFolderNavigate) return;

    if (file.isR2Folder) {
      // 导航到 R2 文件夹
      onFolderNavigate(null, true, file.r2Path, file.mountPointId);
    } else if (file.isOneDriveFolder) {
      // 导航到 OneDrive 文件夹
      onFolderNavigate(null, false, undefined, file.mountPointId, true, file.oneDrivePath);
    } else if (file.mimeType === "application/directory") {
      // 导航到本地文件夹
      onFolderNavigate(file.id, false);
    }
  };

  // 处理文件预览
  const handleFilePreview = (file: FileItem) => {
    if (file.isR2Folder || file.mimeType === "application/directory") {
      // 文件夹不支持预览，执行导航
      handleFolderClick(file);
    } else {
      // 打开文件预览
      setPreviewFile(file);
      setPreviewOpen(true);
    }
  };

  // 排序文件，使文件夹显示在前面
  const sortedFiles = [...files].sort((a, b) => {
    const aIsFolder = a.isR2Folder || a.mimeType === "application/directory";
    const bIsFolder = b.isR2Folder || b.mimeType === "application/directory";
    
    // 首先按文件夹/文件类型排序
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    
    // 然后按名称字母顺序排序
    return a.originalName.localeCompare(b.originalName);
  });

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <FileIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">暂无文件</h3>
        <p className="text-muted-foreground">上传您的第一个文件开始使用</p>
      </div>
    )
  }

  return (
    <div className="h-[60vh] overflow-y-auto overflow-x-hidden space-y-2 md:space-y-3 pr-2">
      {sortedFiles.map((file) => (
        <Card key={file.id} className="w-full max-w-full overflow-hidden">
          <CardContent className="p-3 md:p-4 w-full">
            <div className="flex items-start md:items-center justify-between gap-2 w-full">
              <div className="flex items-start md:items-center gap-2 md:gap-4 flex-1 min-w-0 overflow-hidden">
                <div 
                  className={file.isR2Folder || file.mimeType === "application/directory" ? "cursor-pointer flex-shrink-0" : "flex-shrink-0"}
                  onClick={() => {
                    if (file.isR2Folder || file.mimeType === "application/directory") {
                      handleFolderClick(file);
                    }
                  }}
                >
                  {file.isR2Folder ? (
                    <Folder className="h-6 w-6 text-blue-500" />
                  ) : file.mimeType === "application/directory" ? (
                    <Folder className="h-6 w-6 text-yellow-500" />
                  ) : (
                    getFileIcon(file.mimeType, file.originalName)
                  )}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden w-full">
                  <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 w-full">
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      {file.isR2Folder || file.mimeType === "application/directory" ? (
                        <h4 
                          className="font-medium truncate max-w-[50vw] sm:max-w-[60vw] md:max-w-[400px] lg:max-w-[600px] cursor-pointer hover:text-blue-600 hover:underline text-sm md:text-base flex-1 min-w-0" 
                          onClick={() => handleFolderClick(file)}
                          title={file.originalName}
                        >
                          {file.originalName}
                        </h4>
                      ) : (
                        <h4 
                          className="font-medium truncate max-w-[50vw] sm:max-w-[60vw] md:max-w-[400px] lg:max-w-[600px] cursor-pointer hover:text-blue-600 hover:underline text-sm md:text-base flex-1 min-w-0" 
                          onClick={() => handleFilePreview(file)}
                          title={file.originalName}
                        >
                          {file.originalName}
                        </h4>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap flex-shrink-0">
                      {(file.isR2File || file.isR2Folder) && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1 flex-shrink-0">
                          <Cloud className="h-3 w-3 flex-shrink-0" />
                          <span className="hidden sm:inline whitespace-nowrap">R2</span>
                          {file.isR2Folder && <span className="hidden sm:inline whitespace-nowrap">目录</span>}
                        </Badge>
                      )}
                      {(file.isOneDriveFile || file.isOneDriveFolder) && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-blue-100 text-blue-800 flex-shrink-0">
                          <Cloud className="h-3 w-3 flex-shrink-0" />
                          <span className="hidden sm:inline whitespace-nowrap">OneDrive</span>
                          {file.isOneDriveFolder && <span className="hidden sm:inline whitespace-nowrap">目录</span>}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-1 overflow-hidden">
                    <span className="flex-shrink-0">
                      {file.isR2Folder || file.mimeType === "application/directory" 
                        ? `${file.itemCount || 1}个项目` 
                        : formatFileSize(file.size)
                      }
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span className="hidden sm:inline truncate max-w-[120px]">
                        {file.isR2File && file.lastModified
                          ? formatDate(new Date(file.lastModified).getTime())
                          : formatDate(file.createdAt)
                        }
                      </span>
                      <span className="sm:hidden truncate max-w-[80px]">
                        {file.isR2File && file.lastModified
                          ? new Date(file.lastModified).toLocaleDateString("zh-CN")
                          : new Date(file.createdAt).toLocaleDateString("zh-CN")
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {file.isR2File || file.isOneDriveFile ? (
                        <Cloud className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <HardDrive className="h-3 w-3 flex-shrink-0" />
                      )}
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {file.storageType.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-end md:items-center gap-1 md:gap-2 flex-shrink-0">
                {/* 移动端：只显示下载按钮和更多操作 */}
                <div className="md:hidden flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(file.id, file.originalName, file)}
                    className="flex items-center gap-1 h-8 px-2"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleGetDirectLink(file.id, file.originalName)}>
                        <Link className="h-4 w-4 mr-2" />
                        获取直链
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare(file.id, file.originalName)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        分享文件
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteConfirm({ open: true, fileId: file.id, fileName: file.originalName })}
                        className="text-red-600 focus:text-red-600"
                        disabled={deletingId === file.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* 桌面端：显示所有按钮 */}
                <div className="hidden md:flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleGetDirectLink(file.id, file.originalName)}>
                        <Link className="h-4 w-4 mr-2" />
                        获取直链
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare(file.id, file.originalName)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        分享文件
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(file.id, file.originalName, file)}
                    className="flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" />
                    下载
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>删除文件</AlertDialogTitle>
                        <AlertDialogDescription>
                          您确定要删除 "{file.originalName}" 吗？删除后无法找回文件，此操作无法撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(file.id)}
                          disabled={deletingId === file.id}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {deletingId === file.id ? "删除中..." : "删除"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* 移动端删除确认底板 */}
      <Drawer open={isMobile && deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, open }))}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>删除文件</DrawerTitle>
            <DrawerDescription>
              确认删除 "{deleteConfirm.fileName}" 吗？删除后无法找回文件。
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 py-2">
            <p className="text-sm text-muted-foreground">
              此操作将永久删除该文件且不可恢复，请谨慎操作。
            </p>
          </div>
          <DrawerFooter>
            <Button
              onClick={() => handleDelete(deleteConfirm.fileId)}
              disabled={deletingId === deleteConfirm.fileId}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingId === deleteConfirm.fileId ? "删除中..." : "删除"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">取消</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* 桌面端直链对话框 */}
      <Dialog open={!isMobile && directLinkDialog.open} onOpenChange={(open) =>
        setDirectLinkDialog(prev => ({ ...prev, open }))
      }>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>文件直链</DialogTitle>
            <DialogDescription>
              {directLinkDialog.fileName} 的永久下载链接
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {directLinkDialog.loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">直链地址</label>
                <div className="flex gap-2">
                  <Input
                    value={directLinkDialog.directUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyDirectLink}
                    className="flex items-center gap-1"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "已复制" : "复制"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  此链接使用原始文件名，可以多次使用，无需登录即可下载文件
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDirectLinkDialog(prev => ({ ...prev, open: false }))}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 移动端直链底板 */}
      <Drawer open={isMobile && directLinkDialog.open} onOpenChange={(open) =>
        setDirectLinkDialog(prev => ({ ...prev, open }))
      }>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>文件直链</DrawerTitle>
            <DrawerDescription>
              {directLinkDialog.fileName} 的永久下载链接
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-4">
            {directLinkDialog.loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">直链地址</label>
                  <div className="space-y-2">
                    <Input
                      value={directLinkDialog.directUrl}
                      readOnly
                      className="text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={handleCopyDirectLink}
                      className="w-full flex items-center gap-2"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copied ? "已复制到剪贴板" : "复制链接"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    此链接使用原始文件名，可以多次使用，无需登录即可下载文件
                  </p>
                </div>
              </div>
            )}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">关闭</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* 分享对话框 */}
      <Dialog open={shareDialog.open} onOpenChange={(open) =>
        setShareDialog(prev => ({ ...prev, open }))
      }>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>分享文件</DialogTitle>
            <DialogDescription>
              {shareDialog.fileName} 的分享设置
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!shareDialog.shareUrl ? (
              // 分享设置阶段
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requireLogin"
                    checked={shareDialog.requireLogin}
                    onChange={(e) => setShareDialog(prev => ({
                      ...prev,
                      requireLogin: e.target.checked
                    }))}
                    className="rounded"
                  />
                  <label htmlFor="requireLogin" className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    需要登录后才能下载
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="usePickupCode"
                    checked={shareDialog.usePickupCode}
                    onChange={(e) => setShareDialog(prev => ({
                      ...prev,
                      usePickupCode: e.target.checked
                    }))}
                    className="rounded"
                  />
                  <label htmlFor="usePickupCode" className="text-sm font-medium flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    使用取件码
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">BETA</span>
                  </label>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="gatekeeper"
                      checked={shareDialog.gatekeeper}
                      onChange={(e) => setShareDialog(prev => ({
                        ...prev,
                        gatekeeper: e.target.checked,
                        // 清空自定义信息当禁用守门模式时
                        customFileName: e.target.checked ? prev.customFileName : "",
                        customFileExtension: e.target.checked ? prev.customFileExtension : "",
                        customFileSize: e.target.checked ? prev.customFileSize : "",
                      }))}
                      className="rounded"
                    />
                    <label htmlFor="gatekeeper" className="text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      守门模式
                      <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">NEW</span>
                    </label>
                  </div>

                  {shareDialog.gatekeeper && (
                    <div className="ml-6 space-y-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800 font-medium">自定义文件信息</p>
                      <p className="text-xs text-orange-700">在守门模式下，您可以自定义访问者看到的文件信息</p>

                      <div className="space-y-2">
                        <Label htmlFor="customFileName" className="text-sm">自定义文件名</Label>
                        <Input
                          id="customFileName"
                          placeholder={`原文件名: ${shareDialog.fileName}`}
                          value={shareDialog.customFileName}
                          onChange={(e) => setShareDialog(prev => ({
                            ...prev,
                            customFileName: e.target.value
                          }))}
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customFileExtension" className="text-sm">自定义文件扩展名</Label>
                        <Select
                          value={shareDialog.customFileExtension || "original"}
                          onValueChange={(value) => setShareDialog(prev => ({
                            ...prev,
                            customFileExtension: value === "original" ? "" : value
                          }))}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="选择扩展名或保持原样" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="original">保持原扩展名</SelectItem>
                            <SelectItem value="pdf">PDF 文档 (.pdf)</SelectItem>
                            <SelectItem value="doc">Word 文档 (.doc)</SelectItem>
                            <SelectItem value="docx">Word 文档 (.docx)</SelectItem>
                            <SelectItem value="xls">Excel 表格 (.xls)</SelectItem>
                            <SelectItem value="xlsx">Excel 表格 (.xlsx)</SelectItem>
                            <SelectItem value="ppt">PowerPoint (.ppt)</SelectItem>
                            <SelectItem value="pptx">PowerPoint (.pptx)</SelectItem>
                            <SelectItem value="txt">文本文件 (.txt)</SelectItem>
                            <SelectItem value="jpg">图片 (.jpg)</SelectItem>
                            <SelectItem value="png">图片 (.png)</SelectItem>
                            <SelectItem value="mp4">视频 (.mp4)</SelectItem>
                            <SelectItem value="mp3">音频 (.mp3)</SelectItem>
                            <SelectItem value="zip">压缩包 (.zip)</SelectItem>
                            <SelectItem value="rar">压缩包 (.rar)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customFileSize" className="text-sm">自定义文件大小 (MB)</Label>
                        <Input
                          id="customFileSize"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="留空保持原大小"
                          value={shareDialog.customFileSize}
                          onChange={(e) => setShareDialog(prev => ({
                            ...prev,
                            customFileSize: e.target.value
                          }))}
                          className="text-sm"
                        />
                        <p className="text-xs text-orange-600">
                          提示: 支持小数，如 1.5 表示 1.5MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    有效期
                  </label>
                  <DatePicker
                    date={shareDialog.expiresAt}
                    onDateChange={(date) => setShareDialog(prev => ({
                      ...prev,
                      expiresAt: date
                    }))}
                    placeholder="留空表示永久有效"
                  />
                  <p className="text-xs text-muted-foreground">
                    设置分享的过期时间，留空则永久有效
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>分享方式说明：</strong><br/>
                    • <strong>分享链接</strong>：生成链接，任何人都可通过链接访问<br/>
                    • <strong>取件码</strong>：生成6位数字取件码，需要在取件页面输入取件码<br/>
                    • <strong>守门模式</strong>：只允许查看文件信息，禁止下载文件内容。可自定义显示的文件名、扩展名和大小
                  </p>
                </div>
              </div>
            ) : (
              // 分享结果阶段
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">分享链接</label>
                  <div className="flex gap-2">
                    <Input
                      value={shareDialog.shareUrl}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyShareLink}
                      className="flex items-center gap-1"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copied ? "已复制" : "复制"}
                    </Button>
                  </div>
                </div>
                {shareDialog.pickupCode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">取件码</label>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <span className="text-2xl font-mono font-bold">{shareDialog.pickupCode}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      请将此取件码告知下载者
                    </p>
                  </div>
                )}
                {shareDialog.expiresAt && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      有效期
                    </label>
                    <div className="p-3 bg-muted rounded-lg">
                      <span className="text-sm">
                        {shareDialog.expiresAt.toLocaleDateString("zh-CN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })} 过期
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {!shareDialog.shareUrl ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShareDialog(prev => ({ ...prev, open: false }))}
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreateShare}
                  disabled={shareDialog.loading}
                >
                  {shareDialog.loading ? "创建中..." : "创建分享"}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShareDialog(prev => ({ ...prev, open: false }))}
              >
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 文件预览对话框 */}
      <FilePreview
        file={previewFile}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  )
}
