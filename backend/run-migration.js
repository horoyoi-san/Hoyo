const Database = require('better-sqlite3')

const dbPath = process.env.DATABASE_URL || './netdisk.db'

console.log('🔍 检查数据库状态...')

try {
  // 连接数据库
  const db = new Database(dbPath)
  
  console.log('✅ 数据库连接成功!')
  
  // 检查 site_config 表结构
  console.log('\n📋 检查站点配置表结构:')
  const siteConfigColumns = db.prepare('PRAGMA table_info(site_config)').all()
  
  console.log('站点配置表字段:')
  siteConfigColumns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})${col.dflt_value ? ` 默认值: ${col.dflt_value}` : ''}`)
  })
  
  // 检查是否有 allow_user_registration 字段
  const hasAllowUserRegistration = siteConfigColumns.some(col => col.name === 'allow_user_registration')
  
  if (hasAllowUserRegistration) {
    console.log('\n✅ allow_user_registration 字段存在')
  } else {
    console.log('\n❌ allow_user_registration 字段不存在')
    console.log('💡 请重启后端服务以触发数据库自动迁移')
  }
  
  // 查询现有配置
  console.log('\n📊 当前站点配置:')
  try {
    const result = db.prepare('SELECT * FROM site_config LIMIT 1').get()
    if (result) {
      console.log(`   - 标题: ${result.title || 'FireflyCloud'}`)
      console.log(`   - 描述: ${result.description || '云存储'}`)
      if (hasAllowUserRegistration) {
        console.log(`   - 允许注册: ${result.allow_user_registration ? '是' : '否'}`)
      }
    } else {
      console.log('   - 站点配置记录不存在，将在服务启动时自动创建')
    }
  } catch (error) {
    console.log(`   - 无法读取站点配置: ${error.message}`)
  }

  console.log('\n🚀 数据库状态检查完成!')
  console.log('💡 如果发现问题，请重启后端服务进行自动修复')

  db.close()
} catch (error) {
  console.error('❌ 数据库检查失败:', error.message)
  process.exit(1)
} 