"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"

function GoogleCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')

    if (error) {
      // 谷歌OAuth错误，重定向到登录页面并显示错误
      router.push(`/login?error=${encodeURIComponent('谷歌登录被取消或失败')}&oauth_type=google`)
      return
    }

    if (code) {
      // 成功获取授权码，重定向到登录页面进行处理
      router.push(`/login?code=${encodeURIComponent(code)}&oauth_type=google`)
      return
    }

    // 没有code也没有error，可能是直接访问了这个页面
    router.push('/login')
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            การจัดการการลงชื่อเข้าใช้ Google
          </CardTitle>
          <CardDescription>
            正在处理您的谷歌账户登录...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">
            โปรดรอสักครู่ในขณะที่เราตรวจสอบข้อมูลบัญชี Google ของคุณ
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallbackContent />
    </Suspense>
  )
}