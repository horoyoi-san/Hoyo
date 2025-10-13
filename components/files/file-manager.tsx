"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { FileUpload } from "./file-upload"
import { FileList } from "./file-list"
import { FolderTree } from "./folder-tree"
import { FolderBreadcrumb } from "./folder-breadcrumb"
import { QuotaDisplay } from "./quota-display"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Upload, Files, FolderOpen, RefreshCw, Cloud } from "lucide-react"
import { MobileQuotaBar } from "./mobile-quota-bar"

interface FileItem {
  id: string
  filename: string
  originalName: string
  size: number
  mimeType: string
  storageType: string
  folderId: string | null
  createdAt: number
}

export function FileManager() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [quotaRefreshKey, setQuotaRefreshKey] = useState(0)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [r2MountInfo, setR2MountInfo] = useState<any>(null)
  const [oneDriveMountInfo, setOneDriveMountInfo] = useState<any>(null)
  const { token } = useAuth()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  useEffect(() => {
    fetchFiles()
    fetchFolders()
  }, [refreshTrigger, selectedFolderId])

  const fetchFiles = async () => {
    if (!token) return

    try {
      const folderId = selectedFolderId === null ? "root" : selectedFolderId
      const response = await fetch(`${API_URL}/files?folderId=${folderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      let allFiles: FileItem[] = []

      if (response.ok) {
        const data = await response.json()
        allFiles = data.files || []
      }

      // 如果选择了文件夹，尝试获取 R2 挂载内容
      if (selectedFolderId) {
        try {
          const r2Response = await fetch(`${API_URL}/folders/${selectedFolderId}/r2-contents`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (r2Response.ok) {
            const r2Data = await r2Response.json()
            // 合并 R2 文件到文件列表
            allFiles = [...allFiles, ...(r2Data.files || [])]
            
            // 将 R2 子目录转换为虚拟文件夹条目
            const r2FolderItems = (r2Data.folders || []).map((folder: {
              id: string,
              name: string,
              path: string,
              mountPointId: string,
              itemCount?: number
            }) => ({
              id: folder.id,
              filename: folder.name,
              originalName: folder.name,
              size: 0,
              mimeType: "application/directory",
              storageType: "r2",
              createdAt: Date.now(),
              isR2Folder: true, // 标记为 R2 文件夹
              r2Path: folder.path,
              mountPointId: folder.mountPointId,
              itemCount: folder.itemCount || 0 // 添加项目计数
            }));
            
            // 合并 R2 文件夹到文件列表
            allFiles = [...allFiles, ...r2FolderItems];
            
            // 保存 R2 挂载信息
            setR2MountInfo(r2Data.mountPoint)
          } else {
            setR2MountInfo(null)
          }
        } catch (r2Error) {
          // R2 挂载内容获取失败不影响常规文件显示
          console.log("No R2 mount or failed to fetch R2 contents:", r2Error)
          setR2MountInfo(null)
        }

        // 尝试获取 OneDrive 挂载内容
        try {
          const onedriveResponse = await fetch(`${API_URL}/folders/${selectedFolderId}/onedrive-contents`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (onedriveResponse.ok) {
            const onedriveData = await onedriveResponse.json()
            // 合并 OneDrive 文件到文件列表
            allFiles = [...allFiles, ...(onedriveData.files || [])]
            
            // 将 OneDrive 子目录转换为虚拟文件夹条目
            const onedriveFolderItems = (onedriveData.folders || []).map((folder: {
              id: string,
              name: string,
              path: string,
              mountPointId: string,
              itemCount?: number
            }) => ({
              id: folder.id,
              filename: folder.name,
              originalName: folder.name,
              size: 0,
              mimeType: "application/directory",
              storageType: "onedrive",
              createdAt: Date.now(),
              isOneDriveFolder: true, // 标记为 OneDrive 文件夹
              oneDrivePath: folder.path,
              mountPointId: folder.mountPointId,
              itemCount: folder.itemCount || 0 // 添加项目计数
            }));
            
            // 合并 OneDrive 文件夹到文件列表
            allFiles = [...allFiles, ...onedriveFolderItems];
            
            // 保存 OneDrive 挂载信息
            setOneDriveMountInfo(onedriveData.mountPoint)
          } else {
            setOneDriveMountInfo(null)
          }
        } catch (onedriveError) {
          // OneDrive 挂载内容获取失败不影响常规文件显示
          console.log("No OneDrive mount or failed to fetch OneDrive contents:", onedriveError)
          setOneDriveMountInfo(null)
        }
      } else {
        setR2MountInfo(null)
        setOneDriveMountInfo(null)
      }

      setFiles(allFiles)
    } catch (error) {
      console.error("Failed to fetch files:", error)
    } finally {
      setLoading(false)
    }
  }

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
        setFolders(data.folders || [])
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error)
    }
  }

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1)
    setQuotaRefreshKey(prev => prev + 1)
  }

  const handleDeleteSuccess = (deletedId: string) => {
    // 乐观更新：先从当前列表移除，再后台刷新以确保一致
    setFiles(prev => prev.filter(f => f.id !== deletedId))
    setRefreshTrigger((prev) => prev + 1)
    setQuotaRefreshKey(prev => prev + 1)
  }

  const handleFolderSelect = (folderId: string | null) => {
    // 只有当选择的文件夹真的发生变化时才设置loading状态
    if (selectedFolderId !== folderId) {
      setSelectedFolderId(folderId)
      setLoading(true)
    }
  }
  
  // 处理文件列表中的文件夹导航
  const handleFolderNavigate = (folderId: string | null, isR2Folder?: boolean, r2Path?: string, mountPointId?: string, isOneDriveFolder?: boolean, oneDrivePath?: string) => {
    if (isR2Folder && r2Path && mountPointId) {
      // 这是一个R2文件夹，需要特殊处理
      // 我们需要获取当前挂载点信息，更新当前R2挂载路径并保持在同一文件夹中
      console.log(`导航到R2文件夹: ${r2Path}`)
      
      // 保持在当前选中的文件夹中，但更新 R2 路径
      // 这里需要调用API获取R2子目录内容
      // 为简单起见，我们可以直接刷新当前页面，后端会根据新的r2Path获取内容
      setLoading(true);
      
      // 以AJAX方式获取指定R2路径的内容
      if (token && selectedFolderId) {
        // 使用查询参数来传递R2路径
        const queryParams = new URLSearchParams({ r2Path });
        
        fetch(`${API_URL}/folders/${selectedFolderId}/r2-contents?${queryParams}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
          .then(response => response.json())
          .then(data => {
            // 更新文件列表，包括文件和文件夹
            let allFiles: FileItem[] = [];
            
            // 添加R2文件
            allFiles = [...allFiles, ...(data.files || [])];
            
            // 将R2文件夹转换为条目
            const r2FolderItems = (data.folders || []).map((folder: any) => ({
              id: folder.id,
              filename: folder.name,
              originalName: folder.name,
              size: 0,
              mimeType: "application/directory",
              storageType: "r2",
              createdAt: Date.now(),
              isR2Folder: true,
              r2Path: folder.path,
              mountPointId: folder.mountPointId,
              itemCount: folder.itemCount || 0 // 添加项目计数
            }));
            
            allFiles = [...allFiles, ...r2FolderItems];
            
            // 更新文件列表
            setFiles(allFiles);
            setR2MountInfo({
              ...data.mountPoint,
              currentR2Path: r2Path
            });
            setLoading(false);
          })
          .catch(error => {
            console.error("Failed to navigate to R2 folder:", error);
            setLoading(false);
            // 刷新整个列表作为回退方案
            setRefreshTrigger(prev => prev + 1);
          });
      }
    } else if (isOneDriveFolder && oneDrivePath && mountPointId) {
      // 这是一个OneDrive文件夹，需要特殊处理
      console.log(`导航到OneDrive文件夹: ${oneDrivePath}`)
      
      // 保持在当前选中的文件夹中，但更新 OneDrive 路径
      setLoading(true);
      
      // 以AJAX方式获取指定OneDrive路径的内容
      if (token && selectedFolderId) {
        // 使用查询参数来传递OneDrive路径
        const queryParams = new URLSearchParams({ oneDrivePath });
        
        fetch(`${API_URL}/folders/${selectedFolderId}/onedrive-contents?${queryParams}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
          .then(response => response.json())
          .then(data => {
            // 更新文件列表，包括文件和文件夹
            let allFiles: FileItem[] = [];
            
            // 添加OneDrive文件
            allFiles = [...allFiles, ...(data.files || [])];
            
            // 将OneDrive文件夹转换为条目
            const onedriveFolderItems = (data.folders || []).map((folder: any) => ({
              id: folder.id,
              filename: folder.name,
              originalName: folder.name,
              size: 0,
              mimeType: "application/directory",
              storageType: "onedrive",
              createdAt: Date.now(),
              isOneDriveFolder: true,
              oneDrivePath: folder.path,
              mountPointId: folder.mountPointId,
              itemCount: folder.itemCount || 0
            }));
            
            allFiles = [...allFiles, ...onedriveFolderItems];
            
            // 更新文件列表
            setFiles(allFiles);
            setOneDriveMountInfo({
              ...data.mountPoint,
              currentOneDrivePath: oneDrivePath
            });
            setLoading(false);
          })
          .catch(error => {
            console.error("Failed to navigate to OneDrive folder:", error);
            setLoading(false);
            // 刷新整个列表作为回退方案
            setRefreshTrigger(prev => prev + 1);
          });
      }
    } else {
      // 普通文件夹导航
      handleFolderSelect(folderId);
    }
  }

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  // 处理R2路径导航
  const handleR2Navigate = (r2Path: string) => {
    if (!r2MountInfo) return

    setLoading(true)

    // 调用R2文件夹导航API
    fetch(`${API_URL}/folders/r2?folderId=${selectedFolderId}&r2Path=${encodeURIComponent(r2Path)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(response => response.json())
      .then(data => {
        // 更新文件列表，包括文件和文件夹
        let allFiles: FileItem[] = []

        // 添加R2文件
        allFiles = [...allFiles, ...(data.files || [])]

        // 将R2文件夹转换为条目
        const r2FolderItems = (data.folders || []).map((folder: any) => ({
          id: folder.id,
          filename: folder.name,
          originalName: folder.name,
          size: 0,
          mimeType: "application/directory",
          storageType: "r2",
          createdAt: Date.now(),
          isR2Folder: true,
          r2Path: folder.path,
          mountPointId: folder.mountPointId,
          itemCount: folder.itemCount || 0
        }))

        allFiles = [...allFiles, ...r2FolderItems]

        // 更新文件列表和R2挂载信息
        setFiles(allFiles)
        setR2MountInfo({
          ...data.mountPoint,
          currentR2Path: r2Path
        })
        setLoading(false)
      })
      .catch(error => {
        console.error("Failed to navigate to R2 path:", error)
        setLoading(false)
        // 刷新整个列表作为回退方案
        setRefreshTrigger(prev => prev + 1)
      })
  }

  // 处理OneDrive路径导航
  const handleOneDriveNavigate = (oneDrivePath: string) => {
    if (!oneDriveMountInfo) return

    setLoading(true)

    // 调用OneDrive文件夹导航API
    fetch(`${API_URL}/folders/onedrive?folderId=${selectedFolderId}&oneDrivePath=${encodeURIComponent(oneDrivePath)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(response => response.json())
      .then(data => {
        // 更新文件列表，包括文件和文件夹
        let allFiles: FileItem[] = []

        // 添加OneDrive文件
        allFiles = [...allFiles, ...(data.files || [])]

        // 将OneDrive文件夹转换为条目
        const onedriveFolderItems = (data.folders || []).map((folder: any) => ({
          id: folder.id,
          filename: folder.name,
          originalName: folder.name,
          size: 0,
          mimeType: "application/directory",
          storageType: "onedrive",
          createdAt: Date.now(),
          isOneDriveFolder: true,
          oneDrivePath: folder.path,
          mountPointId: folder.mountPointId,
          itemCount: folder.itemCount || 0
        }))

        allFiles = [...allFiles, ...onedriveFolderItems]

        // 更新文件列表和OneDrive挂载信息
        setFiles(allFiles)
        setOneDriveMountInfo({
          ...data.mountPoint,
          currentOneDrivePath: oneDrivePath
        })
        setLoading(false)
      })
      .catch(error => {
        console.error("Failed to navigate to OneDrive path:", error)
        setLoading(false)
        // 刷新整个列表作为回退方案
        setRefreshTrigger(prev => prev + 1)
      })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4 md:space-y-6 pb-16 md:pb-0">
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-6">
          {/* 文件夹树和配额显示 - 移动端优化 */}
          <div className="lg:col-span-1 space-y-4">
            <div className="block">
              <FolderTree
                selectedFolderId={selectedFolderId}
                onFolderSelect={handleFolderSelect}
                onRefresh={handleRefresh}
              />
            </div>
            <div className="hidden md:block">
              <QuotaDisplay refreshKey={quotaRefreshKey} />
            </div>
          </div>

          {/* 主内容区域 */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="files" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="files" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                  <Files className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">文件 ({files.length})</span>
                  <span className="sm:hidden">文件</span>
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                  <Upload className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">上传文件</span>
                  <span className="sm:hidden">上传</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="files" className="space-y-4">
                <Card className="w-full">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                          <FolderOpen className="h-4 w-4 md:h-5 md:w-5" />
                          <span className="hidden sm:inline">文件管理</span>
                          <span className="sm:hidden">文件</span>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <div className="space-y-1 md:space-y-2">
                            <div className="overflow-hidden">
                              <FolderBreadcrumb
                                currentFolderId={selectedFolderId}
                                onFolderSelect={handleFolderSelect}
                                r2MountInfo={r2MountInfo}
                                onR2Navigate={handleR2Navigate}
                                oneDriveMountInfo={oneDriveMountInfo}
                                onOneDriveNavigate={handleOneDriveNavigate}
                              />
                            </div>
                            {r2MountInfo && (
                              <div className="flex items-center gap-2 text-xs md:text-sm">
                                <Cloud className="h-3 w-3 md:h-4 md:w-4 text-purple-500" />
                                <span className="text-purple-600 truncate">
                                  <span className="hidden sm:inline">R2 挂载: {r2MountInfo.mountName} → </span>
                                  <span className="sm:hidden">R2: </span>
                                  {r2MountInfo.r2Path || "/"}
                                </span>
                              </div>
                            )}
                            {oneDriveMountInfo && (
                              <div className="flex items-center gap-2 text-xs md:text-sm">
                                <Cloud className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
                                <span className="text-blue-600 truncate">
                                  <span className="hidden sm:inline">OneDrive 挂载: {oneDriveMountInfo.mountName} → </span>
                                  <span className="sm:hidden">OneDrive: </span>
                                  {oneDriveMountInfo.oneDrivePath || "/"}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        className="shrink-0"
                      >
                        <RefreshCw className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                        <span className="hidden md:inline">刷新</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 md:px-6 overflow-x-hidden">
                    <div className="w-full max-w-full">
                      <FileList 
                        files={files} 
                        onDeleteSuccess={handleDeleteSuccess}
                        onFolderNavigate={handleFolderNavigate}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg">上传文件</CardTitle>
                    <CardDescription className="text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                        <span>上传文件到</span>
                        <div className="overflow-hidden flex-1">
                          <FolderBreadcrumb
                            currentFolderId={selectedFolderId}
                            onFolderSelect={handleFolderSelect}
                          />
                        </div>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 md:px-6">
                    <FileUpload
                      onUploadSuccess={handleUploadSuccess}
                      currentFolderId={selectedFolderId}
                      r2MountInfo={r2MountInfo}
                      oneDriveMountInfo={oneDriveMountInfo}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      {/* 移动端配额显示条 */}
      <MobileQuotaBar refreshKey={quotaRefreshKey} />
    </>
  )
}