"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Cloud } from "lucide-react"
import { UserStorageManagement } from "@/components/admin/user-storage-management"

export default function AdminUserStoragePage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppLayout>
        <div className="space-y-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1">
                  <Cloud className="h-4 w-4" />
                  นโยบายการจัดเก็บข้อมูลของผู้ใช้
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">นโยบายการจัดเก็บข้อมูลของผู้ใช้</h1>
            <p className="text-sm sm:text-base text-muted-foreground">การกำหนดนโยบายการจัดเก็บข้อมูลให้กับผู้ใช้</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>การมอบหมายกลยุทธ์</CardTitle>
              <CardDescription>กำหนดหรือปรับนโยบายการจัดเก็บข้อมูลสำหรับผู้ใช้ที่ระบุ</CardDescription>
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