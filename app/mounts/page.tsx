"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AppLayout } from "@/components/layout/app-layout"
import { MountManagement } from "@/components/mounts/mount-management"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { HardDrive } from "lucide-react"

export default function MountsPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppLayout>
        <div className="space-y-6">
          {/* 面包屑导航 */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1">
                  <HardDrive className="h-4 w-4" />
                  การจัดการการเมานต์
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">การจัดการการเมานต์</h1>
            <p className="text-sm sm:text-base text-muted-foreground">การจัดการจุดเชื่อมต่อที่เก็บข้อมูล R2 และ OneDrive</p>
          </div>
          <MountManagement />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}