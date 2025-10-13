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
import { Cloud, Link, Plus, Trash2, AlertCircle, CheckCircle, PlugZap, RefreshCw, Info, Folder as FolderIcon, FileText, ArrowLeft, Download } from "lucide-react"

interface FolderItem {
	id: string
	name: string
	path: string
}

interface MountPoint {
	id: string
	folderId: string
	oneDrivePath: string
	oneDriveItemId?: string
	mountName: string
	enabled: boolean
	createdAt: number
	updatedAt: number
}

export function OneDriveMountManagement() {
	const { token } = useAuth()
	const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

	const [folders, setFolders] = useState<FolderItem[]>([])
	const [mounts, setMounts] = useState<MountPoint[]>([])
	const [loading, setLoading] = useState(true)
	const [createDialogOpen, setCreateDialogOpen] = useState(false)
	const [selectedFolderId, setSelectedFolderId] = useState("")
	const [oneDrivePath, setOneDrivePath] = useState("")
	const [oneDriveItemId, setOneDriveItemId] = useState("")
	const [mountName, setMountName] = useState("")
	const [error, setError] = useState("")
	const [success, setSuccess] = useState("")
	const [azureConfigured, setAzureConfigured] = useState(false)
	const [webdavConfigured, setWebdavConfigured] = useState(false)

	// WebDAV 浏览状态
	const [browserOpen, setBrowserOpen] = useState(false)
	const [browsingMount, setBrowsingMount] = useState<MountPoint | null>(null)
	const [browsingSubPath, setBrowsingSubPath] = useState("")
	const [browseFolders, setBrowseFolders] = useState<Array<{ id: string; name: string; path: string }>>([])
	const [browseFiles, setBrowseFiles] = useState<Array<{ id: string; name: string; path: string; size?: number }>>([])
	const [loadingBrowse, setLoadingBrowse] = useState(false)
	const [browseError, setBrowseError] = useState("")

	const redirectUri = useMemo(() => {
		if (typeof window === "undefined") return ""
		return `${window.location.origin}/onedrive/callback`
	}, [])

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
				setAzureConfigured(!!cfg.oneDriveClientId)
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
			const response = await fetch(`${API_URL}/storage/onedrive/mounts`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (response.ok) {
				const data = await response.json()
				setMounts(data.mounts || [])
			}
		} catch (e) {
			console.error("Failed to fetch onedrive mounts", e)
		} finally {
			setLoading(false)
		}
	}

	const connectOneDrive = async () => {
		if (!azureConfigured) {
			toast.error("未配置 Azure 应用", { description: "仅配置 WebDAV 无需连接；如需 Graph 模式，请在存储设置填入 Client ID/Secret/Tenant" })
			return
		}
		try {
			const res = await fetch(`${API_URL}/storage/onedrive/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (!res.ok) {
				toast.error("无法获取授权链接", { description: "请检查 OneDrive Azure 配置是否完整" })
				return
			}
			const data = await res.json()
			window.location.href = data.authUrl
		} catch (e) {
			toast.error("网络错误", { description: "无法连接到服务器" })
		}
	}

	const handleCreateMount = async () => {
		setError("")
		if (!selectedFolderId || !mountName.trim()) {
			setError("请填写必填字段：目标文件夹与挂载名称")
			return
		}
		try {
			const res = await fetch(`${API_URL}/storage/onedrive/mount`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					folderId: selectedFolderId,
					oneDrivePath: oneDrivePath,
					oneDriveItemId: oneDriveItemId || undefined,
					mountName: mountName.trim(),
				}),
			})
			if (res.ok) {
				setSuccess("OneDrive 挂载点创建成功")
				setCreateDialogOpen(false)
				setSelectedFolderId("")
				setOneDrivePath("")
				setOneDriveItemId("")
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
			const res = await fetch(`${API_URL}/storage/onedrive/mounts/${id}`, {
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
	const openBrowser = async (mount: MountPoint) => {
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
			const res = await fetch(`${API_URL}/storage/onedrive/webdav/browse?${params.toString()}`, {
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
		const base = (browsingMount.oneDrivePath || "").replace(/^\/+|\/+$/g, "")
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

	const makeDownloadUrl = (filePath: string, name: string) => {
		if (!browsingMount) return "#"
		const base = (browsingMount.oneDrivePath || "").replace(/^\/+|\/+$/g, "")
		let rel = filePath.replace(/^\/+/, "")
		if (base && rel.startsWith(base + "/")) rel = rel.slice(base.length + 1)
		const params = new URLSearchParams({ mountId: browsingMount.id, path: rel, filename: name })
		return `${API_URL}/storage/onedrive/webdav/download?${params.toString()}`
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Cloud className="h-5 w-5 text-blue-600" />
								OneDrive 挂载点管理
								{webdavConfigured && (
									<Badge variant="outline" className="ml-2">WebDAV</Badge>
								)}
							</CardTitle>
							<CardDescription>
								管理当前账户的 OneDrive 挂载点{azureConfigured ? "（已配置 Azure，支持授权）" : webdavConfigured ? "（已配置 WebDAV）" : ""}
							</CardDescription>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" onClick={fetchMounts}>
								<RefreshCw className="h-4 w-4 mr-2" />刷新
							</Button>
							{azureConfigured && (
								<Button onClick={connectOneDrive}>
									<PlugZap className="h-4 w-4 mr-2" />连接 OneDrive
								</Button>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{!azureConfigured && webdavConfigured && (
						<Alert>
							<Info className="h-4 w-4" />
							<AlertDescription>
								已配置 WebDAV。可直接创建挂载点；挂载浏览将逐步补充增强。
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
								<Button disabled={!azureConfigured && !webdavConfigured} title={!azureConfigured && !webdavConfigured ? "请先在存储设置中配置 Azure 或 WebDAV" : undefined}>
									<Plus className="h-4 w-4 mr-2" />创建挂载点
								</Button>
							</DialogTrigger>
							<DialogContent className="max-w-lg">
								<DialogHeader>
									<DialogTitle>创建 OneDrive 挂载点</DialogTitle>
									<DialogDescription>选择本地文件夹并填写 OneDrive 路径</DialogDescription>
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
										<Label htmlFor="oneDrivePath">OneDrive 路径</Label>
										<Input
											id="oneDrivePath"
											value={oneDrivePath}
											onChange={(e) => setOneDrivePath(e.target.value)}
											placeholder={azureConfigured ? "例如：Documents/Projects" : "例如：/remote.php/dav/files/xxx/Documents"}
										/>
										<p className="text-xs text-muted-foreground">可留空表示挂载根目录</p>
									</div>

									<div className="space-y-2">
										<Label htmlFor="oneDriveItemId">OneDrive 文件夹ID（可选，Graph 模式）</Label>
										<Input
											id="oneDriveItemId"
											value={oneDriveItemId}
											onChange={(e) => setOneDriveItemId(e.target.value)}
											placeholder="若已知目标文件夹的唯一ID，可填写（WebDAV 可留空）"
										/>
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
						<div className="text-center py-8 text-muted-foreground">
							<Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p>暂无 OneDrive 挂载点</p>
							<p className="text-sm">{azureConfigured ? "请先点击 “连接 OneDrive” 完成授权，再创建挂载点" : webdavConfigured ? "已启用 WebDAV，可直接创建挂载点" : "请先到存储设置配置 Azure 或 WebDAV"}</p>
						</div>
					) : (
						<div className="space-y-4">
							{mounts.map((mount) => (
								<Card key={mount.id} className="border-l-4 border-l-blue-500">
									<CardContent className="p-4">
										<div className="flex items-center justify-between">
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
														<Cloud className="h-3 w-3" /> OneDrive: {mount.oneDrivePath || "/"}
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
									</CardContent>
								</Card>
							))}
						</div>
					)}

					{/* WebDAV 浏览对话框 */}
					<Dialog open={browserOpen} onOpenChange={setBrowserOpen}>
						<DialogContent className="max-w-3xl">
							<DialogHeader>
								<DialogTitle>浏览 OneDrive (WebDAV)</DialogTitle>
								<DialogDescription>
									{browsingMount ? (
										<div className="text-xs text-muted-foreground">
											挂载根：{browsingMount.oneDrivePath || "/"} / 当前：{browsingSubPath || "/"}
										</div>
									) : null}
								</DialogDescription>
							</DialogHeader>

							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<Button variant="outline" size="sm" onClick={goUp} disabled={!browsingSubPath || loadingBrowse}>
										<ArrowLeft className="h-4 w-4" /> 上一级
									</Button>
								</div>

								{browseError && (
									<Alert variant="destructive">
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>{browseError}</AlertDescription>
									</Alert>
								)}

								{loadingBrowse ? (
									<div className="flex items-center justify-center py-8">
										<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
									</div>
								) : (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<h4 className="text-sm font-medium mb-2">文件夹</h4>
											{browseFolders.length === 0 ? (
												<p className="text-xs text-muted-foreground">无</p>
											) : (
												<div className="space-y-1">
													{browseFolders.map((f) => (
														<button
															key={f.id}
															className="w-full text-left px-2 py-1 rounded hover:bg-muted flex items-center gap-2"
															onClick={() => goInto(f.path)}
														>
															<FolderIcon className="h-4 w-4" />
															<span className="truncate">{f.name}</span>
														</button>
													))}
												</div>
											)}
										</div>
										<div>
											<h4 className="text-sm font-medium mb-2">文件</h4>
											{browseFiles.length === 0 ? (
												<p className="text-xs text-muted-foreground">无</p>
											) : (
												<div className="space-y-1">
													{browseFiles.map((f) => (
														<div
															key={f.id}
															className="flex items-center justify-between px-2 py-1 rounded hover:bg-muted"
														>
															<div className="flex items-center gap-2 min-w-0">
																<FileText className="h-4 w-4" />
																<span className="truncate">{f.name}</span>
															</div>
															<a
																className="text-xs inline-flex items-center gap-1 underline"
																href={makeDownloadUrl(f.path, f.name)}
																target="_blank"
																rel="noreferrer"
															>
																<Download className="h-3 w-3" /> 下载
															</a>
														</div>
													))}
												</div>
											)}
										</div>
									</div>
								)}
							</div>
							<DialogFooter>
								<Button variant="outline" onClick={() => setBrowserOpen(false)}>关闭</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</CardContent>
			</Card>
		</div>
	)
} 