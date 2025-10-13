const Database = require('better-sqlite3');
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, 'netdisk.db');
const db = new Database(dbPath);

try {
  console.log('=== 修复存储策略配置 ===');
  
  // 获取OneDrive挂载点详细信息
  const onedriveMounts = db.prepare("SELECT * FROM onedrive_mount_points").all();
  console.log('OneDrive挂载点详情:');
  onedriveMounts.forEach(mount => {
    console.log(`- ID: ${mount.id}`);
    console.log(`- 名称: ${mount.display_name || mount.mount_name}`);
    console.log(`- Client ID: ${mount.client_id}`);
    console.log(`- Tenant ID: ${mount.tenant_id}`);
    console.log(`- 激活状态: ${mount.is_active}`);
    
    // 更新OneDrive策略配置
    const config = {
      oneDriveClientId: mount.client_id || '',
      oneDriveTenantId: mount.tenant_id || '',
      oneDriveClientSecret: mount.client_secret || ''
    };
    
    const strategyName = `OneDrive - ${mount.display_name || mount.mount_name}`;
    
    db.prepare(`
      UPDATE storage_strategies 
      SET config = ?, is_active = ?, updated_at = ?
      WHERE name = ?
    `).run(
      JSON.stringify(config),
      mount.is_active ? 1 : 0,
      Date.now(),
      strategyName
    );
    
    console.log(`✅ 更新OneDrive策略配置: ${strategyName}`);
  });
  
  // 获取R2挂载点详细信息
  const r2Mounts = db.prepare("SELECT * FROM r2_mount_points").all();
  console.log('\nR2挂载点详情:');
  r2Mounts.forEach(mount => {
    console.log(`- ID: ${mount.id}`);
    console.log(`- 名称: ${mount.display_name || mount.bucket_name}`);
    console.log(`- 端点: ${mount.endpoint}`);
    console.log(`- 存储桶: ${mount.bucket_name}`);
    console.log(`- 访问密钥: ${mount.access_key}`);
    console.log(`- 激活状态: ${mount.is_active}`);
    
    // 更新R2策略配置
    const config = {
      r2Endpoint: mount.endpoint || '',
      r2Bucket: mount.bucket_name || '',
      r2AccessKey: mount.access_key || '',
      r2SecretKey: mount.secret_key || ''
    };
    
    const strategyName = `R2 - ${mount.display_name || mount.bucket_name}`;
    
    db.prepare(`
      UPDATE storage_strategies 
      SET name = ?, config = ?, is_active = ?, updated_at = ?
      WHERE name LIKE 'R2 - %'
    `).run(
      strategyName,
      JSON.stringify(config),
      mount.is_active ? 1 : 0,
      Date.now()
    );
    
    console.log(`✅ 更新R2策略配置: ${strategyName}`);
  });
  
  // 显示修复后的结果
  console.log('\n=== 修复后的存储策略 ===');
  const strategies = db.prepare("SELECT * FROM storage_strategies").all();
  strategies.forEach(strategy => {
    console.log(`\n策略: ${strategy.name} (${strategy.type})`);
    console.log(`激活: ${strategy.is_active ? '是' : '否'}`);
    console.log(`配置: ${strategy.config}`);
  });
  
} catch (error) {
  console.error('修复失败:', error);
} finally {
  db.close();
}