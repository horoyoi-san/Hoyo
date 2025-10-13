"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Mail,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  RefreshCw
} from "lucide-react"

interface SmtpConfig {
  enabled: boolean
  host: string
  port: number
  user: string
  pass: string
  secure: boolean
  emailTemplate: string
}

export function SmtpConfiguration() {
  const [config, setConfig] = useState<SmtpConfig>({
    enabled: false,
    host: "",
    port: 465,
    user: "",
    pass: "",
    secure: true,
    emailTemplate: ""
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [previewCode, setPreviewCode] = useState("123456")
  
  const { token } = useAuth()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  // 默认邮件模板 - shadcn UI 风格
  const defaultTemplate = [
    '<!DOCTYPE html>',
    '<html lang="th-TH">',
    '<head>',
    '    <meta charset="UTF-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '    <title>FireflyCloud 邮箱验证</title>',
    '    <style>',
    '        * {',
    '            margin: 0;',
    '            padding: 0;',
    '            box-sizing: border-box;',
    '        }',
    '        body {',
    '            font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;',
    '            line-height: 1.6;',
    '            color: hsl(0, 0%, 3.9%);',
    '            background-color: hsl(0, 0%, 96.1%);',
    '            padding: 20px;',
    '        }',
    '        .email-container {',
    '            max-width: 600px;',
    '            margin: 0 auto;',
    '            background-color: hsl(0, 0%, 100%);',
    '            border: 1px solid hsl(0, 0%, 89.8%);',
    '            border-radius: 8px;',
    '            overflow: hidden;',
    '        }',
    '        .header {',
    '            background-color: hsl(0, 0%, 9%);',
    '            color: hsl(0, 0%, 98%);',
    '            padding: 32px;',
    '            text-align: center;',
    '        }',
    '        .logo {',
    '            width: 48px;',
    '            height: 48px;',
    '            background-color: hsl(0, 0%, 98%);',
    '            border-radius: 6px;',
    '            display: inline-flex;',
    '            align-items: center;',
    '            justify-content: center;',
    '            margin-bottom: 16px;',
    '        }',
    '        .title {',
    '            font-size: 24px;',
    '            font-weight: 600;',
    '            margin: 0;',
    '        }',
    '        .subtitle {',
    '            color: hsl(0, 0%, 71%);',
    '            font-size: 14px;',
    '            margin: 4px 0 0 0;',
    '            font-weight: 400;',
    '        }',
    '        .content {',
    '            padding: 32px;',
    '        }',
    '        .greeting {',
    '            font-size: 18px;',
    '            font-weight: 600;',
    '            margin-bottom: 16px;',
    '            color: hsl(0, 0%, 3.9%);',
    '        }',
    '        .description {',
    '            color: hsl(0, 0%, 45.1%);',
    '            margin-bottom: 24px;',
    '            line-height: 1.5;',
    '        }',
    '        .code-container {',
    '            background-color: hsl(0, 0%, 96.1%);',
    '            border: 1px solid hsl(0, 0%, 89.8%);',
    '            border-radius: 8px;',
    '            padding: 24px;',
    '            text-align: center;',
    '            margin: 24px 0;',
    '        }',
    '        .code {',
    '            font-size: 32px;',
    '            font-weight: 700;',
    '            color: hsl(0, 0%, 9%);',
    '            letter-spacing: 6px;',
    '            margin-bottom: 8px;',
    '            font-family: ui-monospace, monospace;',
    '        }',
    '        .code-label {',
    '            color: hsl(0, 0%, 45.1%);',
    '            font-size: 14px;',
    '            font-weight: 500;',
    '        }',
    '        .warning {',
    '            background-color: hsl(0, 0%, 98%);',
    '            border: 1px solid hsl(0, 0%, 89.8%);',
    '            border-left: 4px solid hsl(38, 92%, 50%);',
    '            border-radius: 6px;',
    '            padding: 16px;',
    '            margin: 24px 0;',
    '        }',
    '        .footer {',
    '            background-color: hsl(0, 0%, 98%);',
    '            padding: 24px 32px;',
    '            text-align: center;',
    '            border-top: 1px solid hsl(0, 0%, 89.8%);',
    '            color: hsl(0, 0%, 45.1%);',
    '            font-size: 14px;',
    '        }',
    '    </style>',
    '</head>',
    '<body>',
    '    <div class="email-container">',
    '        <div class="header">',
    '            <div class="logo">✉️</div>',
    '            <h1 class="title">FireflyCloud</h1>',
    '            <p class="subtitle">การจัดเก็บข้อมูลบนคลาวด์ที่ทันสมัย</p>',
    '        </div>',
    '        <div class="content">',
    '            <p class="greeting">您好！</p>',
    '            <p class="description">感谢您注册 FireflyCloud 账户。为了确保您的邮箱地址有效，请使用以下验证码完成注册：</p>',
    '            <div class="code-container">',
    '                <div class="code">{{CODE}}</div>',
    '                <div class="code-label">邮箱验证码</div>',
    '            </div>',
    '            <p class="description">请在注册页面输入此验证码以完成账户创建。</p>',
    '            <div class="warning">',
    '                <div style="color: hsl(0, 0%, 9%); font-weight: 600; font-size: 14px; margin-bottom: 8px;">重要提示</div>',
    '                <div style="color: hsl(0, 0%, 45.1%); font-size: 14px;">此验证码将在 10 分钟后过期，请勿将验证码分享给他人。</div>',
    '            </div>',
    '        </div>',
    '        <div class="footer">',
    '            <p>此邮件由 FireflyCloud 系统自动发送，请勿回复。</p>',
    '            <p style="margin-top: 16px; color: hsl(0, 0%, 64%); font-size: 12px;">© 2024 FireflyCloud. 保留所有权利。</p>',
    '        </div>',
    '    </div>',
    '</body>',
    '</html>'
  ].join('\n')

  useEffect(() => {
    fetchConfig()
  }, [token])

  const fetchConfig = async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/admin/smtp-config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()

        // 处理可能的错误响应
        if (data.error) {
          console.warn("SMTP config API returned error:", data.error)
          setConfig({
            enabled: data.config?.enabled || false,
            host: data.config?.host || "",
            port: data.config?.port || 465,
            user: data.config?.user || "",
            pass: data.config?.pass || "",
            secure: data.config?.secure !== undefined ? data.config.secure : true,
            emailTemplate: data.config?.emailTemplate || defaultTemplate
          })
        } else {
          setConfig({
            enabled: data.enabled || false,
            host: data.host || "",
            port: data.port || 465,
            user: data.user || "",
            pass: data.pass || "",
            secure: data.secure !== undefined ? data.secure : true,
            emailTemplate: data.emailTemplate || defaultTemplate
          })
        }
      } else {
        // 如果获取失败，使用默认配置
        setConfig(prev => ({
          ...prev,
          emailTemplate: defaultTemplate
        }))
      }
    } catch (error) {
      console.error("Failed to fetch SMTP config:", error)
      // 设置默认配置
      setConfig(prev => ({
        ...prev,
        emailTemplate: defaultTemplate
      }))
      toast({
        title: "获取配置失败",
        description: "使用默认配置，请检查网络连接",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/admin/smtp-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        toast.success("SMTP 配置已成功保存", {
          description: "配置已更新并生效"
        })
      } else {
        throw new Error("Failed to save config")
      }
    } catch (error) {
      console.error("Failed to save SMTP config:", error)
      toast.error("保存失败", {
        description: "无法保存 SMTP 配置，请稍后重试"
      })
    } finally {
      setSaving(false)
    }
  }

  const testSmtp = async () => {
    if (!testEmail) {
      toast.error("请输入测试邮箱", {
        description: "请输入一个有效的邮箱地址进行测试"
      })
      return
    }

    setTesting(true)
    try {
      console.log('发送测试邮件请求:', {
        email: testEmail,
        config: { ...safeConfig, pass: '***' } // 隐藏密码
      })

      const response = await fetch(`${API_URL}/admin/test-smtp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: testEmail,
          config: safeConfig
        }),
      })

      if (response.ok) {
        await response.json() // 确保响应被完全读取
        toast.success("测试邮件已发送", {
          description: `测试邮件已发送到 ${testEmail}，请查收`
        })
      } else {
        const errorData = await response.json()
        console.error("SMTP 测试失败:", errorData)
        throw new Error(errorData.error || "Failed to send test email")
      }
    } catch (error) {
      console.error("Failed to test SMTP:", error)
      toast.error("测试失败", {
        description: "无法发送测试邮件，请检查配置"
      })
    } finally {
      setTesting(false)
    }
  }

  const resetTemplate = () => {
    setConfig(prev => ({
      ...prev,
      emailTemplate: defaultTemplate
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // 确保配置对象有默认值
  const safeConfig = {
    ...config,
    emailTemplate: config.emailTemplate || defaultTemplate
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            SMTP 邮件配置
          </CardTitle>
          <CardDescription>
            配置邮件服务器设置，用于发送验证码和通知邮件
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto">
              <TabsTrigger value="settings" className="text-xs sm:text-sm">基础设置</TabsTrigger>
              <TabsTrigger value="template" className="text-xs sm:text-sm">邮件模板</TabsTrigger>
              <TabsTrigger value="test" className="text-xs sm:text-sm">测试发送</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">启用 SMTP 服务</Label>
                  <p className="text-sm text-muted-foreground">
                    开启后将使用配置的 SMTP 服务器发送邮件
                  </p>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({ ...prev, enabled: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="host">SMTP 服务器</Label>
                  <Input
                    id="host"
                    placeholder="smtp.example.com"
                    value={config.host}
                    onChange={(e) =>
                      setConfig(prev => ({ ...prev, host: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">端口</Label>
                  <Input
                    id="port"
                    type="number"
                    placeholder="465"
                    value={config.port}
                    onChange={(e) =>
                      setConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 465 }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user">用户名</Label>
                  <Input
                    id="user"
                    placeholder="your-email@example.com"
                    value={config.user}
                    onChange={(e) =>
                      setConfig(prev => ({ ...prev, user: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pass">密码</Label>
                  <Input
                    id="pass"
                    type="password"
                    placeholder="your-password"
                    value={config.pass}
                    onChange={(e) =>
                      setConfig(prev => ({ ...prev, pass: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">使用 SSL/TLS</Label>
                  <p className="text-sm text-muted-foreground">
                    推荐开启，提供更安全的连接
                  </p>
                </div>
                <Switch
                  checked={config.secure}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({ ...prev, secure: checked }))
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveConfig} disabled={saving}>
                  {saving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      保存配置
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="template" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">邮件模板</Label>
                    <p className="text-sm text-muted-foreground">
                      自定义验证码邮件的 HTML 模板，使用 {`{{CODE}}`} 作为验证码占位符
                    </p>
                  </div>
                  <Button variant="outline" onClick={resetTemplate}>
                    重置为默认模板
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>模板编辑器</Label>
                    <Textarea
                      placeholder="输入邮件 HTML 模板..."
                      value={safeConfig.emailTemplate}
                      onChange={(e) =>
                        setConfig(prev => ({ ...prev, emailTemplate: e.target.value }))
                      }
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>预览效果</Label>
                      <Input
                        placeholder="预览验证码"
                        value={previewCode}
                        onChange={(e) => setPreviewCode(e.target.value)}
                        className="w-32"
                      />
                    </div>
                    <div className="border rounded-lg p-4 bg-muted/50 min-h-[400px] overflow-auto">
                      <iframe
                        srcDoc={safeConfig.emailTemplate
                          .replace(/\{\{CODE\}\}/g, previewCode)
                          .replace(/\$\{code\}/g, previewCode)
                          // 移除可能的脚本标签以确保安全
                          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        }
                        className="w-full h-[400px] border-0"
                        sandbox="allow-same-origin"
                        title="邮件预览"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveConfig} disabled={saving}>
                    {saving ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        保存模板
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="test" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base">测试邮件发送</Label>
                  <p className="text-sm text-muted-foreground">
                    发送测试邮件以验证 SMTP 配置是否正确
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="testEmail">测试邮箱地址</Label>
                      <Input
                        id="testEmail"
                        type="email"
                        placeholder="test@example.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>当前状态</Label>
                      <div className="flex items-center gap-2">
                        {config.enabled ? (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            已启用
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            未启用
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={testSmtp}
                      disabled={testing || !config.enabled || !testEmail}
                    >
                      {testing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          发送中...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          发送测试邮件
                        </>
                      )}
                    </Button>

                    {!config.enabled && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        请先启用 SMTP 服务
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-base">配置检查</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {config.host ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">SMTP 服务器: {config.host || "未配置"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.port ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">端口: {config.port || "未配置"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.user ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">用户名: {config.user || "未配置"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.pass ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">密码: {config.pass ? "已配置" : "未配置"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
