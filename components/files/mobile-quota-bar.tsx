"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Progress } from "@/components/ui/progress"
import { HardDrive, AlertTriangle } from "lucide-react"

interface QuotaInfo {
  maxStorage: number
  usedStorage: number
  availableSpace: number
  usagePercentage: number
  maxStorageFormatted: string
  usedStorageFormatted: string
  availableSpaceFormatted: string
}

interface MobileQuotaBarProps {
  refreshKey?: number
}

export function MobileQuotaBar({ refreshKey = 0 }: MobileQuotaBarProps) {
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()

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
      }
    } catch (error) {
      console.error("Failed to fetch quota:", error)
    } finally {
      setLoading(false)
    }
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600"
    if (percentage >= 75) return "text-yellow-600"
    return "text-green-600"
  }

  if (loading || !quota) {
    return null
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 z-10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <HardDrive className="h-3 w-3" />
          <span className="text-xs font-medium">存储</span>
          {quota.usagePercentage >= 90 && (
            <AlertTriangle className="h-3 w-3 text-red-500" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={getUsageColor(quota.usagePercentage)}>
            {quota.usedStorageFormatted}
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">
            {quota.maxStorageFormatted}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Progress 
          value={quota.usagePercentage} 
          className="h-1.5 flex-1"
        />
        <span className={`text-xs font-medium ${getUsageColor(quota.usagePercentage)}`}>
          {quota.usagePercentage}%
        </span>
      </div>
    </div>
  )
}