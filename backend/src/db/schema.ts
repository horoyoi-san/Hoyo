import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export const emailVerificationCodes = sqliteTable("email_verification_codes", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: integer("expires_at").notNull(),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
})

export const folders = sqliteTable("folders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  parentId: text("parent_id"), // null for root folders
  path: text("path").notNull(), // full path for easy querying
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  folderId: text("folder_id"), // null for root files
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  size: integer("size").notNull(),
  mimeType: text("mime_type").notNull(),
  storageType: text("storage_type").notNull(),
  storagePath: text("storage_path").notNull(),
  createdAt: integer("created_at").notNull(),
})

export const storageConfig = sqliteTable("storage_config", {
  id: integer("id").primaryKey().default(1),
  storageType: text("storage_type").notNull().default("local"),
  r2Endpoint: text("r2_endpoint"),
  r2AccessKey: text("r2_access_key"),
  r2SecretKey: text("r2_secret_key"),
  r2Bucket: text("r2_bucket"),
  // OneDrive 配置字段
  oneDriveClientId: text("onedrive_client_id"),
  oneDriveClientSecret: text("onedrive_client_secret"),
  oneDriveTenantId: text("onedrive_tenant_id"),
  // OneDrive WebDAV 配置字段
  oneDriveWebDavUrl: text("onedrive_webdav_url"),
  oneDriveWebDavUser: text("onedrive_webdav_user"),
  oneDriveWebDavPass: text("onedrive_webdav_pass"),
  // 新增字段支持混合模式
  enableMixedMode: integer("enable_mixed_mode", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at").notNull(),
})

// 新增 R2 挂载点表
export const r2MountPoints = sqliteTable("r2_mount_points", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  folderId: text("folder_id").notNull(), // 挂载到的本地文件夹
  r2Path: text("r2_path").notNull(), // R2 存储桶中的路径
  mountName: text("mount_name").notNull(), // 挂载点显示名称
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

// OneDrive 用户认证表
export const oneDriveAuth = sqliteTable("onedrive_auth", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: integer("expires_at").notNull(),
  scope: text("scope").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

// OneDrive 挂载点表
export const oneDriveMountPoints = sqliteTable("onedrive_mount_points", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  folderId: text("folder_id").notNull(),
  oneDrivePath: text("onedrive_path").notNull(),
  oneDriveItemId: text("onedrive_item_id"),
  mountName: text("mount_name").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export const webdavMountPoints = sqliteTable("webdav_mount_points", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  folderId: text("folder_id").notNull(),
  mountName: text("mount_name").notNull(),
  webdavUrl: text("webdav_url").notNull(),
  username: text("username").notNull(),
  passwordEncrypted: text("password_encrypted").notNull(),
  basePath: text("base_path").default("/"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export const smtpConfig = sqliteTable("smtp_config", {
  id: integer("id").primaryKey().default(1),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  host: text("host"),
  port: integer("port").default(465),
  user: text("user"),
  pass: text("pass"),
  secure: integer("secure", { mode: "boolean" }).notNull().default(true),
  emailTemplate: text("email_template"),
  updatedAt: integer("updated_at").notNull(),
})

// 谷歌OAuth配置表
export const googleOAuthConfig = sqliteTable("google_oauth_config", {
  id: integer("id").primaryKey().default(1),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  redirectUri: text("redirect_uri"), // 保留以便向后兼容，但逐步废弃
  updatedAt: integer("updated_at").notNull(),
})

// 谷歌OAuth回调链接表（支持多个域名）
export const googleOAuthRedirectUris = sqliteTable("google_oauth_redirect_uris", {
  id: text("id").primaryKey(),
  redirectUri: text("redirect_uri").notNull().unique(), // 回调链接URL
  name: text("name").notNull(), // 用户友好的名称（如"主域名"、"测试域名"）
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

// GitHub OAuth配置表
export const githubOAuthConfig = sqliteTable("github_oauth_config", {
  id: integer("id").primaryKey().default(1),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  updatedAt: integer("updated_at").notNull(),
})

// GitHub OAuth回调链接表（支持多个域名）
export const githubOAuthRedirectUris = sqliteTable("github_oauth_redirect_uris", {
  id: text("id").primaryKey(),
  redirectUri: text("redirect_uri").notNull().unique(), // 回调链接URL
  name: text("name").notNull(), // 用户友好的名称（如"主域名"、"测试域名"）
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

// Microsoft OAuth配置表
export const microsoftOAuthConfig = sqliteTable("microsoft_oauth_config", {
  id: integer("id").primaryKey().default(1),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  tenantId: text("tenant_id").default("common"), // 支持多租户：common、organizations、consumers 或具体租户ID
  updatedAt: integer("updated_at").notNull(),
})

// Microsoft OAuth回调链接表（支持多个域名）
export const microsoftOAuthRedirectUris = sqliteTable("microsoft_oauth_redirect_uris", {
  id: text("id").primaryKey(),
  redirectUri: text("redirect_uri").notNull().unique(), // 回调链接URL
  name: text("name").notNull(), // 用户友好的名称（如"主域名"、"测试域名"）
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

// 站点配置表（标题、描述等）
export const siteConfig = sqliteTable("site_config", {
  id: integer("id").primaryKey().default(1),
  title: text("title"),
  description: text("description"),
  allowUserRegistration: integer("allow_user_registration", { mode: "boolean" }).notNull().default(true), // 是否允许用户注册
  updatedAt: integer("updated_at").notNull(),
})

export const downloadTokens = sqliteTable("download_tokens", {
  id: text("id").primaryKey(),
  fileId: text("file_id").notNull(),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  used: integer("used", { mode: "boolean" }).notNull().default(false), // 保持兼容性，但将逐步废弃
  usageCount: integer("usage_count").notNull().default(0), // 新增：使用次数计数器
  maxUsage: integer("max_usage").notNull().default(2), // 新增：最大使用次数，默认2次
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
})

export const fileDirectLinks = sqliteTable("file_direct_links", {
  id: text("id").primaryKey(),
  fileId: text("file_id").notNull().unique(), // 一个文件只能有一个直链
  userId: text("user_id").notNull(),
  directName: text("direct_name").notNull().unique(), // 直链使用的文件名
  token: text("token").notNull().unique(), // 直链访问令牌
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  accessCount: integer("access_count").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  adminDisabled: integer("admin_disabled", { mode: "boolean" }).notNull().default(false),
})

// 直链访问日志表
export const directLinkAccessLogs = sqliteTable("direct_link_access_logs", {
  id: text("id").primaryKey(),
  directLinkId: text("direct_link_id").notNull(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  country: text("country"),
  province: text("province"),
  city: text("city"),
  isp: text("isp"),
  accessedAt: integer("accessed_at").notNull(),
})

// IP封禁表
export const ipBans = sqliteTable("ip_bans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(), // 执行封禁的用户ID
  directLinkId: text("direct_link_id"), // 关联的直链ID，如果为null则为全局封禁
  ipAddress: text("ip_address").notNull(),
  reason: text("reason"), // 封禁原因
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true), // 是否启用封禁
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export const fileShares = sqliteTable("file_shares", {
  id: text("id").primaryKey(),
  fileId: text("file_id").notNull(),
  userId: text("user_id").notNull(),
  shareToken: text("share_token").unique(), // 分享链接token，可选（取件码模式不需要）
  pickupCode: text("pickup_code"), // 取件码，可选
  requireLogin: integer("require_login", { mode: "boolean" }).notNull().default(false),
  gatekeeper: integer("gatekeeper", { mode: "boolean" }).notNull().default(false), // 守门模式：只显示文件详情，禁用下载
  // 守门模式自定义文件信息
  customFileName: text("custom_file_name"), // 自定义文件名
  customFileExtension: text("custom_file_extension"), // 自定义文件扩展名
  customFileSize: integer("custom_file_size"), // 自定义文件大小（字节）
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  accessCount: integer("access_count").notNull().default(0),
  expiresAt: integer("expires_at"), // 过期时间，可选
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  adminDisabled: integer("admin_disabled", { mode: "boolean" }).notNull().default(false),
})

// 用户存储配额表
export const userQuotas = sqliteTable("user_quotas", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  maxStorage: integer("max_storage").notNull(), // 最大存储容量（字节）
  usedStorage: integer("used_storage").notNull().default(0), // 已使用存储（字节）
  role: text("role").notNull().default("user"), // 用户角色（admin/user）
  customQuota: integer("custom_quota"), // 自定义配额（字节），如果设置则覆盖默认配额
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

// 角色默认配额配置表
export const roleQuotaConfig = sqliteTable("role_quota_config", {
  id: text("id").primaryKey(),
  role: text("role").notNull().unique(), // 角色名称（admin/user）
  defaultQuota: integer("default_quota").notNull(), // 默认配额（字节）
  description: text("description"), // 配额描述
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

// 存储策略表
export const storageStrategies = sqliteTable("storage_strategies", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(), // 策略名称
  type: text("type").notNull(), // 存储类型：local, r2, onedrive, webdav
  config: text("config").notNull(), // JSON格式的配置信息
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false), // 是否为活跃策略
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

// 用户存储策略分配表
export const userStorageAssignments = sqliteTable("user_storage_assignments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  strategyId: text("strategy_id").notNull().references(() => storageStrategies.id, { onDelete: "cascade" }),
  userFolder: text("user_folder").notNull(), // 用户在远程存储中的专属文件夹路径
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

// 角色默认存储策略表
export const roleStorageDefaults = sqliteTable("role_storage_defaults", {
  id: text("id").primaryKey(),
  role: text("role").notNull().unique(), // 角色名称（admin/user）
  strategyId: text("strategy_id").notNull().references(() => storageStrategies.id, { onDelete: "cascade" }),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})
