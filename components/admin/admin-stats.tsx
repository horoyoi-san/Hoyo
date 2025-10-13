"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/components/auth/auth-provider"
import { Users, Files, HardDrive, Shield, User, Cloud, AlertTriangle, Database, RefreshCw } from "lucide-react"

interface AdminStatsProps {
  stats: {
    totalUsers: number
    totalFiles: number
    totalStorage: number
    r2Storage: number
    localStorage: number
    r2Files: number
    localFiles: number
    r2StorageInDB: number
    r2FilesInDB: number
    adminUsers: number
    regularUsers: number
    storageType: string
    enableMixedMode: boolean
    r2StorageError?: string
  }
  onRefresh?: () => void
}

export function AdminStats({ stats, onRefresh }: AdminStatsProps) {
  const [refreshing, setRefreshing] = useState(false)
  const { token } = useAuth()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 字节"
    const k = 1024
    const sizes = ["字节", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleRefreshR2Stats = async () => {
    if (!token || refreshing) return

    setRefreshing(true)
    try {
      const response = await fetch(`${API_URL}/admin/refresh-r2-stats`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        // 刷新成功，重新获取统计数据
        if (onRefresh) {
          onRefresh()
        }
      } else {
        console.error("Failed to refresh R2 stats")
      }
    } catch (error) {
      console.error("Error refreshing R2 stats:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const getStoragePercentage = (storageAmount: number) => {
    if (stats.totalStorage === 0) return 0
    return Math.round((storageAmount / stats.totalStorage) * 100)
  }

  return (
    <div className="space-y-6">
      {/* 主要统计卡片 */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">总用户数</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span className="hidden xs:inline">管理员</span>
              <span className="xs:hidden">管</span>
              {stats.adminUsers}
            </Badge>
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="hidden xs:inline">用户</span>
              <span className="xs:hidden">用</span>
              {stats.regularUsers}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">总文件数</CardTitle>
          <Files className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalFiles}</div>
          <p className="text-xs text-muted-foreground mt-2">所有用户上传的文件</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">已用存储</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatFileSize(stats.totalStorage)}</div>
          <p className="text-xs text-muted-foreground mt-2">总存储消耗</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">R2 存储使用</CardTitle>
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-muted-foreground" />
            {stats.r2StorageError && (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatFileSize(stats.r2Storage || 0)}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Files className="h-3 w-3" />
              <span>{stats.r2Files || 0}</span>
              <span className="hidden xs:inline">文件</span>
            </Badge>
          </div>
          {stats.r2StorageError && (
            <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              查询失败
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* 存储分布详情 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              存储分布详情
              <Badge variant="outline" className="text-xs">
                {stats.storageType === "r2" ? "R2模式" : stats.enableMixedMode ? "混合模式" : "本地模式"}
              </Badge>
            </CardTitle>
            {(stats.storageType === "r2" || stats.enableMixedMode) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshR2Stats}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "刷新中..." : "刷新R2统计"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {stats.r2StorageError && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                R2存储统计查询失败: {stats.r2StorageError}
                <br />
                <span className="text-xs text-muted-foreground">
                  显示的R2数据可能不准确，请检查R2配置或网络连接
                </span>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* R2 存储 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Cloudflare R2</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatFileSize(stats.r2Storage || 0)}</div>
                  <div className="text-xs text-muted-foreground">
                    {getStoragePercentage(stats.r2Storage || 0)}% · {stats.r2Files || 0} 文件
                  </div>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getStoragePercentage(stats.r2Storage || 0)}%` }}
                ></div>
              </div>
            </div>

            {/* 本地存储 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-green-500" />
                  <span className="font-medium">本地存储</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatFileSize(stats.localStorage || 0)}</div>
                  <div className="text-xs text-muted-foreground">
                    {getStoragePercentage(stats.localStorage || 0)}% · {stats.localFiles || 0} 文件
                  </div>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getStoragePercentage(stats.localStorage || 0)}%` }}
                ></div>
              </div>
            </div>

            {/* 总计 */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Files className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">总计</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatFileSize(stats.totalStorage)}</div>
                  <div className="text-xs text-muted-foreground">
                    {stats.totalFiles} 文件
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
