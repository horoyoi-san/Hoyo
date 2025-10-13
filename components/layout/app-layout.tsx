"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"
import { useMemo } from "react"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean)
    const items = []

    if (segments.length === 0 || (segments.length === 1 && segments[0] === "dashboard")) {
      return [{ label: "仪表板", href: "/dashboard", isActive: true }]
    }

    // Add Dashboard as first item if not on dashboard
    items.push({ label: "仪表板", href: "/dashboard", isActive: false })

    // Process remaining segments
    segments.forEach((segment, index) => {
      if (segment === "dashboard") return

      const href = "/" + segments.slice(0, index + 1).join("/")
      let label = segment.charAt(0).toUpperCase() + segment.slice(1)

      // 中文路径映射
      if (segment === "admin") {
        label = "管理面板"
      } else if (segment === "logs") {
        label = "运行日志"
      } else if (segment === "pickup") {
        label = "取件码"
      } else if (segment === "shares") {
        label = "我的分享"
      } else if (segment === "direct-links") {
        label = "直链管理"
      }

      const isActive = index === segments.length - 1

      items.push({ label, href, isActive })
    })

    return items
  }, [pathname])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {/* 移动端只显示当前页面 */}
                <div className="md:hidden">
                  {breadcrumbs.find(item => item.isActive) && (
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-sm font-medium">
                        {breadcrumbs.find(item => item.isActive)?.label}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                </div>

                {/* 桌面端显示完整面包屑 */}
                <div className="hidden md:flex md:items-center md:gap-2">
                  {breadcrumbs.map((item, index) => (
                    <div key={item.href} className="flex items-center gap-2">
                      <BreadcrumbItem>
                        {item.isActive ? (
                          <BreadcrumbPage>{item.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {index < breadcrumbs.length - 1 && (
                        <BreadcrumbSeparator />
                      )}
                    </div>
                  ))}
                </div>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-x-hidden max-w-full">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
