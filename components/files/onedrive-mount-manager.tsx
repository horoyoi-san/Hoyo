"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Cloud, Clock } from "lucide-react"

export function OneDriveMountManager({ onMountCreated }: { onMountCreated: () => void }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-600 opacity-50" />
            OneDrive 挂载管理
            <Badge variant="outline" className="ml-2">
              <Clock className="h-3 w-3 mr-1" />
              敬请期待
            </Badge>
          </CardTitle>
          <CardDescription>
            OneDrive 存储功能正在开发中，将支持与 Microsoft OneDrive 的无缝集成
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">功能开发中</p>
                <p>OneDrive 存储功能正在开发中，将支持以下特性：</p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                  <li>与 Microsoft OneDrive 的无缝集成</li>
                  <li>文件夹挂载和同步</li>
                  <li>OAuth 安全认证</li>
                  <li>实时文件管理</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">敬请期待后续版本更新！</p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
