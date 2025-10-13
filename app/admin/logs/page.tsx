"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AppLayout } from "@/components/layout/app-layout"
import { RuntimeLogs } from "@/components/admin/runtime-logs"
import { SystemInfo } from "@/components/admin/system-info"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Settings, Terminal } from "lucide-react"
import Link from "next/link"

export default function AdminLogsPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AppLayout>
        <div className="space-y-4 sm:space-y-6">
          {/* 面包屑导航 - 移动端优化 */}
          <Breadcrumb className="overflow-x-auto">
            <BreadcrumbList className="flex-nowrap">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/admin" className="flex items-center gap-1 text-sm">
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">系统管理</span>
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1 text-sm">
                  <Terminal className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">运行日志</span>
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* 页面标题 - 移动端优化 */}
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">运行日志</h1>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">查看系统详细信息、实时运行日志和错误信息</p>
          </div>

          {/* 系统信息 */}
          <div className="w-full min-w-0">
            <SystemInfo />
          </div>

          {/* 运行日志组件 */}
          <div className="w-full min-w-0">
            <RuntimeLogs />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
