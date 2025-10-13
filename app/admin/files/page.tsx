"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Files as FilesIcon } from "lucide-react"
import { FileManagement } from "@/components/admin/file-management"

export default function AdminFilesPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppLayout>
        <div className="space-y-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1">
                  <FilesIcon className="h-4 w-4" />
                  文件管理
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">文件</h1>
            <p className="text-sm sm:text-base text-muted-foreground">查看和管理系统中的所有文件</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>文件管理</CardTitle>
              <CardDescription>支持筛选、查看详情和删除文件</CardDescription>
            </CardHeader>
            <CardContent>
              <FileManagement onFileDeleted={() => {}} />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
} 