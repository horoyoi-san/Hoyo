"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { User, Shield, Trash2, Calendar, UserPlus } from "lucide-react"
import { toast } from "sonner"

interface UserItem {
  id: string
  email: string
  role: "admin" | "user"
  createdAt: number
}

interface UserManagementProps {
  onUserDeleted: () => void
}

export function UserManagement({ onUserDeleted }: UserManagementProps) {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [allowUserRegistration, setAllowUserRegistration] = useState(true)
  const [updatingRegistration, setUpdatingRegistration] = useState(false)
  const { token } = useAuth()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    fetchUsers()
    fetchRegistrationSettings()
  }, [])

  const fetchUsers = async () => {
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRegistrationSettings = async () => {
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/site-config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAllowUserRegistration(data.allowUserRegistration ?? true)
      }
    } catch (error) {
      console.error("Failed to fetch registration settings:", error)
    }
  }

  const handleUpdateRegistrationSetting = async (enabled: boolean) => {
    if (!token) return

    setUpdatingRegistration(true)

    try {
      const response = await fetch(`${API_URL}/admin/site-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ allowUserRegistration: enabled }),
      })

      if (response.ok) {
        setAllowUserRegistration(enabled)
        toast.success(
          enabled ? "已开启用户注册" : "已关闭用户注册", 
          {
            description: enabled 
              ? "新用户现在可以注册账户" 
              : "已禁止新用户注册，注册页面将显示相应提示"
          }
        )
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error("设置失败", {
          description: errorData.error || "无法更新注册设置"
        })
        // 回滚状态
        setAllowUserRegistration(!enabled)
      }
    } catch (error) {
      console.error("Failed to update registration setting:", error)
      toast.error("设置失败", {
        description: "网络连接错误，请稍后重试"
      })
      // 回滚状态
      setAllowUserRegistration(!enabled)
    } finally {
      setUpdatingRegistration(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!token) return

    setDeletingId(userId)

    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const deletedUser = users.find(user => user.id === userId)
        setUsers((prev) => prev.filter((user) => user.id !== userId))
        onUserDeleted()
        toast.success("用户删除成功", {
          description: `用户 "${deletedUser?.email}" 及其所有文件已被删除`
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error("删除用户失败", {
          description: errorData.error || "无法删除用户"
        })
      }
    } catch (error) {
      console.error("Delete failed:", error)
      toast.error("删除失败", {
        description: "网络连接错误，请稍后重试"
      })
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">未找到用户</h3>
        <p className="text-muted-foreground">系统中没有注册用户</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 用户注册设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            用户注册设置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="registration-toggle" className="text-sm font-medium">
                允许新用户注册
              </Label>
              <p className="text-sm text-muted-foreground">
                关闭后将禁止新用户在注册页面创建账户
              </p>
            </div>
            <Switch
              id="registration-toggle"
              checked={allowUserRegistration}
              onCheckedChange={handleUpdateRegistrationSetting}
              disabled={updatingRegistration}
            />
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 flex-shrink-0">
                  {user.role === "admin" ? (
                    <Shield className="h-5 w-5 text-primary" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                    <h4 className="font-medium truncate text-sm sm:text-base">{user.email}</h4>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs self-start sm:self-auto">
                      {user.role.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">加入于 {formatDate(user.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {user.id !== "admin" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>删除用户</AlertDialogTitle>
                        <AlertDialogDescription>
                          您确定要删除用户 "{user.email}" 吗？这将同时删除他们的所有文件。
                          此操作无法撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={deletingId === user.id}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {deletingId === user.id ? "删除中..." : "删除用户"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {user.id === "admin" && (
                  <Badge variant="outline" className="text-xs">
                    受保护
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  )
}
