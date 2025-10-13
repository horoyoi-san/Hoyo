"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { useIsMobile } from "@/components/ui/use-mobile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  HardDrive,
  Users,
  Settings,
  RefreshCw,
  Edit,
  Calculator,
  AlertCircle,
  CheckCircle,
  Crown,
  User,
} from "lucide-react"
import { toast } from "sonner"

interface UserQuota {
  id: string
  userId: string
  maxStorage: number
  usedStorage: number
  role: string
  customQuota?: number
  createdAt: number
  updatedAt: number
  userEmail: string
}

interface RoleQuotaConfig {
  id: string
  role: string
  defaultQuota: number
  description?: string
  createdAt: number
  updatedAt: number
}

export function QuotaManagement() {
  const [quotas, setQuotas] = useState<UserQuota[]>([])
  const [roleConfigs, setRoleConfigs] = useState<RoleQuotaConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [roleConfigDialogOpen, setRoleConfigDialogOpen] = useState(false)
  const [selectedQuota, setSelectedQuota] = useState<UserQuota | null>(null)
  const [selectedRole, setSelectedRole] = useState("")
  const [maxStorage, setMaxStorage] = useState("")
  const [customQuota, setCustomQuota] = useState("")
  const [defaultQuota, setDefaultQuota] = useState("")
  const [description, setDescription] = useState("")
  const { token } = useAuth()
  const isMobile = useIsMobile()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    fetchQuotas()
    fetchRoleConfigs()
  }, [])

  const fetchQuotas = async () => {
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/admin/user-quotas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setQuotas(data.quotas || [])
      } else {
        toast.error("获取用户配额失败", {
          description: "无法加载用户配额信息"
        })
      }
    } catch (error) {
      console.error("Failed to fetch quotas:", error)
      toast.error("网络错误", {
        description: "无法连接到服务器"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchRoleConfigs = async () => {
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/admin/role-quota-config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRoleConfigs(data.configs || [])
      }
    } catch (error) {
      console.error("Failed to fetch role configs:", error)
    }
  }

  const handleUpdateQuota = async () => {
    if (!selectedQuota || !maxStorage) {
      toast.error("请填写所有必需字段", {
        description: "最大存储空间是必需的"
      })
      return
    }

    try {
      const maxStorageBytes = parseFloat(maxStorage) * 1024 * 1024 * 1024 // GB to bytes
      const customQuotaBytes = customQuota ? parseFloat(customQuota) * 1024 * 1024 * 1024 : undefined

      const response = await fetch(`${API_URL}/admin/user-quotas/${selectedQuota.userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          maxStorage: maxStorageBytes,
          customQuota: customQuotaBytes,
        }),
      })

      if (response.ok) {
        toast.success("用户配额更新成功", {
          description: `用户 ${selectedQuota.email} 的配额已更新`
        })
        setEditDialogOpen(false)
        setSelectedQuota(null)
        await fetchQuotas()
      } else {
        const errorData = await response.json()
        toast.error("更新配额失败", {
          description: errorData.error || "无法更新用户配额"
        })
      }
    } catch (error) {
      toast.error("网络错误", {
        description: "无法连接到服务器"
      })
    }
  }

  const handleUpdateRoleConfig = async () => {
    if (!selectedRole || !defaultQuota) {
      toast.error("请填写所有必需字段", {
        description: "角色和默认配额都是必需的"
      })
      return
    }

    try {
      const defaultQuotaBytes = parseFloat(defaultQuota) * 1024 * 1024 * 1024 // GB to bytes

      const response = await fetch(`${API_URL}/admin/role-quota-config/${selectedRole}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          defaultQuota: defaultQuotaBytes,
          description,
        }),
      })

      if (response.ok) {
        toast.success("角色默认配额更新成功", {
          description: `角色 "${selectedRole}" 的默认配额已更新`
        })
        setRoleConfigDialogOpen(false)
        setSelectedRole("")
        await fetchRoleConfigs()
      } else {
        const errorData = await response.json()
        toast.error("更新角色配额失败", {
          description: errorData.error || "无法更新角色默认配额"
        })
      }
    } catch (error) {
      toast.error("网络错误", {
        description: "无法连接到服务器"
      })
    }
  }

  const handleRecalculateStorage = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/recalculate-user-storage/${userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const localStorageFormatted = formatFileSize(data.localStorage || 0)
        const r2StorageFormatted = formatFileSize(data.r2Storage || 0)
        const totalFormatted = formatFileSize(data.newUsedStorage || 0)

        toast.success("存储使用量重新计算成功", {
          description: `总计: ${totalFormatted} (本地: ${localStorageFormatted}, R2: ${r2StorageFormatted})`
        })
        await fetchQuotas()
      } else {
        const errorData = await response.json()
        toast.error("重新计算失败", {
          description: errorData.error || "无法重新计算存储使用量"
        })
      }
    } catch (error) {
      toast.error("网络错误", {
        description: "无法连接到服务器"
      })
    }
  }

  const handleRecalculateAllStorage = async () => {
    if (!confirm("确定要重新计算所有用户的存储使用量吗？这可能需要一些时间。")) return

    try {
      const response = await fetch(`${API_URL}/admin/recalculate-all-storage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("批量重新计算完成", {
          description: `已更新 ${data.updatedCount} 个用户的存储使用量`
        })
        await fetchQuotas()
      } else {
        const errorData = await response.json()
        toast.error("批量重新计算失败", {
          description: errorData.error || "无法批量重新计算存储使用量"
        })
      }
    } catch (error) {
      toast.error("网络错误", {
        description: "无法连接到服务器"
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 字节"
    const k = 1024
    const sizes = ["字节", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getUsagePercentage = (used: number, total: number) => {
    if (total === 0) return 0
    return Math.round((used / total) * 100)
  }

  const handleEditQuota = (quota: UserQuota) => {
    setSelectedQuota(quota)
    setMaxStorage((quota.maxStorage / 1024 / 1024 / 1024).toString())
    setCustomQuota(quota.customQuota ? (quota.customQuota / 1024 / 1024 / 1024).toString() : "")
    setEditDialogOpen(true)
  }

  const handleEditRoleConfig = (role: string) => {
    const config = roleConfigs.find(c => c.role === role)
    setSelectedRole(role)
    setDefaultQuota(config ? (config.defaultQuota / 1024 / 1024 / 1024).toString() : "")
    setDescription(config?.description || "")
    setRoleConfigDialogOpen(true)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 角色默认配额配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                角色默认配额配置
              </CardTitle>
              <CardDescription>
                设置不同角色的默认存储配额
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {["admin", "user"].map((role) => {
              const config = roleConfigs.find(c => c.role === role)
              return (
                <Card key={role} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {role === "admin" ? (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <User className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-medium">
                          {role === "admin" ? "管理员" : "普通用户"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRoleConfig(role)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold">
                      {config ? formatFileSize(config.defaultQuota) : "未配置"}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {config?.description || "默认配额"}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 用户配额管理 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <HardDrive className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">用户存储配额管理</span>
              </CardTitle>
              <CardDescription className="text-sm">
                管理所有用户的存储配额和使用情况
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={fetchQuotas} size="sm" className="text-xs sm:text-sm">
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                刷新
              </Button>
              <Button variant="outline" onClick={handleRecalculateAllStorage} size="sm" className="text-xs sm:text-sm">
                <Calculator className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">重新计算全部</span>
                <span className="sm:hidden">重新计算</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {quotas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无用户配额记录</p>
            </div>
          ) : isMobile ? (
            /* 移动端卡片布局 */
            <div className="space-y-3">
              {quotas.map((quota) => {
                const usagePercentage = getUsagePercentage(quota.usedStorage, quota.maxStorage)
                const effectiveQuota = quota.customQuota || quota.maxStorage

                return (
                  <Card key={quota.id} className="border">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* 用户信息和角色 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Users className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium truncate text-sm">{quota.userEmail}</span>
                          </div>
                          <Badge variant={quota.role === "admin" ? "default" : "secondary"} className="text-xs">
                            {quota.role === "admin" ? "管理员" : "用户"}
                          </Badge>
                        </div>

                        {/* 配额信息 */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-muted-foreground text-xs">配额</div>
                            <div className="font-medium">{formatFileSize(effectiveQuota)}</div>
                            {quota.customQuota && (
                              <div className="text-xs text-muted-foreground">自定义配额</div>
                            )}
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">已使用</div>
                            <div className="font-medium">{formatFileSize(quota.usedStorage)}</div>
                            <div className="text-xs text-muted-foreground">
                              剩余 {formatFileSize(effectiveQuota - quota.usedStorage)}
                            </div>
                          </div>
                        </div>

                        {/* 使用率进度条 */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">使用率</span>
                            <span className="font-medium">{usagePercentage}%</span>
                          </div>
                          <Progress value={usagePercentage} className="h-2" />
                        </div>

                        {/* 更新时间和操作按钮 */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            更新于 {formatDate(quota.updatedAt)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditQuota(quota)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRecalculateStorage(quota.userId)}
                              className="h-8 w-8 p-0"
                            >
                              <Calculator className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            /* 桌面端表格布局 */
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>配额</TableHead>
                    <TableHead>使用情况</TableHead>
                    <TableHead>使用率</TableHead>
                    <TableHead>更新时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotas.map((quota) => {
                    const usagePercentage = getUsagePercentage(quota.usedStorage, quota.maxStorage)
                    const effectiveQuota = quota.customQuota || quota.maxStorage

                    return (
                      <TableRow key={quota.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {quota.userEmail}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={quota.role === "admin" ? "default" : "secondary"}>
                            {quota.role === "admin" ? "管理员" : "用户"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatFileSize(effectiveQuota)}</div>
                            {quota.customQuota && (
                              <div className="text-xs text-muted-foreground">自定义配额</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatFileSize(quota.usedStorage)}</div>
                            <div className="text-xs text-muted-foreground">
                              剩余 {formatFileSize(effectiveQuota - quota.usedStorage)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Progress value={usagePercentage} className="flex-1" />
                              <span className="text-sm font-medium">{usagePercentage}%</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(quota.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditQuota(quota)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRecalculateStorage(quota.userId)}
                            >
                              <Calculator className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑用户配额对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户配额</DialogTitle>
            <DialogDescription>
              修改用户的存储配额设置
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxStorage">最大存储容量 (GB)</Label>
              <Input
                id="maxStorage"
                type="number"
                value={maxStorage}
                onChange={(e) => setMaxStorage(e.target.value)}
                placeholder="输入最大存储容量"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customQuota">自定义配额 (GB，可选)</Label>
              <Input
                id="customQuota"
                type="number"
                value={customQuota}
                onChange={(e) => setCustomQuota(e.target.value)}
                placeholder="留空使用默认配额"
              />
              <p className="text-xs text-muted-foreground">
                如果设置自定义配额，将覆盖角色默认配额
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateQuota}>
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑角色配额对话框 */}
      <Dialog open={roleConfigDialogOpen} onOpenChange={setRoleConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑角色默认配额</DialogTitle>
            <DialogDescription>
              设置 {selectedRole === "admin" ? "管理员" : "普通用户"} 的默认存储配额
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultQuota">默认配额 (GB)</Label>
              <Input
                id="defaultQuota"
                type="number"
                value={defaultQuota}
                onChange={(e) => setDefaultQuota(e.target.value)}
                placeholder="输入默认配额"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述 (可选)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入配额描述"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleConfigDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateRoleConfig}>
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
