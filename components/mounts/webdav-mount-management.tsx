"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Globe, Link, Plus, Trash2, AlertCircle, CheckCircle, RefreshCw, Info, Folder as FolderIcon, FileText, ArrowLeft, Download, Copy } from "lucide-react"

interface FolderItem {
	id: string
	name: string
	path: string
}

interface WebDAVMountPoint {
	id: string
	folderId: string
	webdavPath: string // 使用正确的WebDAV路径字段
	mountName: string
	enabled: boolean
	createdAt: number
	updatedAt: number
}

export function WebDAVMountManagement() {
	const { token } = useAuth()
	const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

	const [folders, setFolders] = useState<FolderItem[]>([])
	const [mounts, setMounts] = useState<WebDAVMountPoint[]>([])
	const [loading, setLoading] = useState(true)
	const [createDialogOpen, setCreateDialogOpen] = useState(false)
	const [selectedFolderId, setSelectedFolderId] = useState("")
	const [webdavPath, setWebdavPath] = useState("")
	const [mountName, setMountName] = useState("")
	const [error, setError] = useState("")
	const [success, setSuccess] = useState("")
	const [webdavConfigured, setWebdavConfigured] = useState(false)

	// WebDAV 浏览状态
	const [browserOpen, setBrowserOpen] = useState(false)
	const [browsingMount, setBrowsingMount] = useState<WebDAVMountPoint | null>(null)
	const [browsingSubPath, setBrowsingSubPath] = useState("")
	const [browseFolders, setBrowseFolders] = useState<Array<{ id: string; name: string; path: string }>>([])
	const [browseFiles, setBrowseFiles] = useState<Array<{ id: string; name: string; path: string; size?: number }>>([])
	const [loadingBrowse, setLoadingBrowse] = useState(false)
	const [browseError, setBrowseError] = useState("")

	useEffect(() => {
		if (!token) {
			setLoading(false)
			return
		}
		fetchStorageConfig()
		fetchFolders()
		fetchMounts()
	}, [token])

	const fetchStorageConfig = async () => {
		try {
			const res = await fetch(`${API_URL}/storage/config`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) {
				const data = await res.json()
				const cfg = data?.config || {}
				setWebdavConfigured(!!cfg.oneDriveWebDavUrl && !!cfg.oneDriveWebDavUser && !!cfg.oneDriveWebDavPass)
			}
		} catch (_) {}
	}

	const fetchFolders = async () => {
		try {
			const response = await fetch(`${API_URL}/folders`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (response.ok) {
				const data = await response.json()
				setFolders(data.folders || [])
			}
		} catch (e) {
			console.error("Failed to fetch folders", e)
		}
	}

	const fetchMounts = async () => {
		try {
			const response = await fetch(`${API_URL}/storage/webdav/mounts`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (response.ok) {
				const data = await response.json()
				setMounts(data.mounts || [])
			}
		} catch (e) {
			console.error("Failed to fetch webdav mounts", e)
		} finally {
			setLoading(false)
		}
	}

	const handleCreateMount = async () => {
		setError("")
		if (!selectedFolderId || !mountName.trim()) {
			setError("请填写必填字段：目标文件夹与挂载名称")
			return
		}
		try {
			const res = await fetch(`${API_URL}/storage/webdav/mount`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					folderId: selectedFolderId,
					webdavPath: webdavPath,
					mountName: mountName.trim(),
				}),
			})
			if (res.ok) {
				setSuccess("WebDAV 挂载点创建成功")
				setCreateDialogOpen(false)
				setSelectedFolderId("")
				setWebdavPath("")
				setMountName("")
				await fetchMounts()
			} else {
				const data = await res.json()
				setError(data.error || "创建挂载点失败")
			}
		} catch (e) {
			setError("网络错误")
		}
	}

	const handleDeleteMount = async (id: string) => {
		if (!confirm("确定要删除此挂载点吗？")) return
		try {
			const res = await fetch(`${API_URL}/storage/webdav/mounts/${id}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) {
				toast.success("挂载点删除成功")
				await fetchMounts()
			} else {
				const data = await res.json()
				toast.error("删除失败", { description: data.error || "无法删除挂载点" })
			}
		} catch (e) {
			toast.error("网络错误", { description: "无法连接到服务器" })
		}
	}

	const getFolderPath = (folderId: string) => folders.find(f => f.id === folderId)?.path || ""

	// WebDAV 浏览逻辑
	const openBrowser = async (mount: WebDAVMountPoint) => {
		setBrowsingMount(mount)
		setBrowsingSubPath("")
		setBrowseFolders([])
		setBrowseFiles([])
		setBrowseError("")
		setBrowserOpen(true)
		await fetchWebDavContents(mount.id, "")
	}

	const fetchWebDavContents = async (mountId: string, subPath: string) => {
		try {
			setLoadingBrowse(true)
			setBrowseError("")
			const params = new URLSearchParams({ mountId })
			if (subPath) params.set("subPath", subPath)
			const res = await fetch(`${API_URL}/storage/webdav/browse?${params.toString()}`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) {
				const data = await res.json()
				setBrowseFolders((data.folders || []).map((f: any) => ({ id: f.id, name: f.name, path: f.path })))
				setBrowseFiles((data.files || []).map((f: any) => ({ id: f.id, name: f.name, path: f.path, size: f.size })))
				setBrowsingSubPath(subPath)
			} else {
				const err = await res.json()
				setBrowseError(err.error || "浏览失败")
			}
		} catch (e) {
			setBrowseError("网络错误")
		} finally {
			setLoadingBrowse(false)
		}
	}

	const goInto = async (folderPath: string) => {
		if (!browsingMount) return
		// folderPath 是 WebDAV 绝对路径，转换为相对挂载路径
		const base = (browsingMount.webdavPath || "").replace(/^\/+|\/+$/g, "")
		let rel = folderPath.replace(/^\/+/, "")
		if (base && rel.startsWith(base + "/")) rel = rel.slice(base.length + 1)
		await fetchWebDavContents(browsingMount.id, rel)
	}

	const goUp = async () => {
		if (!browsingMount) return
		const parts = browsingSubPath.split("/").filter(Boolean)
		parts.pop()
		const parent = parts.join("/")
		await fetchWebDavContents(browsingMount.id, parent)
	}

	const handleDownload = async (filePath: string, name: string) => {
		if (!browsingMount || !token) return
		
		try {
			const base = (browsingMount.webdavPath || "").replace(/^\/+|\/+$/g, "")
			let rel = filePath.replace(/^\/+/, "")
			if (base && rel.startsWith(base + "/")) rel = rel.slice(base.length + 1)
			
			const params = new URLSearchParams({ mountId: browsingMount.id, path: rel, filename: name })
			const response = await fetch(`${API_URL}/storage/webdav/download?${params.toString()}`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			if (response.ok) {
				// 创建下载链接
				const blob = await response.blob()
				const url = window.URL.createObjectURL(blob)
				const a = document.createElement('a')
				a.style.display = 'none'
				a.href = url
				a.download = name
				document.body.appendChild(a)
				a.click()
				window.URL.revokeObjectURL(url)
				document.body.removeChild(a)
			} else {
				const errorData = await response.json().catch(() => ({}))
				toast.error("下载失败", { description: errorData.error || '未知错误' })
			}
		} catch (error) {
			console.error("Download failed:", error)
			toast.error("下载失败", { description: "网络错误" })
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
			</div>
		)
	}

	return (
		<div className="space-y-4 sm:space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
				<div>
					<h3 className="text-base sm:text-lg font-medium flex items-center gap-2">
						<Globe className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
						WebDAV 挂载点
						<Badge variant="outline" className="ml-2 text-xs">通用协议</Badge>
					</h3>
					<p className="text-xs sm:text-sm text-muted-foreground">
						管理 WebDAV 协议挂载点{webdavConfigured ? "（已配置 WebDAV）" : "（未配置 WebDAV）"}
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={fetchMounts} size="sm">
						<RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
						<span className="hidden sm:inline">刷新</span>
					</Button>
				</div>
			</div>

			{!webdavConfigured && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						未配置 WebDAV 连接。请先到存储设置中配置 WebDAV 服务器地址、用户名和密码。
					</AlertDescription>
				</Alert>
			)}

			{webdavConfigured && (
				<Alert>
					<Info className="h-4 w-4" />
					<AlertDescription>
						已配置 WebDAV 连接。WebDAV 协议支持多种云存储服务，包括 OneDrive、Nextcloud、ownCloud 等。
					</AlertDescription>
				</Alert>
			)}

			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
			{success && (
				<Alert>
					<CheckCircle className="h-4 w-4" />
					<AlertDescription>{success}</AlertDescription>
				</Alert>
			)}

			<div className="flex items-center justify-between mb-4">
				<div className="text-sm text-muted-foreground">
					已配置挂载点：<Badge variant="secondary">{mounts.length}</Badge>
				</div>
				<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
					<DialogTrigger asChild>
						<Button 
							disabled={!webdavConfigured} 
							title={!webdavConfigured ? "请先在存储设置中配置 WebDAV" : undefined}
							size="sm"
						>
							<Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
							<span className="text-xs sm:text-sm">创建挂载点</span>
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-lg mx-4 sm:mx-auto">
						<DialogHeader>
							<DialogTitle className="text-base sm:text-lg">创建 WebDAV 挂载点</DialogTitle>
							<DialogDescription className="text-sm">选择本地文件夹并填写 WebDAV 路径</DialogDescription>
						</DialogHeader>

						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="folder">目标文件夹</Label>
								<Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
									<SelectTrigger>
										<SelectValue placeholder="选择要挂载的文件夹" />
									</SelectTrigger>
									<SelectContent>
										{folders.map((folder) => (
											<SelectItem key={folder.id} value={folder.id}>
												{folder.path}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="webdavPath">WebDAV 路径</Label>
								<Input
									id="webdavPath"
									value={webdavPath}
									onChange={(e) => setWebdavPath(e.target.value)}
									placeholder="例如：/Documents 或 /remote.php/dav/files/username/Documents"
								/>
								<p className="text-xs text-muted-foreground">可留空表示挂载根目录</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="mountName">挂载点名称</Label>
								<Input
									id="mountName"
									value={mountName}
									onChange={(e) => setMountName(e.target.value)}
									placeholder="输入挂载点显示名称"
								/>
							</div>
						</div>

						<DialogFooter>
							<Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
							<Button onClick={handleCreateMount}>创建挂载点</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{mounts.length === 0 ? (
				<div className="text-center py-6 sm:py-8 text-muted-foreground">
					<Globe className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
					<p className="text-sm sm:text-base">暂无 WebDAV 挂载点</p>
					<p className="text-xs sm:text-sm px-4">{webdavConfigured ? "可以创建 WebDAV 挂载点" : "请先到存储设置配置 WebDAV 连接信息"}</p>
				</div>
			) : (
				<div className="space-y-3 sm:space-y-4">
					{mounts.map((mount) => (
						<Card key={mount.id} className="border-l-4 border-l-green-500">
							<CardContent className="p-3 sm:p-4">
								{/* 桌面端布局 */}
								<div className="hidden sm:flex items-center justify-between">
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<h4 className="font-medium">{mount.mountName}</h4>
											<Badge variant={mount.enabled ? "default" : "secondary"}>{mount.enabled ? "已启用" : "已禁用"}</Badge>
										</div>
										<div className="text-sm text-muted-foreground">
											<div className="flex items-center gap-1">
												<Link className="h-3 w-3" /> 本地: {getFolderPath(mount.folderId)}
											</div>
											<div className="flex items-center gap-1">
												<Globe className="h-3 w-3" /> WebDAV: {mount.webdavPath || "/"}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Button variant="outline" size="sm" onClick={() => openBrowser(mount)}>
											<FolderIcon className="h-4 w-4" /> 浏览
										</Button>
										<Button variant="outline" size="sm" onClick={() => handleDeleteMount(mount.id)}>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>

								{/* 移动端布局 */}
								<div className="sm:hidden space-y-3">
									<div className="flex items-start justify-between">
										<div className="space-y-1 flex-1 min-w-0">
											<h4 className="font-medium text-sm truncate">{mount.mountName}</h4>
											<Badge variant={mount.enabled ? "default" : "secondary"} className="text-xs">
												{mount.enabled ? "已启用" : "已禁用"}
											</Badge>
										</div>
										<div className="flex items-center gap-1 ml-2">
											<Button variant="outline" size="sm" onClick={() => openBrowser(mount)} className="h-8 w-8 p-0">
												<FolderIcon className="h-3 w-3" />
											</Button>
											<Button variant="outline" size="sm" onClick={() => handleDeleteMount(mount.id)} className="h-8 w-8 p-0">
												<Trash2 className="h-3 w-3" />
											</Button>
										</div>
									</div>
									
									<div className="space-y-2 text-xs">
										<div className="flex items-center gap-2">
											<Link className="h-3 w-3 text-muted-foreground" />
											<span className="text-muted-foreground">本地:</span>
											<span className="truncate">{getFolderPath(mount.folderId)}</span>
										</div>
										<div className="flex items-center gap-2">
											<Globe className="h-3 w-3 text-muted-foreground" />
											<span className="text-muted-foreground">WebDAV:</span>
											<code className="text-xs bg-muted px-1 py-0.5 rounded truncate">
												{mount.webdavPath || "/"}
											</code>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* WebDAV 浏览对话框 */}
			<Dialog open={browserOpen} onOpenChange={setBrowserOpen}>
				<DialogContent className="max-w-3xl mx-4 sm:mx-auto max-h-[90vh] overflow-hidden flex flex-col">
					<DialogHeader className="flex-shrink-0">
						<DialogTitle className="text-base sm:text-lg">浏览 WebDAV</DialogTitle>
						<DialogDescription>
							{browsingMount ? (
								<div className="text-xs text-muted-foreground break-all">
									挂载根：{browsingMount.webdavPath || "/"} / 当前：{browsingSubPath || "/"}
								</div>
							) : null}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3 flex-1 overflow-hidden">
						<div className="flex items-center gap-2 flex-shrink-0">
							<Button variant="outline" size="sm" onClick={goUp} disabled={!browsingSubPath || loadingBrowse}>
								<ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> 
								<span className="text-xs sm:text-sm">上一级</span>
							</Button>
						</div>

						{browseError && (
							<Alert variant="destructive" className="flex-shrink-0">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription className="text-sm">{browseError}</AlertDescription>
							</Alert>
						)}

						{loadingBrowse ? (
							<div className="flex items-center justify-center py-8">
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
							</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-auto">
								<div className="space-y-2">
									<h4 className="text-sm font-medium sticky top-0 bg-background py-1">文件夹</h4>
									{browseFolders.length === 0 ? (
										<p className="text-xs text-muted-foreground">无</p>
									) : (
										<div className="space-y-1 max-h-48 sm:max-h-64 overflow-auto">
											{browseFolders.map((f) => (
												<button
													key={f.id}
													className="w-full text-left px-2 py-2 rounded hover:bg-muted flex items-center gap-2 text-sm"
													onClick={() => goInto(f.path)}
												>
													<FolderIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
													<span className="truncate">{f.name}</span>
												</button>
											))}
										</div>
									)}
								</div>
								<div className="space-y-2">
									<h4 className="text-sm font-medium sticky top-0 bg-background py-1">文件</h4>
									{browseFiles.length === 0 ? (
										<p className="text-xs text-muted-foreground">无</p>
									) : (
										<div className="space-y-1 max-h-48 sm:max-h-64 overflow-auto">
											{browseFiles.map((f) => (
												<div
													key={f.id}
													className="flex items-center justify-between px-2 py-2 rounded hover:bg-muted text-sm"
												>
													<div className="flex items-center gap-2 min-w-0 flex-1">
														<FileText className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
														<span className="truncate">{f.name}</span>
													</div>
													<Button
														variant="ghost"
														size="sm"
														className="text-xs h-6 px-2 ml-2 flex-shrink-0"
														onClick={() => handleDownload(f.path, f.name)}
													>
														<Download className="h-3 w-3 mr-1" /> 
														<span className="hidden sm:inline">下载</span>
													</Button>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						)}
					</div>
					<DialogFooter className="flex-shrink-0">
						<Button variant="outline" onClick={() => setBrowserOpen(false)} className="text-sm">
							关闭
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}