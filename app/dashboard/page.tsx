"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AppLayout } from "@/components/layout/app-layout"
import { FileManager } from "@/components/files/file-manager"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-4 md:space-y-6 w-full max-w-full overflow-hidden">
          <div className="px-1">
            <h1 className="text-xl md:text-3xl font-bold text-foreground">我的文件</h1>
            <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">上传、管理和整理您的文件</p>
          </div>
          <div className="w-full max-w-full overflow-hidden">
            <FileManager />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
