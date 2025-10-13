"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Users, Cloud } from "lucide-react"
import { UserManagement } from "@/components/admin/user-management"
import { UserStorageManagement } from "@/components/admin/user-storage-management"

export default function AdminUsersPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppLayout>
        <div className="space-y-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  การจัดการผู้ใช้
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">การจัดการผู้ใช้</h1>
            <p className="text-sm sm:text-base text-muted-foreground">จัดการผู้ใช้ระบบ สิทธิ์อนุญาต และการกำหนดนโยบายการจัดเก็บข้อมูล</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>รายชื่อผู้ใช้</CardTitle>
              <CardDescription>เพิ่มและลบผู้ใช้ และปรับเปลี่ยนสิทธิ์บทบาท</CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagement onUserDeleted={() => {}} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                นโยบายการจัดเก็บข้อมูลของผู้ใช้
              </CardTitle>
              <CardDescription>กำหนดหรือปรับนโยบายการจัดเก็บข้อมูล (ภายในเครื่อง/R2/OneDrive เป็นต้น) ให้กับผู้ใช้</CardDescription>
            </CardHeader>
            <CardContent>
              <UserStorageManagement />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
} 