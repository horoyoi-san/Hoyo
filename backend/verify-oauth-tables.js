const Database = require('better-sqlite3')

const dbPath = process.env.DATABASE_URL || './netdisk.db'

console.log('🔍 验证Google OAuth多回调链接表结构...')

try {
  const db = new Database(dbPath)
  
  // 检查 google_oauth_config 表结构
  const configColumns = db.prepare("PRAGMA table_info(google_oauth_config)").all()
  console.log('\n📋 google_oauth_config 表结构:')
  configColumns.forEach(col => {
    console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''}`)
  })
  
  // 检查 google_oauth_redirect_uris 表是否存在
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='google_oauth_redirect_uris'").all()
  
  if (tables.length > 0) {
    console.log('\n✅ google_oauth_redirect_uris 表已存在')
    
    const uriColumns = db.prepare("PRAGMA table_info(google_oauth_redirect_uris)").all()
    console.log('\n📋 google_oauth_redirect_uris 表结构:')
    uriColumns.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''}`)
    })
    
    // 检查现有数据
    const existingUris = db.prepare("SELECT COUNT(*) as count FROM google_oauth_redirect_uris").get()
    console.log(`\n📊 现有回调链接数量: ${existingUris.count}`)
    
    if (existingUris.count > 0) {
      const uris = db.prepare("SELECT id, name, redirect_uri, enabled FROM google_oauth_redirect_uris").all()
      console.log('\n📄 现有回调链接:')
      uris.forEach(uri => {
        console.log(`  - ${uri.name}: ${uri.redirect_uri} (${uri.enabled ? '启用' : '禁用'})`)
      })
    }
  } else {
    console.log('\n❌ google_oauth_redirect_uris 表不存在！')
  }
  
  // 检查现有的 google_oauth_config 数据
  const existingConfig = db.prepare("SELECT * FROM google_oauth_config WHERE id = 1").get()
  if (existingConfig) {
    console.log('\n📊 现有OAuth配置:')
    console.log(`  - 启用状态: ${existingConfig.enabled ? '是' : '否'}`)
    console.log(`  - 客户端ID: ${existingConfig.client_id ? '已配置' : '未配置'}`)
    console.log(`  - 客户端密钥: ${existingConfig.client_secret ? '已配置' : '未配置'}`)
    console.log(`  - 旧版回调链接: ${existingConfig.redirect_uri || '未配置'}`)
  }
  
  db.close()
  console.log('\n✅ 数据库验证完成!')
  
} catch (error) {
  console.error('❌ 验证失败:', error.message)
  process.exit(1)
} 