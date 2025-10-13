"use client"

import { useState, useCallback } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, File as FileIcon, CheckCircle, AlertCircle, Info, RotateCcw } from "lucide-react"
import { useDropzone } from "react-dropzone"

interface R2MountInfo {
  id: string
  mountName: string
  r2Path: string
  folderId: string
  currentR2Path?: string
}

interface OneDriveMountInfo {
  id: string
  mountName: string
  oneDrivePath: string
  folderId: string
  currentOneDrivePath?: string
}

interface FileUploadProps {
  onUploadSuccess: () => void
  currentFolderId?: string | null
  r2MountInfo?: R2MountInfo | null
  oneDriveMountInfo?: OneDriveMountInfo | null
}

interface UploadFile {
  file: File
  progress: number
  status: "pending" | "uploading" | "processing" | "success" | "error"
  error?: string
}

export function FileUpload({ onUploadSuccess, currentFolderId, r2MountInfo, oneDriveMountInfo }: FileUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [error, setError] = useState("")
  const { token } = useAuth()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: "pending" as const,
    }))
    setUploadFiles((prev) => [...prev, ...newFiles])
    setError("")
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  })

  const removeFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const retryUpload = (index: number) => {
    setUploadFiles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, status: "pending", error: undefined } : item))
    )
    uploadFile(uploadFiles[index], index)
  }

  const getErrorVariant = (error: string) => {
    if (error.includes("配额限制") || error.includes("quota")) {
      return "default" // 使用默认样式，不那么严重
    }
    return "destructive" // 使用红色破坏性样式
  }

  const getErrorIcon = (error: string) => {
    if (error.includes("配额限制") || error.includes("quota")) {
      return <Info className="h-4 w-4" />
    }
    return <AlertCircle className="h-4 w-4" />
  }

  const getErrorTitle = (error: string) => {
    if (error.includes("配额限制") || error.includes("quota")) {
      return "存储空间不足"
    }
    if (error.includes("网络错误") || error.includes("network")) {
      return "网络连接失败"
    }
    return "上传失败"
  }

  const canRetry = (error: string) => {
    // 配额错误不能重试
    return !error.includes("配额限制") && !error.includes("quota")
  }

  const uploadFile = async (fileItem: UploadFile, index: number) => {
    if (!token) return

    setUploadFiles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, status: "uploading", progress: 0 } : item)),
    )

    try {
      // 若当前使用 OneDrive 策略/路径，尝试直传
      const tryDirectOneDrive = async (): Promise<boolean> => {
        try {
          const createBody: Record<string, any> = { 
            filename: fileItem.file.name,
            fileSize: fileItem.file.size
          }
          if (currentFolderId) createBody.folderId = currentFolderId
          if (oneDriveMountInfo?.currentOneDrivePath) createBody.currentOneDrivePath = oneDriveMountInfo.currentOneDrivePath

          const sessionResp = await fetch(`${API_URL}/files/onedrive/create-upload-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(createBody)
          })
          if (!sessionResp.ok) {
            // 处理OneDrive上传会话创建失败的错误
            let errorMessage = "OneDrive上传会话创建失败"
            try {
              const errorData = await sessionResp.json()
              errorMessage = errorData.error || errorMessage
            } catch {}
            setUploadFiles(prev => prev.map((item, i) => (i === index ? { ...item, status: 'error', error: errorMessage } : item)))
            return false
          }
          const sessionData = await sessionResp.json()
          if (!sessionData?.useDirect || !sessionData?.uploadUrl) return false

          const uploadUrl: string = sessionData.uploadUrl

          const chunkSize = 320 * 1024 * 10 // ~3.2MB
          let uploaded = 0
          const total = fileItem.file.size
          let lastDriveItemId: string | null = null
          while (uploaded < total) {
            const start = uploaded
            const end = Math.min(start + chunkSize, total)
            const blob = fileItem.file.slice(start, end)
            const arrayBuffer = await blob.arrayBuffer()
            const res = await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                'Content-Range': `bytes ${start}-${end - 1}/${total}`,
                'Content-Length': String(arrayBuffer.byteLength),
              },
              body: arrayBuffer,
            })
            if (!res.ok && res.status !== 201 && res.status !== 200 && res.status !== 202) {
              return false
            }
            // 如果上传完成（200/201），尝试解析返回的 DriveItem
            if (res.ok && (res.status === 200 || res.status === 201)) {
              try {
                const json = await res.json()
                if (json && json.id) {
                  lastDriveItemId = json.id as string
                }
              } catch {}
            }
            uploaded = end
            const raw = (uploaded / total) * 100
            const percent = Math.max(1, Math.min(99, Math.round(raw)))
            setUploadFiles(prev => prev.map((item, i) => (i === index ? { ...item, progress: percent } : item)))
          }

          // 最后一次响应通常包含 driveItem；若没有，再 GET session 也可，这里直接解析最后一次结果不可控，改为标记 processing
          setUploadFiles(prev => prev.map((item, i) => (i === index ? { ...item, status: 'processing', progress: 99 } : item)))

          if (!lastDriveItemId) {
            // 未拿到 ID，视为失败回退
            return false
          }

          // 调用后端登记文件
          const finalizeResp = await fetch(`${API_URL}/files/onedrive/finalize-upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              filename: fileItem.file.name,
              size: fileItem.file.size,
              mimeType: fileItem.file.type || 'application/octet-stream',
              driveItemId: lastDriveItemId,
              folderId: currentFolderId || undefined,
            })
          })
          if (!finalizeResp.ok) {
            // 处理OneDrive上传完成失败的错误
            let errorMessage = "OneDrive上传完成失败"
            try {
              const errorData = await finalizeResp.json()
              errorMessage = errorData.error || errorMessage
            } catch {}
            setUploadFiles(prev => prev.map((item, i) => (i === index ? { ...item, status: 'error', error: errorMessage } : item)))
            return false
          }
          // 成功
          setUploadFiles(prev => prev.map((item, i) => (i === index ? { ...item, status: 'success', progress: 100 } : item)))
          onUploadSuccess()
          return true
        } catch (error) {
          setUploadFiles(prev => prev.map((item, i) => (i === index ? { ...item, status: 'error', error: 'OneDrive上传过程中发生错误' } : item)))
          return false
        }
      }

      // 若直传失败，回退到服务器中转
      const directOk = await tryDirectOneDrive()
      if (!directOk) {
        const formData = new FormData()
        formData.append("file", fileItem.file)

        // 添加文件夹ID到表单数据
        if (currentFolderId) {
          formData.append("folderId", currentFolderId)
        }

        // 添加当前R2路径到表单数据
        if (r2MountInfo?.currentR2Path) {
          formData.append("currentR2Path", r2MountInfo.currentR2Path)
        }

        // 添加当前OneDrive路径到表单数据
        if (oneDriveMountInfo?.currentOneDrivePath) {
          formData.append("currentOneDrivePath", oneDriveMountInfo.currentOneDrivePath)
        }

        // 使用 XMLHttpRequest 以便获取上传进度
        await new Promise<void>((resolve) => {
          const xhr = new XMLHttpRequest()
          xhr.open("POST", `${API_URL}/files/upload`, true)
          xhr.setRequestHeader("Authorization", `Bearer ${token}`)

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              // 仅反映客户端 -> 服务端的上传进度，将上限封顶在 95%，留出服务器处理阶段
              const raw = (event.loaded / event.total) * 100
              const percent = Math.max(1, Math.min(95, Math.round(raw)))
              setUploadFiles((prev) =>
                prev.map((item, i) => (i === index ? { ...item, progress: percent } : item)),
              )
            }
          }

          // 当请求体发送完成，但服务器仍在处理（例如上传到远程存储）
          xhr.upload.onload = () => {
            setUploadFiles((prev) =>
              prev.map((item, i) => (i === index ? { ...item, status: "processing", progress: Math.max(item.progress, 99) } : item)),
            )
          }

          xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadFiles((prev) =>
                prev.map((item, i) => (i === index ? { ...item, status: "success", progress: 100 } : item)),
              )
              onUploadSuccess()
              resolve()
            } else {
              let message = "上传失败"
              try {
                const data = JSON.parse(xhr.responseText)
                message = data.error || message
              } catch {}
              setUploadFiles((prev) =>
                prev.map((item, i) => (i === index ? { ...item, status: "error", error: message } : item)),
              )
              resolve()
            }
          }

          xhr.onerror = () => {
            setUploadFiles((prev) =>
              prev.map((item, i) => (i === index ? { ...item, status: "error", error: "网络错误" } : item)),
            )
            resolve()
          }

          xhr.send(formData)
        })
      }
    } catch (err) {
      setUploadFiles((prev) =>
        prev.map((item, i) => (i === index ? { ...item, status: "error", error: "网络错误" } : item)),
      )
    }
  }

  const uploadAllFiles = async () => {
    const pendingFiles = uploadFiles.filter((f) => f.status === "pending")
    for (let i = 0; i < uploadFiles.length; i++) {
      if (uploadFiles[i].status === "pending") {
        await uploadFile(uploadFiles[i], i)
      }
    }
  }

  const clearCompleted = () => {
    setUploadFiles((prev) => prev.filter((f) => f.status !== "success"))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 字节"
    const k = 1024
    const sizes = ["字节", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card
        {...getRootProps()}
        className={`border-2 border-dashed cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">{isDragActive ? "拖放文件到这里" : "拖拽文件到这里"}</p>
          <p className="text-sm text-muted-foreground mb-4">或点击浏览文件</p>
          <Button variant="outline">选择文件</Button>
        </CardContent>
      </Card>

      {uploadFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">待上传文件 ({uploadFiles.length})</h3>
            <div className="flex gap-2">
              <Button onClick={uploadAllFiles} disabled={uploadFiles.every((f) => f.status !== "pending")}>
                全部上传
              </Button>
              <Button variant="outline" onClick={clearCompleted}>
                清除已完成
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {uploadFiles.map((fileItem, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate max-w-[60vw] sm:max-w-[70vw] md:max-w-none" title={fileItem.file.name}>{fileItem.file.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(fileItem.file.size)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {fileItem.status === "success" && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {fileItem.status === "error" && <AlertCircle className="h-5 w-5 text-red-500" />}
                      {fileItem.status === "pending" && (
                        <Button size="sm" onClick={() => uploadFile(fileItem, index)}>
                          上传
                        </Button>
                      )}
                      {fileItem.status === "error" && canRetry(fileItem.error || "") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryUpload(index)}
                          className="h-8 px-3"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          重试
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {(fileItem.status === "uploading" || fileItem.status === "processing") && (
                    <div className="mt-3 flex items-center gap-2">
                      <Progress value={fileItem.progress} className="h-2 flex-1" />
                      <span className="text-sm text-muted-foreground w-14 text-right">
                        {fileItem.progress}%
                      </span>
                      {fileItem.status === "processing" && (
                        <span className="text-xs text-muted-foreground">处理中...</span>
                      )}
                    </div>
                  )}

                  {fileItem.status === "error" && (
                    <div className="mt-3">
                      <Alert variant={getErrorVariant(fileItem.error || "") as "default" | "destructive"}>
                        {getErrorIcon(fileItem.error || "")}
                        <AlertTitle>{getErrorTitle(fileItem.error || "")}</AlertTitle>
                        <AlertDescription>
                          {fileItem.error || "上传失败"}
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
