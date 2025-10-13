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
                  用户管理
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">用户管理</h1>
            <p className="text-sm sm:text-base text-muted-foreground">管理系统用户、权限，以及存储策略分配</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>用户列表</CardTitle>
              <CardDescription>添加、删除用户，调整角色权限</CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagement onUserDeleted={() => {}} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                用户存储策略
              </CardTitle>
              <CardDescription>为用户分配或调整存储策略（本地 / R2 / OneDrive 等）</CardDescription>
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