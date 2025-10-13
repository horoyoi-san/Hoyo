"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AppLayout } from "@/components/layout/app-layout"
import { DatabaseManagement } from "@/components/admin/database-management"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Database, Settings } from "lucide-react"
import Link from "next/link"

export default function DatabasePage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppLayout>
        <div className="space-y-6">
        {/* 面包屑导航 */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/admin" className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  系统管理
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1">
                <Database className="h-4 w-4" />
                数据库管理
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* 页面标题 */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex-shrink-0">
            <Database className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">数据库管理</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              查看和管理数据库中的所有表和数据
            </p>
          </div>
        </div>

          {/* 数据库管理组件 */}
          <DatabaseManagement />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
