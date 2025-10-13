import { Database } from "bun:sqlite"

// 获取数据库路径
const dbPath = process.env.DATABASE_URL || './netdisk.db'
const db = new Database(dbPath)

console.log('🔍 当前OAuth配置详情')
console.log('===================')

// 查看Google OAuth配置
console.log('\n📧 Google OAuth配置表内容:')
try {
  const googleConfig = db.query('SELECT * FROM google_oauth_config').get()
  console.log('google_oauth_config:', JSON.stringify(googleConfig, null, 2))
  
  const googleRedirectUris = db.query('SELECT * FROM google_oauth_redirect_uris').all()
  console.log('google_oauth_redirect_uris:', JSON.stringify(googleRedirectUris, null, 2))
} catch (error) {
  console.error('❌ 读取Google OAuth配置失败:', error.message)
}

// 查看GitHub OAuth配置
console.log('\n🐙 GitHub OAuth配置表内容:')
try {
  const githubConfig = db.query('SELECT * FROM github_oauth_config').get()
  console.log('github_oauth_config:', JSON.stringify(githubConfig, null, 2))
  
  const githubRedirectUris = db.query('SELECT * FROM github_oauth_redirect_uris').all()
  console.log('github_oauth_redirect_uris:', JSON.stringify(githubRedirectUris, null, 2))
} catch (error) {
  console.error('❌ 读取GitHub OAuth配置失败:', error.message)
}

// 检查数据库中是否存在这些表
console.log('\n📋 数据库表存在性检查:')
const tables = [
  'google_oauth_config',
  'google_oauth_redirect_uris', 
  'github_oauth_config',
  'github_oauth_redirect_uris'
]

tables.forEach(tableName => {
  try {
    const result = db.query(`SELECT COUNT(*) as count FROM ${tableName}`).get()
    console.log(`✅ ${tableName}: 存在 (${result.count} 条记录)`)
  } catch (error) {
    console.log(`❌ ${tableName}: 不存在或无法访问`)
  }
})

console.log('\n✨ 调试完成！')

// 关闭数据库连接
db.close() 