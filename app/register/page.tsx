"use client"

import { useState, useEffect } from "react"
import * as React from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Cloud } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [smtpEnabled, setSmtpEnabled] = useState<boolean | null>(null)
  const [checkingSmtp, setCheckingSmtp] = useState(true)
  const [registrationAllowed, setRegistrationAllowed] = useState<boolean | null>(null)
  const [checkingRegistration, setCheckingRegistration] = useState(true)

  const { register } = useAuth()
  const router = useRouter()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  // 检查 SMTP 状态和注册状态
  useEffect(() => {
    const checkStatuses = async () => {
      try {
        // 检查 SMTP 状态
        const smtpResponse = await fetch(`${API_URL}/auth/smtp-status`)
        if (smtpResponse.ok) {
          const smtpData = await smtpResponse.json()
          setSmtpEnabled(smtpData.enabled)
        } else {
          setSmtpEnabled(false)
        }

        // 检查注册状态
        const siteResponse = await fetch(`${API_URL}/site-config`)
        if (siteResponse.ok) {
          const siteData = await siteResponse.json()
          setRegistrationAllowed(siteData.allowUserRegistration ?? true)
        } else {
          setRegistrationAllowed(true) // 默认允许注册
        }
      } catch (error) {
        console.error("Failed to check statuses:", error)
        setSmtpEnabled(false)
        setRegistrationAllowed(true)
      } finally {
        setCheckingSmtp(false)
        setCheckingRegistration(false)
      }
    }

    checkStatuses()
  }, [API_URL])

  // 倒计时效果
  React.useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  // 发送验证码
  const handleSendCode = async () => {
    if (!smtpEnabled) {
      setError("邮件服务未启用")
      return
    }

    if (!email) {
      setError("请先输入邮箱地址")
      return
    }

    setSendingCode(true)
    setError("")

    try {
      const response = await fetch(`${API_URL}/auth/send-verification-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setCodeSent(true)
        setCountdown(60) // 60秒倒计时
        setError("")
      } else {
        setError(data.error || "发送验证码失败")
      }
    } catch (err) {
      setError("网络错误，请稍后重试")
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // 基本验证
    if (!email.trim()) {
      setError("请输入邮箱地址")
      return
    }

    if (!password.trim()) {
      setError("请输入密码")
      return
    }

    if (!confirmPassword.trim()) {
      setError("请确认密码")
      return
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }

    if (password.length < 6) {
      setError("密码长度至少需要6个字符")
      return
    }

    // 如果启用了 SMTP，则需要验证码
    if (smtpEnabled && !verificationCode.trim()) {
      setError("请输入邮箱验证码")
      return
    }

    setLoading(true)

    try {
      const requestBody: any = {
        email,
        password,
      }

      // 只有在启用 SMTP 时才发送验证码
      if (smtpEnabled) {
        requestBody.verificationCode = verificationCode
      }

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok) {
        // 注册成功，保存token并跳转
        localStorage.setItem("token", data.token)
        router.push("/dashboard")
      } else {
        setError(data.error || "注册失败，请稍后重试")
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("注册失败，请检查您的网络连接")
      }
    } finally {
      setLoading(false)
    }
  }

  // 加载中状态
  if (checkingRegistration || checkingSmtp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary mb-4">
              <Cloud className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">FireflyCloud</h1>
            <p className="text-muted-foreground text-sm">检查系统状态中...</p>
          </div>
          <Card className="w-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 注册已关闭的情况
  if (registrationAllowed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary mb-4">
              <Cloud className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">FireflyCloud</h1>
            <p className="text-muted-foreground text-sm">การจัดเก็บข้อมูลบนคลาวด์ที่ทันสมัย</p>
          </div>
          <Card className="w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">
                注册已关闭
              </CardTitle>
              <CardDescription>
                系统管理员已关闭新用户注册功能
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  目前不接受新用户注册。如果您需要账户，请联系系统管理员。
                </AlertDescription>
              </Alert>
              <div className="flex justify-center">
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    返回登录页面
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary mb-4">
            <Cloud className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">FireflyCloud</h1>
          <p className="text-muted-foreground text-sm">การจัดเก็บข้อมูลบนคลาวด์ที่ทันสมัย</p>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              สร้างบัญชี
            </CardTitle>
            <CardDescription>
              สร้างบัญชี FireflyCloud ของคุณเพื่อเริ่มต้น
              {checkingSmtp && <span className="block text-xs text-muted-foreground mt-1">正在检查邮件配置...</span>}
              {!checkingSmtp && smtpEnabled && <span className="block text-xs text-muted-foreground mt-1">需要邮箱验证</span>}
              {!checkingSmtp && !smtpEnabled && <span className="block text-xs text-muted-foreground mt-1">ไม่จำเป็นต้องมีการยืนยันอีเมล</span>}
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">ที่อยู่อีเมล</Label>
              {smtpEnabled ? (
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={sendingCode || countdown > 0 || !email}
                    className="whitespace-nowrap"
                  >
                    {sendingCode ? "发送中..." : countdown > 0 ? `${countdown}s` : "发送验证码"}
                  </Button>
                </div>
              ) : (
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              )}
              {smtpEnabled && codeSent && (
                <p className="text-sm text-muted-foreground">
                  验证码已发送到您的邮箱，请查收
                </p>
              )}
            </div>

            {smtpEnabled && (
              <div className="space-y-2">
                <Label htmlFor="verificationCode">邮箱验证码</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="请输入6位验证码"
                  maxLength={6}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="创建密码"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || checkingSmtp || checkingRegistration || (smtpEnabled === true && !verificationCode)}
            >
              {loading ? "กำลังสร้างบัญชี..." : (checkingSmtp || checkingRegistration) ? "กำลังตรวจสอบการกำหนดค่า..." : "สร้างบัญชี"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              มีบัญชีอยู่แล้วใช่ไหม?{" "}
              <Link href="/login" className="text-primary hover:underline">
                เข้าสู่ระบบตอนนี้
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
