"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { HardDrive } from "lucide-react"
import { QuotaManagement } from "@/components/admin/quota-management"

export default function AdminQuotasPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppLayout>
        <div className="space-y-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1">
                  <HardDrive className="h-4 w-4" />
                  配额管理
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">配额管理</h1>
            <p className="text-sm sm:text-base text-muted-foreground">管理用户存储配额</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>用户配额</CardTitle>
              <CardDescription>查看和调整用户的最大存储、已用存储与默认配额</CardDescription>
            </CardHeader>
            <CardContent>
              <QuotaManagement />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
} 