"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Info, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  Cloud,
  Settings,
  Key,
  Globe
} from "lucide-react"
import { toast } from "sonner"

export function AzureSetupGuide() {
  const [copiedUri, setCopiedUri] = useState(false)
  const [currentDomain, setCurrentDomain] = useState("")
  
  // 动态获取当前域名
  const redirectUri = typeof window !== "undefined" 
    ? `${window.location.origin}/onedrive/callback` 
    : "https://your-domain.com/onedrive/callback"

  // 组件挂载时获取当前域名
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentDomain(window.location.origin)
    }
  }, [])

  const copyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri)
      setCopiedUri(true)
      toast.success("重定向 URI 已复制到剪贴板")
      setTimeout(() => setCopiedUri(false), 2000)
    } catch (error) {
      toast.error("复制失败，请手动复制")
    }
  }

  const openAzurePortal = () => {
    window.open("https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade", "_blank")
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Azure 配置指南
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-600" />
            OneDrive API - Azure 应用配置指南
          </DialogTitle>
          <DialogDescription>
            按照以下步骤在 Azure 门户中配置应用程序，以启用 OneDrive API 功能
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 步骤 1 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="default">1</Badge>
                创建 Azure 应用注册
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                在 Azure 门户中注册新的应用程序
              </p>
              <div className="space-y-2">
                <Button onClick={openAzurePortal} className="w-full sm:w-auto">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  打开 Azure 门户
                </Button>
                <div className="text-sm space-y-1">
                  <p>1. 点击"新注册"</p>
                  <p>2. 输入应用名称（如：FireflyCloud OneDrive）</p>
                  <p>3. 选择"任何组织目录中的帐户和个人 Microsoft 帐户"</p>
                  <p>4. 暂时跳过重定向 URI，点击"注册"</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 步骤 2 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="default">2</Badge>
                配置重定向 URI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">重要：必须配置正确的重定向 URI</p>
                  <p className="text-sm">OneDrive OAuth 授权需要预先注册的重定向 URI</p>
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">您的重定向 URI（自动生成）：</p>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <code className="flex-1 text-sm font-mono break-all">
                      {redirectUri}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyRedirectUri}
                      className="flex-shrink-0"
                      title="复制重定向 URI"
                    >
                      {copiedUri ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <Info className="h-3 w-3" />
                    <span>此 URI 根据当前访问域名自动生成，支持多域名部署</span>
                  </div>
                </div>

                <div className="text-sm space-y-1">
                  <p className="font-medium">配置步骤：</p>
                  <p>1. 在应用页面左侧点击"身份验证"</p>
                  <p>2. 点击"添加平台" → 选择"Web"</p>
                  <p>3. 在"重定向 URI"中粘贴上面的 URI</p>
                  <p>4. 勾选"访问令牌"和"ID 令牌"</p>
                  <p>5. 点击"配置"保存</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 步骤 3 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="default">3</Badge>
                获取应用凭据
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    <span className="font-medium text-sm">应用程序 ID</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    在"概述"页面复制"应用程序(客户端) ID"
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    <span className="font-medium text-sm">客户端密钥</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    在"证书和密码"页面创建新的客户端密码
                  </p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <p className="font-medium mb-1">注意事项：</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>客户端密钥创建后只显示一次，请立即复制保存</li>
                    <li>租户 ID 可在"概述"页面找到，或使用 "common" 支持所有账户类型</li>
                    <li>确保应用具有 "Files.ReadWrite" 权限（通常自动包含）</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* 步骤 4 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="default">4</Badge>
                配置 API 权限
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <p>1. 在应用页面左侧点击"API 权限"</p>
                <p>2. 点击"添加权限" → "Microsoft Graph" → "委托的权限"</p>
                <p>3. 搜索并添加以下权限：</p>
                <div className="ml-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Files.ReadWrite</Badge>
                    <span className="text-xs">读写用户文件</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">offline_access</Badge>
                    <span className="text-xs">离线访问（刷新令牌）</span>
                  </div>
                </div>
                <p>4. 点击"授予管理员同意"（可选，但推荐）</p>
              </div>
            </CardContent>
          </Card>

          {/* 完成提示 */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">配置完成后：</p>
              <p className="text-sm">
                将获取到的应用程序 ID、客户端密钥和租户 ID 填入存储配置中，
                然后就可以在挂载管理中点击"连接 OneDrive"进行授权了。
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  )
}