"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SmtpConfiguration } from "./smtp-configuration"
import { StorageConfiguration } from "./storage-configuration"
import { GoogleOAuthConfiguration } from "./google-oauth-configuration"
import { AdminSettings } from "./admin-settings"
import { Mail, HardDrive, Shield, Settings } from "lucide-react"

export function AdminConfiguration() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">系统配置</h1>
        <p className="text-muted-foreground">
          管理系统的各项配置和设置
        </p>
      </div>

      <Tabs defaultValue="oauth" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="oauth" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            OAuth配置
          </TabsTrigger>
          <TabsTrigger value="smtp" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            邮件配置
          </TabsTrigger>
          <TabsTrigger value="storage" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            存储配置
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            管理员设置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="oauth" className="space-y-6">
          <GoogleOAuthConfiguration />
        </TabsContent>

        <TabsContent value="smtp" className="space-y-6">
          <SmtpConfiguration />
        </TabsContent>

        <TabsContent value="storage" className="space-y-6">
          <StorageConfiguration />
        </TabsContent>

        <TabsContent value="admin" className="space-y-6">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}