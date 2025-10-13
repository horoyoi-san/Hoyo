"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AppLayout } from "@/components/layout/app-layout"
import {
  Download,
  Hash,
  Calendar,
  HardDrive,
  Shield,
  AlertCircle,
  Search,
  Loader2,
  Eye,
  Package
} from "lucide-react"
import { getFileIcon, getFileTypeDescription } from "@/lib/file-icons"
import { downloadFile } from "@/lib/utils"

interface FileInfo {
  id: string
  originalName: string
  size: number
  mimeType: string
  createdAt: number
}

interface ShareInfo {
  requireLogin: boolean
  hasPickupCode: boolean
  accessCount: number
  createdAt: number
  expiresAt?: number
  gatekeeper: boolean
}

export default function PickupPage() {
  const [pickupCode, setPickupCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null)
  const [shareToken, setShareToken] = useState("")
  const [downloading, setDownloading] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  const handleSearch = async () => {
    if (!pickupCode.trim()) {
      setError("请输入取件码")
      return
    }

    if (pickupCode.length !== 6 || !/^\d{6}$/.test(pickupCode)) {
      setError("取件码必须是6位数字")
      return
    }

    setLoading(true)
    setError("")
    setFileInfo(null)
    setShareInfo(null)

    try {
      const response = await fetch(`${API_URL}/pickup/${pickupCode}`)
      
      if (response.ok) {
        const data = await response.json()
        setFileInfo(data.file)
        setShareInfo(data.share)
        setShareToken(data.shareToken)
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || "取件码无效或已失效")
      }
    } catch (error) {
      console.error("Failed to fetch pickup info:", error)
      setError("网络错误，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!shareToken || !fileInfo) return

    setDownloading(true)

    try {
      const response = await fetch(`${API_URL}/share/${shareToken}/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickupCode: pickupCode,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // 使用通用下载函数直接下载文件
        await downloadFile(data.downloadUrl, fileInfo.originalName)
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(`下载失败: ${errorData.error || '未知错误'}`)
      }
    } catch (error) {
      console.error("Download failed:", error)
      setError("下载失败: 网络错误")
    } finally {
      setDownloading(false)
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="relative">
            {/* 守门模式角标 */}
            {shareInfo?.gatekeeper && (
              <div className="absolute top-3 right-3 z-10">
                <div className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Gatekeep
                </div>
              </div>
            )}
            
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                文件取件
              </CardTitle>
              <CardDescription>
                输入取件码来获取文件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="请输入6位数字取件码"
                  value={pickupCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setPickupCode(value)
                    if (error) setError("")
                  }}
                  onKeyPress={handleKeyPress}
                  maxLength={6}
                  className="text-center text-lg tracking-widest font-mono"
                />
                <Button
                  onClick={handleSearch}
                  disabled={loading || pickupCode.length !== 6}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {loading ? "查询中..." : "查询"}
                </Button>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 文件信息 */}
          {fileInfo && shareInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getFileIcon(fileInfo.mimeType, fileInfo.originalName)}
                  文件信息
                </CardTitle>
                <CardDescription>
                  找到了对应的文件，您可以下载它
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 文件详情 */}
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <div>{getFileIcon(fileInfo.mimeType, fileInfo.originalName, { size: "lg" })}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{fileInfo.originalName}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{formatFileSize(fileInfo.size)}</span>
                      <span>{getFileTypeDescription(fileInfo.mimeType, fileInfo.originalName)}</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(fileInfo.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 分享信息 */}
                <div className="space-y-3">
                  <h4 className="font-medium">分享信息</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      需要取件码
                    </Badge>
                    {shareInfo.requireLogin && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        需要登录
                      </Badge>
                    )}
                    {shareInfo.gatekeeper && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        守门模式
                      </Badge>
                    )}
                    <Badge variant="outline">
                      已下载 {shareInfo.accessCount} 次
                    </Badge>
                    {shareInfo.expiresAt && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {Date.now() > shareInfo.expiresAt ? "已过期" : `${formatDate(shareInfo.expiresAt)} 过期`}
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                {/* 下载按钮或守门模式提示 */}
                <div className="flex flex-col items-center gap-3">
                  {shareInfo.gatekeeper ? (
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span className="text-sm">此分享启用了守门模式</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        只允许查看文件信息，禁止下载文件内容
                      </p>
                    </div>
                  ) : (
                    <Button
                      size="lg"
                      onClick={handleDownload}
                      disabled={downloading}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {downloading ? "下载中..." : "下载文件"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 使用说明 */}
          <Card className="bg-muted/50">
            <CardContent className="p-6">
              <h4 className="font-medium mb-3">使用说明</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 取件码是6位数字，由文件分享者提供</li>
                <li>• 每个取件码对应一个特定的文件</li>
                <li>• 取件码可以多次使用下载同一文件</li>
                <li>• 如果取件码无效，请联系分享者确认</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
