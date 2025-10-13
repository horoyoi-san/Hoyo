"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Wifi, 
  Server,
  Activity,
  Download,
  Upload,
  Clock,
  Monitor
} from "lucide-react"
import { toast } from "sonner"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface SystemInfo {
  cpu: {
    model: string
    cores: number
    usage: number
  }
  memory: {
    total: number
    used: number
    free: number
    usagePercent: number
  }
  system: {
    platform: string
    arch: string
    hostname: string
    uptime: number
  }
  network: {
    speed: {
      download: number
      upload: number
    }
    total: {
      received: number
      sent: number
    }
  }
  timestamp: number
}

interface NetworkHistoryPoint {
  timestamp: number
  time: string
  download: number
  upload: number
}

// 格式化字节数
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化网络速度
function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s'
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))
  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化运行时间
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}天 ${hours}小时 ${minutes}分钟`
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}

export function SystemInfo() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [networkHistory, setNetworkHistory] = useState<NetworkHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { token } = useAuth()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  // 获取系统信息
  const fetchSystemInfo = async () => {
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/system/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setSystemInfo(data)
      setError(null)
    } catch (err) {
      console.error('获取系统信息失败:', err)
      setError(err instanceof Error ? err.message : '获取系统信息失败')
    }
  }

  // 获取网络历史数据
  const fetchNetworkHistory = async () => {
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/system/network-history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setNetworkHistory(data.history || [])
    } catch (err) {
      console.error('获取网络历史数据失败:', err)
    }
  }

  // 初始化数据
  useEffect(() => {
    const initData = async () => {
      setLoading(true)
      await Promise.all([
        fetchSystemInfo(),
        fetchNetworkHistory()
      ])
      setLoading(false)
    }

    if (token) {
      initData()
    }
  }, [token])

  // 定时更新数据
  useEffect(() => {
    if (!token) return

    const interval = setInterval(() => {
      fetchSystemInfo()
      fetchNetworkHistory()
    }, 5000) // 每5秒更新一次

    return () => clearInterval(interval)
  }, [token])

  if (loading) {
    return (
      <div className="grid gap-4 md:gap-6 lg:gap-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">无法获取系统信息</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!systemInfo) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无系统信息</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 系统概览卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* CPU 信息 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU 使用率</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemInfo.cpu.usage.toFixed(1)}%</div>
            <Progress value={systemInfo.cpu.usage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {systemInfo.cpu.cores} 核心 • {systemInfo.cpu.model.split(' ').slice(0, 3).join(' ')}
            </p>
          </CardContent>
        </Card>

        {/* 内存信息 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">内存使用率</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemInfo.memory.usagePercent.toFixed(1)}%</div>
            <Progress value={systemInfo.memory.usagePercent} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {formatBytes(systemInfo.memory.used)} / {formatBytes(systemInfo.memory.total)}
            </p>
          </CardContent>
        </Card>

        {/* 网络下载速度 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">下载速度</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSpeed(systemInfo.network.speed.download)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              总接收: {formatBytes(systemInfo.network.total.received)}
            </p>
          </CardContent>
        </Card>

        {/* 网络上传速度 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">上传速度</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSpeed(systemInfo.network.speed.upload)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              总发送: {formatBytes(systemInfo.network.total.sent)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 网络带宽图表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            网络带宽使用情况
          </CardTitle>
          <CardDescription>
            实时网络上传/下载速度监控
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {networkHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={networkHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatSpeed(value)}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatSpeed(value), 
                      name === 'download' ? '下载' : '上传'
                    ]}
                    labelFormatter={(label) => `时间: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="download" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={false}
                    name="download"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="upload" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    dot={false}
                    name="upload"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Wifi className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>正在收集网络数据...</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 系统详细信息 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* CPU 详细信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              CPU 详细信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">型号</span>
                <span className="text-sm font-medium">{systemInfo.cpu.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">核心数</span>
                <span className="text-sm font-medium">{systemInfo.cpu.cores} 核心</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">当前使用率</span>
                <Badge variant={systemInfo.cpu.usage > 80 ? "destructive" : systemInfo.cpu.usage > 60 ? "secondary" : "default"}>
                  {systemInfo.cpu.usage.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 系统信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              系统信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">主机名</span>
                <span className="text-sm font-medium">{systemInfo.system.hostname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">平台</span>
                <span className="text-sm font-medium">{systemInfo.system.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">架构</span>
                <span className="text-sm font-medium">{systemInfo.system.arch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">运行时间</span>
                <span className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatUptime(systemInfo.system.uptime)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}