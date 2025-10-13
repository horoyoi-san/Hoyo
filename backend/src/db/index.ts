import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"
import * as schema from "./schema"
import { logger } from "../utils/logger"
import { generateAdminPassword } from "../utils/password"

const sqlite = new Database(process.env.DATABASE_URL || "./netdisk.db")
export const db = drizzle(sqlite, { schema })

// Initialize database with auto-migration
async function initializeDatabase() {
  try {
    logger.startup('🔧 开始初始化数据库...')

    // 创建基础表
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        parent_id TEXT,
        path TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES folders (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        folder_id TEXT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        storage_type TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS storage_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        storage_type TEXT NOT NULL DEFAULT 'local',
        r2_endpoint TEXT,
        r2_access_key TEXT,
        r2_secret_key TEXT,
        r2_bucket TEXT,
        onedrive_client_id TEXT,
        onedrive_client_secret TEXT,
        onedrive_tenant_id TEXT,
        onedrive_webdav_url TEXT,
        onedrive_webdav_user TEXT,
        onedrive_webdav_pass TEXT,
        enable_mixed_mode INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS site_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        title TEXT,
        description TEXT,
        allow_user_registration INTEGER NOT NULL DEFAULT 1,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS storage_strategies (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        config TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS r2_mount_points (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        folder_id TEXT NOT NULL,
        r2_path TEXT NOT NULL,
        mount_name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS onedrive_auth (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        scope TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS onedrive_mount_points (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        folder_id TEXT NOT NULL,
        onedrive_path TEXT NOT NULL,
        onedrive_item_id TEXT,
        mount_name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS webdav_mount_points (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        folder_id TEXT NOT NULL,
        mount_name TEXT NOT NULL,
        webdav_url TEXT NOT NULL,
        username TEXT NOT NULL,
        password_encrypted TEXT NOT NULL,
        base_path TEXT DEFAULT '/',
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS email_verification_codes (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS smtp_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        enabled INTEGER DEFAULT 0,
        host TEXT,
        port INTEGER DEFAULT 465,
        user TEXT,
        pass TEXT,
        secure INTEGER DEFAULT 1,
        email_template TEXT,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS download_tokens (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        usage_count INTEGER NOT NULL DEFAULT 0,
        max_usage INTEGER NOT NULL DEFAULT 2,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS file_direct_links (
        id TEXT PRIMARY KEY,
        file_id TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        direct_name TEXT UNIQUE NOT NULL,
        token TEXT UNIQUE NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        admin_disabled INTEGER NOT NULL DEFAULT 0,
        access_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS direct_link_access_logs (
        id TEXT PRIMARY KEY,
        direct_link_id TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT,
        country TEXT,
        province TEXT,
        city TEXT,
        isp TEXT,
        accessed_at INTEGER NOT NULL,
        FOREIGN KEY (direct_link_id) REFERENCES file_direct_links (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS ip_bans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        direct_link_id TEXT,
        ip_address TEXT NOT NULL,
        reason TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (direct_link_id) REFERENCES file_direct_links (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS file_shares (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        share_token TEXT UNIQUE,
        pickup_code TEXT,
        require_login INTEGER NOT NULL DEFAULT 0,
        gatekeeper INTEGER NOT NULL DEFAULT 0,
        custom_file_name TEXT,
        custom_file_extension TEXT,
        custom_file_size INTEGER,
        enabled INTEGER NOT NULL DEFAULT 1,
        admin_disabled INTEGER NOT NULL DEFAULT 0,
        access_count INTEGER NOT NULL DEFAULT 0,
        expires_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_quotas (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        max_storage INTEGER NOT NULL,
        used_storage INTEGER NOT NULL DEFAULT 0,
        role TEXT NOT NULL DEFAULT 'user',
        custom_quota INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS role_quota_config (
        id TEXT PRIMARY KEY,
        role TEXT UNIQUE NOT NULL,
        default_quota INTEGER NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `)

    // 新增：创建 google_oauth_config、google_oauth_redirect_uris、user_storage_assignments、role_storage_defaults 及索引
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS google_oauth_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        enabled INTEGER NOT NULL DEFAULT 0,
        client_id TEXT,
        client_secret TEXT,
        redirect_uri TEXT,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS google_oauth_redirect_uris (
        id TEXT PRIMARY KEY,
        redirect_uri TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS github_oauth_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        enabled INTEGER NOT NULL DEFAULT 0,
        client_id TEXT,
        client_secret TEXT,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS github_oauth_redirect_uris (
        id TEXT PRIMARY KEY,
        redirect_uri TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS microsoft_oauth_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        enabled INTEGER NOT NULL DEFAULT 0,
        client_id TEXT,
        client_secret TEXT,
        tenant_id TEXT DEFAULT 'common',
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS microsoft_oauth_redirect_uris (
        id TEXT PRIMARY KEY,
        redirect_uri TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_storage_assignments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        strategy_id TEXT NOT NULL REFERENCES storage_strategies(id) ON DELETE CASCADE,
        user_folder TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS role_storage_defaults (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL UNIQUE,
        strategy_id TEXT NOT NULL REFERENCES storage_strategies(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `)

    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_storage_assignments_user_id ON user_storage_assignments(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_storage_assignments_strategy_id ON user_storage_assignments(strategy_id);
      CREATE INDEX IF NOT EXISTS idx_role_storage_defaults_role ON role_storage_defaults(role);
      CREATE INDEX IF NOT EXISTS idx_microsoft_oauth_redirect_uris_enabled ON microsoft_oauth_redirect_uris(enabled);
      CREATE INDEX IF NOT EXISTS idx_microsoft_oauth_redirect_uris_redirect_uri ON microsoft_oauth_redirect_uris(redirect_uri);
    `)

    // 检查并添加 email_verified 字段
    const userColumns = sqlite.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>
    const hasEmailVerified = userColumns.some(col => col.name === 'email_verified')

    if (!hasEmailVerified) {
      logger.dbInfo('添加 email_verified 字段到 users 表...')
      sqlite.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0')
      logger.database('ALTER', 'users')
      logger.dbInfo('email_verified 字段添加成功')
    }

    // 检查并添加 folder_id 字段到 files 表
    const fileColumns = sqlite.prepare("PRAGMA table_info(files)").all() as Array<{ name: string }>
    const hasFolderId = fileColumns.some(col => col.name === 'folder_id')

    if (!hasFolderId) {
      logger.dbInfo('添加 folder_id 字段到 files 表...')
      sqlite.exec('ALTER TABLE files ADD COLUMN folder_id TEXT')
      logger.database('ALTER', 'files')
      logger.dbInfo('folder_id 字段添加成功')
    }

    // 检查并添加 enable_mixed_mode 字段到 storage_config 表
    const storageConfigColumns = sqlite.prepare("PRAGMA table_info(storage_config)").all() as Array<{ name: string }>
    const hasEnableMixedMode = storageConfigColumns.some(col => col.name === 'enable_mixed_mode')

    if (!hasEnableMixedMode) {
      logger.dbInfo('添加 enable_mixed_mode 字段到 storage_config 表...')
      sqlite.exec('ALTER TABLE storage_config ADD COLUMN enable_mixed_mode INTEGER NOT NULL DEFAULT 0')
      logger.database('ALTER', 'storage_config')
      logger.dbInfo('enable_mixed_mode 字段添加成功')
    }

    // 检查并添加 OneDrive 相关字段到 storage_config 表
    const hasOneDriveClientId = storageConfigColumns.some(col => col.name === 'onedrive_client_id')
    const hasOneDriveClientSecret = storageConfigColumns.some(col => col.name === 'onedrive_client_secret')
    const hasOneDriveTenantId = storageConfigColumns.some(col => col.name === 'onedrive_tenant_id')
    const hasOneDriveWebDavUrl = storageConfigColumns.some(col => col.name === 'onedrive_webdav_url')
    const hasOneDriveWebDavUser = storageConfigColumns.some(col => col.name === 'onedrive_webdav_user')
    const hasOneDriveWebDavPass = storageConfigColumns.some(col => col.name === 'onedrive_webdav_pass')

    if (!hasOneDriveClientId) {
      logger.dbInfo('添加 onedrive_client_id 字段到 storage_config 表...')
      sqlite.exec('ALTER TABLE storage_config ADD COLUMN onedrive_client_id TEXT')
      logger.database('ALTER', 'storage_config')
      logger.dbInfo('onedrive_client_id 字段添加成功')
    }

    if (!hasOneDriveClientSecret) {
      logger.dbInfo('添加 onedrive_client_secret 字段到 storage_config 表...')
      sqlite.exec('ALTER TABLE storage_config ADD COLUMN onedrive_client_secret TEXT')
      logger.database('ALTER', 'storage_config')
      logger.dbInfo('onedrive_client_secret 字段添加成功')
    }

    if (!hasOneDriveTenantId) {
      logger.dbInfo('添加 onedrive_tenant_id 字段到 storage_config 表...')
      sqlite.exec('ALTER TABLE storage_config ADD COLUMN onedrive_tenant_id TEXT')
      logger.database('ALTER', 'storage_config')
      logger.dbInfo('onedrive_tenant_id 字段添加成功')
    }

    if (!hasOneDriveWebDavUrl) {
      logger.dbInfo('添加 onedrive_webdav_url 字段到 storage_config 表...')
      sqlite.exec('ALTER TABLE storage_config ADD COLUMN onedrive_webdav_url TEXT')
      logger.database('ALTER', 'storage_config')
      logger.dbInfo('onedrive_webdav_url 字段添加成功')
    }

    if (!hasOneDriveWebDavUser) {
      logger.dbInfo('添加 onedrive_webdav_user 字段到 storage_config 表...')
      sqlite.exec('ALTER TABLE storage_config ADD COLUMN onedrive_webdav_user TEXT')
      logger.database('ALTER', 'storage_config')
      logger.dbInfo('onedrive_webdav_user 字段添加成功')
    }

    if (!hasOneDriveWebDavPass) {
      logger.dbInfo('添加 onedrive_webdav_pass 字段到 storage_config 表...')
      sqlite.exec('ALTER TABLE storage_config ADD COLUMN onedrive_webdav_pass TEXT')
      logger.database('ALTER', 'storage_config')
      logger.dbInfo('onedrive_webdav_pass 字段添加成功')
    }

    // 检查并补齐 file_direct_links 缺失字段（兼容旧库）
    try {
      const directLinkColumns = sqlite.prepare("PRAGMA table_info(file_direct_links)").all() as Array<{ name: string }>
      const hasAdminDisabledDL = directLinkColumns.some(col => col.name === 'admin_disabled')
      if (!hasAdminDisabledDL) {
        logger.dbInfo('添加 admin_disabled 字段到 file_direct_links 表...')
        sqlite.exec('ALTER TABLE file_direct_links ADD COLUMN admin_disabled INTEGER NOT NULL DEFAULT 0')
        logger.database('ALTER', 'file_direct_links')
        logger.dbInfo('admin_disabled 字段添加成功 (file_direct_links)')
      }
    } catch (e) {
      // 表不存在会在前面的 CREATE IF NOT EXISTS 创建，这里忽略
    }

    // 检查并补齐 file_shares 缺失字段（兼容旧库）
    try {
      const shareColumns = sqlite.prepare("PRAGMA table_info(file_shares)").all() as Array<{ name: string }>
      const ensureShareColumn = (col: string, ddl: string) => {
        if (!shareColumns.some(c => c.name === col)) {
          logger.dbInfo(`添加 ${col} 字段到 file_shares 表...`)
          sqlite.exec(`ALTER TABLE file_shares ADD COLUMN ${ddl}`)
          logger.database('ALTER', 'file_shares')
          logger.dbInfo(`${col} 字段添加成功 (file_shares)`)
        }
      }
      ensureShareColumn('require_login', 'require_login INTEGER NOT NULL DEFAULT 0')
      ensureShareColumn('gatekeeper', 'gatekeeper INTEGER NOT NULL DEFAULT 0')
      ensureShareColumn('custom_file_name', 'custom_file_name TEXT')
      ensureShareColumn('custom_file_extension', 'custom_file_extension TEXT')
      ensureShareColumn('custom_file_size', 'custom_file_size INTEGER')
      ensureShareColumn('expires_at', 'expires_at INTEGER')
      ensureShareColumn('admin_disabled', 'admin_disabled INTEGER NOT NULL DEFAULT 0')
    } catch (e) {
      // 忽略，表会被前面的 CREATE 创建
    }

    // 检查并补齐 download_tokens 缺失计数字段（兼容旧库）
    try {
      const dlColumns = sqlite.prepare("PRAGMA table_info(download_tokens)").all() as Array<{ name: string }>
      const hasUsageCount = dlColumns.some(col => col.name === 'usage_count')
      const hasMaxUsage = dlColumns.some(col => col.name === 'max_usage')
      if (!hasUsageCount) {
        logger.dbInfo('添加 usage_count 字段到 download_tokens 表...')
        sqlite.exec('ALTER TABLE download_tokens ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 0')
        logger.database('ALTER', 'download_tokens')
        logger.dbInfo('usage_count 字段添加成功 (download_tokens)')
      }
      if (!hasMaxUsage) {
        logger.dbInfo('添加 max_usage 字段到 download_tokens 表...')
        sqlite.exec('ALTER TABLE download_tokens ADD COLUMN max_usage INTEGER NOT NULL DEFAULT 2')
        logger.database('ALTER', 'download_tokens')
        logger.dbInfo('max_usage 字段添加成功 (download_tokens)')
      }
    } catch (e) {
      // 忽略
    }

    // 检查并添加 allow_user_registration 字段到 site_config 表
    try {
      const siteConfigColumns = sqlite.prepare("PRAGMA table_info(site_config)").all() as Array<{ name: string }>
      const hasAllowUserRegistration = siteConfigColumns.some(col => col.name === 'allow_user_registration')
      
      if (!hasAllowUserRegistration) {
        logger.dbInfo('添加 allow_user_registration 字段到 site_config 表...')
        sqlite.exec('ALTER TABLE site_config ADD COLUMN allow_user_registration INTEGER NOT NULL DEFAULT 1')
        logger.database('ALTER', 'site_config')
        logger.dbInfo('allow_user_registration 字段添加成功 (site_config) - 默认允许用户注册')
      }
    } catch (e) {
      // 忽略
    }

    // 迁移现有的Google OAuth redirect_uri到新表
    await migrateGoogleOAuthRedirectUris()

    // 插入默认数据
    sqlite.exec(`
      INSERT OR IGNORE INTO storage_config (storage_type, updated_at)
      VALUES ('local', ${Date.now()});
    `)

    // 初始化默认记录
    const now = Date.now()
    sqlite.exec(`
      INSERT OR IGNORE INTO smtp_config (id, enabled, host, port, user, pass, secure, email_template, updated_at)
      VALUES (1, 0, '', 465, '', '', 1, '', ${now});

      INSERT OR IGNORE INTO storage_config (id, storage_type, enable_mixed_mode, updated_at)
      VALUES (1, 'local', 0, ${now});

      INSERT OR IGNORE INTO site_config (id, title, description, allow_user_registration, updated_at)
      VALUES (1, 'FireflyCloud', '云存储', 1, ${now});
    `)

    // 新增：插入 OAuth 配置默认数据
    sqlite.exec(`
      INSERT OR IGNORE INTO google_oauth_config (id, enabled, updated_at)
      VALUES (1, 0, ${Date.now()});
      
      INSERT OR IGNORE INTO github_oauth_config (id, enabled, updated_at)
      VALUES (1, 0, ${Date.now()});
      
      INSERT OR IGNORE INTO microsoft_oauth_config (id, enabled, tenant_id, updated_at)
      VALUES (1, 0, 'common', ${Date.now()});
    `)

    // 初始化存储策略系统
    await initializeStorageStrategies()

    // 新增：将挂载点幂等迁移为存储策略
    await migrateMountsToStrategies()

    // 初始化管理员账户
    await initializeAdminAccount()

    // 初始化 SMTP 配置
    const smtpConfigExists = sqlite.prepare("SELECT COUNT(*) as count FROM smtp_config WHERE id = 1").get() as { count: number }
    if (smtpConfigExists.count === 0) {
      // 检查环境变量中是否有 SMTP 配置（可选）
      const hasEnvConfig = process.env.SMTP_HOST && process.env.SMTP_PORT &&
                          process.env.SMTP_USER && process.env.SMTP_PASS

      if (hasEnvConfig) {
        // 从环境变量初始化配置（兼容旧版本）
        sqlite.exec(`
          INSERT INTO smtp_config (id, enabled, host, port, user, pass, secure, updated_at)
          VALUES (1, 1, '${process.env.SMTP_HOST}', ${parseInt(process.env.SMTP_PORT || "465")},
                  '${process.env.SMTP_USER}', '${process.env.SMTP_PASS}', 1, ${Date.now()})
        `)
        logger.database('INSERT', 'smtp_config')
        logger.dbInfo('已从环境变量初始化 SMTP 配置（建议在管理面板中管理）')
      } else {
        // 创建默认的禁用配置
        sqlite.exec(`
          INSERT INTO smtp_config (id, enabled, host, port, user, pass, secure, updated_at)
          VALUES (1, 0, '', 465, '', '', 1, ${Date.now()})
        `)
        logger.database('INSERT', 'smtp_config')
        logger.dbInfo('已创建默认 SMTP 配置（禁用状态），请在管理面板中配置')
      }
    }

    // 初始化用户配额系统
    await initializeQuotaSystem()

    // 验证所有表是否正确创建
    await validateDatabaseTables()

    logger.startup('数据库初始化完成')
  } catch (error) {
    logger.error('数据库初始化失败:', error)
    throw error
  }
}

// 迁移Google OAuth redirect URIs
async function migrateGoogleOAuthRedirectUris() {
  try {
    logger.info('🔧 迁移Google OAuth回调链接到新表（幂等）...')

    const { nanoid } = await import('nanoid')
    const now = Date.now()

    // 检查是否已有redirect URIs在新表中
    const existingRedirectUris = sqlite.prepare("SELECT COUNT(*) as count FROM google_oauth_redirect_uris").get() as { count: number }

    if (existingRedirectUris.count === 0) {
      // 从旧的google_oauth_config表中获取redirect_uri
      const googleOAuthConfig = sqlite.prepare("SELECT redirect_uri FROM google_oauth_config WHERE redirect_uri IS NOT NULL AND redirect_uri != ''").get() as { redirect_uri?: string } | undefined

      if (googleOAuthConfig?.redirect_uri) {
        logger.dbInfo(`迁移现有回调链接: ${googleOAuthConfig.redirect_uri}`)
        
        // 插入到新表中
        const id = nanoid()
        sqlite.exec(`
          INSERT INTO google_oauth_redirect_uris (id, redirect_uri, name, enabled, created_at, updated_at)
          VALUES ('${id}', '${googleOAuthConfig.redirect_uri}', '默认回调链接', 1, ${now}, ${now})
        `)
        
        logger.database('INSERT', 'google_oauth_redirect_uris')
        logger.dbInfo('✅ 成功迁移现有回调链接到新表')
      } else {
        logger.dbInfo('未找到现有回调链接，跳过迁移')
      }
    } else {
      logger.dbInfo('新表中已有回调链接，跳过迁移')
    }

    logger.dbInfo('Google OAuth回调链接迁移完成（幂等）')
  } catch (error) {
    logger.error('迁移Google OAuth回调链接失败:', error)
  }
}

// 初始化存储策略系统
async function initializeStorageStrategies() {
  try {
    logger.info('🔧 初始化存储策略系统...')

    // 检查是否已有存储策略
    const existingStrategies = sqlite.prepare("SELECT COUNT(*) as count FROM storage_strategies").get() as { count: number }

    if (existingStrategies.count === 0) {
      logger.dbInfo('创建默认本地存储策略...')
      
      const { nanoid } = await import('nanoid')
      const strategyId = nanoid()
      const now = Date.now()

      sqlite.exec(`
        INSERT INTO storage_strategies (id, name, type, config, is_active, created_at, updated_at)
        VALUES ('${strategyId}', '默认本地存储', 'local', '{}', 1, ${now}, ${now})
      `)
      
      logger.database('INSERT', 'storage_strategies')
      logger.dbInfo('✅ 默认本地存储策略创建成功')
    } else {
      logger.dbInfo('存储策略已存在，跳过初始化')
    }

    logger.dbInfo('存储策略系统初始化完成')
  } catch (error) {
    logger.error('存储策略系统初始化失败:', error)
    throw error
  }
}

// 新增：挂载点到存储策略的幂等迁移
async function migrateMountsToStrategies() {
  try {
    logger.info('🔧 迁移挂载点到存储策略（幂等）...')

    const { nanoid } = await import('nanoid')
    const now = Date.now()

    const storageCfg = sqlite.prepare("SELECT * FROM storage_config LIMIT 1").get() as any

    // OneDrive 挂载点
    const odMounts = sqlite.prepare("SELECT * FROM onedrive_mount_points WHERE enabled = 1").all() as Array<any>
    for (const mount of odMounts) {
      const strategyName = `OneDrive - ${mount.mount_name}`
      const exists = sqlite.prepare("SELECT 1 FROM storage_strategies WHERE name = ?").get(strategyName) as any
      if (exists) continue

      const config = {
        oneDriveClientId: storageCfg?.onedrive_client_id || '',
        oneDriveTenantId: storageCfg?.onedrive_tenant_id || '',
        oneDriveClientSecret: storageCfg?.onedrive_client_secret || '',
        webDavUrl: storageCfg?.onedrive_webdav_url || '',
        webDavUser: storageCfg?.onedrive_webdav_user || '',
        webDavPass: storageCfg?.onedrive_webdav_pass || ''
      }

      const id = nanoid()
      sqlite.exec(`
        INSERT INTO storage_strategies (id, name, type, config, is_active, created_at, updated_at)
        VALUES ('${id}', '${strategyName}', 'onedrive', '${JSON.stringify(config)}', ${storageCfg?.storage_type === 'onedrive' ? 1 : 0}, ${now}, ${now})
      `)
      logger.database('INSERT', 'storage_strategies')
      logger.dbInfo(`✅ 创建OneDrive存储策略: ${strategyName}`)
    }

    // R2 挂载点
    const r2Mounts = sqlite.prepare("SELECT * FROM r2_mount_points WHERE enabled = 1").all() as Array<any>
    for (const mount of r2Mounts) {
      const strategyName = `R2 - ${mount.mount_name}`
      const exists = sqlite.prepare("SELECT 1 FROM storage_strategies WHERE name = ?").get(strategyName) as any
      if (exists) continue

      const config = {
        r2Endpoint: storageCfg?.r2_endpoint || '',
        r2Bucket: storageCfg?.r2_bucket || '',
        r2AccessKey: storageCfg?.r2_access_key || '',
        r2SecretKey: storageCfg?.r2_secret_key || ''
      }

      const id = nanoid()
      sqlite.exec(`
        INSERT INTO storage_strategies (id, name, type, config, is_active, created_at, updated_at)
        VALUES ('${id}', '${strategyName}', 'r2', '${JSON.stringify(config)}', ${storageCfg?.storage_type === 'r2' ? 1 : 0}, ${now}, ${now})
      `)
      logger.database('INSERT', 'storage_strategies')
      logger.dbInfo(`✅ 创建R2存储策略: ${strategyName}`)
    }

    // WebDAV 挂载点
    try {
      const wdMounts = sqlite.prepare("SELECT * FROM webdav_mount_points WHERE enabled = 1").all() as Array<any>
      for (const mount of wdMounts) {
        const strategyName = `WebDAV - ${mount.mount_name}`
        const exists = sqlite.prepare("SELECT 1 FROM storage_strategies WHERE name = ?").get(strategyName) as any
        if (exists) continue

        const config = {
          webDavUrl: mount.webdav_url || '',
          webDavUser: mount.username || '',
          webDavPass: mount.password_encrypted || ''
        }

        const id = nanoid()
        sqlite.exec(`
          INSERT INTO storage_strategies (id, name, type, config, is_active, created_at, updated_at)
          VALUES ('${id}', '${strategyName}', 'webdav', '${JSON.stringify(config)}', ${storageCfg?.storage_type === 'webdav' ? 1 : 0}, ${now}, ${now})
        `)
        logger.database('INSERT', 'storage_strategies')
        logger.dbInfo(`✅ 创建WebDAV存储策略: ${strategyName}`)
      }
    } catch (_) {
      // webdav_mount_points 表可能不存在，忽略
    }

    logger.dbInfo('挂载点迁移为策略完成（幂等）')
  } catch (error) {
    logger.error('迁移挂载点为策略失败:', error)
  }
}

// 初始化用户配额系统
async function initializeQuotaSystem() {
  try {
    logger.info('🔧 初始化用户配额系统...')

    // 初始化角色默认配额配置
    const adminQuotaExists = sqlite.prepare("SELECT COUNT(*) as count FROM role_quota_config WHERE role = 'admin'").get() as { count: number }
    const userQuotaExists = sqlite.prepare("SELECT COUNT(*) as count FROM role_quota_config WHERE role = 'user'").get() as { count: number }

    if (adminQuotaExists.count === 0) {
      const adminQuotaId = `quota_admin_${Date.now()}`
      sqlite.exec(`
        INSERT INTO role_quota_config (id, role, default_quota, description, created_at, updated_at)
        VALUES ('${adminQuotaId}', 'admin', ${10 * 1024 * 1024 * 1024}, '管理员默认配额：10GB', ${Date.now()}, ${Date.now()})
      `)
      logger.database('INSERT', 'role_quota_config')
      logger.dbInfo('已创建管理员默认配额配置：10GB')
    }

    if (userQuotaExists.count === 0) {
      const userQuotaId = `quota_user_${Date.now()}`
      sqlite.exec(`
        INSERT INTO role_quota_config (id, role, default_quota, description, created_at, updated_at)
        VALUES ('${userQuotaId}', 'user', ${1 * 1024 * 1024 * 1024}, '普通用户默认配额：1GB', ${Date.now()}, ${Date.now()})
      `)
      logger.database('INSERT', 'role_quota_config')
      logger.dbInfo('已创建普通用户默认配额配置：1GB')
    }

    // 为现有用户创建配额记录
    const usersWithoutQuota = sqlite.prepare(`
      SELECT u.id, u.role
      FROM users u
      LEFT JOIN user_quotas uq ON u.id = uq.user_id
      WHERE uq.user_id IS NULL
    `).all() as Array<{ id: string; role: string }>

    for (const user of usersWithoutQuota) {
      const quotaConfig = sqlite.prepare("SELECT default_quota FROM role_quota_config WHERE role = ?").get(user.role) as { default_quota: number } | undefined
      const defaultQuota = quotaConfig ? quotaConfig.default_quota : (user.role === 'admin' ? 10 * 1024 * 1024 * 1024 : 1 * 1024 * 1024 * 1024)

      // 计算用户当前使用量（包括本地存储和R2存储）
      const userFiles = sqlite.prepare("SELECT COALESCE(SUM(size), 0) as total_size FROM files WHERE user_id = ?").get(user.id) as { total_size: number }
      const totalUsedStorage = userFiles ? userFiles.total_size : 0

      // 分别统计本地存储和R2存储（用于日志）
      const localFiles = sqlite.prepare("SELECT COALESCE(SUM(size), 0) as local_size FROM files WHERE user_id = ? AND storage_type = 'local'").get(user.id) as { local_size: number }
      const r2Files = sqlite.prepare("SELECT COALESCE(SUM(size), 0) as r2_size FROM files WHERE user_id = ? AND storage_type = 'r2'").get(user.id) as { r2_size: number }
      const localStorage = localFiles ? localFiles.local_size : 0
      const r2Storage = r2Files ? r2Files.r2_size : 0

      const quotaId = `quota_${user.id}_${Date.now()}`
      sqlite.exec(`
        INSERT INTO user_quotas (id, user_id, max_storage, used_storage, role, created_at, updated_at)
        VALUES ('${quotaId}', '${user.id}', ${defaultQuota}, ${totalUsedStorage}, '${user.role}', ${Date.now()}, ${Date.now()})
      `)
      logger.database('INSERT', 'user_quotas')
      logger.dbInfo(`已为用户 ${user.id} (${user.role}) 创建配额记录：${Math.round(defaultQuota / 1024 / 1024 / 1024)}GB，已使用：${Math.round(totalUsedStorage / 1024 / 1024)}MB (本地: ${Math.round(localStorage / 1024 / 1024)}MB, R2: ${Math.round(r2Storage / 1024 / 1024)}MB)`) 
    }

    logger.dbInfo('用户配额系统初始化完成')
  } catch (error) {
    logger.error('用户配额系统初始化失败:', error)
    throw error
  }
}

// 验证数据库表是否正确创建
async function validateDatabaseTables() {
  try {
    logger.dbInfo('🔍 验证数据库表结构...')

    // 定义所有应该存在的表
    const requiredTables = [
      'users',
      'folders',
      'files',
      'storage_config',
      'storage_strategies',
      'r2_mount_points',
      'onedrive_auth',
      'onedrive_mount_points',
      'webdav_mount_points',
      'email_verification_codes',
      'smtp_config',
      'download_tokens',
      'file_direct_links',
      'direct_link_access_logs',
      'ip_bans',
      'file_shares',
      'user_quotas',
      'role_quota_config',
      // OAuth 配置表
      'google_oauth_config',
      'google_oauth_redirect_uris',
      'github_oauth_config', 
      'github_oauth_redirect_uris',
      'microsoft_oauth_config',
      'microsoft_oauth_redirect_uris',
      // 存储策略表
      'user_storage_assignments',
      'role_storage_defaults'
    ]

    // 获取数据库中实际存在的表
    const existingTables = sqlite.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all().map((row: any) => row.name)

    // 检查缺失的表
    const missingTables = requiredTables.filter(table => !existingTables.includes(table))

    if (missingTables.length > 0) {
      logger.error(`❌ 缺失的数据库表: ${missingTables.join(', ')}`)
      throw new Error(`数据库表不完整，缺失: ${missingTables.join(', ')}`)
    }

    // 检查额外的表（可能是旧版本遗留）
    const extraTables = existingTables.filter(table => !requiredTables.includes(table))
    if (extraTables.length > 0) {
      logger.dbInfo(`ℹ️ 发现额外的表（可能是旧版本遗留）: ${extraTables.join(', ')}`)
    }

    logger.dbInfo(`✅ 数据库表验证通过，共 ${requiredTables.length} 个表`)

    // 记录每个表的记录数
    for (const table of requiredTables) {
      try {
        const count = sqlite.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number }
        logger.debug(`  ${table}: ${count.count} 条记录`)
      } catch (error: any) {
        logger.warn(`  ${table}: 无法获取记录数 - ${error.message}`)
      }
    }

  } catch (error) {
    logger.error('数据库表验证失败:', error)
    throw error
  }
}

// 初始化管理员账户
async function initializeAdminAccount() {
  try {
    logger.info('🔧 初始化管理员账户...')

    // 检查管理员账户是否已存在
    const adminExists = sqlite.prepare("SELECT COUNT(*) as count FROM users WHERE id = 'admin'").get() as { count: number }

    if (adminExists.count === 0) {
      // 生成随机密码
      const { plainPassword, hashedPassword } = await generateAdminPassword()

      // 创建管理员账户
      sqlite.exec(`
        INSERT INTO users (id, email, password, role, email_verified, created_at, updated_at)
        VALUES ('admin', 'admin@cialloo.site', '${hashedPassword}', 'admin', 1, ${Date.now()}, ${Date.now()})
      `)

      logger.database('INSERT', 'users')
      logger.dbInfo('✅ สร้างบัญชีผู้ดูแลระบบสำเร็จแล้ว')

      // 在控制台显示登录信息
      console.log('\n' + '='.repeat(80))
      console.log('🔐 ข้อมูลบัญชีผู้ดูแลระบบ')
      console.log('='.repeat(80))
      console.log(`📧 เข้าสู่ระบบอีเมล์ของคุณ: admin@cialloo.site`)
      console.log(`🔑 รหัสผ่านในการเข้าสู่ระบบ: ${plainPassword}`)
      console.log('='.repeat(80))
      console.log('⚠️  โปรดเก็บรักษารหัสผ่านข้างต้นให้ปลอดภัย ขอแนะนำให้เปลี่ยนรหัสผ่านในแผงควบคุมการจัดการหลังจากเข้าสู่ระบบครั้งแรก')
      console.log('='.repeat(80) + '\n')

    } else {
      logger.dbInfo('บัญชีผู้ดูแลระบบมีอยู่แล้ว ข้ามการสร้างได้เลย')
    }
  } catch (error) {
    logger.error('การเริ่มต้นบัญชีผู้ดูแลระบบล้มเหลว:', error)
    throw error
  }
}

// 执行初始化
initializeDatabase().catch(error => {
  logger.error('การเริ่มต้นฐานข้อมูลล้มเหลว:', error)
  process.exit(1)
})

export { sqlite }