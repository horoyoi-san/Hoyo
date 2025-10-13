"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuAction,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Cloud,
  Files,
  Settings,
  Users,
  HardDrive,
  LogOut,
  User,
  ChevronUp,
  Database,
  Hash,
  Share2,
  Link as LinkIcon,
  Terminal,
  Globe,
  Mail,
  ChevronRight,
  HardDrive as HardDriveIcon,
} from "lucide-react"
import Link from "next/link"
import { useSiteConfig } from "@/components/providers"

const navigationItems = [
  {
    title: "我的文件",
    url: "/dashboard",
    icon: Files,
    description: "上传和管理您的文件",
  },
  {
    title: "我的分享",
    url: "/shares",
    icon: Share2,
    description: "管理您的分享文件",
  },
  {
    title: "直链管理",
    url: "/direct-links",
    icon: LinkIcon,
    description: "管理您的文件直链",
  },
  {
    title: "取件码",
    url: "/pickup",
    icon: Hash,
    description: "使用取件码下载文件",
  },
]

const adminItems = [
  {
    title: "管理面板",
    url: "/admin",
    icon: Settings,
    description: "系统管理",
    children: [
      {
        title: "总览",
        url: "/admin",
        icon: Settings,
      },
      {
        title: "用户管理",
        url: "/admin/users",
        icon: Users,
      },
      {
        title: "文件",
        url: "/admin/files",
        icon: Files,
      },
      {
        title: "配额管理",
        url: "/admin/quotas",
        icon: HardDrive,
      },
      {
        title: "存储设置",
        url: "/admin/storage",
        icon: Settings,
      },
      {
        title: "站点设置",
        url: "/admin/site",
        icon: Globe,
      },
      {
        title: "邮件配置",
        url: "/admin/smtp",
        icon: Mail,
      },
      {
        title: "OAuth配置",
        url: "/admin/oauth",
        icon: Cloud,
      }
    ]
  },
  {
    title: "挂载管理",
    url: "/mounts",
    icon: HardDrive,
    description: "管理存储挂载点",
  },
  {
    title: "运行日志",
    url: "/admin/logs",
    icon: Terminal,
    description: "查看系统实时运行日志",
  },
  {
    title: "数据库管理",
    url: "/admin/database",
    icon: Database,
    description: "数据库可视化管理",
  },
]

export function AppSidebar() {
  const { user, logout, token } = useAuth()
  const pathname = usePathname()
  const { title, description } = useSiteConfig()
  const [adminOpen, setAdminOpen] = useState(pathname.startsWith('/admin'))

  // Quota state
  const [usagePercent, setUsagePercent] = useState<number | null>(null)
  const [quotaText, setQuotaText] = useState<string>("")

  useEffect(() => {
    if (pathname.startsWith('/admin')) setAdminOpen(true)
  }, [pathname])

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    const fetchQuota = async () => {
      if (!token) return
      try {
        const res = await fetch(`${API_URL}/auth/quota`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          const quota = data.quota
          const percent = Math.min(100, Math.max(0, Math.round(quota.usagePercentage)))
          setUsagePercent(percent)
          // 简洁文本: 已用 / 总计
          if (quota.usedStorageFormatted && quota.maxStorageFormatted) {
            setQuotaText(`${quota.usedStorageFormatted} / ${quota.maxStorageFormatted}`)
          }
        }
      } catch {}
    }
    fetchQuota()
  }, [token])

  if (!user) return null

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Cloud className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{title || 'FireflyCloud'}</span>
                  <span className="truncate text-xs">{description || '云存储'}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>系统管理</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => {
                  const hasChildren = !!item.children && item.children.length > 0
                  const isParentExactActive = pathname === item.url
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isParentExactActive}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {hasChildren && (
                        <SidebarMenuAction
                          onClick={() => setAdminOpen((v) => !v)}
                          aria-label={adminOpen ? '折叠' : '展开'}
                          title={adminOpen ? '折叠' : '展开'}
                          className={adminOpen ? 'rotate-90 transition-transform' : 'transition-transform'}
                        >
                          <ChevronRight className="size-4" />
                        </SidebarMenuAction>
                      )}
                      {hasChildren && adminOpen && (
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.title}>
                              <SidebarMenuSubButton asChild isActive={pathname === child.url}>
                                <Link href={child.url}>
                                  <child.icon />
                                  <span>{child.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {/* 账户信息 */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.email}</span>
                    <span className="truncate text-xs capitalize">{user.role}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    仪表板
                  </Link>
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      管理面板
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* 配额使用率 */}
        {usagePercent !== null && (
          <div className="px-2 pb-2">
            <div className="flex items-center justify-between text-[10px] text-sidebar-foreground/70 mb-1">
              <div className="flex items-center gap-1">
                <HardDriveIcon className="h-3 w-3" />
                <span>配额使用</span>
              </div>
              <div className="font-medium">{usagePercent}%</div>
            </div>
            <Progress value={usagePercent} className="h-1.5" />
            {quotaText && (
              <div className="mt-1 text-[10px] text-sidebar-foreground/60">
                {quotaText}
              </div>
            )}
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
