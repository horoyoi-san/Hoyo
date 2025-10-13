"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { HardDrive, AlertTriangle, CheckCircle, Crown, User } from "lucide-react"

interface QuotaInfo {
  maxStorage: number
  usedStorage: number
  availableSpace: number
  usagePercentage: number
  maxStorageFormatted: string
  usedStorageFormatted: string
  availableSpaceFormatted: string
}

interface QuotaDisplayProps {
  refreshKey?: number
}

export function QuotaDisplay({ refreshKey = 0 }: QuotaDisplayProps) {
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { token, user } = useAuth()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    fetchQuota()
  }, [token, refreshKey])

  const fetchQuota = async () => {
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/auth/quota`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setQuota(data.quota)
      } else {
        setError("获取配额信息失败")
      }
    } catch (error) {
      console.error("Failed to fetch quota:", error)
      setError("网络错误")
    } finally {
      setLoading(false)
    }
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600"
    if (percentage >= 75) return "text-yellow-600"
    return "text-green-600"
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500"
    if (percentage >= 75) return "bg-yellow-500"
    return "bg-green-500"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            存储使用情况
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!quota) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>配额信息不可用</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2 md:pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2">
            <HardDrive className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">存储使用情况</span>
            <span className="sm:hidden">存储</span>
          </CardTitle>
          <div className="flex items-center gap-1 md:gap-2">
            {user?.role === "admin" ? (
              <Crown className="h-3 w-3 md:h-4 md:w-4 text-yellow-500" />
            ) : (
              <User className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
            )}
            <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="text-xs">
              {user?.role === "admin" ? "管理员" : "用户"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4 px-3 md:px-6">
        {/* 使用情况概览 */}
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex items-center justify-between text-xs md:text-sm">
            <span>已使用</span>
            <span className={`font-medium ${getUsageColor(quota.usagePercentage)}`}>
              {quota.usedStorageFormatted}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs md:text-sm">
            <span>总容量</span>
            <span className="font-medium">{quota.maxStorageFormatted}</span>
          </div>
          <div className="flex items-center justify-between text-xs md:text-sm">
            <span>可用空间</span>
            <span className="font-medium text-muted-foreground">
              {quota.availableSpaceFormatted}
            </span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs md:text-sm font-medium">使用率</span>
            <span className={`text-xs md:text-sm font-bold ${getUsageColor(quota.usagePercentage)}`}>
              {quota.usagePercentage}%
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={quota.usagePercentage} 
              className="h-1.5 md:h-2"
            />
            {quota.usagePercentage >= 90 && (
              <div className="absolute inset-0 bg-red-500 rounded-full opacity-75"></div>
            )}
          </div>
        </div>

        {/* 状态提示 */}
        {quota.usagePercentage >= 95 && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
            <AlertDescription className="text-xs">
              <span className="hidden sm:inline">存储空间即将用完！请清理不需要的文件或联系管理员增加配额。</span>
              <span className="sm:hidden">存储空间不足！</span>
            </AlertDescription>
          </Alert>
        )}

        {quota.usagePercentage >= 85 && quota.usagePercentage < 95 && (
          <Alert className="py-2">
            <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
            <AlertDescription className="text-xs">
              <span className="hidden sm:inline">存储空间使用率较高，建议及时清理文件。</span>
              <span className="sm:hidden">使用率较高</span>
            </AlertDescription>
          </Alert>
        )}

        {quota.usagePercentage < 50 && (
          <div className="flex items-center gap-1 md:gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>存储空间充足</span>
          </div>
        )}

        {/* 详细信息 - 移动端隐藏 */}
        <div className="hidden md:block pt-2 border-t">
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <div className="font-medium">已用</div>
              <div>{quota.usedStorageFormatted}</div>
            </div>
            <div>
              <div className="font-medium">剩余</div>
              <div>{quota.availableSpaceFormatted}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
