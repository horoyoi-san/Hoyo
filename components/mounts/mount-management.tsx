"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { R2MountManagement } from "./r2-mount-management"
import { OneDriveMountManagement } from "./onedrive-mount-management"
import { WebDAVMountManagement } from "./webdav-mount-management"
import { Cloud, HardDrive, Globe } from "lucide-react"
import { useIsMobile } from "@/components/ui/use-mobile"

export function MountManagement() {
  const [activeTab, setActiveTab] = useState("r2")
  const isMobile = useIsMobile()

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <HardDrive className="h-4 w-4 sm:h-5 sm:w-5" />
            存储挂载管理
          </CardTitle>
          <CardDescription className="text-sm">
            统一管理所有外部存储挂载点，包括 Cloudflare R2、OneDrive API 和 WebDAV
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger 
                value="r2" 
                className={`flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm ${
                  isMobile ? 'px-1' : 'px-3'
                }`}
              >
                <Cloud className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="truncate">R2</span>
              </TabsTrigger>
              <TabsTrigger 
                value="onedrive" 
                className={`flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm ${
                  isMobile ? 'px-1' : 'px-3'
                }`}
              >
                <Cloud className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                <span className="truncate">OneDrive</span>
              </TabsTrigger>
              <TabsTrigger 
                value="webdav" 
                className={`flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm ${
                  isMobile ? 'px-1' : 'px-3'
                }`}
              >
                <Globe className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                <span className="truncate">WebDAV</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-4 sm:mt-6">
              <TabsContent value="r2" className="space-y-4 mt-0">
                <R2MountManagement />
              </TabsContent>
              
              <TabsContent value="onedrive" className="space-y-4 mt-0">
                <OneDriveMountManagement />
              </TabsContent>
              
              <TabsContent value="webdav" className="space-y-4 mt-0">
                <WebDAVMountManagement />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
