"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Filter,
  Wifi,
  WifiOff,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  Skull
} from "lucide-react"
import { toast } from "sonner"

interface LogEntry {
  timestamp: number
  level: string
  levelNumber: number
  icon: string
  message: string
  args: any[]
  plainMessage: string
  formattedTimestamp: string
}

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL" | "ALL"

const LOG_LEVEL_COLORS = {
  DEBUG: "text-cyan-600 dark:text-cyan-400",
  INFO: "text-green-600 dark:text-green-400", 
  WARN: "text-yellow-600 dark:text-yellow-400",
  ERROR: "text-red-600 dark:text-red-400",
  FATAL: "text-red-800 dark:text-red-300 font-bold"
}

const LOG_LEVEL_ICONS = {
  DEBUG: <Filter className="h-3 w-3" />,
  INFO: <Info className="h-3 w-3" />,
  WARN: <AlertTriangle className="h-3 w-3" />,
  ERROR: <XCircle className="h-3 w-3" />,
  FATAL: <Skull className="h-3 w-3" />
}

const LOG_LEVEL_NUMBERS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
}

export function RuntimeLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filterLevel, setFilterLevel] = useState<LogLevel>("ALL")
  const [maxLogs, setMaxLogs] = useState(1000)
  
  const { token } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  // 智能构建WebSocket URL，正确处理https到wss的转换
  const getWebSocketUrl = (apiUrl: string): string => {
    try {
      const url = new URL(apiUrl)
      // 根据HTTP协议自动选择对应的WebSocket协议
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${wsProtocol}//${url.host}`
    } catch (error) {
      // 回退到简单的字符串替换
      console.warn('解析API URL失败，使用简单替换:', error)
      return apiUrl.replace(/^https?/, apiUrl.startsWith('https') ? 'wss' : 'ws')
    }
  }

  const WS_URL = getWebSocketUrl(API_URL)

  // 过滤日志
  const filteredLogs = logs.filter(log => {
    if (filterLevel === "ALL") return true
    return log.levelNumber >= LOG_LEVEL_NUMBERS[filterLevel]
  })

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [autoScroll])

  // 连接WebSocket
  const connectWebSocket = useCallback(async () => {
    if (!token || isConnecting) return

    setIsConnecting(true)

    try {
      // 先验证token
      const response = await fetch(`${API_URL}/logs/verify?token=${token}`)
      if (!response.ok) {
        throw new Error("Token验证失败")
      }

      console.log("Token验证成功，建立WebSocket连接...")

      const ws = new WebSocket(`${WS_URL}/logs/stream`)

      ws.onopen = () => {
        console.log("日志WebSocket连接已建立")
        setIsConnected(true)
        setIsConnecting(false)
        reconnectAttempts.current = 0
        wsRef.current = ws

        toast.success("日志流连接已建立")
      }

      ws.onmessage = (event) => {
        if (isPaused) return
        
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === "connection") {
            console.log("收到连接确认:", data.message)
            return
          }
          
          if (data.type === "pong") {
            return
          }
          
          // 处理日志数据
          if (data.timestamp && data.level) {
            const logEntry: LogEntry = {
              timestamp: data.timestamp,
              level: data.level,
              levelNumber: data.levelNumber || 0,
              icon: data.icon || "",
              message: data.message || "",
              args: data.args || [],
              plainMessage: data.plainMessage || "",
              formattedTimestamp: data.formattedTimestamp || new Date(data.timestamp).toLocaleTimeString()
            }
            
            setLogs(prevLogs => {
              const newLogs = [...prevLogs, logEntry]
              // 限制日志数量
              if (newLogs.length > maxLogs) {
                return newLogs.slice(-maxLogs)
              }
              return newLogs
            })
          }
        } catch (error) {
          console.error("解析日志消息失败:", error)
        }
      }

      ws.onclose = () => {
        console.log("日志WebSocket连接已关闭")
        setIsConnected(false)
        setIsConnecting(false)
        wsRef.current = null
        
        // 自动重连
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          
          toast.info(`连接断开，${delay/1000}秒后重试 (${reconnectAttempts.current}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket()
          }, delay)
        } else {
          toast.error("连接失败次数过多，请手动重连")
        }
      }

      ws.onerror = (error) => {
        console.error("日志WebSocket错误:", error)
        setIsConnecting(false)
        toast.error("WebSocket连接错误")
      }

    } catch (error) {
      console.error("创建WebSocket连接失败:", error)
      setIsConnecting(false)
      toast.error(`连接失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, [token, isPaused, maxLogs, WS_URL, API_URL])

  // 断开WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsConnected(false)
    setIsConnecting(false)
    reconnectAttempts.current = 0
  }, [])

  // 清空日志
  const clearLogs = () => {
    setLogs([])
    toast.success("日志已清空")
  }

  // 导出日志
  const exportLogs = () => {
    const logText = filteredLogs.map(log => 
      `${log.formattedTimestamp} ${log.level.padEnd(5)} ${log.icon} ${log.message}`
    ).join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `runtime-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success("日志已导出")
  }

  // 组件挂载时连接
  useEffect(() => {
    connectWebSocket()
    
    return () => {
      disconnectWebSocket()
    }
  }, [connectWebSocket, disconnectWebSocket])

  // 自动滚动
  useEffect(() => {
    scrollToBottom()
  }, [filteredLogs, scrollToBottom])

  return (
    <Card className="h-[600px] sm:h-[700px] lg:h-[800px] flex flex-col min-h-0">
      <CardHeader className="pb-3 flex-shrink-0">
        {/* 移动端：垂直布局，桌面端：水平布局 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <span className="text-lg sm:text-xl">运行日志</span>
              {isConnected ? (
                <Badge variant="default" className="bg-green-500 text-xs">
                  <Wifi className="h-3 w-3 mr-1" />
                  已连接
                </Badge>
              ) : isConnecting ? (
                <Badge variant="secondary" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1 animate-spin" />
                  连接中...
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  <WifiOff className="h-3 w-3 mr-1" />
                  未连接
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-sm">
              实时查看系统运行日志 ({filteredLogs.length} 条)
            </CardDescription>
          </div>

          {/* 移动端：网格布局，桌面端：水平布局 */}
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={isPaused ? () => setIsPaused(false) : () => setIsPaused(true)}
              className="flex items-center justify-center gap-1 text-xs sm:text-sm"
            >
              {isPaused ? <Play className="h-3 w-3 sm:h-4 sm:w-4" /> : <Pause className="h-3 w-3 sm:h-4 sm:w-4" />}
              <span className="hidden xs:inline">{isPaused ? "继续" : "暂停"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
              className="flex items-center justify-center gap-1 text-xs sm:text-sm"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">清空</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              className="flex items-center justify-center gap-1 text-xs sm:text-sm"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">导出</span>
            </Button>

            {/* 移动端连接按钮 */}
            {!isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={connectWebSocket}
                disabled={isConnecting}
                className="flex items-center justify-center gap-1 text-xs sm:text-sm sm:hidden"
              >
                <Wifi className="h-3 w-3" />
                <span className="hidden xs:inline">重连</span>
              </Button>
            )}
          </div>
        </div>

        {/* 移动端：垂直堆叠，桌面端：水平布局 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pt-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="log-level" className="text-xs sm:text-sm whitespace-nowrap">日志级别:</Label>
            <Select value={filterLevel} onValueChange={(value: LogLevel) => setFilterLevel(value)}>
              <SelectTrigger className="w-20 sm:w-24 h-8 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部</SelectItem>
                <SelectItem value="DEBUG">DEBUG</SelectItem>
                <SelectItem value="INFO">INFO</SelectItem>
                <SelectItem value="WARN">WARN</SelectItem>
                <SelectItem value="ERROR">ERROR</SelectItem>
                <SelectItem value="FATAL">FATAL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="auto-scroll"
              checked={autoScroll}
              onCheckedChange={setAutoScroll}
              className="scale-90 sm:scale-100"
            />
            <Label htmlFor="auto-scroll" className="text-xs sm:text-sm">自动滚动</Label>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="max-logs" className="text-xs sm:text-sm whitespace-nowrap">最大条数:</Label>
            <Select value={maxLogs.toString()} onValueChange={(value) => setMaxLogs(parseInt(value))}>
              <SelectTrigger className="w-16 sm:w-20 h-8 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="1000">1000</SelectItem>
                <SelectItem value="2000">2000</SelectItem>
                <SelectItem value="5000">5000</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="flex-1 p-0 min-h-0">
        <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
          {/* 移动端快速操作栏 */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b p-2 sm:hidden">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {filteredLogs.length} 条日志
              </span>
              <div className="flex items-center gap-2">
                {!isConnected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={connectWebSocket}
                    disabled={isConnecting}
                    className="h-6 px-2 text-xs"
                  >
                    <Wifi className="h-3 w-3 mr-1" />
                    重连
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => scrollToBottom()}
                  className="h-6 px-2 text-xs"
                >
                  ↓ 底部
                </Button>
              </div>
            </div>
          </div>

          <div className="p-2 sm:p-4 space-y-1 sm:space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                {isConnected ? "等待日志数据..." : "请连接到日志流"}
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={`${log.timestamp}-${index}`}
                  className="font-mono text-xs sm:text-xs leading-relaxed hover:bg-muted/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md border border-transparent hover:border-border/50 transition-colors"
                >
                  {/* 移动端：垂直布局，桌面端：水平布局 */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 mb-1">
                    {/* 时间戳和级别 */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-muted-foreground text-[9px] sm:text-[10px] whitespace-nowrap">
                        {log.formattedTimestamp}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] whitespace-nowrap ${LOG_LEVEL_COLORS[log.level as keyof typeof LOG_LEVEL_COLORS]}`}>
                        {LOG_LEVEL_ICONS[log.level as keyof typeof LOG_LEVEL_ICONS]}
                        {log.level.padEnd(5)}
                      </span>
                      {log.icon && (
                        <span className="flex-shrink-0 text-[9px] sm:text-[10px]">{log.icon}</span>
                      )}
                    </div>
                  </div>

                  {/* 日志内容 - 移动端优化 */}
                  <div className="ml-0 pl-0">
                    <div className="break-all whitespace-pre-wrap text-[11px] sm:text-xs leading-relaxed">
                      {log.message}
                    </div>
                    {log.args.length > 0 && (
                      <div className="text-muted-foreground text-[9px] sm:text-[10px] mt-1 p-1.5 sm:p-2 bg-muted/30 rounded border-l-2 border-muted-foreground/20">
                        <pre className="whitespace-pre-wrap break-all font-mono overflow-x-auto">
                          {JSON.stringify(log.args, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
