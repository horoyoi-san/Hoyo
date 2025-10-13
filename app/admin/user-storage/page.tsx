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
                  用户存储策略
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">用户存储策略</h1>
            <p className="text-sm sm:text-base text-muted-foreground">为用户分配存储策略</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>策略分配</CardTitle>
              <CardDescription>为指定用户分配或调整存储策略</CardDescription>
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