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
                  การจัดการระบบ
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">แผงผู้ดูแลระบบ</h1>
            <p className="text-sm sm:text-base text-muted-foreground">จัดการผู้ใช้ ไฟล์ และการตั้งค่าระบบ</p>
          </div>
          <AdminDashboard />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
