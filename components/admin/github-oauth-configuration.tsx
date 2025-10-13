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
import { useAuth } from "@/components/auth/auth-provider"
import { AlertCircle, CheckCircle, ExternalLink, Copy, Plus, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface GitHubOAuthRedirectUri {
  id: string
  redirectUri: string
  name: string
  enabled: boolean
}

interface GitHubOAuthConfig {
  enabled: boolean
  clientId: string
  clientSecret: string
  redirectUris: GitHubOAuthRedirectUri[]
}

export function GitHubOAuthConfiguration() {
  const [config, setConfig] = useState<GitHubOAuthConfig>({
    enabled: false,
    clientId: "",
    clientSecret: "",
    redirectUris: []
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUri, setEditingUri] = useState<GitHubOAuthRedirectUri | null>(null)
  const [newUri, setNewUri] = useState({ redirectUri: "", name: "" })
  const { token } = useAuth()
  const { toast } = useToast()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  // 生成默认的重定向URI
  const defaultRedirectUri = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/github/callback`
    : ""

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    if (!token) return

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/github-oauth-config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const loaded: GitHubOAuthConfig = data.config || {
          enabled: false,
          clientId: "",
          clientSecret: "",
          redirectUris: []
        }

        setConfig(loaded)
      } else {
        setError("获取配置失败")
      }
    } catch (err) {
      setError("网络错误，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    if (!token) return

    // 验证必填字段
    if (config.enabled && (!config.clientId || !config.clientSecret)) {
      setError("启用GitHub OAuth时，客户端ID和客户端密钥都是必填的")
      return
    }

    // 如果要启用OAuth，检查是否至少有一个回调链接
    if (config.enabled && config.redirectUris.filter(uri => uri.enabled).length === 0) {
      setError("启用GitHub OAuth时，至少需要一个有效的回调链接")
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`${API_URL}/admin/github-oauth-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: config.enabled,
          clientId: config.clientId,
          clientSecret: config.clientSecret
        }),
      })

      if (response.ok) {
        setSuccess("GitHub OAuth配置已保存")
        toast({
          title: "配置已保存",
          description: "GitHub OAuth配置已成功更新",
        })
      } else {
        const errorData = await response.json()
        setError(errorData.error || "保存配置失败")
      }
    } catch (err) {
      setError("网络错误，请稍后重试")
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    if (!config.clientId || !config.clientSecret) {
      setError("请先填写完整的配置信息")
      return
    }

    // 使用第一个启用的回调链接进行测试
    const enabledUri = config.redirectUris.find(uri => uri.enabled)
    if (!enabledUri) {
      setError("请先添加至少一个启用的回调链接")
      return
    }

    setTestingConnection(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`${API_URL}/admin/test-github-oauth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri: enabledUri.redirectUri
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSuccess("GitHub OAuth配置测试成功")
          toast({
            title: "测试成功",
            description: "GitHub OAuth配置有效",
          })
        } else {
          setError(data.error || "配置测试失败")
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "测试连接失败")
      }
    } catch (err) {
      setError("网络错误，请稍后重试")
    } finally {
      setTestingConnection(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "已复制",
      description: "内容已复制到剪贴板",
    })
  }

  // 管理回调链接的函数
  const handleAddUri = async () => {
    if (!newUri.redirectUri || !newUri.name) {
      setError("回调链接和名称都是必填的")
      return
    }

    try {
      const response = await fetch(`${API_URL}/admin/github-oauth-redirect-uri`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUri),
      })

      if (response.ok) {
        const data = await response.json()
        setConfig(prev => ({
          ...prev,
          redirectUris: [...prev.redirectUris, data.redirectUri]
        }))
        setNewUri({ redirectUri: "", name: "" })
        setDialogOpen(false)
        setError("")
        toast({
          title: "成功",
          description: "回调链接已添加",
        })
      } else {
        const errorData = await response.json()
        setError(errorData.error || "添加回调链接失败")
      }
    } catch (err) {
      setError("网络错误，请稍后重试")
    }
  }

  const handleUpdateUri = async (uri: GitHubOAuthRedirectUri) => {
    try {
      const response = await fetch(`${API_URL}/admin/github-oauth-redirect-uri/${uri.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(uri),
      })

      if (response.ok) {
        setConfig(prev => ({
          ...prev,
          redirectUris: prev.redirectUris.map(u => u.id === uri.id ? uri : u)
        }))
        toast({
          title: "成功",
          description: "回调链接已更新",
        })
      } else {
        const errorData = await response.json()
        setError(errorData.error || "更新回调链接失败")
      }
    } catch (err) {
      setError("网络错误，请稍后重试")
    }
  }

  const handleDeleteUri = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/github-oauth-redirect-uri/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setConfig(prev => ({
          ...prev,
          redirectUris: prev.redirectUris.filter(uri => uri.id !== id)
        }))
        toast({
          title: "成功",
          description: "回调链接已删除",
        })
      } else {
        const errorData = await response.json()
        setError(errorData.error || "删除回调链接失败")
      }
    } catch (err) {
      setError("网络错误，请稍后重试")
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitHub OAuth配置</CardTitle>
          <CardDescription>配置GitHub账号登录功能</CardDescription>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          GitHub OAuth配置
          {config.enabled ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              已启用
            </Badge>
          ) : (
            <Badge variant="secondary">已禁用</Badge>
          )}
        </CardTitle>
        <CardDescription>
          配置GitHub账号登录功能，支持多个域名回调链接
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
            <Label className="text-base">启用GitHub OAuth登录</Label>
            <div className="text-sm text-muted-foreground">
              允许用户使用GitHub账户登录系统
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
            <li>访问 <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">GitHub Developer Settings <ExternalLink className="w-3 h-3" /></a></li>
            <li>点击"New OAuth App"创建新的OAuth应用</li>
            <li>填写应用信息，将下方的回调链接填入"Authorization callback URL"</li>
            <li>创建应用后复制Client ID和Client Secret</li>
            <li>将Client ID和Client Secret填入下方配置中</li>
          </ol>
        </div>

        {/* 客户端ID */}
        <div className="space-y-2">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            id="clientId"
            value={config.clientId}
            onChange={(e) =>
              setConfig(prev => ({ ...prev, clientId: e.target.value }))
            }
            placeholder="your-github-client-id"
            disabled={!config.enabled}
          />
        </div>

        {/* 客户端密钥 */}
        <div className="space-y-2">
          <Label htmlFor="clientSecret">Client Secret</Label>
          <Input
            id="clientSecret"
            type="password"
            value={config.clientSecret}
            onChange={(e) =>
              setConfig(prev => ({ ...prev, clientSecret: e.target.value }))
            }
            placeholder="your-github-client-secret"
            disabled={!config.enabled}
          />
        </div>

        {/* 回调链接管理 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">授权回调链接</Label>
              <div className="text-sm text-muted-foreground">
                管理多个域名的OAuth回调链接
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
                  <DialogTitle>添加回调链接</DialogTitle>
                  <DialogDescription>
                    为不同的域名添加OAuth回调链接
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
                      placeholder={defaultRedirectUri || "https://yourdomain.com/auth/github/callback"}
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
                  <Button onClick={handleAddUri}>
                    添加
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
                        onCheckedChange={(checked) => {
                          const updatedUri = { ...uri, enabled: checked }
                          handleUpdateUri(updatedUri)
                        }}
                        disabled={!config.enabled}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUri(uri.id)}
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

        {/* 使用说明 */}
        {config.enabled && config.redirectUris.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">使用说明：</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>用户可以在登录页面点击"使用GitHub账号登录"按钮</li>
              <li>系统会自动获取GitHub账户的邮箱地址作为用户名</li>
              <li>首次使用GitHub登录的用户会自动创建账户</li>
              <li>GitHub账户必须有已验证的邮箱地址才能登录</li>
              <li>支持多个域名，每个域名都需要添加对应的回调链接</li>
              <li>启用的回调链接将被用于OAuth验证流程</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 