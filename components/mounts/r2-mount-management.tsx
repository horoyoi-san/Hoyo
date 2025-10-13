"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { Switch } from "@/components/ui/switch"
import { R2Browser } from "@/components/admin/r2-browser"
import {
  Cloud,
  FolderPlus,
  Trash2,
  Edit,
  Users,
  Folder,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Plus,
} from "lucide-react"
import { toast } from "sonner"

interface MountPoint {
  id: string
  userId: string
  folderId: string
  r2Path: string
  mountName: string
  enabled: boolean
  createdAt: number
  updatedAt: number
  userEmail: string
  folderName: string
  folderPath: string
}

interface User {
  id: string
  email: string
  role: string
}

interface Folder {
  id: string
  name: string
  path: string
  userId: string
}

export function R2MountManagement() {
  const [mounts, setMounts] = useState<MountPoint[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserFolders, setSelectedUserFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [browserOpen, setBrowserOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedFolderId, setSelectedFolderId] = useState("")
  const [selectedR2Path, setSelectedR2Path] = useState("")
  const [mountName, setMountName] = useState("")
  const [editingMount, setEditingMount] = useState<MountPoint | null>(null)
  const { token } = useAuth()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    fetchMounts()
    fetchUsers()
  }, [])

  const fetchMounts = async () => {
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/admin/r2-mounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMounts(data.mounts || [])
      } else {
        toast.error("获取挂载点失败", {
          description: "无法加载 R2 挂载点列表"
        })
      }
    } catch (error) {
      console.error("Failed to fetch mounts:", error)
      toast.error("网络错误", {
        description: "无法连接到服务器"
      })
    } finally {
      setLoading(false)
    }
  }

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
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

  const fetchUserFolders = async (userId: string) => {
    if (!token || !userId) return

    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/folders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedUserFolders(data.folders || [])
      } else {
        setSelectedUserFolders([])
      }
    } catch (error) {
      console.error("Failed to fetch user folders:", error)
      setSelectedUserFolders([])
    }
  }

  const handleCreateMount = async () => {
    if (!selectedUserId || !selectedFolderId || !selectedR2Path || !mountName.trim()) {
      toast.error("请填写所有必需字段", {
        description: "用户、文件夹、R2路径和挂载名称都是必需的"
      })
      return
    }

    try {
      const response = await fetch(`${API_URL}/admin/r2-mounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedUserId,
          folderId: selectedFolderId,
          r2Path: selectedR2Path,
          mountName: mountName.trim(),
        }),
      })

      if (response.ok) {
        toast.success("R2 挂载点创建成功", {
          description: `挂载点 "${mountName}" 已成功创建`
        })
        setCreateDialogOpen(false)
        resetCreateForm()
        await fetchMounts()
      } else {
        const errorData = await response.json()
        toast.error("创建挂载点失败", {
          description: errorData.error || "无法创建 R2 挂载点"
        })
      }
    } catch (error) {
      toast.error("网络错误", {
        description: "无法连接到服务器"
      })
    }
  }

  const handleUpdateMount = async () => {
    if (!editingMount || !mountName.trim()) {
      toast.error("请填写所有必需字段", {
        description: "挂载名称不能为空"
      })
      return
    }

    try {
      const response = await fetch(`${API_URL}/admin/r2-mounts/${editingMount.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mountName: mountName.trim(),
          r2Path: selectedR2Path,
          enabled: editingMount.enabled,
        }),
      })

      if (response.ok) {
        toast.success("挂载点更新成功", {
          description: `挂载点 "${mountName}" 已成功更新`
        })
        setEditDialogOpen(false)
        setEditingMount(null)
        await fetchMounts()
      } else {
        const errorData = await response.json()
        toast.error("更新挂载点失败", {
          description: errorData.error || "无法更新挂载点"
        })
      }
    } catch (error) {
      toast.error("网络错误", {
        description: "无法连接到服务器"
      })
    }
  }

  const handleDeleteMount = async (mountId: string) => {
    if (!confirm("确定要删除此挂载点吗？")) return

    try {
      const response = await fetch(`${API_URL}/admin/r2-mounts/${mountId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast.success("挂载点删除成功", {
          description: "挂载点已从系统中移除"
        })
        await fetchMounts()
      } else {
        const errorData = await response.json()
        toast.error("删除挂载点失败", {
          description: errorData.error || "无法删除挂载点"
        })
      }
    } catch (error) {
      toast.error("网络错误", {
        description: "无法连接到服务器"
      })
    }
  }

  const handleToggleMount = async (mount: MountPoint) => {
    try {
      const response = await fetch(`${API_URL}/admin/r2-mounts/${mount.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mountName: mount.mountName,
          r2Path: mount.r2Path,
          enabled: !mount.enabled,
        }),
      })

      if (response.ok) {
        toast.success(`挂载点已${mount.enabled ? "禁用" : "启用"}`, {
          description: `挂载点 "${mount.mountName}" 状态已更新`
        })
        await fetchMounts()
      } else {
        const errorData = await response.json()
        toast.error("操作失败", {
          description: errorData.error || "无法更新挂载点状态"
        })
      }
    } catch (error) {
      toast.error("网络错误", {
        description: "无法连接到服务器"
      })
    }
  }

  const resetCreateForm = () => {
    setSelectedUserId("")
    setSelectedFolderId("")
    setSelectedR2Path("")
    setMountName("")
    setSelectedUserFolders([])
  }

  const handleSelectR2Path = (path: string) => {
    setSelectedR2Path(path)
    setBrowserOpen(false)
  }

  const handleEditMount = (mount: MountPoint) => {
    setEditingMount(mount)
    setMountName(mount.mountName)
    setSelectedR2Path(mount.r2Path)
    setEditDialogOpen(true)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN")
  }

  const getDisplayR2Path = (path: string) => {
    return path || "/"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h3 className="text-base sm:text-lg font-medium">R2 挂载点</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            管理所有用户的 Cloudflare R2 存储桶挂载点
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMounts} size="sm">
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">刷新</span>
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">创建挂载点</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl mx-4 sm:mx-auto max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-base sm:text-lg">创建 R2 挂载点</DialogTitle>
                <DialogDescription className="text-sm">
                  为指定用户创建 R2 存储桶挂载点
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 flex-1 overflow-auto">
                <div className="space-y-2">
                  <Label htmlFor="user" className="text-sm">目标用户</Label>
                  <Select 
                    value={selectedUserId} 
                    onValueChange={(value) => {
                      setSelectedUserId(value)
                      setSelectedFolderId("")
                      fetchUserFolders(value)
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="选择用户" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="truncate text-sm">{user.email}</span>
                            <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
                              {user.role}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="folder" className="text-sm">目标文件夹</Label>
                  <Select 
                    value={selectedFolderId} 
                    onValueChange={setSelectedFolderId}
                    disabled={!selectedUserId}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="选择要挂载的文件夹" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedUserFolders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          <div className="flex items-center gap-2">
                            <Folder className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="truncate text-sm">{folder.path}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="r2Path" className="text-sm">R2 路径</Label>
                  <div className="flex gap-2">
                    <Input
                      value={selectedR2Path}
                      onChange={(e) => setSelectedR2Path(e.target.value)}
                      placeholder="输入 R2 路径或点击浏览"
                      className="flex-1 h-9 text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setBrowserOpen(true)}
                      size="sm"
                      className="px-3"
                    >
                      浏览
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mountName" className="text-sm">挂载点名称</Label>
                  <Input
                    value={mountName}
                    onChange={(e) => setMountName(e.target.value)}
                    placeholder="输入挂载点显示名称"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => {
                  setCreateDialogOpen(false)
                  resetCreateForm()
                }} className="text-sm">
                  取消
                </Button>
                <Button onClick={handleCreateMount} className="text-sm">
                  创建挂载点
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {mounts.length === 0 ? (
        <div className="text-center py-6 sm:py-8 text-muted-foreground">
          <Cloud className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
          <p className="text-sm sm:text-base">暂无 R2 挂载点</p>
          <p className="text-xs sm:text-sm">点击上方按钮创建第一个挂载点</p>
        </div>
      ) : (
        <>
          {/* 桌面端表格 */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>挂载点名称</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>本地文件夹</TableHead>
                  <TableHead>R2 路径</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mounts.map((mount) => (
                  <TableRow key={mount.id}>
                    <TableCell className="font-medium">
                      {mount.mountName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {mount.userEmail}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        {mount.folderPath}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {getDisplayR2Path(mount.r2Path)}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={mount.enabled}
                          onCheckedChange={() => handleToggleMount(mount)}
                        />
                        <Badge variant={mount.enabled ? "default" : "secondary"}>
                          {mount.enabled ? "启用" : "禁用"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(mount.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMount(mount)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMount(mount.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 移动端卡片布局 */}
          <div className="md:hidden space-y-3">
            {mounts.map((mount) => (
              <Card key={mount.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{mount.mountName}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Switch
                            checked={mount.enabled}
                            onCheckedChange={() => handleToggleMount(mount)}
                            className="scale-75"
                          />
                          <Badge variant={mount.enabled ? "default" : "secondary"} className="text-xs">
                            {mount.enabled ? "启用" : "禁用"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMount(mount)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMount(mount.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">用户:</span>
                        <span className="truncate">{mount.userEmail}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Folder className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">文件夹:</span>
                        <span className="truncate">{mount.folderPath}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Cloud className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">R2路径:</span>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded truncate">
                          {getDisplayR2Path(mount.r2Path)}
                        </code>
                      </div>
                      <div className="text-muted-foreground">
                        创建时间: {formatDate(mount.createdAt)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="mx-4 sm:mx-auto max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-base sm:text-lg">编辑 R2 挂载点</DialogTitle>
            <DialogDescription className="text-sm">
              修改挂载点的名称和 R2 路径
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-auto">
            <div className="space-y-2">
              <Label htmlFor="editMountName" className="text-sm">挂载点名称</Label>
              <Input
                id="editMountName"
                value={mountName}
                onChange={(e) => setMountName(e.target.value)}
                placeholder="输入挂载点显示名称"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editR2Path" className="text-sm">R2 路径</Label>
              <div className="flex gap-2">
                <Input
                  id="editR2Path"
                  value={selectedR2Path}
                  onChange={(e) => setSelectedR2Path(e.target.value)}
                  placeholder="输入 R2 路径或点击浏览"
                  className="flex-1 h-9 text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => setBrowserOpen(true)}
                  size="sm"
                  className="px-3"
                >
                  浏览
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setEditDialogOpen(false)
              setEditingMount(null)
            }} className="text-sm">
              取消
            </Button>
            <Button onClick={handleUpdateMount} className="text-sm">
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* R2 浏览器 */}
      <R2Browser
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        onSelectPath={handleSelectR2Path}
        title="选择 R2 挂载路径"
        description="选择要挂载到本地文件夹的 R2 目录"
      />
    </div>
  )
}