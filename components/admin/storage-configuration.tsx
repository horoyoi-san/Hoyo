"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { HardDrive, Cloud, Save, CheckCircle, AlertCircle, Clock, Globe, Copy, Plus, Edit, Trash2, Settings } from "lucide-react"
import { toast } from "sonner"
import { AzureSetupGuide } from "./azure-setup-guide"

interface StorageStrategy {
  id: string
  name: string
  type: "local" | "r2" | "onedrive" | "webdav"
  config: {
    r2Endpoint?: string
    r2Bucket?: string
    r2AccessKey?: string
    r2SecretKey?: string
    oneDriveClientId?: string
    oneDriveTenantId?: string
    webDavUrl?: string
    webDavUser?: string
    webDavPass?: string
  }
  isActive: boolean
  createdAt: string
}

export function StorageConfiguration() {
  const [strategies, setStrategies] = useState<StorageStrategy[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStrategy, setEditingStrategy] = useState<StorageStrategy | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    type: "local" as "local" | "r2" | "onedrive" | "webdav",
    r2Endpoint: "",
    r2AccessKey: "",
    r2SecretKey: "",
    r2Bucket: "",
    oneDriveClientId: "",
    oneDriveClientSecret: "",
    oneDriveTenantId: "",
    webDavUrl: "",
    webDavUser: "",
    webDavPass: "",
  })
  const { token } = useAuth()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    fetchStrategies()
  }, [token])

  const fetchStrategies = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/storage/strategies`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStrategies(data.strategies || [])
      }
    } catch (error) {
      console.error("Failed to fetch storage strategies:", error)
      toast.error("获取存储策略失败")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStrategy = () => {
    setEditingStrategy(null)
    setFormData({
      name: "",
      type: "local",
      r2Endpoint: "",
      r2AccessKey: "",
      r2SecretKey: "",
      r2Bucket: "",
      oneDriveClientId: "",
      oneDriveClientSecret: "",
      oneDriveTenantId: "",
      webDavUrl: "",
      webDavUser: "",
      webDavPass: "",
    })
    setDialogOpen(true)
  }

  const handleEditStrategy = (strategy: StorageStrategy) => {
    setEditingStrategy(strategy)
    setFormData({
      name: strategy.name,
      type: strategy.type,
      r2Endpoint: strategy.config.r2Endpoint || "",
      r2AccessKey: strategy.config.r2AccessKey || "",
      r2SecretKey: strategy.config.r2SecretKey || "",
      r2Bucket: strategy.config.r2Bucket || "",
      oneDriveClientId: strategy.config.oneDriveClientId || "",
      oneDriveClientSecret: "",
      oneDriveTenantId: strategy.config.oneDriveTenantId || "",
      webDavUrl: strategy.config.webDavUrl || "",
      webDavUser: strategy.config.webDavUser || "",
      webDavPass: strategy.config.webDavPass || "",
    })
    setDialogOpen(true)
  }

  const handleSaveStrategy = async () => {
    if (!token) return

    if (!formData.name.trim()) {
      toast.error("请输入策略名称")
      return
    }

    try {
      const config: any = {}
      
      if (formData.type === "r2") {
        if (!formData.r2Endpoint || !formData.r2Bucket || !formData.r2AccessKey || !formData.r2SecretKey) {
          toast.error("请填写完整的 R2 配置信息")
          return
        }
        config.r2Endpoint = formData.r2Endpoint
        config.r2Bucket = formData.r2Bucket
        config.r2AccessKey = formData.r2AccessKey
        config.r2SecretKey = formData.r2SecretKey
      } else if (formData.type === "onedrive") {
        if (!formData.oneDriveClientId || !formData.oneDriveClientSecret || !formData.oneDriveTenantId) {
          toast.error("请填写完整的 OneDrive 配置信息")
          return
        }
        config.oneDriveClientId = formData.oneDriveClientId
        config.oneDriveTenantId = formData.oneDriveTenantId
      } else if (formData.type === "webdav") {
        if (!formData.webDavUrl || !formData.webDavUser || !formData.webDavPass) {
          toast.error("请填写完整的 WebDAV 配置信息")
          return
        }
        config.webDavUrl = formData.webDavUrl
        config.webDavUser = formData.webDavUser
        config.webDavPass = formData.webDavPass
      }

      const requestData = {
        name: formData.name,
        type: formData.type,
        config,
        ...(formData.type === "onedrive" && { clientSecret: formData.oneDriveClientSecret })
      }

      const url = editingStrategy 
        ? `${API_URL}/storage/strategies/${editingStrategy.id}`
        : `${API_URL}/storage/strategies`
      
      const method = editingStrategy ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      })

      if (response.ok) {
        toast.success(editingStrategy ? "存储策略已更新" : "存储策略已创建")
        setDialogOpen(false)
        fetchStrategies()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "操作失败")
      }
    } catch (error) {
      toast.error("网络连接错误，请稍后重试")
    }
  }

  const handleDeleteStrategy = async (strategyId: string) => {
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/storage/strategies/${strategyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast.success("存储策略已删除")
        fetchStrategies()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "删除失败")
      }
    } catch (error) {
      toast.error("网络连接错误，请稍后重试")
    }
  }

  const handleToggleStrategy = async (strategyId: string, isActive: boolean) => {
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/storage/strategies/${strategyId}/toggle`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (response.ok) {
        toast.success(isActive ? "存储策略已禁用" : "存储策略已启用")
        fetchStrategies()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "操作失败")
      }
    } catch (error) {
      toast.error("网络连接错误，请稍后重试")
    }
  }

  const getStorageTypeIcon = (type: string) => {
    switch (type) {
      case "local":
        return <HardDrive className="h-4 w-4" />
      case "r2":
        return <Cloud className="h-4 w-4" />
      case "onedrive":
        return <Cloud className="h-4 w-4" />
      case "webdav":
        return <Globe className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  const getStorageTypeName = (type: string) => {
    switch (type) {
      case "local":
        return "本地存储"
      case "r2":
        return "Cloudflare R2"
      case "onedrive":
        return "OneDrive"
      case "webdav":
        return "WebDAV"
      default:
        return "未知类型"
    }
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>存储策略管理</CardTitle>
              <CardDescription>
                管理您的存储策略配置，支持多种存储后端
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleCreateStrategy} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  添加存储策略
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingStrategy ? "编辑存储策略" : "添加存储策略"}
                  </DialogTitle>
                  <DialogDescription>
                    配置新的存储策略或编辑现有策略
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="strategyName">策略名称</Label>
                    <Input
                      id="strategyName"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="输入策略名称"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="storageType">存储类型</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: "local" | "r2" | "onedrive" | "webdav") => 
                        setFormData(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择存储类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4" />
                            本地存储
                          </div>
                        </SelectItem>
                        <SelectItem value="r2">
                          <div className="flex items-center gap-2">
                            <Cloud className="h-4 w-4" />
                            Cloudflare R2
                          </div>
                        </SelectItem>
                        <SelectItem value="onedrive">
                          <div className="flex items-center gap-2">
                            <Cloud className="h-4 w-4" />
                            OneDrive
                          </div>
                        </SelectItem>
                        <SelectItem value="webdav">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            WebDAV
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.type === "r2" && (
                    <div className="space-y-4">
                      <Separator />
                      <div className="space-y-4">
                        <h4 className="font-medium">Cloudflare R2 配置</h4>
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="r2Endpoint">R2 端点</Label>
                            <Input
                              id="r2Endpoint"
                              value={formData.r2Endpoint}
                              onChange={(e) => setFormData(prev => ({ ...prev, r2Endpoint: e.target.value }))}
                              placeholder="https://your-account-id.r2.cloudflarestorage.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="r2Bucket">存储桶名称</Label>
                            <Input
                              id="r2Bucket"
                              value={formData.r2Bucket}
                              onChange={(e) => setFormData(prev => ({ ...prev, r2Bucket: e.target.value }))}
                              placeholder="your-bucket-name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="r2AccessKey">访问密钥 ID</Label>
                            <Input
                              id="r2AccessKey"
                              type="password"
                              value={formData.r2AccessKey}
                              onChange={(e) => setFormData(prev => ({ ...prev, r2AccessKey: e.target.value }))}
                              placeholder="输入访问密钥"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="r2SecretKey">秘密访问密钥</Label>
                            <Input
                              id="r2SecretKey"
                              type="password"
                              value={formData.r2SecretKey}
                              onChange={(e) => setFormData(prev => ({ ...prev, r2SecretKey: e.target.value }))}
                              placeholder="输入秘密密钥"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.type === "onedrive" && (
                    <div className="space-y-4">
                      <Separator />
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">OneDrive 配置</h4>
                          <AzureSetupGuide />
                        </div>
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="oneDriveClientId">应用程序 ID (Client ID)</Label>
                            <Input
                              id="oneDriveClientId"
                              value={formData.oneDriveClientId}
                              onChange={(e) => setFormData(prev => ({ ...prev, oneDriveClientId: e.target.value }))}
                              placeholder="输入 Azure 应用程序 ID"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="oneDriveClientSecret">客户端密钥 (Client Secret)</Label>
                            <Input
                              id="oneDriveClientSecret"
                              type="password"
                              value={formData.oneDriveClientSecret}
                              onChange={(e) => setFormData(prev => ({ ...prev, oneDriveClientSecret: e.target.value }))}
                              placeholder="输入客户端密钥"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="oneDriveTenantId">租户 ID (Tenant ID)</Label>
                            <Input
                              id="oneDriveTenantId"
                              value={formData.oneDriveTenantId}
                              onChange={(e) => setFormData(prev => ({ ...prev, oneDriveTenantId: e.target.value }))}
                              placeholder="输入租户 ID 或使用 'common'"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.type === "webdav" && (
                    <div className="space-y-4">
                      <Separator />
                      <div className="space-y-4">
                        <h4 className="font-medium">WebDAV 配置</h4>
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="webDavUrl">WebDAV 服务器地址</Label>
                            <Input
                              id="webDavUrl"
                              value={formData.webDavUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, webDavUrl: e.target.value }))}
                              placeholder="https://dav.example.com/remote.php/dav/files/username/"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="webDavUser">用户名</Label>
                            <Input
                              id="webDavUser"
                              value={formData.webDavUser}
                              onChange={(e) => setFormData(prev => ({ ...prev, webDavUser: e.target.value }))}
                              placeholder="输入 WebDAV 用户名"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="webDavPass">密码</Label>
                            <Input
                              id="webDavPass"
                              type="password"
                              value={formData.webDavPass}
                              onChange={(e) => setFormData(prev => ({ ...prev, webDavPass: e.target.value }))}
                              placeholder="输入 WebDAV 密码"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.type === "local" && (
                    <div className="space-y-4">
                      <Separator />
                      <Alert>
                        <HardDrive className="h-4 w-4" />
                        <AlertDescription>
                          本地存储将文件保存在服务器的本地文件系统中，无需额外配置。
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleSaveStrategy}>
                      {editingStrategy ? "更新策略" : "创建策略"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {strategies.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无存储策略</h3>
              <p className="text-muted-foreground mb-4">
                点击"添加存储策略"按钮创建您的第一个存储策略
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {strategies.map((strategy) => (
                <Card key={strategy.id} className={`relative ${strategy.isActive ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStorageTypeIcon(strategy.type)}
                        <CardTitle className="text-base">{strategy.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        {strategy.isActive && (
                          <Badge variant="default" className="text-xs">
                            活跃
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditStrategy(strategy)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStrategy(strategy.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      {getStorageTypeName(strategy.type)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      {strategy.type === "r2" && strategy.config.r2Bucket && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">存储桶:</span>
                          <span className="font-mono text-xs">{strategy.config.r2Bucket}</span>
                        </div>
                      )}
                      {strategy.type === "webdav" && strategy.config.webDavUrl && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">服务器:</span>
                          <span className="font-mono text-xs truncate max-w-32" title={strategy.config.webDavUrl}>
                            {strategy.config.webDavUrl}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">创建时间:</span>
                        <span className="text-xs">
                          {new Date(strategy.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button
                        variant={strategy.isActive ? "secondary" : "default"}
                        size="sm"
                        className="w-full"
                        onClick={() => handleToggleStrategy(strategy.id, strategy.isActive)}
                      >
                        {strategy.isActive ? "禁用" : "启用"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>重要说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">存储策略管理</p>
              <p className="text-muted-foreground">
                您可以创建多个存储策略，但同一时间只能启用一个策略。切换策略不会影响已存储的文件。
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">安全性</p>
              <p className="text-muted-foreground">
                所有敏感信息（如密钥、密码）都会被安全加密存储，确保您的数据安全。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}