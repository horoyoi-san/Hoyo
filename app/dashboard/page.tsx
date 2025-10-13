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
            <h1 className="text-xl md:text-3xl font-bold text-foreground">ไฟล์ของฉัน</h1>
            <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">อัพโหลด จัดการ และจัดระเบียบไฟล์ของคุณ</p>
          </div>
          <div className="w-full max-w-full overflow-hidden">
            <FileManager />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
