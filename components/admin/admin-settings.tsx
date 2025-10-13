"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { Key, Eye, EyeOff, Shield, CheckCircle, AlertTriangle, Info, Globe } from "lucide-react"

interface PasswordStrength {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
}

export function AdminSettings() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { token, user } = useAuth()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  // 站点配置
  const [siteTitle, setSiteTitle] = useState("FireflyCloud")
  const [siteDescription, setSiteDescription] = useState("云存储")
  const [savingSite, setSavingSite] = useState(false)

  useEffect(() => {
    const fetchSite = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/site-config`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setSiteTitle(data.title || "FireflyCloud")
          setSiteDescription(data.description || "云存储")
        }
      } catch {}
    }
    if (token) fetchSite()
  }, [token, API_URL])

  const saveSiteConfig = async () => {
    try {
      setSavingSite(true)
      const res = await fetch(`${API_URL}/admin/site-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: siteTitle, description: siteDescription })
      })
      if (res.ok) {
        toast.success("站点信息已保存")
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error("保存失败", { description: data.error || '无法保存站点配置' })
      }
    } catch {
      toast.error("网络错误", { description: '请稍后重试' })
    } finally {
      setSavingSite(false)
    }
  }

  // 密码强度检查
  const checkPasswordStrength = (password: string): PasswordStrength => {
    const errors: string[] = []
    
    if (password.length < 6) {
      errors.push('密码长度至少6位')
    }
    
    if (password.length > 128) {
      errors.push('密码长度不能超过128位')
    }
    
    const hasLowercase = /[a-z]/.test(password)
    const hasUppercase = /[A-Z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    
    let characterTypes = 0
    if (hasLowercase) characterTypes++
    if (hasUppercase) characterTypes++
    if (hasNumbers) characterTypes++
    if (hasSymbols) characterTypes++
    
    if (characterTypes < 2) {
      errors.push('密码应包含至少两种字符类型（大写字母、小写字母、数字、特殊字符）')
    }
    
    let strength: 'weak' | 'medium' | 'strong' = 'weak'
    
    if (password.length >= 8 && characterTypes >= 3) {
      strength = 'strong'
    } else if (password.length >= 6 && characterTypes >= 2) {
      strength = 'medium'
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      strength
    }
  }

  const passwordStrength = newPassword ? checkPasswordStrength(newPassword) : null

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'weak': return 'text-red-600'
      default: return 'text-gray-500'
    }
  }

  const getStrengthIcon = (strength: string) => {
    switch (strength) {
      case 'strong': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'weak': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // 基本验证
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("请填写所有字段", {
        description: "当前密码、新密码和确认密码都是必需的"
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("新密码和确认密码不匹配", {
        description: "请确保两次输入的新密码一致"
      })
      return
    }

    if (!passwordStrength?.isValid) {
      toast.error("密码强度不足", {
        description: passwordStrength?.errors.join("，")
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/admin/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        toast.success("密码修改成功", {
          description: `密码强度：${data.passwordStrength}`,
          action: {
            label: "确定",
            onClick: () => console.log("Password changed successfully"),
          },
        })
      } else {
        if (data.details) {
          toast.error(data.error || "密码修改失败", {
            description: data.details.join("，")
          })
        } else {
          toast.error("密码修改失败", {
            description: data.error || "无法修改密码"
          })
        }
      }
    } catch (error) {
      toast.error("网络错误", {
        description: "无法连接到服务器，请稍后重试"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            站点信息
          </CardTitle>
          <CardDescription>
            配置左上角站点标题和描述，默认为 FireflyCloud
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteTitle">站点标题</Label>
              <Input id="siteTitle" value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDesc">站点描述</Label>
              <Input id="siteDesc" value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={saveSiteConfig} disabled={savingSite} className="min-w-[120px]">
              {savingSite ? '保存中...' : '保存设置'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            修改管理员密码
          </CardTitle>
          <CardDescription>
            为了账户安全，建议定期更换密码。密码应包含字母、数字和特殊字符。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">当前密码</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="请输入当前密码"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {passwordStrength && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getStrengthIcon(passwordStrength.strength)}
                    <span className={`text-sm font-medium ${getStrengthColor(passwordStrength.strength)}`}>
                      密码强度：{passwordStrength.strength === 'strong' ? '强' : passwordStrength.strength === 'medium' ? '中等' : '弱'}
                    </span>
                  </div>
                  {passwordStrength.errors.length > 0 && (
                    <ul className="text-sm text-red-600 space-y-1">
                      {passwordStrength.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-600">密码不匹配</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={loading || !passwordStrength?.isValid || newPassword !== confirmPassword}
                className="min-w-[120px]"
              >
                {loading ? "修改中..." : "修改密码"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            账户信息
          </CardTitle>
          <CardDescription>
            当前管理员账户的基本信息
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">登录邮箱：</span>
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">账户角色：</span>
              <span className="text-sm text-muted-foreground">管理员</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">账户ID：</span>
              <span className="text-sm text-muted-foreground font-mono">{user?.id}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
