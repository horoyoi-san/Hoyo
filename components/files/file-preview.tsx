"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  X, 
  Download, 
  Save, 
  FileText, 
  Image, 
  Video, 
  Music, 
  File as FileIcon,
  Loader2
} from "lucide-react"
import { TextEditor } from "./text-editor"
import { MediaPlayer } from "./media-player"
import { ImageViewer } from "./image-viewer"
import { VideoPlayer } from "./video-player"

interface FileItem {
  id: string
  filename: string
  originalName: string
  size: number
  mimeType: string
  storageType: string
  createdAt: number
  isR2File?: boolean
  r2Key?: string
}

interface FilePreviewProps {
  file: FileItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FilePreview({ file, open, onOpenChange }: FilePreviewProps) {
  const [fileContent, setFileContent] = useState<string>("")
  const [fileUrl, setFileUrl] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const { token } = useAuth()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

  // 文件类型检测
  const getFileType = (mimeType: string, fileName: string) => {
    // 优先基于文件扩展名检测
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    
    // 文本文件扩展名
    const textExtensions = ['txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'scss', 'sass', 'less', 'html', 'htm', 'xml', 'yaml', 'yml', 'ini', 'conf', 'config', 'log', 'sql', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'go', 'rs', 'sh', 'bash', 'bat', 'ps1', 'vue', 'svelte', 'astro', 'dockerfile', 'gitignore', 'env', 'toml', 'lock', 'makefile', 'cmake', 'gradle', 'properties', 'cfg', 'conf', 'rc']
    
    // 图片文件扩展名
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif', 'avif', 'heic', 'heif']
    
    // 视频文件扩展名
    const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'mpg', 'mpeg', 'ogv', 'asf', 'rm', 'rmvb', 'vob', 'ts', 'm2ts', 'mts']
    
    // 音频文件扩展名
    const audioExtensions = ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'wma', 'amr', 'opus', 'aiff', 'au', 'ra', 'ac3', 'dts']
    
    // 基于扩展名判断
    if (textExtensions.includes(ext)) {
      return "text"
    }
    if (imageExtensions.includes(ext)) {
      return "image"
    }
    if (videoExtensions.includes(ext)) {
      return "video"
    }
    if (audioExtensions.includes(ext)) {
      return "audio"
    }
    
    // 如果扩展名无法确定，再基于MIME类型判断
    if (mimeType.startsWith("text/") || 
        mimeType === "application/json" ||
        mimeType === "application/javascript" ||
        mimeType === "application/xml") {
      return "text"
    }
    if (mimeType.startsWith("image/")) {
      return "image"
    }
    if (mimeType.startsWith("video/")) {
      return "video"
    }
    if (mimeType.startsWith("audio/")) {
      return "audio"
    }
    
    return "unknown"
  }

  const fileType = file ? getFileType(file.mimeType, file.originalName) : "unknown"

  // 获取文件内容或URL
  useEffect(() => {
    if (!file || !open || !token) return

    const fetchFileContent = async () => {
      setLoading(true)
      setFileContent("")
      setFileUrl("")
      setHasChanges(false)

      try {
        if (fileType === "text") {
          // 获取文本文件内容
          const response = await fetch(`${API_URL}/files/${file.id}/content`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const content = await response.text()
            console.log("Fetched file content:", content.length, "characters")
            setFileContent(content)
          } else {
            const errorText = await response.text()
            console.error("Failed to fetch file content:", response.status, errorText)
          }
        } else if (fileType === "image" || fileType === "video" || fileType === "audio") {
          // 获取媒体文件URL
          let downloadUrl = ""
          
          if (file.isR2File && file.r2Key) {
            // R2文件获取预签名URL
            const response = await fetch(`${API_URL}/storage/r2/download-url`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ key: file.r2Key }),
            })

            if (response.ok) {
              const data = await response.json()
              downloadUrl = data.downloadUrl
            }
          } else {
            // 常规文件获取下载URL
            const response = await fetch(`${API_URL}/files/${file.id}/download`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })

            if (response.ok) {
              const data = await response.json()
              downloadUrl = data.downloadUrl
            }
          }

          setFileUrl(downloadUrl)
        }
      } catch (error) {
        console.error("Failed to fetch file:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFileContent()
  }, [file, open, token, fileType, API_URL])

  // 保存文件内容
  const handleSave = async () => {
    if (!file || !token || fileType !== "text") return

    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/files/${file.id}/content`, {
        method: "PUT",
        headers: {
          "Content-Type": "text/plain",
          Authorization: `Bearer ${token}`,
        },
        body: fileContent,
      })

      if (response.ok) {
        setHasChanges(false)
        // 可以添加成功提示
      } else {
        console.error("Failed to save file")
        // 可以添加错误提示
      }
    } catch (error) {
      console.error("Save failed:", error)
    } finally {
      setSaving(false)
    }
  }

  // 下载文件
  const handleDownload = async () => {
    if (!file || !token) return

    try {
      let downloadUrl = ""
      
      if (file.isR2File && file.r2Key) {
        const response = await fetch(`${API_URL}/storage/r2/download-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ key: file.r2Key }),
        })

        if (response.ok) {
          const data = await response.json()
          downloadUrl = data.downloadUrl
        }
      } else {
        const response = await fetch(`${API_URL}/files/${file.id}/download`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          downloadUrl = data.downloadUrl
        }
      }

      if (downloadUrl) {
        const link = document.createElement("a")
        link.href = downloadUrl
        link.download = file.originalName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 字节"
    const k = 1024
    const sizes = ["字节", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = () => {
    switch (fileType) {
      case "text":
        return <FileText className="h-5 w-5" />
      case "image":
        return <Image className="h-5 w-5" />
      case "video":
        return <Video className="h-5 w-5" />
      case "audio":
        return <Music className="h-5 w-5" />
      default:
        return <FileIcon className="h-5 w-5" />
    }
  }

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon()}
              <div>
                <DialogTitle className="text-lg">{file.originalName}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{file.mimeType}</Badge>
                  <Badge variant="secondary">{formatFileSize(file.size)}</Badge>
                  {file.isR2File && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      R2存储
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {fileType === "text" && hasChanges && (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? "保存中..." : "保存"}
                </Button>
              )}
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                下载
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>加载中...</span>
              </div>
            </div>
          ) : (
            <>
              {fileType === "text" && (
                <TextEditor
                  content={fileContent}
                  onChange={(content) => {
                    setFileContent(content)
                    setHasChanges(true)
                  }}
                  language={getLanguageFromFileName(file.originalName)}
                />
              )}
              {fileType === "image" && fileUrl && (
                <ImageViewer src={fileUrl} alt={file.originalName} />
              )}
              {fileType === "video" && fileUrl && (
                <VideoPlayer src={fileUrl} />
              )}
              {fileType === "audio" && fileUrl && (
                <MediaPlayer src={fileUrl} type="audio" />
              )}
              {fileType === "unknown" && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">无法预览此文件</h3>
                    <p className="text-muted-foreground mb-4">
                      不支持预览 {file.mimeType} 类型的文件
                    </p>
                    <Button onClick={handleDownload} className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      下载文件
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 根据文件名获取语言类型
function getLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'sh': 'shell',
    'bat': 'bat',
    'ps1': 'powershell',
    'html': 'html',
    'xml': 'xml',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'txt': 'plaintext',
    'log': 'plaintext',
    'ini': 'ini',
    'conf': 'ini'
  }
  
  return languageMap[ext || ''] || 'plaintext'
}
