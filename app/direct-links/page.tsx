"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AppLayout } from "@/components/layout/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Link,
  Eye,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Clock,
  Users,
  Activity,
  Globe,
  Smartphone,
  Monitor,
  RefreshCw,
  Ban,
  Shield,
  ShieldOff,
  Plus
} from "lucide-react"

interface DirectLink {
  id: string
  fileId: string
  directName: string
  token?: string
  enabled: boolean
  adminDisabled?: boolean
  accessCount: number
  createdAt: number
  updatedAt: number
  file: {
    name: string
    size: number
    mimeType: string
  }
}

interface AccessLog {
  id: string
  ipAddress: string
  userAgent: string
  location: {
    country: string
    province: string
    city: string
    isp: string
  }
  accessedAt: number
}

interface DirectLinkStats {
  totalAccess: number
  todayAccess: number
  uniqueIPs: number
  lastAccess: number | null
  enabled: boolean
  createdAt: number
}

interface IPBan {
  id: string
  ipAddress: string
  reason: string | null
  enabled: boolean
  createdAt: number
  updatedAt: number
}

export default function DirectLinksPage() {
  const { user, token } = useAuth()
  const [directLinks, setDirectLinks] = useState<DirectLink[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLink, setSelectedLink] = useState<DirectLink | null>(null)
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [stats, setStats] = useState<DirectLinkStats | null>(null)
  const [logsLoading, setLogsLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [linkToDelete, setLinkToDelete] = useState<DirectLink | null>(null)
  const [copied, setCopied] = useState(false)
  const [bannedIPs, setBannedIPs] = useState<IPBan[]>([])
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [ipToBan, setIpToBan] = useState("")
  const [banReason, setBanReason] = useState("")
  const [selectedIPFromLog, setSelectedIPFromLog] = useState<string | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    if (user && token) {
      fetchDirectLinks()
    }
  }, [user, token])

  const fetchDirectLinks = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/direct-links`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDirectLinks(data.directLinks)
      } else {
        console.error("Failed to fetch direct links")
      }
    } catch (error) {
      console.error("Error fetching direct links:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAccessLogs = async (linkId: string) => {
    try {
      setLogsLoading(true)
      const response = await fetch(`${API_URL}/direct-links/${linkId}/logs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAccessLogs(data.logs)
      } else {
        console.error("Failed to fetch access logs")
      }
    } catch (error) {
      console.error("Error fetching access logs:", error)
    } finally {
      setLogsLoading(false)
    }
  }

  const fetchStats = async (linkId: string) => {
    try {
      setStatsLoading(true)
      const response = await fetch(`${API_URL}/direct-links/${linkId}/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        console.error("Failed to fetch stats")
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchBannedIPs = async (linkId: string) => {
    try {
      const response = await fetch(`${API_URL}/direct-links/${linkId}/banned-ips`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setBannedIPs(data.bans)
      } else {
        console.error("Failed to fetch banned IPs")
      }
    } catch (error) {
      console.error("Error fetching banned IPs:", error)
    }
  }

  const handleViewDetails = async (link: DirectLink) => {
    setSelectedLink(link)
    setDetailsOpen(true)
    await Promise.all([
      fetchAccessLogs(link.id),
      fetchStats(link.id),
      fetchBannedIPs(link.id)
    ])
  }

  const handleToggleLink = async (link: DirectLink) => {
    try {
      if (link.adminDisabled && !link.enabled) {
        alert("该直链因违规已被管理员禁用，无法启用")
        return
      }
      const response = await fetch(`${API_URL}/direct-links/${link.id}/toggle`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: !link.enabled }),
      })

      if (response.ok) {
        await fetchDirectLinks()
      } else {
        const err = await response.json().catch(() => ({}))
        alert(err.error || "操作失败")
      }
    } catch (error) {
      console.error("Error toggling link:", error)
      alert("操作失败")
    }
  }

  const handleBanIP = async () => {
    if (!selectedLink || !ipToBan.trim()) return

    try {
      const response = await fetch(`${API_URL}/direct-links/${selectedLink.id}/ban-ip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ipAddress: ipToBan.trim(),
          reason: banReason.trim() || null
        }),
      })

      if (response.ok) {
        await fetchBannedIPs(selectedLink.id)
        setBanDialogOpen(false)
        setIpToBan("")
        setBanReason("")
        setSelectedIPFromLog(null)
      } else {
        const error = await response.json()
        alert(error.error || "封禁失败")
      }
    } catch (error) {
      console.error("Error banning IP:", error)
      alert("封禁失败")
    }
  }

  const handleUnbanIP = async (banId: string) => {
    if (!selectedLink) return

    try {
      const response = await fetch(`${API_URL}/direct-links/${selectedLink.id}/ban-ip/${banId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        await fetchBannedIPs(selectedLink.id)
      } else {
        alert("解封失败")
      }
    } catch (error) {
      console.error("Error unbanning IP:", error)
      alert("解封失败")
    }
  }

  const handleBanIPFromLog = (ipAddress: string) => {
    setIpToBan(ipAddress)
    setSelectedIPFromLog(ipAddress)
    setBanDialogOpen(true)
  }

  const handleDeleteLink = async () => {
    if (!linkToDelete) return

    try {
      const response = await fetch(`${API_URL}/direct-links/${linkToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        await fetchDirectLinks()
        setDeleteDialogOpen(false)
        setLinkToDelete(null)
      } else {
        alert("删除失败")
      }
    } catch (error) {
      console.error("Error deleting link:", error)
      alert("删除失败")
    }
  }

  const handleCopyLink = async (link: DirectLink) => {
    // 使用新格式直链：/dl/filename?token=xxxxx
    const directUrl = link.token
      ? `${API_URL}/dl/${link.directName}?token=${link.token}`
      : `${API_URL}/files/direct/${link.directName}` // 向后兼容旧格式

    try {
      await navigator.clipboard.writeText(directUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Copy failed:", error)
      alert("复制失败")
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
    return new Date(timestamp).toLocaleString("zh-CN")
  }

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return <Smartphone className="h-4 w-4" />
    }
    return <Monitor className="h-4 w-4" />
  }

  const getLocationDisplay = (location: AccessLog['location']) => {
    const parts = [location.country, location.province, location.city].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : '未知'
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">直链管理</h1>
          <p className="text-muted-foreground">管理您创建的所有文件直链</p>
        </div>
        <Button onClick={fetchDirectLinks} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : directLinks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Link className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">暂无直链</h3>
            <p className="text-muted-foreground">您还没有创建任何文件直链</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>直链列表</CardTitle>
            <CardDescription>
              共 {directLinks.length} 个直链
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>文件名</TableHead>
                  <TableHead>直链名称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>访问次数</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{link.file.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatFileSize(link.file.size)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {link.directName}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={link.enabled ? "default" : "secondary"}>
                        {link.enabled ? "启用" : "禁用"}
                      </Badge>
                      {link.adminDisabled && (
                        <span className="ml-2 text-xs text-red-600">管理员禁用</span>
                      )}
                    </TableCell>
                    <TableCell>{link.accessCount}</TableCell>
                    <TableCell>{formatDate(link.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(link)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(link)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleLink(link)}
                          disabled={!!link.adminDisabled && !link.enabled}
                          title={link.adminDisabled && !link.enabled ? "该直链因违规已被管理员禁用，无法启用" : undefined}
                        >
                          {link.enabled ? (
                            <ToggleRight className="h-4 w-4" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setLinkToDelete(link)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 详情对话框 */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>直链详情</DialogTitle>
            <DialogDescription>
              {selectedLink?.file.name} 的访问统计和日志
            </DialogDescription>
          </DialogHeader>
          
          {selectedLink && (
            <Tabs defaultValue="stats" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="stats">统计信息</TabsTrigger>
                <TabsTrigger value="logs">访问日志</TabsTrigger>
                <TabsTrigger value="bans">IP封禁</TabsTrigger>
              </TabsList>
              
              <TabsContent value="stats" className="space-y-4">
                {statsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Activity className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-sm text-muted-foreground">总访问量</p>
                            <p className="text-2xl font-bold">{stats.totalAccess}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="text-sm text-muted-foreground">今日访问</p>
                            <p className="text-2xl font-bold">{stats.todayAccess}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-purple-500" />
                          <div>
                            <p className="text-sm text-muted-foreground">独立IP</p>
                            <p className="text-2xl font-bold">{stats.uniqueIPs}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-orange-500" />
                          <div>
                            <p className="text-sm text-muted-foreground">最后访问</p>
                            <p className="text-sm font-medium">
                              {stats.lastAccess ? formatDate(stats.lastAccess) : '从未'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="logs" className="space-y-4">
                {logsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP地址</TableHead>
                        <TableHead>归属地</TableHead>
                        <TableHead>设备</TableHead>
                        <TableHead>访问时间</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <code className="text-sm">{log.ipAddress}</code>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{getLocationDisplay(log.location)}</span>
                            </div>
                            {log.location.isp && (
                              <div className="text-sm text-muted-foreground">
                                {log.location.isp}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getDeviceIcon(log.userAgent)}
                              <span className="text-sm">{log.userAgent || '未知'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(log.accessedAt)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBanIPFromLog(log.ipAddress)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="bans" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">IP封禁管理</h3>
                  <Button
                    onClick={() => setBanDialogOpen(true)}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    封禁IP
                  </Button>
                </div>

                {bannedIPs.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">暂无封禁IP</h3>
                      <p className="text-muted-foreground">您还没有封禁任何IP地址</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP地址</TableHead>
                        <TableHead>封禁原因</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>封禁时间</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bannedIPs.map((ban) => (
                        <TableRow key={ban.id}>
                          <TableCell>
                            <code className="text-sm">{ban.ipAddress}</code>
                          </TableCell>
                          <TableCell>
                            {ban.reason || (
                              <span className="text-muted-foreground">无</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={ban.enabled ? "destructive" : "secondary"}>
                              {ban.enabled ? "已封禁" : "已解封"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(ban.createdAt)}</TableCell>
                          <TableCell>
                            {ban.enabled && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnbanIP(ban.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <ShieldOff className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除直链</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除直链 "{linkToDelete?.directName}" 吗？此操作不可撤销，所有访问日志也将被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLink}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* IP封禁对话框 */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>封禁IP地址</DialogTitle>
            <DialogDescription>
              封禁指定的IP地址，阻止其访问此直链
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="ip-address">IP地址</Label>
              <Input
                id="ip-address"
                value={ipToBan}
                onChange={(e) => setIpToBan(e.target.value)}
                placeholder="请输入要封禁的IP地址"
                className="mt-1"
              />
              {selectedIPFromLog && (
                <p className="text-sm text-muted-foreground mt-1">
                  来自访问日志的IP地址
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="ban-reason">封禁原因（可选）</Label>
              <Input
                id="ban-reason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="请输入封禁原因"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setBanDialogOpen(false)
                setIpToBan("")
                setBanReason("")
                setSelectedIPFromLog(null)
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleBanIP}
              disabled={!ipToBan.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              <Ban className="h-4 w-4 mr-2" />
              封禁
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {copied && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg">
          直链已复制到剪贴板
        </div>
      )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
