"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, Cloud } from "lucide-react"
import Link from "next/link"

function LoginContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubEnabled, setGithubEnabled] = useState(false)
  const [microsoftLoading, setMicrosoftLoading] = useState(false)
  const [microsoftEnabled, setMicrosoftEnabled] = useState(false)

  const { login, loginWithGoogle, getGoogleAuthUrl, loginWithGitHub, getGitHubAuthUrl, loginWithMicrosoft, getMicrosoftAuthUrl } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  // 检查谷歌OAuth是否启用
  useEffect(() => {
    const checkGoogleOAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/google-oauth-status`)
        if (response.ok) {
          const data = await response.json()
          setGoogleEnabled(data.enabled && data.configured)
        }
      } catch (error) {
        console.error("การตรวจสอบสถานะ Google OAuth ล้มเหลว:", error)
      }
    }
    checkGoogleOAuth()
  }, [])

  // 检查GitHub OAuth是否启用
  useEffect(() => {
    const checkGitHubOAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/github-oauth-status`)
        if (response.ok) {
          const data = await response.json()
          setGithubEnabled(data.enabled && data.configured)
        }
      } catch (error) {
        console.error("การตรวจสอบสถานะ GitHub OAuth ล้มเหลว:", error)
      }
    }
    checkGitHubOAuth()
  }, [])

  // 检查Microsoft OAuth是否启用
  useEffect(() => {
    const checkMicrosoftOAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/microsoft-oauth-status`)
        if (response.ok) {
          const data = await response.json()
          setMicrosoftEnabled(data.enabled && data.configured)
        }
      } catch (error) {
        console.error("การตรวจสอบสถานะ Microsoft OAuth ล้มเหลว:", error)
      }
    }
    checkMicrosoftOAuth()
  }, [])

  // 处理OAuth回调 - 统一处理，通过参数区分类型
  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const oauthType = searchParams.get('oauth_type') // 新增：OAuth类型标识
    
    if (error) {
      if (oauthType === 'google') {
        setError('การลงชื่อเข้าใช้ Google ถูกยกเลิกหรือล้มเหลว')
      } else if (oauthType === 'github') {
        setError('การเข้าสู่ระบบ GitHub ถูกยกเลิกหรือล้มเหลว')
      } else if (oauthType === 'microsoft') {
        setError('การลงชื่อเข้าใช้ Microsoft ถูกยกเลิกหรือล้มเหลว')
      } else {
        setError('การเข้าสู่ระบบ OAuth ล้มเหลว')
      }
      return
    }
    
    if (code && oauthType) {
      if (oauthType === 'google') {
        handleGoogleCallback(code)
      } else if (oauthType === 'github') {
        handleGitHubCallback(code)
      } else if (oauthType === 'microsoft') {
        handleMicrosoftCallback(code)
      }
    }
  }, [searchParams])

  const handleGoogleCallback = async (code: string) => {
    setGoogleLoading(true)
    setError("")
    
    try {
      await loginWithGoogle(code)
      router.push("/dashboard")
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("การเข้าสู่ระบบ Google ล้มเหลว โปรดลองอีกครั้งในภายหลัง")
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleGitHubCallback = async (code: string) => {
    setGithubLoading(true)
    setError("")
    
    try {
      await loginWithGitHub(code)
      router.push("/dashboard")
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("การเข้าสู่ระบบ GitHub ล้มเหลว โปรดลองอีกครั้งในภายหลัง")
      }
    } finally {
      setGithubLoading(false)
    }
  }

  const handleMicrosoftCallback = async (code: string) => {
    setMicrosoftLoading(true)
    setError("")
    
    try {
      await loginWithMicrosoft(code)
      router.push("/dashboard")
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("การเข้าสู่ระบบ Microsoft ล้มเหลว โปรดลองอีกครั้งในภายหลัง")
      }
    } finally {
      setMicrosoftLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError("")
    
    try {
      const authUrl = await getGoogleAuthUrl()
      window.location.href = authUrl
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("ไม่สามารถรับลิงก์การอนุญาตจาก Google ได้")
      }
      setGoogleLoading(false)
    }
  }

  const handleGitHubLogin = async () => {
    setGithubLoading(true)
    setError("")
    
    try {
      const authUrl = await getGitHubAuthUrl()
      window.location.href = authUrl
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("ไม่สามารถรับลิงก์การอนุญาต GitHub ได้")
      }
      setGithubLoading(false)
    }
  }

  const handleMicrosoftLogin = async () => {
    setMicrosoftLoading(true)
    setError("")
    
    try {
      const authUrl = await getMicrosoftAuthUrl()
      window.location.href = authUrl
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("ไม่สามารถรับลิงก์การอนุญาตของ Microsoft ได้")
      }
      setMicrosoftLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // 基本验证
    if (!email.trim()) {
      setError("กรุณากรอกที่อยู่อีเมลของคุณ")
      setLoading(false)
      return
    }

    if (!password.trim()) {
      setError("กรุณากรอกรหัสผ่านของคุณ")
      setLoading(false)
      return
    }

    try {
      await login(email, password)
      router.push("/dashboard")
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("การเข้าสู่ระบบล้มเหลว กรุณาตรวจสอบการเชื่อมต่อเครือข่ายของคุณ")
      }
    } finally {
      setLoading(false)
    }
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
          <p className="text-muted-foreground text-sm"></p>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              เข้าสู่ระบบบัญชีของคุณ
            </CardTitle>
            <CardDescription>กรอกข้อมูลประจำตัวของคุณเพื่อเข้าถึง FireflyCloud</CardDescription>
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
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="กรุณากรอกที่อยู่อีเมลของคุณ"
                required
                disabled={loading || googleLoading || githubLoading || microsoftLoading}
                className={error && !email.trim() ? "border-red-500 focus:border-red-500" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรุณากรอกรหัสผ่านของคุณ"
                  required
                  disabled={loading || googleLoading || githubLoading || microsoftLoading}
                  className={error && !password.trim() ? "border-red-500 focus:border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || googleLoading || githubLoading || microsoftLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || googleLoading || githubLoading || microsoftLoading}>
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
          </form>

          {/* OAuth登录区域 */}
          {(googleEnabled || githubEnabled || microsoftEnabled) && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">หรือเข้าสู่ระบบโดยใช้บัญชีบุคคลที่สาม</span>
                </div>
              </div>

              {/* OAuth登录图标卡片 */}
              {(() => {
                const enabledCount = [googleEnabled, githubEnabled, microsoftEnabled].filter(Boolean).length
                const gridCols = enabledCount === 1 ? 'grid-cols-1' : enabledCount === 2 ? 'grid-cols-2' : 'grid-cols-3'
                return (
                  <div className={`grid gap-3 ${gridCols}`}>
                {/* Google登录卡片 */}
                {googleEnabled && (
                  <Card 
                    className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 border-2 hover:border-primary/50"
                    onClick={handleGoogleLogin}
                  >
                    <CardContent className="flex items-center justify-center p-4">
                      {googleLoading ? (
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      ) : (
                        <svg className="h-6 w-6" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* GitHub登录卡片 */}
                {githubEnabled && (
                  <Card 
                    className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 border-2 hover:border-primary/50"
                    onClick={handleGitHubLogin}
                  >
                    <CardContent className="flex items-center justify-center p-4">
                      {githubLoading ? (
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      ) : (
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Microsoft登录卡片 */}
                {microsoftEnabled && (
                  <Card 
                    className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 border-2 hover:border-primary/50"
                    onClick={handleMicrosoftLogin}
                  >
                    <CardContent className="flex items-center justify-center p-4">
                      {microsoftLoading ? (
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      ) : (
                        <svg className="h-6 w-6" viewBox="0 0 23 23">
                          <path d="M0 0h11v11H0z" fill="#F25022"/>
                          <path d="M12 0h11v11H12z" fill="#7FBA00"/>
                          <path d="M0 12h11v11H0z" fill="#00A4EF"/>
                          <path d="M12 12h11v11H12z" fill="#FFB900"/>
                        </svg>
                      )}
                    </CardContent>
                  </Card>
                )}
                  </div>
                )
              })()}
            </>
          )}

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              ยังไม่มีบัญชีใช่ไหม?{" "}
              <Link href="/register" className="text-primary hover:underline">
                ลงทะเบียนตอนนี้
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}