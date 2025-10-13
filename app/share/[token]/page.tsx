"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Download,
  File as FileIcon,
  Calendar,
  HardDrive,
  Shield,
  Hash,
  AlertCircle,
  Cloud,
  Eye
} from "lucide-react"
import { getFileIcon } from "@/lib/file-icons"
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

export default function SharePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null)
  const [downloading, setDownloading] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    fetchShareInfo()
  }, [token])

  const fetchShareInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/share/${token}`)
      
      if (response.ok) {
        const data = await response.json()
        setFileInfo(data.file)
        setShareInfo(data.share)
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || "分享不存在或已失效")
      }
    } catch (error) {
      console.error("Failed to fetch share info:", error)
      setError("网络错误，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!fileInfo || !shareInfo) return

    // 分享链接直接下载，不需要取件码
    await performDownload()
  }

  const performDownload = async () => {
    setDownloading(true)

    try {
      const response = await fetch(`${API_URL}/share/${token}/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // 分享链接不需要取件码
      })

      if (response.ok) {
        const data = await response.json()
        // 使用通用下载函数直接下载文件
        await downloadFile(data.downloadUrl, fileInfo?.originalName)
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(`下载失败: ${errorData.error || '未知错误'}`)
      }
    } catch (error) {
      console.error("Download failed:", error)
      alert("下载失败: 网络错误")
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



  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">分享不可用</h3>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Cloud className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">FireflyCloud</span>
          </div>

          {/* 登录注册按钮 - 仅在未登录时显示 */}
          {!user && (
            <div className="flex items-center space-x-1 md:space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/login")}
                className="text-xs md:text-sm"
              >
                登录
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/register")}
                className="text-xs md:text-sm"
              >
                注册
              </Button>
            </div>
          )}

          {/* 已登录用户信息 */}
          {user && (
            <div className="flex items-center space-x-1 md:space-x-2">
              <span className="text-xs md:text-sm text-muted-foreground hidden sm:inline">
                欢迎，{user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="text-xs md:text-sm"
              >
                <span className="hidden sm:inline">进入仪表板</span>
                <span className="sm:hidden">仪表板</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
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
                <FileIcon className="h-5 w-5" />
                文件分享
              </CardTitle>
              <CardDescription>
                有人向你分享了一个文件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 文件信息 */}
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div>{getFileIcon(fileInfo!.mimeType, fileInfo!.originalName, { size: "lg" })}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{fileInfo!.originalName}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>{formatFileSize(fileInfo!.size)}</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(fileInfo!.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 分享信息 */}
              <div className="space-y-3">
                <h4 className="font-medium">分享信息</h4>
                <div className="flex flex-wrap gap-2">
                  {shareInfo!.requireLogin && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      需要登录
                    </Badge>
                  )}

                  {shareInfo!.gatekeeper && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      守门模式
                    </Badge>
                  )}

                  <Badge variant="outline">
                    已下载 {shareInfo!.accessCount} 次
                  </Badge>
                  {shareInfo!.expiresAt && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {Date.now() > shareInfo!.expiresAt ? "已过期" : `${formatDate(shareInfo!.expiresAt)} 过期`}
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* 下载按钮或守门模式提示 */}
              <div className="flex flex-col items-center gap-3">
                {shareInfo!.gatekeeper ? (
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
        </div>
      </div>


    </div>
  )
}
