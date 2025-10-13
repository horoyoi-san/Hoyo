"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Share2,
  MoreHorizontal,
  Copy,
  Eye,
  EyeOff,
  Calendar,
  Trash2,
  RefreshCw,
  Hash,
  Link,
  Download,
  Clock,
  Check,
  AlertCircle,
} from "lucide-react"

interface ShareRecord {
  id: string
  fileId: string
  shareToken: string | null
  pickupCode: string | null
  requireLogin: boolean
  enabled: boolean
  adminDisabled?: boolean
  accessCount: number
  expiresAt: number | null
  createdAt: number
  updatedAt: number
  fileName: string
  fileSize: number
  fileMimeType: string
}

export default function SharesPage() {
  const { user, token } = useAuth()
  const [shares, setShares] = useState<ShareRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  
  // 编辑有效期对话框状态
  const [editExpiryDialog, setEditExpiryDialog] = useState<{
    open: boolean
    shareId: string
    currentExpiry: Date | undefined
    newExpiry: Date | undefined
  }>({
    open: false,
    shareId: "",
    currentExpiry: undefined,
    newExpiry: undefined,
  })

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    if (user && token) {
      fetchShares()
    }
  }, [user, token])

  const fetchShares = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/files/shares`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setShares(data.shares)
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || "获取分享列表失败")
      }
    } catch (error) {
      console.error("Failed to fetch shares:", error)
      setError("网络错误，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (text: string, type: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        setCopied(`${type}-${text}`)
        setTimeout(() => setCopied(null), 2000)
      } else {
        // 回退方案：使用传统的复制方法
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(`${type}-${text}`)
        setTimeout(() => setCopied(null), 2000)
      }
    } catch (error) {
      console.error("Copy failed:", error)
      alert("复制失败")
    }
  }

  const handleToggleStatus = async (shareId: string, enabled: boolean) => {
    try {
      const target = shares.find(s => s.id === shareId)
      if (target?.adminDisabled && enabled) {
        alert("该分享因违规已被管理员禁用，无法启用")
        return
      }
      const response = await fetch(`${API_URL}/files/shares/${shareId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      })

      if (response.ok) {
        await fetchShares() // 刷新列表
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(`操作失败: ${errorData.error || "未知错误"}`)
      }
    } catch (error) {
      console.error("Toggle status failed:", error)
      alert("操作失败: 网络错误")
    }
  }

  const handleUpdateExpiry = async () => {
    try {
      const response = await fetch(`${API_URL}/files/shares/${editExpiryDialog.shareId}/expiry`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          expiresAt: editExpiryDialog.newExpiry ? editExpiryDialog.newExpiry.getTime() : null,
        }),
      })

      if (response.ok) {
        setEditExpiryDialog({ open: false, shareId: "", currentExpiry: undefined, newExpiry: undefined })
        await fetchShares() // 刷新列表
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(`更新失败: ${errorData.error || "未知错误"}`)
      }
    } catch (error) {
      console.error("Update expiry failed:", error)
      alert("更新失败: 网络错误")
    }
  }

  const handleDeleteShare = async (shareId: string) => {
    if (!confirm("确定要删除这个分享吗？此操作不可撤销。")) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/files/shares/${shareId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        await fetchShares() // 刷新列表
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(`删除失败: ${errorData.error || "未知错误"}`)
      }
    } catch (error) {
      console.error("Delete share failed:", error)
      alert("删除失败: 网络错误")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (timestamp: number) => {
    // 只在客户端使用toLocaleString
    if (typeof window !== 'undefined') {
      return new Date(timestamp).toLocaleString("zh-CN")
    }
    // 服务器端回退方案
    return new Date(timestamp).toISOString()
  }

  const getShareUrl = (share: ShareRecord) => {
    if (share.shareToken) {
      // 只在客户端访问window.location
      if (typeof window !== 'undefined') {
        return `${window.location.origin}/share/${share.shareToken}`
      }
      // 服务器端使用默认值
      return `/share/${share.shareToken}`
    }
    return null
  }

  const isExpired = (expiresAt: number | null) => {
    return expiresAt && Date.now() > expiresAt
  }

  if (!user) {
    return null
  }

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Share2 className="h-6 w-6 md:h-8 md:w-8" />
              我的分享
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              管理您的分享文件，查看下载统计和控制访问权限
            </p>
          </div>
          <Button
            onClick={fetchShares}
            variant="outline"
            className="flex items-center gap-2 w-full md:w-auto"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">总分享数</CardTitle>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{shares.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">活跃分享</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">
                {shares.filter(s => s.enabled && !isExpired(s.expiresAt)).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">总下载次数</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">
                {shares.reduce((sum, share) => sum + share.accessCount, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">取件码分享</CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">
                {shares.filter(s => s.pickupCode).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 分享列表 */}
        <Card>
          <CardHeader>
            <CardTitle>分享列表</CardTitle>
            <CardDescription>
              您创建的所有分享文件，包括分享链接和取件码
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">加载中...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 text-red-500">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error}
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>还没有创建任何分享</p>
                <p className="text-sm">去文件管理页面创建您的第一个分享吧</p>
              </div>
            ) : (
              <>
                {/* 桌面端表格视图 */}
                <div className="hidden md:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>文件名</TableHead>
                        <TableHead>大小</TableHead>
                        <TableHead>分享方式</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>下载次数</TableHead>
                        <TableHead>有效期</TableHead>
                        <TableHead>创建时间</TableHead>
                        <TableHead className="w-[100px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shares.map((share) => (
                        <TableRow key={share.id}>
                          <TableCell className="font-medium max-w-[200px]">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="truncate cursor-help">
                                  {share.fileName}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs break-all">{share.fileName}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{formatFileSize(share.fileSize)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {share.shareToken ? (
                                <Badge variant="default" className="flex items-center gap-1">
                                  <Link className="h-3 w-3" />
                                  分享链接
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  取件码
                                </Badge>
                              )}
                              {share.requireLogin && (
                                <Badge variant="outline" className="text-xs">
                                  需登录
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isExpired(share.expiresAt) ? (
                                <Badge variant="destructive">已过期</Badge>
                              ) : share.enabled ? (
                                <Badge variant="default">活跃</Badge>
                              ) : (
                                <Badge variant="secondary">已禁用</Badge>
                              )}
                              {share.adminDisabled && (
                                <span className="text-xs text-red-600">管理员禁用</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono">{share.accessCount}</span>
                          </TableCell>
                          <TableCell>
                            {share.expiresAt ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3" />
                                {formatDate(share.expiresAt)}
                              </div>
                            ) : (
                              <Badge variant="outline">永久</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(share.createdAt)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {share.shareToken && (
                                  <DropdownMenuItem
                                    onClick={() => handleCopy(getShareUrl(share)!, "link")}
                                    className="flex items-center gap-2"
                                  >
                                    {copied === `link-${getShareUrl(share)}` ? (
                                      <Check className="h-4 w-4" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                    复制链接
                                  </DropdownMenuItem>
                                )}
                                {share.pickupCode && (
                                  <DropdownMenuItem
                                    onClick={() => handleCopy(share.pickupCode!, "code")}
                                    className="flex items-center gap-2"
                                  >
                                    {copied === `code-${share.pickupCode}` ? (
                                      <Check className="h-4 w-4" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                    复制取件码
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(share.id, !share.enabled)}
                                  className="flex items-center gap-2"
                                  disabled={!!share.adminDisabled && !share.enabled}
                                >
                                  {share.enabled ? (
                                    <>
                                      <EyeOff className="h-4 w-4" />
                                      禁用分享
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-4 w-4" />
                                      启用分享
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setEditExpiryDialog({
                                    open: true,
                                    shareId: share.id,
                                    currentExpiry: share.expiresAt ? new Date(share.expiresAt) : undefined,
                                    newExpiry: share.expiresAt ? new Date(share.expiresAt) : undefined,
                                  })}
                                  className="flex items-center gap-2"
                                >
                                  <Clock className="h-4 w-4" />
                                  修改有效期
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteShare(share.id)}
                                  className="flex items-center gap-2 text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  删除分享
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 移动端卡片视图 */}
                <div className="md:hidden space-y-4">
                  {shares.map((share) => (
                    <Card key={share.id} className="p-4">
                      <div className="space-y-3">
                        {/* 文件名和操作按钮 */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <h3 className="font-medium truncate cursor-help">
                                  {share.fileName}
                                </h3>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs break-all">{share.fileName}</p>
                              </TooltipContent>
                            </Tooltip>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(share.fileSize)}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {share.shareToken && (
                                <DropdownMenuItem
                                  onClick={() => handleCopy(getShareUrl(share)!, "link")}
                                  className="flex items-center gap-2"
                                >
                                  {copied === `link-${getShareUrl(share)}` ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                  复制链接
                                </DropdownMenuItem>
                              )}
                              {share.pickupCode && (
                                <DropdownMenuItem
                                  onClick={() => handleCopy(share.pickupCode!, "code")}
                                  className="flex items-center gap-2"
                                >
                                  {copied === `code-${share.pickupCode}` ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                  复制取件码
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(share.id, !share.enabled)}
                                className="flex items-center gap-2"
                                disabled={!!share.adminDisabled && !share.enabled}
                              >
                                {share.enabled ? (
                                  <>
                                    <EyeOff className="h-4 w-4" />
                                    禁用分享
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4" />
                                    启用分享
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setEditExpiryDialog({
                                  open: true,
                                  shareId: share.id,
                                  currentExpiry: share.expiresAt ? new Date(share.expiresAt) : undefined,
                                  newExpiry: share.expiresAt ? new Date(share.expiresAt) : undefined,
                                })}
                                className="flex items-center gap-2"
                              >
                                <Clock className="h-4 w-4" />
                                修改有效期
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteShare(share.id)}
                                className="flex items-center gap-2 text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                                删除分享
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* 分享方式和状态 */}
                        <div className="flex flex-wrap items-center gap-2">
                          {share.shareToken ? (
                            <Badge variant="default" className="flex items-center gap-1">
                              <Link className="h-3 w-3" />
                              分享链接
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              取件码
                            </Badge>
                          )}
                          {share.requireLogin && (
                            <Badge variant="outline" className="text-xs">
                              需登录
                            </Badge>
                          )}
                          {isExpired(share.expiresAt) ? (
                            <Badge variant="destructive">已过期</Badge>
                          ) : share.enabled ? (
                            <Badge variant="default">活跃</Badge>
                          ) : (
                            <Badge variant="secondary">已禁用</Badge>
                          )}
                        </div>

                        {/* 统计信息 */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">下载次数</span>
                            <div className="font-mono font-medium">{share.accessCount}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">有效期</span>
                            <div className="font-medium">
                              {share.expiresAt ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span className="text-xs">
                                    {new Date(share.expiresAt).toLocaleDateString("zh-CN")}
                                  </span>
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-xs">永久</Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 创建时间 */}
                        <div className="text-xs text-muted-foreground border-t pt-2">
                          创建于 {formatDate(share.createdAt)}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 编辑有效期对话框 */}
        <Dialog open={editExpiryDialog.open} onOpenChange={(open) => 
          setEditExpiryDialog(prev => ({ ...prev, open }))
        }>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>修改分享有效期</DialogTitle>
              <DialogDescription>
                设置新的过期时间，留空表示永久有效
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>当前有效期</Label>
                <div className="text-sm text-muted-foreground">
                  {editExpiryDialog.currentExpiry 
                    ? formatDate(editExpiryDialog.currentExpiry.getTime())
                    : "永久有效"
                  }
                </div>
              </div>
              <div className="space-y-2">
                <Label>新有效期</Label>
                <DatePicker
                  date={editExpiryDialog.newExpiry}
                  onDateChange={(date) => setEditExpiryDialog(prev => ({
                    ...prev,
                    newExpiry: date
                  }))}
                  placeholder="留空表示永久有效"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditExpiryDialog({ open: false, shareId: "", currentExpiry: undefined, newExpiry: undefined })}
              >
                取消
              </Button>
              <Button onClick={handleUpdateExpiry}>
                确认修改
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </TooltipProvider>
    </AppLayout>
  )
}
