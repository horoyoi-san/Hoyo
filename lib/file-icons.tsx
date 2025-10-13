import {
  File as FileIcon,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  Archive,
  Smartphone,
  Monitor,
  FileCode,
  FileSpreadsheet,
  Presentation,
  BookOpen
} from "lucide-react"

interface FileIconProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function getFileIcon(mimeType: string, fileName: string = "", props: FileIconProps = {}) {
  const { size = "md", className = "" } = props
  const extension = fileName.toLowerCase().split('.').pop() || ""
  
  // 根据尺寸设置图标大小
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }
  
  const iconSize = sizeClasses[size]
  const baseClassName = `${iconSize} ${className}`
  
  // 图片文件
  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "ico"].includes(extension)) {
    return <FileImage className={`${baseClassName} text-green-500`} />
  }
  
  // 视频文件
  if (mimeType.startsWith("video/") || ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm", "m4v"].includes(extension)) {
    return <FileVideo className={`${baseClassName} text-red-500`} />
  }
  
  // 音频文件
  if (mimeType.startsWith("audio/") || ["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a"].includes(extension)) {
    return <FileAudio className={`${baseClassName} text-purple-500`} />
  }
  
  // 压缩包
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "tar.gz", "tar.bz2"].includes(extension) || 
      mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("compressed")) {
    return <Archive className={`${baseClassName} text-orange-500`} />
  }
  
  // 安装程序
  if (["exe", "msi", "dmg", "pkg", "deb", "rpm", "appimage"].includes(extension)) {
    return <Monitor className={`${baseClassName} text-blue-500`} />
  }
  
  // APK 文件
  if (extension === "apk") {
    return <Smartphone className={`${baseClassName} text-green-600`} />
  }
  
  // 代码文件
  if (["js", "ts", "jsx", "tsx", "html", "css", "scss", "sass", "less", "php", "py", "java", "cpp", "c", "h", "cs", "go", "rs", "rb", "swift", "kt", "dart", "vue", "svelte"].includes(extension)) {
    return <FileCode className={`${baseClassName} text-indigo-500`} />
  }
  
  // 文本文件
  if (["txt", "md", "rtf", "log", "ini", "cfg", "conf", "yaml", "yml", "toml", "json", "xml"].includes(extension) || 
      mimeType.startsWith("text/")) {
    return <FileText className={`${baseClassName} text-gray-500`} />
  }
  
  // PDF 文件
  if (extension === "pdf" || mimeType.includes("pdf")) {
    return <BookOpen className={`${baseClassName} text-red-600`} />
  }
  
  // Excel 文件
  if (["xls", "xlsx", "csv", "ods"].includes(extension) || 
      mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    return <FileSpreadsheet className={`${baseClassName} text-green-600`} />
  }
  
  // PowerPoint 文件
  if (["ppt", "pptx", "odp"].includes(extension) || 
      mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
    return <Presentation className={`${baseClassName} text-orange-600`} />
  }
  
  // Word 文档
  if (["doc", "docx", "odt"].includes(extension) || 
      mimeType.includes("document") || mimeType.includes("word")) {
    return <FileText className={`${baseClassName} text-blue-600`} />
  }
  
  // 默认文件图标
  return <FileIcon className={`${baseClassName} text-gray-400`} />
}

// 获取文件类型描述
export function getFileTypeDescription(mimeType: string, fileName: string = ""): string {
  const extension = fileName.toLowerCase().split('.').pop() || ""
  
  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "ico"].includes(extension)) {
    return "图片文件"
  }
  
  if (mimeType.startsWith("video/") || ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm", "m4v"].includes(extension)) {
    return "视频文件"
  }
  
  if (mimeType.startsWith("audio/") || ["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a"].includes(extension)) {
    return "音频文件"
  }
  
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "tar.gz", "tar.bz2"].includes(extension)) {
    return "压缩包"
  }
  
  if (["exe", "msi", "dmg", "pkg", "deb", "rpm", "appimage"].includes(extension)) {
    return "安装程序"
  }
  
  if (extension === "apk") {
    return "Android 应用"
  }
  
  if (["js", "ts", "jsx", "tsx", "html", "css", "scss", "sass", "less", "php", "py", "java", "cpp", "c", "h", "cs", "go", "rs", "rb", "swift", "kt", "dart", "vue", "svelte"].includes(extension)) {
    return "代码文件"
  }
  
  if (["txt", "md", "rtf", "log", "ini", "cfg", "conf", "yaml", "yml", "toml", "json", "xml"].includes(extension)) {
    return "文本文件"
  }
  
  if (extension === "pdf") {
    return "PDF 文档"
  }
  
  if (["xls", "xlsx", "csv", "ods"].includes(extension)) {
    return "电子表格"
  }
  
  if (["ppt", "pptx", "odp"].includes(extension)) {
    return "演示文稿"
  }
  
  if (["doc", "docx", "odt"].includes(extension)) {
    return "Word 文档"
  }
  
  return "文件"
}
