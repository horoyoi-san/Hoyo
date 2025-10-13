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
                  邮件配置
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">邮件配置</h1>
            <p className="text-sm sm:text-base text-muted-foreground">配置 SMTP 邮件服务</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>SMTP 设置</CardTitle>
              <CardDescription>配置发信服务器、凭据、模板并可测试发送</CardDescription>
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