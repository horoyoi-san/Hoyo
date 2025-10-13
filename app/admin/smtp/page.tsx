"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Mail } from "lucide-react"
import { SmtpConfiguration } from "@/components/admin/smtp-configuration"

export default function AdminSmtpPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppLayout>
        <div className="space-y-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  การกำหนดค่าอีเมล
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">การกำหนดค่าอีเมล</h1>
            <p className="text-sm sm:text-base text-muted-foreground">การกำหนดค่าบริการอีเมล SMTP</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>การตั้งค่า SMTP</CardTitle>
              <CardDescription>กำหนดค่าเซิร์ฟเวอร์การส่ง ข้อมูลประจำตัว เทมเพลต และการทดสอบการส่ง</CardDescription>
            </CardHeader>
            <CardContent>
              <SmtpConfiguration />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
} 