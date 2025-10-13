"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AppLayout } from "@/components/layout/app-layout"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Settings } from "lucide-react"

export default function AdminPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppLayout>
        <div className="space-y-6">
          {/* 面包屑导航 */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  系统管理
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">管理面板</h1>
            <p className="text-sm sm:text-base text-muted-foreground">管理用户、文件和系统设置</p>
          </div>
          <AdminDashboard />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
