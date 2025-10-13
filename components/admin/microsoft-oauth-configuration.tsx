"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/components/auth/auth-provider"
import { AlertCircle, CheckCircle, ExternalLink, Copy, Plus, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface MicrosoftOAuthRedirectUri {
  id: string
  redirectUri: string
  name: string
  enabled: boolean
}

interface MicrosoftOAuthConfig {
  enabled: boolean
  clientId: string
  clientSecret: string
  tenantId: string
  redirectUris: MicrosoftOAuthRedirectUri[]
}

export function MicrosoftOAuthConfiguration() {
  const [config, setConfig] = useState<MicrosoftOAuthConfig>({
    enabled: false,
    clientId: "",
    clientSecret: "",
    tenantId: "common",
    redirectUris: []
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUri, setEditingUri] = useState<MicrosoftOAuthRedirectUri | null>(null)
  const [newUri, setNewUri] = useState({ redirectUri: "", name: "" })
  const { token } = useAuth()
  const { toast } = useToast()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  // 生成默认的重定向URI
  const defaultRedirectUri = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/microsoft/callback`
    : ""

  const fetchConfig = async () => {
    setLoading(true)
    setError("")
    
    try {
      const response = await fetch(`${API_URL}/admin/microsoft-oauth-config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('获取配置失败')
      }

      const data = await response.json()
      
      setConfig({
        enabled: data.config?.enabled || false,
        clientId: data.config?.clientId || "",
        clientSecret: data.config?.clientSecret === "***已设置***" ? "" : (data.config?.clientSecret || ""),
        tenantId: data.config?.tenantId || "common",
        redirectUris: data.redirectUris || []
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取配置失败')
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    setError("")
    setSuccess("")
    
    try {
      const response = await fetch(`${API_URL}/admin/microsoft-oauth-config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: config.enabled,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          tenantId: config.tenantId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '保存配置失败')
      }

      setSuccess("Microsoft OAuth配置保存成功")
      toast({
        title: "保存成功",
        description: "Microsoft OAuth配置已更新",
      })
      
      // 重新获取配置以更新显示
      setTimeout(() => {
        fetchConfig()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存配置失败')
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    if (!config.clientId || !config.clientSecret || config.redirectUris.length === 0) {
      setError("请先配置Client ID、Client Secret和至少一个回调链接")
      return
    }

    setTestingConnection(true)
    setError("")
    setSuccess("")
    
    try {
      const response = await fetch(`${API_URL}/admin/test-microsoft-oauth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          tenantId: config.tenantId,
          redirectUri: config.redirectUris.find(uri => uri.enabled)?.redirectUri || config.redirectUris[0]?.redirectUri
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess(data.message)
        toast({
          title: "测试成功",
          description: "Microsoft OAuth配置测试通过",
        })
      } else {
        throw new Error(data.error || '测试失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '测试连接失败')
    } finally {
      setTestingConnection(false)
    }
  }

  const addRedirectUri = async () => {
    if (!newUri.redirectUri || !newUri.name) {
      setError("请填写完整的回调链接信息")
      return
    }

    try {
      const response = await fetch(`${API_URL}/admin/microsoft-oauth-redirect-uri`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUri),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '添加回调链接失败')
      }

      setDialogOpen(false)
      setNewUri({ redirectUri: "", name: "" })
      fetchConfig()
      toast({
        title: "添加成功",
        description: "回调链接已添加",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加回调链接失败')
    }
  }

  const updateRedirectUri = async () => {
    if (!editingUri || !newUri.redirectUri || !newUri.name) {
      setError("请填写完整的回调链接信息")
      return
    }

    try {
      const response = await fetch(`${API_URL}/admin/microsoft-oauth-redirect-uri/${editingUri.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redirectUri: newUri.redirectUri,
          name: newUri.name,
          enabled: editingUri.enabled
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '更新回调链接失败')
      }

      setDialogOpen(false)
      setEditingUri(null)
      setNewUri({ redirectUri: "", name: "" })
      fetchConfig()
      toast({
        title: "更新成功",
        description: "回调链接已更新",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新回调链接失败')
    }
  }

  const deleteRedirectUri = async (id: string) => {
    if (!confirm('确定要删除这个回调链接吗？')) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/admin/microsoft-oauth-redirect-uri/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '删除回调链接失败')
      }

      fetchConfig()
      toast({
        title: "删除成功",
        description: "回调链接已删除",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除回调链接失败')
    }
  }

  const toggleUriEnabled = async (uri: MicrosoftOAuthRedirectUri) => {
    try {
      const response = await fetch(`${API_URL}/admin/microsoft-oauth-redirect-uri/${uri.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redirectUri: uri.redirectUri,
          name: uri.name,
          enabled: !uri.enabled
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '更新回调链接状态失败')
      }

      fetchConfig()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新回调链接状态失败')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "复制成功",
      description: "链接已复制到剪贴板",
    })
  }

  const openDialog = (uri?: MicrosoftOAuthRedirectUri) => {
    if (uri) {
      setEditingUri(uri)
      setNewUri({ redirectUri: uri.redirectUri, name: uri.name })
    } else {
      setEditingUri(null)
      setNewUri({ redirectUri: "", name: "" })
    }
    setDialogOpen(true)
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Microsoft OAuth 配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Microsoft OAuth 配置
          <Badge variant={config.enabled ? "default" : "secondary"}>
            {config.enabled ? "已启用" : "已禁用"}
          </Badge>
        </CardTitle>
        <CardDescription>
          配置 Microsoft OAuth 2.0 应用程序以允许用户使用 Microsoft 账户登录，支持多个域名回调链接
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        {/* 启用开关 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">启用Microsoft OAuth登录</Label>
            <div className="text-sm text-muted-foreground">
              允许用户使用Microsoft账户登录系统
            </div>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => 
              setConfig(prev => ({ ...prev, enabled: checked }))
            }
          />
        </div>

        <Separator />

        {/* 配置说明 */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">配置步骤：</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>访问 <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Azure Portal <ExternalLink className="w-3 h-3" /></a></li>
            <li>创建新的应用注册或选择现有应用</li>
            <li>复制应用程序ID和客户端密钥到下方配置中</li>
            <li>将下方的回调链接添加到应用注册的重定向URI列表中</li>
            <li>配置适当的API权限（User.Read、openid、profile、email）</li>
          </ol>
        </div>

        {/* 应用程序配置 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clientId">应用程序 ID (Client ID)</Label>
            <Input
              id="clientId"
              value={config.clientId}
              onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
              placeholder="输入 Microsoft 应用程序 ID"
              disabled={!config.enabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">客户端密钥 (Client Secret)</Label>
            <Input
              id="clientSecret"
              type="password"
              value={config.clientSecret}
              onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
              placeholder="输入客户端密钥"
              disabled={!config.enabled}
            />
          </div>
        </div>

        {/* 租户ID配置 */}
        <div className="space-y-2">
          <Label htmlFor="tenantId">租户 ID (Tenant ID)</Label>
          <Select
            value={config.tenantId}
            onValueChange={(value) => setConfig(prev => ({ ...prev, tenantId: value }))}
            disabled={!config.enabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择租户类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="common">common (支持个人和工作/学校账户)</SelectItem>
              <SelectItem value="organizations">organizations (仅支持工作/学校账户)</SelectItem>
              <SelectItem value="consumers">consumers (仅支持个人 Microsoft 账户)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            也可以输入具体的租户 ID 来限制特定组织
          </p>
          <Input
            value={config.tenantId}
            onChange={(e) => setConfig(prev => ({ ...prev, tenantId: e.target.value }))}
            placeholder="或输入具体的租户 ID"
            disabled={!config.enabled}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button
            onClick={testConnection}
            variant="outline"
            disabled={testingConnection || !config.enabled || !config.clientId || !config.clientSecret || config.redirectUris.filter(uri => uri.enabled).length === 0}
          >
            {testingConnection ? "测试中..." : "测试连接"}
          </Button>
          <Button
            onClick={saveConfig}
            disabled={saving}
          >
            {saving ? "保存中..." : "保存配置"}
          </Button>
        </div>

        <Separator />

        {/* 回调链接管理 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">授权回调链接</Label>
              <div className="text-sm text-muted-foreground">
                管理多个域名的Microsoft OAuth回调链接
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!config.enabled}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加回调链接
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingUri ? "编辑回调链接" : "添加回调链接"}
                  </DialogTitle>
                  <DialogDescription>
                    为不同的域名添加Microsoft OAuth回调链接
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-name">名称</Label>
                    <Input
                      id="new-name"
                      value={newUri.name}
                      onChange={(e) => setNewUri(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="例如：主域名、测试域名"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-uri">回调链接</Label>
                    <Input
                      id="new-uri"
                      value={newUri.redirectUri}
                      onChange={(e) => setNewUri(prev => ({ ...prev, redirectUri: e.target.value }))}
                      placeholder={defaultRedirectUri || "https://yourdomain.com/auth/microsoft/callback"}
                    />
                    <div className="text-xs text-muted-foreground">
                      当前站点建议：{defaultRedirectUri}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={editingUri ? updateRedirectUri : addRedirectUri}>
                    {editingUri ? "更新" : "添加"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* 回调链接列表 */}
          <div className="space-y-2">
            {config.redirectUris.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-sm">尚未添加回调链接</div>
                <div className="text-xs">点击上方"添加回调链接"按钮开始配置</div>
              </div>
            ) : (
              config.redirectUris.map((uri, index) => (
                <Card key={uri.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{uri.name}</span>
                        {uri.enabled ? (
                          <Badge variant="default" className="bg-green-500 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            启用
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">已禁用</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        {uri.redirectUri}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(uri.redirectUri)}
                        disabled={!config.enabled}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Switch
                        checked={uri.enabled}
                        onCheckedChange={() => toggleUriEnabled(uri)}
                        disabled={!config.enabled}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(uri)}
                        disabled={!config.enabled}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRedirectUri(uri.id)}
                        disabled={!config.enabled || (config.enabled && config.redirectUris.filter(u => u.enabled).length <= 1 && uri.enabled)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* 使用说明 */}
        {config.enabled && config.redirectUris.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">使用说明：</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>用户可以在登录页面点击"使用Microsoft账号登录"按钮</li>
              <li>系统会自动获取Microsoft账户的邮箱地址作为用户名</li>
              <li>首次使用Microsoft登录的用户会自动创建账户</li>
              <li>Microsoft账户的邮箱必须已验证才能登录</li>
              <li>支持多个域名，每个域名都需要添加对应的回调链接</li>
              <li>启用的回调链接将被用于OAuth验证流程</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 