"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Globe, UserPlus } from "lucide-react"

export function SiteSettings() {
  const { token } = useAuth()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  const [siteTitle, setSiteTitle] = useState("FireflyCloud")
  const [siteDescription, setSiteDescription] = useState("云存储")
  const [allowUserRegistration, setAllowUserRegistration] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

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
          setAllowUserRegistration(data.allowUserRegistration ?? true)
        }
      } catch {}
      setLoading(false)
    }
    if (token) fetchSite()
  }, [token, API_URL])

  const save = async () => {
    try {
      setSaving(true)
      const res = await fetch(`${API_URL}/admin/site-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: siteTitle, 
          description: siteDescription,
          allowUserRegistration: allowUserRegistration
        })
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
      setSaving(false)
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          站点设置
        </CardTitle>
        <CardDescription>配置站点基本信息和用户注册权限</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 站点信息配置 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <h4 className="font-medium">站点信息</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteTitle2">站点标题</Label>
              <Input id="siteTitle2" value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDesc2">站点描述</Label>
              <Input id="siteDesc2" value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} />
            </div>
          </div>
        </div>

        <Separator />

        {/* 用户注册配置 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            <h4 className="font-medium">用户注册</h4>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">允许新用户注册</Label>
              <p className="text-sm text-muted-foreground">
                关闭后，新用户将无法通过注册页面或第三方OAuth创建账户
              </p>
            </div>
            <Switch
              checked={allowUserRegistration}
              onCheckedChange={setAllowUserRegistration}
            />
          </div>
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="min-w-[120px]">
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 