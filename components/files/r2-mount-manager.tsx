"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { R2Browser } from "../admin/r2-browser"
import {
  Cloud,
  FolderPlus,
  Trash2,
  Link,
  AlertCircle,
  CheckCircle,
  Settings,
} from "lucide-react"

// 临时解决方案：直接定义 CardDescription 组件
const CardDescription = ({ children, className = "", ...props }: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any
}) => (
  <div className={`text-sm text-muted-foreground ${className}`} {...props}>
    {children}
  </div>
)

interface FolderItem {
  id: string
  name: string
  path: string
}

interface MountPoint {
  id: string
  folderId: string
  r2Path: string
  mountName: string
  enabled: boolean
  createdAt: number
  updatedAt: number
}

interface R2MountManagerProps {
  folders: FolderItem[]
  onMountCreated: () => void
}

export function R2MountManager({ folders, onMountCreated }: R2MountManagerProps) {
  const [mounts, setMounts] = useState<MountPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [browserOpen, setBrowserOpen] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState("")
  const [selectedR2Path, setSelectedR2Path] = useState("")
  const [mountName, setMountName] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { token } = useAuth()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    fetchMounts()
  }, [])

  const fetchMounts = async () => {
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/storage/r2/mounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMounts(data.mounts || [])
      } else {
        console.error("Failed to fetch mounts")
      }
    } catch (error) {
      console.error("Failed to fetch mounts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMount = async () => {
    if (!selectedFolderId || !selectedR2Path || !mountName.trim()) {
      setError("请填写所有必需字段")
      return
    }

    try {
      const response = await fetch(`${API_URL}/storage/r2/mount`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          folderId: selectedFolderId,
          r2Path: selectedR2Path,
          mountName: mountName.trim(),
        }),
      })

      if (response.ok) {
        setSuccess("R2 挂载点创建成功")
        setCreateDialogOpen(false)
        setSelectedFolderId("")
        setSelectedR2Path("")
        setMountName("")
        setError("")
        await fetchMounts()
        onMountCreated()
      } else {
        const errorData = await response.json()
        setError(errorData.error || "创建挂载点失败")
      }
    } catch (error) {
      setError("网络错误")
    }
  }

  const handleDeleteMount = async (mountId: string) => {
    if (!confirm("确定要删除此挂载点吗？")) return

    try {
      const response = await fetch(`${API_URL}/storage/r2/mount/${mountId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setSuccess("挂载点删除成功")
        await fetchMounts()
        onMountCreated()
      } else {
        const errorData = await response.json()
        setError(errorData.error || "删除挂载点失败")
      }
    } catch (error) {
      setError("网络错误")
    }
  }

  const handleSelectR2Path = (path: string) => {
    // 直接使用API返回的路径，保留空字符串作为根路径
    setSelectedR2Path(path)
    setBrowserOpen(false)
  }

  const getFolderName = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId)
    return folder ? folder.name : "未知文件夹"
  }

  const getFolderPath = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId)
    return folder ? folder.path : ""
  }

  // 获取显示用的R2路径（根路径显示为 "/"）- 仅用于UI显示
  const getDisplayR2Path = (path: string) => {
    return path || "/"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                R2 挂载点管理
              </CardTitle>
              <CardDescription>
                将 Cloudflare R2 存储桶目录挂载到本地文件夹
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  创建挂载点
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>创建 R2 挂载点</DialogTitle>
                  <DialogDescription>
                    选择本地文件夹和 R2 路径来创建挂载点
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="folder">目标文件夹</Label>
                    <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择要挂载的文件夹" />
                      </SelectTrigger>
                      <SelectContent>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.path}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="r2Path">R2 路径</Label>
                    <div className="flex gap-2">
                      <Input
                        value={selectedR2Path}
                        onChange={(e) => setSelectedR2Path(e.target.value)}
                        placeholder="输入 R2 路径或点击浏览"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => setBrowserOpen(true)}
                      >
                        浏览
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mountName">挂载点名称</Label>
                    <Input
                      value={mountName}
                      onChange={(e) => setMountName(e.target.value)}
                      placeholder="输入挂载点显示名称"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateMount}>
                    创建挂载点
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {mounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无 R2 挂载点</p>
              <p className="text-sm">点击上方按钮创建第一个挂载点</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mounts.map((mount) => (
                <Card key={mount.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{mount.mountName}</h4>
                          <Badge variant={mount.enabled ? "default" : "secondary"}>
                            {mount.enabled ? "已启用" : "已禁用"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Link className="h-3 w-3" />
                            本地: {getFolderPath(mount.folderId)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Cloud className="h-3 w-3" />
                            R2: {getDisplayR2Path(mount.r2Path)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMount(mount.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
