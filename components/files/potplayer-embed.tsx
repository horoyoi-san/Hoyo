"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ExternalLink, AlertCircle, Download } from "lucide-react"

interface PotPlayerEmbedProps {
  src: string
}

export function PotPlayerEmbed({ src }: PotPlayerEmbedProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const embedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 检查是否支持PotPlayer插件
    const checkPotPlayerSupport = () => {
      try {
        // 检查是否在Windows环境
        const isWindows = navigator.platform.toLowerCase().includes('win')
        
        if (!isWindows) {
          setError("PotPlayer仅支持Windows系统")
          return
        }

        // 尝试检测PotPlayer插件
        const plugins = navigator.plugins
        let potPlayerFound = false
        
        for (let i = 0; i < plugins.length; i++) {
          const plugin = plugins[i]
          if (plugin.name.toLowerCase().includes('potplayer') || 
              plugin.name.toLowerCase().includes('daum')) {
            potPlayerFound = true
            break
          }
        }

        if (potPlayerFound) {
          setIsSupported(true)
          createPotPlayerEmbed()
        } else {
          setError("未检测到PotPlayer浏览器插件")
        }
      } catch (err) {
        setError("检测PotPlayer插件时发生错误")
      }
    }

    checkPotPlayerSupport()
  }, [src])

  const createPotPlayerEmbed = () => {
    const container = embedRef.current
    if (!container) return

    try {
      // 创建PotPlayer嵌入对象
      const embed = document.createElement('embed')
      embed.src = src
      embed.type = 'application/x-potplayer'
      embed.width = '100%'
      embed.height = '100%'
      embed.style.border = 'none'
      
      // 添加PotPlayer特定参数
      embed.setAttribute('autoplay', 'true')
      embed.setAttribute('controls', 'true')
      embed.setAttribute('volume', '50')
      
      container.appendChild(embed)
    } catch (err) {
      setError("创建PotPlayer嵌入播放器失败")
    }
  }

  const openInPotPlayer = () => {
    try {
      // 尝试使用potplayer://协议打开
      const potplayerUrl = `potplayer://${encodeURIComponent(src)}`
      window.open(potplayerUrl, '_blank')
    } catch (err) {
      // 如果协议不支持，提供下载链接
      const link = document.createElement('a')
      link.href = src
      link.download = ''
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const downloadPotPlayer = () => {
    window.open('https://potplayer.daum.net/', '_blank')
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              您可以选择以下方式播放视频：
            </p>
            
            <div className="flex flex-col gap-2">
              <Button
                onClick={openInPotPlayer}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                在PotPlayer中打开
              </Button>
              
              <Button
                onClick={downloadPotPlayer}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                下载PotPlayer
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• 确保已安装PotPlayer播放器</p>
              <p>• 某些浏览器可能需要允许插件运行</p>
              <p>• 建议使用Chrome或Edge浏览器</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-black rounded-lg overflow-hidden">
      <div ref={embedRef} className="w-full h-full" />
      
      {/* 备用控制栏 */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-2 flex items-center justify-between text-white text-sm">
        <span>PotPlayer 播放器</span>
        <Button
          onClick={openInPotPlayer}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white hover:bg-opacity-20"
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          外部播放
        </Button>
      </div>
    </div>
  )
}
