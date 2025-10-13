"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  Database, 
  Table, 
  RefreshCw,
  Eye,
  Users,
  Files,
  Mail,
  Settings,
  HardDrive,
  Search
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DatabaseTable {
  name: string
  displayName: string
  count: number
  description: string
}

interface TableData {
  tableName: string
  columns: string[]
  data: any[]
  count: number
}

const tableIcons = {
  users: Users,
  files: Files,
  email_verification_codes: Mail,
  smtp_config: Settings,
  storage_config: HardDrive,
}

export function DatabaseManagement() {
  const [tables, setTables] = useState<DatabaseTable[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null)
  const [tableLoading, setTableLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const { token } = useAuth()
  const { toast } = useToast()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    fetchTables()
  }, [token])

  const fetchTables = async () => {
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/admin/database/tables`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTables(data.tables || [])
      } else {
        throw new Error("Failed to fetch tables")
      }
    } catch (error) {
      console.error("Failed to fetch database tables:", error)
      toast({
        title: "获取数据库信息失败",
        description: "无法获取数据库表信息",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchTableData = async (tableName: string) => {
    if (!token) return

    setTableLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/database/table/${tableName}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedTable(data)
      } else {
        throw new Error("Failed to fetch table data")
      }
    } catch (error) {
      console.error("Failed to fetch table data:", error)
      toast({
        title: "获取表数据失败",
        description: "无法获取表数据",
        variant: "destructive",
      })
    } finally {
      setTableLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchTables()
  }

  const formatValue = (value: any, column: string): string => {
    if (value === null || value === undefined) {
      return "-"
    }
    if (typeof value === "boolean") {
      return value ? "是" : "否"
    }
    if (typeof value === "number") {
      // 如果是时间戳（大于1000000000000，即2001年之后的毫秒时间戳）
      if (value > 1000000000000) {
        // 只在客户端使用toLocaleString
        if (typeof window !== 'undefined') {
          return new Date(value).toLocaleString("zh-CN")
        }
        // 服务器端回退方案
        return new Date(value).toISOString()
      }
      // 如果是文件大小字段
      if (column === "size") {
        return formatFileSize(value)
      }
      return value.toString()
    }
    if (typeof value === "string" && value.length > 50) {
      return value.substring(0, 50) + "..."
    }
    return String(value)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getTableIcon = (tableName: string) => {
    const IconComponent = tableIcons[tableName as keyof typeof tableIcons] || Table
    return <IconComponent className="h-5 w-5" />
  }

  // 过滤表格数据
  const filteredTableData = useMemo(() => {
    if (!selectedTable || !searchTerm) return selectedTable?.data || []

    return selectedTable.data.filter(row =>
      selectedTable.columns.some(column =>
        String(row[column]).toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }, [selectedTable, searchTerm])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const totalRecords = tables.reduce((sum, table) => sum + table.count, 0)

  return (
    <div className="space-y-6">
      {/* 数据库统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">数据库表</p>
                <p className="text-2xl font-bold">{tables.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Table className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">总记录数</p>
                <p className="text-2xl font-bold">
                  {typeof window !== 'undefined' 
                    ? totalRecords.toLocaleString() 
                    : totalRecords.toString()
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">用户数量</p>
                <p className="text-2xl font-bold">
                  {tables.find(t => t.name === 'users')?.count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Files className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">文件数量</p>
                <p className="text-2xl font-bold">
                  {tables.find(t => t.name === 'files')?.count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 刷新按钮 */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              刷新中...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => (
              <Card key={table.name} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTableIcon(table.name)}
                      <CardTitle className="text-lg">{table.displayName}</CardTitle>
                    </div>
                    <Badge variant="secondary">{table.count} 条</Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {table.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Dialog onOpenChange={(open) => {
                    if (!open) {
                      setSearchTerm("")
                      setSelectedTable(null)
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fetchTableData(table.name)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        查看数据
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          {getTableIcon(table.name)}
                          {table.displayName} - 数据详情
                        </DialogTitle>
                        <DialogDescription>
                          {table.description} (共 {selectedTable?.count || 0} 条记录)
                        </DialogDescription>
                      </DialogHeader>

                      {/* 搜索框 */}
                      {selectedTable && (
                        <div className="flex items-center space-x-2 py-4">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="搜索数据..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                          />
                          {searchTerm && (
                            <Badge variant="secondary">
                              找到 {filteredTableData.length} 条记录
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {tableLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      ) : selectedTable ? (
                        <ScrollArea className="h-[60vh] w-full">
                          <UITable>
                            <TableHeader>
                              <TableRow>
                                {selectedTable.columns.map((column) => (
                                  <TableHead key={column} className="font-medium">
                                    {column}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredTableData.map((row, index) => (
                                <TableRow key={index}>
                                  {selectedTable.columns.map((column) => (
                                    <TableCell key={column} className="max-w-xs">
                                      <div className="truncate" title={String(row[column])}>
                                        {formatValue(row[column], column)}
                                      </div>
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </UITable>
                          {filteredTableData.length === 0 && selectedTable.data.length > 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <Search className="mx-auto h-8 w-8 mb-2 opacity-50" />
                              <p>未找到匹配的数据</p>
                            </div>
                          )}
                          {selectedTable.data.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              暂无数据
                            </div>
                          )}
                        </ScrollArea>
                      ) : null}
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {tables.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>暂无数据库表信息</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
