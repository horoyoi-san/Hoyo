"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Settings } from "lucide-react"
import { StorageConfiguration } from "@/components/admin/storage-configuration"

export default function AdminStoragePage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppLayout>
        <div className="space-y-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  存储设置
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">存储设置</h1>
            <p className="text-sm sm:text-base text-muted-foreground">配置存储相关设置</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>全局存储配置</CardTitle>
              <CardDescription>设置存储类型、本地/R2/OneDrive等参数</CardDescription>
            </CardHeader>
            <CardContent>
              <StorageConfiguration />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
} 