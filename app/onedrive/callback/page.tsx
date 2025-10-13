"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

function OneDriveCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { token } = useAuth()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    const handleCallback = async () => {
      if (!token) {
        setStatus("error")
        setMessage("用户未登录，请先登录后再进行授权")
        return
      }

      const code = searchParams.get("code")
      const error = searchParams.get("error")
      const errorDescription = searchParams.get("error_description")

      if (error) {
        setStatus("error")
        setMessage(`授权失败: ${error} - ${errorDescription || "未知错误"}`)
        return
      }

      if (!code) {
        setStatus("error")
        setMessage("未收到授权码，请重新尝试授权")
        return
      }

      try {
        const redirectUri = `${window.location.origin}/onedrive/callback`
        
        const response = await fetch(`${API_URL}/storage/onedrive/callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            code,
            redirectUri,
          }),
        })

        if (response.ok) {
          setStatus("success")
          setMessage("OneDrive 授权成功！您现在可以创建 OneDrive 挂载点了。")
        } else {
          const errorData = await response.json()
          setStatus("error")
          setMessage(`授权处理失败: ${errorData.error || "未知错误"}`)
        }
      } catch (error) {
        setStatus("error")
        setMessage("网络错误，无法完成授权处理")
      }
    }

    handleCallback()
  }, [token, searchParams])

  const handleGoBack = () => {
    router.push("/mounts")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === "success" && <CheckCircle className="h-5 w-5 text-green-600" />}
            {status === "error" && <AlertCircle className="h-5 w-5 text-red-600" />}
            OneDrive 授权
          </CardTitle>
          <CardDescription>
            {status === "loading" && "正在处理 OneDrive 授权..."}
            {status === "success" && "授权成功"}
            {status === "error" && "授权失败"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="text-center text-sm text-muted-foreground">
              请稍候，正在与 Microsoft 服务器通信...
            </div>
          )}
          
          {status === "success" && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          
          {status === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {status !== "loading" && (
            <div className="flex justify-center">
              <Button onClick={handleGoBack}>
                返回挂载管理
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function OneDriveCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OneDriveCallbackContent />
    </Suspense>
  )
}