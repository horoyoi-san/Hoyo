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
        setMessage("ผู้ใช้ไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อนแล้วจึงอนุญาต")
        return
      }

      const code = searchParams.get("code")
      const error = searchParams.get("error")
      const errorDescription = searchParams.get("error_description")

      if (error) {
        setStatus("error")
        setMessage(`การอนุญาตล้มเหลว: ${error} - ${errorDescription || "ข้อผิดพลาดที่ไม่รู้จัก"}`)
        return
      }

      if (!code) {
        setStatus("error")
        setMessage("ไม่ได้รับรหัสอนุมัติ กรุณาลองอนุมัติอีกครั้ง")
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
          setMessage("การอนุญาต OneDrive สำเร็จ! ตอนนี้คุณสามารถสร้างจุดเชื่อมต่อ OneDrive ได้แล้ว")
        } else {
          const errorData = await response.json()
          setStatus("error")
          setMessage(`การประมวลผลการอนุญาตล้มเหลว: ${errorData.error || "ข้อผิดพลาดที่ไม่รู้จัก"}`)
        }
      } catch (error) {
        setStatus("error")
        setMessage("ข้อผิดพลาดของเครือข่าย ไม่สามารถดำเนินการอนุมัติให้เสร็จสมบูรณ์ได้")
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
            การอนุญาต OneDrive
          </CardTitle>
          <CardDescription>
            {status === "loading" && "กำลังดำเนินการอนุมัติ OneDrive..."}
            {status === "success" && "การอนุมัติสำเร็จ"}
            {status === "error" && "การอนุญาตล้มเหลว"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="text-center text-sm text-muted-foreground">
              กรุณารอสักครู่ กำลังสื่อสารกับเซิร์ฟเวอร์ Microsoft...
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
                กลับไปที่การจัดการการเมาน
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