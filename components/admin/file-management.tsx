"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Calendar, HardDrive, User, File as FileIcon, Eye, ToggleLeft, ToggleRight, Link as LinkIcon, Share2 } from "lucide-react"
import { getFileIcon } from "@/lib/file-icons"

interface FileItem {
  id: string
  userId: string
  filename: string
  originalName: string
  size: number
  mimeType: string
  storageType: string
  createdAt: number
}

interface AdminDirectLinkItem {
  id: string
  userId: string
  fileId: string
  directName: string
  enabled: boolean
  adminDisabled: boolean
  accessCount: number
  createdAt: number
  updatedAt: number
  fileName: string
  fileSize: number
  fileMimeType: string
  userEmail: string
}

interface AdminShareItem {
  id: string
  userId: string
  fileId: string
  shareToken: string | null
  pickupCode: string | null
  enabled: boolean
  adminDisabled: boolean
  accessCount: number
  expiresAt: number | null
  createdAt: number
  updatedAt: number
  fileName: string
  fileSize: number
  fileMimeType: string
  userEmail: string
}

interface FileManagementProps {
  onFileDeleted: () => void
}

export function FileManagement({ onFileDeleted }: FileManagementProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [links, setLinks] = useState<AdminDirectLinkItem[]>([])
  const [linksLoading, setLinksLoading] = useState(true)

  const [shares, setShares] = useState<AdminShareItem[]>([])
  const [sharesLoading, setSharesLoading] = useState(true)

  const { token } = useAuth()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    fetchFiles()
    fetchAdminDirectLinks()
    fetchAdminShares()
  }, [])

  const fetchFiles = async () => {
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/admin/files`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setFiles(data.files)
      }
    } catch (error) {
      console.error("Failed to fetch files:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAdminDirectLinks = async () => {
    if (!token) return
    try {
      setLinksLoading(true)
      const res = await fetch(`${API_URL}/admin/direct-links`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setLinks(data.directLinks || [])
      }
    } catch (e) {
      console.error("Failed to fetch admin direct links", e)
    } finally {
      setLinksLoading(false)
    }
  }

  const fetchAdminShares = async () => {
    if (!token) return
    try {
      setSharesLoading(true)
      const res = await fetch(`${API_URL}/admin/shares`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setShares(data.shares || [])
      }
    } catch (e) {
      console.error("Failed to fetch admin shares", e)
    } finally {
      setSharesLoading(false)
    }
  }

  const handleToggleAdminDirectLink = async (id: string, adminDisabled: boolean) => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/admin/direct-links/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ adminDisabled })
      })
      if (res.ok) {
        await fetchAdminDirectLinks()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || '操作失败')
      }
    } catch (e) {
      console.error('Toggle direct link failed', e)
    }
  }

  const handleToggleAdminShare = async (id: string, adminDisabled: boolean) => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/admin/shares/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ adminDisabled })
      })
      if (res.ok) {
        await fetchAdminShares()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || '操作失败')
      }
    } catch (e) {
      console.error('Toggle share failed', e)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!token) return

    setDeletingId(fileId)

    try {
      const response = await fetch(`${API_URL}/admin/files/${fileId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setFiles((prev) => prev.filter((file) => file.id !== fileId))
        onFileDeleted()
      }
    } catch (error) {
      console.error("Delete failed:", error)
    } finally {
      setDeletingId(null)
    }
  }

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

  if (loading && linksLoading && sharesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* 文件列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-8">
          <FileIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">未找到文件</h3>
          <p className="text-muted-foreground">系统中没有上传的文件</p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <Card key={file.id} className="w-full max-w-full card-portrait">
              <CardContent className="p-3 sm:p-4 overflow-x-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0">{getFileIcon(file.mimeType, file.originalName)}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate max-w-[15ch] sm:max-w-none text-sm sm:text-base">{file.originalName}</h4>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-1">
                        <span className="font-medium whitespace-nowrap">{formatFileSize(file.size)}</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{formatDate(file.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate max-w-[100px] sm:max-w-none whitespace-nowrap">{file.userId}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3 flex-shrink-0" />
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {file.storageType.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
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
                            您确定要删除 "{file.originalName}" 吗？此操作无法撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteFile(file.id)}
                            disabled={deletingId === file.id}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deletingId === file.id ? "删除中..." : "删除文件"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 所有直链（管理员） */}
      <Card className="w-full max-w-full card-portrait">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> 所有直链</CardTitle>
          <CardDescription>查看用户生成的直链并可手动启用/禁用</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {linksLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : links.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">暂无直链</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">用户</TableHead>
                    <TableHead className="w-40 sm:w-60">文件名</TableHead>
                    <TableHead className="w-40">直链名称</TableHead>
                    <TableHead className="w-24">状态</TableHead>
                    <TableHead className="w-24">访问次数</TableHead>
                    <TableHead className="w-40">创建时间</TableHead>
                    <TableHead className="w-[120px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{l.userEmail}</TableCell>
                      <TableCell className="truncate whitespace-nowrap">{l.fileName}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded whitespace-nowrap inline-block max-w-[160px] sm:max-w-[200px] truncate align-middle">{l.directName}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {l.adminDisabled ? (
                            <Badge variant="destructive" className="whitespace-nowrap">管理员禁用</Badge>
                          ) : l.enabled ? (
                            <Badge variant="default" className="whitespace-nowrap">启用</Badge>
                          ) : (
                            <Badge variant="secondary" className="whitespace-nowrap">禁用</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{l.accessCount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(l.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {l.adminDisabled ? (
                            <Button variant="outline" size="sm" onClick={() => handleToggleAdminDirectLink(l.id, false)}>
                              启用
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleToggleAdminDirectLink(l.id, true)}>
                              禁用
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 所有分享（管理员） */}
      <Card className="w-full max-w-full card-portrait">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Share2 className="h-4 w-4" /> 所有分享</CardTitle>
          <CardDescription>查看用户生成的分享并可手动启用/禁用</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {sharesLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : shares.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">暂无分享</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">用户</TableHead>
                    <TableHead className="w-40 sm:w-60">文件名</TableHead>
                    <TableHead className="w-24">类型</TableHead>
                    <TableHead className="w-24">状态</TableHead>
                    <TableHead className="w-24">下载次数</TableHead>
                    <TableHead className="w-40">创建时间</TableHead>
                    <TableHead className="w-[120px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shares.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{s.userEmail}</TableCell>
                      <TableCell className="truncate whitespace-nowrap">{s.fileName}</TableCell>
                      <TableCell>
                        {s.shareToken ? (
                          <Badge variant="default" className="whitespace-nowrap">链接</Badge>
                        ) : (
                          <Badge variant="secondary" className="whitespace-nowrap">取件码</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {s.adminDisabled ? (
                            <Badge variant="destructive" className="whitespace-nowrap">管理员禁用</Badge>
                          ) : s.enabled ? (
                            <Badge variant="default" className="whitespace-nowrap">启用</Badge>
                          ) : (
                            <Badge variant="secondary" className="whitespace-nowrap">禁用</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{s.accessCount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(s.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {s.adminDisabled ? (
                            <Button variant="outline" size="sm" onClick={() => handleToggleAdminShare(s.id, false)}>启用</Button>
                          ) : (
                            <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleToggleAdminShare(s.id, true)}>禁用</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
