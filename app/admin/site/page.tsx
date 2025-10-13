"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Globe } from "lucide-react"
import { SiteSettings } from "@/components/admin/site-settings"

export default function AdminSitePage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppLayout>
        <div className="space-y-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  การตั้งค่าไซต์
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">การตั้งค่าไซต์</h1>
            <p className="text-sm sm:text-base text-muted-foreground">กำหนดค่าชื่อไซต์และคำอธิบาย</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลไซต์</CardTitle>
              <CardDescription>ชื่อไซต์และคำอธิบายอยู่ที่มุมซ้ายบน</CardDescription>
            </CardHeader>
            <CardContent>
              <SiteSettings />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
} 