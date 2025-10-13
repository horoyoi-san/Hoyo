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
      setError("กรุณากรอกรหัสรับสินค้า")
      return
    }

    if (pickupCode.length !== 6 || !/^\d{6}$/.test(pickupCode)) {
      setError("รหัสการรับสินค้าจะต้องมี 6 หลัก")
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
        setError(errorData.error || "รหัสรับสินค้าไม่ถูกต้องหรือหมดอายุแล้ว")
      }
    } catch (error) {
      console.error("Failed to fetch pickup info:", error)
      setError("ข้อผิดพลาดของเครือข่าย โปรดลองอีกครั้งในภายหลัง")
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
        setError(`การดาวน์โหลดล้มเหลว: ${errorData.error || 'ข้อผิดพลาดที่ไม่รู้จัก'}`)
      }
    } catch (error) {
      console.error("Download failed:", error)
      setError("การดาวน์โหลดล้มเหลว: ข้อผิดพลาดเครือข่าย")
    } finally {
      setDownloading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("th-TH", {
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
                การรับเอกสาร
              </CardTitle>
              <CardDescription>
                กรอกรหัสรับเอกสารเพื่อรับเอกสาร
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="กรุณากรอกรหัสรับสินค้า 6 หลัก"
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
                  {loading ? "กำลังสอบถาม..." : "สอบถาม"}
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
                  ข้อมูลไฟล์
                </CardTitle>
                <CardDescription>
                  พบไฟล์ที่เกี่ยวข้องแล้วและคุณสามารถดาวน์โหลดได้
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
                  <h4 className="font-medium">แบ่งปันข้อมูล</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      จำเป็นต้องมีรหัสรับสินค้า
                    </Badge>
                    {shareInfo.requireLogin && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        จำเป็นต้องเข้าสู่ระบบ
                      </Badge>
                    )}
                    {shareInfo.gatekeeper && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        โหมดผู้รักษาประตู
                      </Badge>
                    )}
                    <Badge variant="outline">
                      ดาวน์โหลดแล้ว {shareInfo.accessCount} ชั้นสอง
                    </Badge>
                    {shareInfo.expiresAt && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {Date.now() > shareInfo.expiresAt ? "หมดอายุแล้ว" : `${formatDate(shareInfo.expiresAt)} หมดอายุแล้ว`}
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
                        <span className="text-sm">การแชร์นี้ได้เปิดใช้งานโหมดเกตแล้ว</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        อนุญาตให้ดูข้อมูลไฟล์เท่านั้น ห้ามดาวน์โหลดเนื้อหาไฟล์
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
                      {downloading ? "กำลังดาวน์โหลด..." : "ดาวน์โหลดไฟล์"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 使用说明 */}
          <Card className="bg-muted/50">
            <CardContent className="p-6">
              <h4 className="font-medium mb-3">คำแนะนำ</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• รหัสการรับข้อมูลเป็นตัวเลข 6 หลักที่ผู้แบ่งปันไฟล์ให้มา</li>
                <li>• รหัสการรับสินค้าแต่ละรหัสจะสอดคล้องกับเอกสารเฉพาะ</li>
                <li>• รหัสรับสินค้าสามารถใช้หลายครั้งเพื่อดาวน์โหลดไฟล์เดียวกันได้</li>
                <li>• หากรหัสรับไม่ถูกต้อง โปรดติดต่อผู้แบ่งปันเพื่อยืนยัน</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
