const Database = require('better-sqlite3');
const path = require('path');
const { nanoid } = require('nanoid');

// 数据库文件路径
const dbPath = path.join(__dirname, 'netdisk.db');
const db = new Database(dbPath);

try {
  console.log('=== 开始迁移挂载点到存储策略 ===');
  
  // 检查现有存储策略
  const existingStrategies = db.prepare("SELECT * FROM storage_strategies").all();
  console.log(`现有存储策略数量: ${existingStrategies.length}`);
  
  // 迁移OneDrive挂载点
  const onedriveMounts = db.prepare("SELECT * FROM onedrive_mount_points").all();
  console.log(`发现 ${onedriveMounts.length} 个OneDrive挂载点`);
  
  for (const mount of onedriveMounts) {
    const strategyName = `OneDrive - ${mount.display_name || mount.mount_name}`;
    
    // 检查是否已存在同名策略
    const existingStrategy = db.prepare("SELECT * FROM storage_strategies WHERE name = ?").get(strategyName);
    if (existingStrategy) {
      console.log(`跳过已存在的策略: ${strategyName}`);
      continue;
    }
    
    const config = {
      oneDriveClientId: mount.client_id,
      oneDriveTenantId: mount.tenant_id,
      oneDriveClientSecret: mount.client_secret,
      // 如果有WebDAV配置也包含进来
      webDavUrl: mount.webdav_url || '',
      webDavUser: mount.webdav_user || '',
      webDavPass: mount.webdav_pass || ''
    };
    
    const strategyId = nanoid();
    const now = Date.now();
    
    db.prepare(`
      INSERT INTO storage_strategies (id, name, type, config, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      strategyId,
      strategyName,
      'onedrive',
      JSON.stringify(config),
      mount.is_active ? 1 : 0,
      now,
      now
    );
    
    console.log(`✅ 创建OneDrive存储策略: ${strategyName}`);
  }
  
  // 迁移R2挂载点
  const r2Mounts = db.prepare("SELECT * FROM r2_mount_points").all();
  console.log(`发现 ${r2Mounts.length} 个R2挂载点`);
  
  for (const mount of r2Mounts) {
    const strategyName = `R2 - ${mount.display_name || mount.bucket_name}`;
    
    // 检查是否已存在同名策略
    const existingStrategy = db.prepare("SELECT * FROM storage_strategies WHERE name = ?").get(strategyName);
    if (existingStrategy) {
      console.log(`跳过已存在的策略: ${strategyName}`);
      continue;
    }
    
    const config = {
      r2Endpoint: mount.endpoint,
      r2Bucket: mount.bucket_name,
      r2AccessKey: mount.access_key,
      r2SecretKey: mount.secret_key
    };
    
    const strategyId = nanoid();
    const now = Date.now();
    
    db.prepare(`
      INSERT INTO storage_strategies (id, name, type, config, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      strategyId,
      strategyName,
      'r2',
      JSON.stringify(config),
      mount.is_active ? 1 : 0,
      now,
      now
    );
    
    console.log(`✅ 创建R2存储策略: ${strategyName}`);
  }
  
  // 迁移WebDAV挂载点
  const webdavMounts = db.prepare("SELECT * FROM webdav_mount_points").all();
  console.log(`发现 ${webdavMounts.length} 个WebDAV挂载点`);
  
  for (const mount of webdavMounts) {
    const strategyName = `WebDAV - ${mount.display_name || mount.mount_name}`;
    
    // 检查是否已存在同名策略
    const existingStrategy = db.prepare("SELECT * FROM storage_strategies WHERE name = ?").get(strategyName);
    if (existingStrategy) {
      console.log(`跳过已存在的策略: ${strategyName}`);
      continue;
    }
    
    const config = {
      webDavUrl: mount.webdav_url,
      webDavUser: mount.webdav_user,
      webDavPass: mount.webdav_pass
    };
    
    const strategyId = nanoid();
    const now = Date.now();
    
    db.prepare(`
      INSERT INTO storage_strategies (id, name, type, config, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      strategyId,
      strategyName,
      'webdav',
      JSON.stringify(config),
      mount.is_active ? 1 : 0,
      now,
      now
    );
    
    console.log(`✅ 创建WebDAV存储策略: ${strategyName}`);
  }
  
  // 显示迁移后的结果
  const finalStrategies = db.prepare("SELECT * FROM storage_strategies").all();
  console.log(`\n=== 迁移完成 ===`);
  console.log(`总存储策略数量: ${finalStrategies.length}`);
  
  finalStrategies.forEach(strategy => {
    console.log(`- ${strategy.name} (${strategy.type}) - 激活: ${strategy.is_active ? '是' : '否'}`);
  });
  
} catch (error) {
  console.error('迁移失败:', error);
} finally {
  db.close();
}