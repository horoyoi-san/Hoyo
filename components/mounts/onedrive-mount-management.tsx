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
import { Cloud, Link, Plus, Trash2, AlertCircle, CheckCircle, PlugZap, RefreshCw, Info, Folder as FolderIcon, FileText, ArrowLeft, Download, Copy } from "lucide-react"

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
	const [oneDriveConnected, setOneDriveConnected] = useState(false)
	const [storageInfo, setStorageInfo] = useState<{
		total: number
		used: number
		available: number
	} | null>(null)
	const [tokenLastUpdated, setTokenLastUpdated] = useState<number | null>(null)
	const [tokenRefreshed, setTokenRefreshed] = useState<boolean>(false)


	const redirectUri = useMemo(() => {
		if (typeof window === "undefined") return ""
		return `${window.location.origin}/onedrive/callback`
	}, [])

	// 复制重定向URI到剪贴板
	const copyRedirectUri = async () => {
		if (!redirectUri) return
		try {
			await navigator.clipboard.writeText(redirectUri)
			toast.success("重定向 URI 已复制到剪贴板")
		} catch (error) {
			toast.error("复制失败，请手动复制")
		}
	}

	useEffect(() => {
		if (!token) {
			setLoading(false)
			return
		}
		fetchStorageConfig()
		fetchOneDriveStatus()
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
			}
		} catch (_) {}
	}

	const fetchOneDriveStatus = async () => {
		try {
			const res = await fetch(`${API_URL}/storage/onedrive/status`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) {
				const data = await res.json()
				setOneDriveConnected(data.connected || false)
				if (data.connected && data.storageInfo) {
					setStorageInfo(data.storageInfo)
				}
				if (data.lastUpdated) {
					setTokenLastUpdated(Number(data.lastUpdated))
				}
				setTokenRefreshed(!!data.refreshed)
			}
		} catch (_) {
			setOneDriveConnected(false)
			setStorageInfo(null)
			setTokenLastUpdated(null)
			setTokenRefreshed(false)
		}
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

		if (!redirectUri) {
			toast.error("重定向 URI 错误", { description: "无法获取当前域名，请刷新页面重试" })
			return
		}

		try {
			const res = await fetch(`${API_URL}/storage/onedrive/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}))
				if (res.status === 400 && errorData.error?.includes("redirect_uri")) {
					toast.error("重定向 URI 配置错误", { 
						description: `请在 Azure 门户中添加重定向 URI: ${redirectUri}` 
					})
				} else {
					toast.error("无法获取授权链接", { description: errorData.error || "请检查 OneDrive Azure 配置是否完整" })
				}
				return
			}
			const data = await res.json()
			
			// 显示即将跳转的提示
			toast.info("正在跳转到 Microsoft 授权页面...", { 
				description: "请在新页面完成授权后返回" 
			})
			
			// 延迟跳转，让用户看到提示
			setTimeout(() => {
				window.location.href = data.authUrl
			}, 1000)
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

	const formatBytes = (bytes: number) => {
		if (bytes === 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	const formatTime = (ts: number) => {
		try {
			return new Date(ts).toLocaleString()
		} catch { return '' }
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
						<Cloud className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
						OneDrive 挂载点
						<Badge variant="outline" className="ml-2 text-xs">Graph API</Badge>
					</h3>
					<p className="text-xs sm:text-sm text-muted-foreground">
						管理当前账户的 OneDrive API 挂载点{azureConfigured ? "（已配置 Azure，支持授权）" : "（未配置 Azure）"}
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => { fetchMounts(); fetchOneDriveStatus(); }} size="sm">
						<RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
						<span className="hidden sm:inline">刷新</span>
					</Button>
					{azureConfigured && !oneDriveConnected && (
						<Button onClick={connectOneDrive} size="sm">
							<PlugZap className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
							<span className="text-xs sm:text-sm">连接 OneDrive</span>
						</Button>
					)}
				</div>
			</div>

			{!azureConfigured && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						未配置 OneDrive API。请先到存储设置中配置 OneDrive API 连接信息（Client ID、Secret、Tenant ID）。
					</AlertDescription>
				</Alert>
			)}

			{azureConfigured && !oneDriveConnected && (
				<Alert>
					<Info className="h-4 w-4" />
					<AlertDescription className="space-y-2">
						<p>已配置 OneDrive API。点击"连接 OneDrive"进行授权后即可创建挂载点。</p>
						<div className="mt-2 p-2 bg-muted rounded text-xs">
							<p className="font-medium mb-1">重要提醒：</p>
							<p>确保在 Azure 门户中已添加以下重定向 URI（自动生成）：</p>
							<div className="flex items-center gap-2 mt-1">
								<code className="flex-1 p-1 bg-background rounded break-all">
									{redirectUri}
								</code>
								<Button
									variant="outline"
									size="sm"
									onClick={copyRedirectUri}
									className="h-6 px-2 flex-shrink-0"
									title="复制重定向 URI"
								>
									<Copy className="h-3 w-3" />
								</Button>
							</div>
							<p className="text-muted-foreground mt-1">
								💡 此 URI 会根据当前访问域名自动生成，支持多域名部署
							</p>
						</div>
					</AlertDescription>
				</Alert>
			)}

			{azureConfigured && oneDriveConnected && storageInfo && (
				<Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
					<CardContent className="p-4">
						<div className="flex items-center gap-3">
							<div className="flex-shrink-0">
								<CheckCircle className="h-5 w-5 text-green-600" />
							</div>
							<div className="flex-1 min-w-0">
								<h4 className="font-medium text-green-900 dark:text-green-100">OneDrive 已连接</h4>
								<div className="mt-2 space-y-1 text-sm text-green-700 dark:text-green-300">
									<div className="flex items-center justify-between">
										<span>总容量：</span>
										<span className="font-mono">{formatBytes(storageInfo.total)}</span>
									</div>
									<div className="flex items-center justify-between">
										<span>已使用：</span>
										<span className="font-mono">{formatBytes(storageInfo.used)}</span>
									</div>
									<div className="flex items-center justify-between">
										<span>可用空间：</span>
										<span className="font-mono">{formatBytes(storageInfo.available)}</span>
									</div>
									<div className="mt-2">
										<div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
											<div 
												className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
												style={{ width: `${(storageInfo.used / storageInfo.total) * 100}%` }}
											></div>
										</div>
										<p className="text-xs text-green-600 dark:text-green-400 mt-1 text-center">
											使用率：{((storageInfo.used / storageInfo.total) * 100).toFixed(1)}%
										</p>
									</div>
									{tokenLastUpdated && (
										<p className="text-xs text-muted-foreground mt-2 text-center">
											令牌最后更新时间：{formatTime(tokenLastUpdated)}{tokenRefreshed ? "（本次已自动刷新）" : ""}
										</p>
									)}
																										</div>
									</div>
								</div>
							</CardContent>
					</Card>
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
							disabled={!azureConfigured || !oneDriveConnected} 
							title={!azureConfigured ? "请先在存储设置中配置 OneDrive API" : !oneDriveConnected ? "请先连接 OneDrive" : undefined}
							size="sm"
						>
							<Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
							<span className="text-xs sm:text-sm">创建挂载点</span>
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-lg mx-4 sm:mx-auto">
						<DialogHeader>
							<DialogTitle className="text-base sm:text-lg">创建 OneDrive 挂载点</DialogTitle>
							<DialogDescription className="text-sm">选择本地文件夹并填写 OneDrive 路径</DialogDescription>
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
				<div className="text-center py-6 sm:py-8 text-muted-foreground">
					<Cloud className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
					<p className="text-sm sm:text-base">暂无 OneDrive 挂载点</p>
					<p className="text-xs sm:text-sm px-4">
						{!azureConfigured 
							? "请先到存储设置配置 OneDrive API" 
							: !oneDriveConnected 
								? "请先点击 \"连接 OneDrive\" 完成授权，再创建挂载点" 
								: "点击 \"创建挂载点\" 开始使用"
						}
					</p>
				</div>
			) : (
				<div className="space-y-3 sm:space-y-4">
					{mounts.map((mount) => (
						<Card key={mount.id} className="border-l-4 border-l-blue-500">
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
												<Cloud className="h-3 w-3" /> OneDrive: {mount.oneDrivePath || "/"}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
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
											<Cloud className="h-3 w-3 text-muted-foreground" />
											<span className="text-muted-foreground">OneDrive:</span>
											<code className="text-xs bg-muted px-1 py-0.5 rounded truncate">
												{mount.oneDrivePath || "/"}
											</code>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

		</div>
	)
}