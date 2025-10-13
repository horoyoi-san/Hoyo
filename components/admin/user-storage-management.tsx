"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/components/auth/auth-provider"
import { AlertCircle, CheckCircle, Users, HardDrive, Settings, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StorageStrategy {
  id: string
  name: string
  type: string
  config: any
  isActive: boolean
}

interface UserStorageAssignment {
  assignment: {
    id: string
    userId: string
    strategyId: string
    userFolder: string
    createdAt: number
    updatedAt: number
  }
  user: {
    id: string
    email: string
    role: string
  }
  strategy: StorageStrategy
}

interface RoleStorageDefault {
  id: string
  role: string
  strategyId: string
  createdAt: number
  updatedAt: number
}

export function UserStorageManagement() {
  const [strategies, setStrategies] = useState<StorageStrategy[]>([])
  const [assignments, setAssignments] = useState<UserStorageAssignment[]>([])
  const [roleDefaults, setRoleDefaults] = useState<{
    admin: RoleStorageDefault | null
    user: RoleStorageDefault | null
  }>({ admin: null, user: null })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { token } = useAuth()
  const { toast } = useToast()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    if (!token) return

    setLoading(true)
    try {
      // 并行获取所有数据
      const [strategiesRes, assignmentsRes, defaultsRes] = await Promise.all([
        fetch(`${API_URL}/admin/storage-strategies`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/admin/user-storage-assignments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/admin/role-storage-defaults`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ])

      if (strategiesRes.ok) {
        const data = await strategiesRes.json()
        setStrategies(data.strategies || [])
      }

      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json()
        setAssignments(data.assignments || [])
      }

      if (defaultsRes.ok) {
        const data = await defaultsRes.json()
        setRoleDefaults(data.defaults || { admin: null, user: null })
      }
    } catch (err) {
      setError("获取数据失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  const setRoleDefault = async (role: string, strategyId: string) => {
    if (!token) return

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`${API_URL}/admin/role-storage-default`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, strategyId }),
      })

      if (response.ok) {
        setSuccess(`${role === 'admin' ? '管理员' : '用户'}角色默认存储策略已设置`)
        toast({
          title: "设置成功",
          description: `${role === 'admin' ? '管理员' : '用户'}角色默认存储策略已更新`,
        })
        await fetchData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || "设置角色默认存储策略失败")
      }
    } catch (err) {
      setError("网络错误，请稍后重试")
    } finally {
      setSaving(false)
    }
  }

  const assignUserStorage = async (userId: string, strategyId: string) => {
    if (!token) return

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`${API_URL}/admin/assign-user-storage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, strategyId }),
      })

      if (response.ok) {
        setSuccess("用户存储策略分配成功")
        toast({
          title: "分配成功",
          description: "用户存储策略已更新",
        })
        await fetchData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || "分配用户存储策略失败")
      }
    } catch (err) {
      setError("网络错误，请稍后重试")
    } finally {
      setSaving(false)
    }
  }

  const removeUserStorage = async (userId: string) => {
    if (!token) return

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`${API_URL}/admin/user-storage-assignment/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setSuccess("用户存储策略分配已删除")
        toast({
          title: "删除成功",
          description: "用户存储策略分配已移除",
        })
        await fetchData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || "删除用户存储策略分配失败")
      }
    } catch (err) {
      setError("网络错误，请稍后重试")
    } finally {
      setSaving(false)
    }
  }

  const getStorageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      local: "本地存储",
      r2: "Cloudflare R2",
      onedrive: "OneDrive",
      webdav: "WebDAV"
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>用户存储策略管理</CardTitle>
          <CardDescription>为用户和角色分配存储策略</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* 角色默认存储策略配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            角色默认存储策略
          </CardTitle>
          <CardDescription>
            为不同角色设置默认的存储策略，新用户注册时会自动分配对应的存储策略
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {strategies.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                没有找到活跃的存储策略。请先在存储配置中创建并启用存储策略。
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* 管理员角色默认策略 */}
              <div className="space-y-2">
                <Label>管理员角色默认存储策略</Label>
                <div className="flex gap-2">
                  <Select
                    value={roleDefaults.admin?.strategyId || ""}
                    onValueChange={(value) => setRoleDefault("admin", value)}
                    disabled={saving}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="选择存储策略" />
                    </SelectTrigger>
                    <SelectContent>
                      {strategies.map((strategy) => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4" />
                            <span>{strategy.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {getStorageTypeLabel(strategy.type)}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {roleDefaults.admin && (
                  <div className="text-sm text-muted-foreground">
                    当前策略: {strategies.find(s => s.id === roleDefaults.admin?.strategyId)?.name}
                  </div>
                )}
              </div>

              {/* 用户角色默认策略 */}
              <div className="space-y-2">
                <Label>用户角色默认存储策略</Label>
                <div className="flex gap-2">
                  <Select
                    value={roleDefaults.user?.strategyId || ""}
                    onValueChange={(value) => setRoleDefault("user", value)}
                    disabled={saving}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="选择存储策略" />
                    </SelectTrigger>
                    <SelectContent>
                      {strategies.map((strategy) => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4" />
                            <span>{strategy.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {getStorageTypeLabel(strategy.type)}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {roleDefaults.user && (
                  <div className="text-sm text-muted-foreground">
                    当前策略: {strategies.find(s => s.id === roleDefaults.user?.strategyId)?.name}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* 用户存储策略分配 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            用户存储策略分配
          </CardTitle>
          <CardDescription>
            查看和管理每个用户的存储策略分配情况
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无用户存储策略分配
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.assignment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{assignment.user.email}</span>
                      <Badge variant={assignment.user.role === 'admin' ? 'default' : 'secondary'}>
                        {assignment.user.role === 'admin' ? '管理员' : '用户'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <HardDrive className="h-4 w-4" />
                      <span>{assignment.strategy.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {getStorageTypeLabel(assignment.strategy.type)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      用户文件夹: {assignment.assignment.userFolder}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={assignment.assignment.strategyId}
                      onValueChange={(value) => assignUserStorage(assignment.user.id, value)}
                      disabled={saving}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {strategies.map((strategy) => (
                          <SelectItem key={strategy.id} value={strategy.id}>
                            <div className="flex items-center gap-2">
                              <HardDrive className="h-4 w-4" />
                              <span>{strategy.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {getStorageTypeLabel(strategy.type)}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeUserStorage(assignment.user.id)}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}