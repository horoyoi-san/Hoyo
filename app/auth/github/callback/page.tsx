"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function GitHubCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('GitHub OAuth error:', error)
      router.push('/login?error=github_oauth_failed&oauth_type=github')
      return
    }

    if (!code) {
      console.error('No authorization code received')
      router.push('/login?error=github_oauth_failed&oauth_type=github')
      return
    }

    // 成功获取授权码，重定向到登录页面进行处理（与Google OAuth保持一致）
    router.push(`/login?code=${encodeURIComponent(code)}&oauth_type=github`)
  }, [searchParams, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">正在处理GitHub登录...</p>
      </div>
    </div>
  )
}

export default function GitHubCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">正在加载...</p>
        </div>
      </div>
    }>
      <GitHubCallbackContent />
    </Suspense>
  )
} 