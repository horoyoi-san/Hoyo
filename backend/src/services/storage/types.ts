export type StorageType = "local" | "r2" | "onedrive" | "webdav"

export interface StorageConfig {
  storageType: StorageType
  enableMixedMode?: boolean
  // R2
  r2Endpoint?: string
  r2AccessKey?: string
  r2SecretKey?: string
  r2Bucket?: string
  // OneDrive
  oneDriveClientId?: string
  oneDriveClientSecret?: string
  oneDriveTenantId?: string
}

export interface R2StorageStats {
  totalSize: number
  totalFiles: number
  averageFileSize?: number
  largestFile?: { key: string; size: number } | null
  smallestFile?: { key: string; size: number } | null
  error?: string
  fromCache?: boolean
}

export interface StorageProvider {
  upload(file: File, filename: string, userId?: string): Promise<string>
  uploadToUserFolder?(file: File, userFilePath: string, userId?: string): Promise<string>
  getDownloadUrl(storagePath: string): Promise<string>
  deleteFile(storagePath: string): Promise<void>
  downloadFile(storagePath: string): Promise<Buffer>
}

export interface OneDriveProviderLike extends StorageProvider {
  setAccessToken(token: string): void
  getService(): any
}

export interface R2ProviderLike extends StorageProvider {
  uploadDirect(file: File, r2Path: string): Promise<string>
  uploadToMount(file: File, filename: string, r2Path: string, targetFolderId: string, currentFolderId: string): Promise<string>
  listObjects(prefix?: string): Promise<{ files: any[]; folders: string[]; folderCounts: Record<string, { files: number; folders: number }> }>
  getPublicUrl(key: string): Promise<string>
  calculateStorageUsage(useCache?: boolean): Promise<R2StorageStats>
  clearStorageCache(): void
  getStorageStats(): Promise<Required<Pick<R2StorageStats, "totalSize" | "totalFiles" | "averageFileSize">> & { largestFile: { key: string; size: number } | null; smallestFile: { key: string; size: number } | null; error?: string }>
} 