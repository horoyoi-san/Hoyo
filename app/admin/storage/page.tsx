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
                  การตั้งค่าการจัดเก็บข้อมูล
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">การตั้งค่าการจัดเก็บข้อมูล</h1>
            <p className="text-sm sm:text-base text-muted-foreground">การกำหนดค่าการตั้งค่าที่เกี่ยวข้องกับการจัดเก็บข้อมูล</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>การกำหนดค่าการจัดเก็บข้อมูลทั่วโลก</CardTitle>
              <CardDescription>ตั้งค่าประเภทการจัดเก็บข้อมูล, ท้องถิ่น/R2/OneDrive และพารามิเตอร์อื่นๆ</CardDescription>
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