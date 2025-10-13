"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Folder,
  FolderPlus,
  FolderOpen,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Home,
  Cloud,
  Link
} from "lucide-react"

interface FolderItem {
  id: string
  userId: string
  name: string
  parentId: string | null
  path: string
  createdAt: number
  updatedAt: number
  children?: FolderItem[]
  isExpanded?: boolean
  isR2Mount?: boolean
  mountPointId?: string
}

interface FolderTreeProps {
  selectedFolderId: string | null
  onFolderSelect: (folderId: string | null) => void
  onRefresh: () => void
}

export function FolderTree({ selectedFolderId, onFolderSelect, onRefresh }: FolderTreeProps) {
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newFolderName, setNewFolderName] = useState("")
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null)
  const [editName, setEditName] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [parentFolderId, setParentFolderId] = useState<string | null>(null)
  const { token } = useAuth()

  // 防抖相关状态
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastClickTimeRef = useRef<number>(0)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    fetchFolders()
  }, [])

  const fetchFolders = async () => {
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/folders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const folderTree = buildFolderTree(data.folders)
        setFolders(folderTree)
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error)
    } finally {
      setLoading(false)
    }
  }

  const buildFolderTree = (flatFolders: FolderItem[]): FolderItem[] => {
    const folderMap = new Map<string, FolderItem>()
    const rootFolders: FolderItem[] = []

    // 创建文件夹映射
    flatFolders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [], isExpanded: false })
    })

    // 构建树形结构
    flatFolders.forEach(folder => {
      const folderNode = folderMap.get(folder.id)!
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId)
        if (parent) {
          parent.children!.push(folderNode)
        }
      } else {
        rootFolders.push(folderNode)
      }
    })

    return rootFolders
  }

  const createFolder = async () => {
    if (!token || !newFolderName.trim()) return

    try {
      const requestBody: { name: string; parentId?: string } = {
        name: newFolderName.trim(),
      }

      if (parentFolderId) {
        requestBody.parentId = parentFolderId
      }

      const response = await fetch(`${API_URL}/folders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        setNewFolderName("")
        setCreateDialogOpen(false)
        setParentFolderId(null)
        await fetchFolders()
        onRefresh()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Failed to create folder:", response.status, errorData)
        alert(`创建文件夹失败: ${errorData.error || '未知错误'}`)
      }
    } catch (error) {
      console.error("Failed to create folder:", error)
      alert("创建文件夹失败: 网络错误")
    }
  }

  const renameFolder = async () => {
    if (!token || !editingFolder || !editName.trim()) return

    try {
      const response = await fetch(`${API_URL}/folders/${editingFolder.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
        }),
      })

      if (response.ok) {
        setEditingFolder(null)
        setEditName("")
        await fetchFolders()
        onRefresh()
      }
    } catch (error) {
      console.error("Failed to rename folder:", error)
    }
  }

  const deleteFolder = async (folderId: string) => {
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/folders/${folderId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        // 如果删除的是当前选中的文件夹，切换到根目录
        if (selectedFolderId === folderId) {
          onFolderSelect(null)
        }
        await fetchFolders()
        onRefresh()
      }
    } catch (error) {
      console.error("Failed to delete folder:", error)
    }
  }

  const toggleFolder = (folderId: string) => {
    const updateFolders = (folders: FolderItem[]): FolderItem[] => {
      return folders.map(folder => {
        if (folder.id === folderId) {
          return { ...folder, isExpanded: !folder.isExpanded }
        }
        if (folder.children) {
          return { ...folder, children: updateFolders(folder.children) }
        }
        return folder
      })
    }
    setFolders(updateFolders(folders))
  }

  // 防抖的文件夹选择函数
  const debouncedFolderSelect = useCallback((folderId: string | null) => {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTimeRef.current

    // 如果距离上次点击时间小于300ms，则忽略这次点击
    if (timeSinceLastClick < 300) {
      return
    }

    // 清除之前的定时器
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // 更新最后点击时间
    lastClickTimeRef.current = now

    // 设置新的定时器，延迟执行选择操作
    debounceTimeoutRef.current = setTimeout(() => {
      onFolderSelect(folderId)
    }, 100)
  }, [onFolderSelect])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const renderFolder = (folder: FolderItem, level: number = 0) => {
    const isSelected = selectedFolderId === folder.id
    const hasChildren = folder.children && folder.children.length > 0

    return (
      <div key={folder.id}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={`flex items-center gap-1 md:gap-2 p-1.5 md:p-2 rounded cursor-pointer hover:bg-muted/50 ${
                isSelected ? "bg-primary/10 border border-primary/20" : ""
              }`}
              style={{ paddingLeft: `${level * 16 + 6}px` }}
              onClick={() => debouncedFolderSelect(folder.id)}
            >
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 md:h-4 md:w-4 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFolder(folder.id)
                  }}
                >
                  {folder.isExpanded ? (
                    <ChevronDown className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  ) : (
                    <ChevronRight className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  )}
                </Button>
              )}
              {!hasChildren && <div className="w-3 md:w-4" />}
              
              {folder.isR2Mount ? (
                <div className="flex items-center gap-0.5 md:gap-1">
                  <Cloud className="h-3 w-3 md:h-4 md:w-4 text-purple-500" />
                  <Link className="h-2.5 w-2.5 md:h-3 md:w-3 text-purple-500" />
                </div>
              ) : folder.isExpanded ? (
                <FolderOpen className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
              ) : (
                <Folder className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
              )}

              <span className={`text-xs md:text-sm truncate ${folder.isR2Mount ? 'text-purple-600 font-medium' : ''}`}>
                {folder.name}
                {folder.isR2Mount && (
                  <span className="ml-1 text-xs text-purple-500 hidden sm:inline">(R2)</span>
                )}
              </span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onClick={() => {
                setParentFolderId(folder.id)
                setCreateDialogOpen(true)
              }}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              新建子文件夹
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                setEditingFolder(folder)
                setEditName(folder.name)
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              重命名
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => deleteFolder(folder.id)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {folder.isExpanded && folder.children && (
          <div>
            {folder.children.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h3 className="font-medium text-sm md:text-base">
            <span className="hidden sm:inline">文件夹</span>
            <span className="sm:hidden">目录</span>
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setParentFolderId(null)
              setCreateDialogOpen(true)
            }}
            className="h-8 px-2 md:px-3"
          >
            <FolderPlus className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden md:inline">新建</span>
          </Button>
        </div>

        <div className="space-y-1">
          {/* 根目录 */}
          <div
            className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted/50 ${
              selectedFolderId === null ? "bg-primary/10 border border-primary/20" : ""
            }`}
            onClick={() => debouncedFolderSelect(null)}
          >
            <Home className="h-4 w-4 text-blue-500" />
            <span className="text-sm">根目录</span>
          </div>

          {/* 文件夹树 */}
          {folders.map(folder => renderFolder(folder))}
        </div>

        {/* 创建文件夹对话框 */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建文件夹</DialogTitle>
              <DialogDescription>
                在{parentFolderId ? "选中的文件夹" : "根目录"}下创建新文件夹
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="文件夹名称"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  createFolder()
                }
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={createFolder} disabled={!newFolderName.trim()}>
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 重命名文件夹对话框 */}
        <Dialog open={!!editingFolder} onOpenChange={() => setEditingFolder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>重命名文件夹</DialogTitle>
              <DialogDescription>
                修改文件夹 "{editingFolder?.name}" 的名称
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="新文件夹名称"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  renameFolder()
                }
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingFolder(null)}>
                取消
              </Button>
              <Button onClick={renameFolder} disabled={!editName.trim()}>
                重命名
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
