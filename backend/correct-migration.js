const Database = require('better-sqlite3');
const path = require('path');
const { nanoid } = require('nanoid');

// 数据库文件路径
const dbPath = path.join(__dirname, 'netdisk.db');
const db = new Database(dbPath);

try {
  console.log('=== 正确的存储策略迁移 ===');
  
  // 先清除之前错误的迁移数据（保留默认本地存储）
  db.prepare("DELETE FROM storage_strategies WHERE name != '默认本地存储'").run();
  console.log('清除之前的错误迁移数据');
  
  // 获取存储配置信息
  const storageConfig = db.prepare("SELECT * FROM storage_config").get();
  console.log('当前存储配置:', storageConfig?.storage_type);
  
  // 获取OneDrive认证信息
  let oneDriveAuth = null;
  try {
    oneDriveAuth = db.prepare("SELECT * FROM onedrive_auth LIMIT 1").get();
  } catch (error) {
    console.log('OneDrive认证表不存在');
  }
  
  // 迁移OneDrive挂载点
  const onedriveMounts = db.prepare("SELECT * FROM onedrive_mount_points WHERE enabled = 1").all();
  console.log(`发现 ${onedriveMounts.length} 个激活的OneDrive挂载点`);
  
  for (const mount of onedriveMounts) {
    const strategyName = `OneDrive - ${mount.mount_name}`;
    
    // 从存储配置中获取OneDrive配置信息
    const config = {
      oneDriveClientId: storageConfig?.onedrive_client_id || '',
      oneDriveTenantId: storageConfig?.onedrive_tenant_id || '',
      oneDriveClientSecret: storageConfig?.onedrive_client_secret || '',
      // 如果有WebDAV配置
      webDavUrl: storageConfig?.onedrive_webdav_url || '',
      webDavUser: storageConfig?.onedrive_webdav_user || '',
      webDavPass: storageConfig?.onedrive_webdav_pass || ''
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
      storageConfig?.storage_type === 'onedrive' ? 1 : 0,
      now,
      now
    );
    
    console.log(`✅ 创建OneDrive存储策略: ${strategyName}`);
    console.log(`   配置: Client ID = ${config.oneDriveClientId || '未配置'}`);
  }
  
  // 迁移R2挂载点
  const r2Mounts = db.prepare("SELECT * FROM r2_mount_points WHERE enabled = 1").all();
  console.log(`发现 ${r2Mounts.length} 个激活的R2挂载点`);
  
  for (const mount of r2Mounts) {
    const strategyName = `R2 - ${mount.mount_name}`;
    
    // 从存储配置中获取R2配置信息
    const config = {
      r2Endpoint: storageConfig?.r2_endpoint || '',
      r2Bucket: storageConfig?.r2_bucket || '',
      r2AccessKey: storageConfig?.r2_access_key || '',
      r2SecretKey: storageConfig?.r2_secret_key || ''
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
      storageConfig?.storage_type === 'r2' ? 1 : 0,
      now,
      now
    );
    
    console.log(`✅ 创建R2存储策略: ${strategyName}`);
    console.log(`   配置: Endpoint = ${config.r2Endpoint || '未配置'}`);
  }
  
  // 迁移WebDAV挂载点
  const webdavMounts = db.prepare("SELECT * FROM webdav_mount_points WHERE enabled = 1").all();
  console.log(`发现 ${webdavMounts.length} 个激活的WebDAV挂载点`);
  
  for (const mount of webdavMounts) {
    const strategyName = `WebDAV - ${mount.mount_name}`;
    
    const config = {
      webDavUrl: mount.webdav_url || '',
      webDavUser: mount.username || '',
      webDavPass: mount.password_encrypted || '' // 注意：这里可能需要解密
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
      storageConfig?.storage_type === 'webdav' ? 1 : 0,
      now,
      now
    );
    
    console.log(`✅ 创建WebDAV存储策略: ${strategyName}`);
    console.log(`   配置: URL = ${config.webDavUrl || '未配置'}`);
  }
  
  // 更新默认本地存储策略的激活状态
  if (storageConfig?.storage_type === 'local') {
    db.prepare(`
      UPDATE storage_strategies 
      SET is_active = 1 
      WHERE name = '默认本地存储'
    `).run();
    console.log('✅ 激活默认本地存储策略');
  } else {
    db.prepare(`
      UPDATE storage_strategies 
      SET is_active = 0 
      WHERE name = '默认本地存储'
    `).run();
  }
  
  // 显示最终结果
  console.log('\n=== 迁移完成 ===');
  const finalStrategies = db.prepare("SELECT * FROM storage_strategies").all();
  console.log(`总存储策略数量: ${finalStrategies.length}`);
  
  finalStrategies.forEach(strategy => {
    const config = JSON.parse(strategy.config);
    console.log(`\n策略: ${strategy.name} (${strategy.type})`);
    console.log(`激活: ${strategy.is_active ? '是' : '否'}`);
    console.log(`配置摘要:`, {
      ...config,
      r2SecretKey: config.r2SecretKey ? '***' : undefined,
      webDavPass: config.webDavPass ? '***' : undefined,
      oneDriveClientSecret: config.oneDriveClientSecret ? '***' : undefined,
    });
  });
  
} catch (error) {
  console.error('迁移失败:', error);
} finally {
  db.close();
}