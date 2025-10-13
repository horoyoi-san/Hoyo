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
                  การจัดการโควต้า
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">การจัดการโควต้า</h1>
            <p className="text-sm sm:text-base text-muted-foreground">การจัดการโควตาการจัดเก็บข้อมูลของผู้ใช้</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>โควตาผู้ใช้</CardTitle>
              <CardDescription>ดูและปรับพื้นที่เก็บข้อมูลสูงสุด พื้นที่เก็บข้อมูลที่ใช้ และโควตาเริ่มต้นของผู้ใช้</CardDescription>
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