import { Database } from "bun:sqlite"

// 获取数据库路径
const dbPath = process.env.DATABASE_URL || './netdisk.db'
const db = new Database(dbPath)

console.log('🔍 OAuth回调URL诊断工具')
console.log('=======================')

// 检查Google OAuth配置
function checkGoogleOAuth() {
  console.log('\n📧 Google OAuth配置：')
  
  // 检查基础配置
  const googleConfig = db.query('SELECT * FROM google_oauth_config').get()
  if (!googleConfig) {
    console.log('❌ 未找到Google OAuth基础配置')
    return
  }
  
  console.log(`✅ 启用状态: ${googleConfig.enabled ? '是' : '否'}`)
  console.log(`✅ Client ID: ${googleConfig.client_id ? '已配置' : '未配置'}`)
  console.log(`✅ Client Secret: ${googleConfig.client_secret ? '已配置' : '未配置'}`)
  
  // 检查回调URL配置
  const redirectUris = db.query('SELECT * FROM google_oauth_redirect_uris WHERE enabled = 1').all()
  console.log(`\n📍 已配置的回调URL (${redirectUris.length}个):`)
  
  if (redirectUris.length === 0) {
    console.log('❌ 没有配置任何回调URL！')
    console.log('💡 建议添加回调URL: http://localhost:3000/auth/google/callback')
    return
  }
  
  redirectUris.forEach((uri, index) => {
    console.log(`${index + 1}. ${uri.redirect_uri} (${uri.name})`)
  })
  
  return redirectUris
}

// 检查GitHub OAuth配置
function checkGitHubOAuth() {
  console.log('\n🐙 GitHub OAuth配置：')
  
  // 检查基础配置
  const githubConfig = db.query('SELECT * FROM github_oauth_config').get()
  if (!githubConfig) {
    console.log('❌ 未找到GitHub OAuth基础配置')
    return
  }
  
  console.log(`✅ 启用状态: ${githubConfig.enabled ? '是' : '否'}`)
  console.log(`✅ Client ID: ${githubConfig.client_id ? '已配置' : '未配置'}`)
  console.log(`✅ Client Secret: ${githubConfig.client_secret ? '已配置' : '未配置'}`)
  
  // 检查回调URL配置
  const redirectUris = db.query('SELECT * FROM github_oauth_redirect_uris WHERE enabled = 1').all()
  console.log(`\n📍 已配置的回调URL (${redirectUris.length}个):`)
  
  if (redirectUris.length === 0) {
    console.log('❌ 没有配置任何回调URL！')
    console.log('💡 建议添加回调URL: http://localhost:3000/auth/github/callback')
    return
  }
  
  redirectUris.forEach((uri, index) => {
    console.log(`${index + 1}. ${uri.redirect_uri} (${uri.name})`)
  })
  
  return redirectUris
}

// 添加开发环境的回调URL
function addDevelopmentRedirectUris() {
  console.log('\n🔧 自动配置开发环境回调URL...')
  
  const nanoid = () => Math.random().toString(36).substring(2, 15)
  const now = Date.now()
  
  try {
    // 为Google OAuth添加开发环境回调URL
    const googleExists = db.query('SELECT * FROM google_oauth_redirect_uris WHERE redirect_uri = ?')
      .get('http://localhost:3000/auth/google/callback')
    
    if (!googleExists) {
      db.query(`
        INSERT INTO google_oauth_redirect_uris 
        (id, redirect_uri, name, enabled, created_at, updated_at) 
        VALUES (?, ?, ?, 1, ?, ?)
      `).run(
        nanoid(), 
        'http://localhost:3000/auth/google/callback',
        '开发环境 - Google',
        now,
        now
      )
      console.log('✅ 已添加Google OAuth开发环境回调URL')
    } else {
      console.log('ℹ️  Google OAuth开发环境回调URL已存在')
    }
    
    // 为GitHub OAuth添加开发环境回调URL
    const githubExists = db.query('SELECT * FROM github_oauth_redirect_uris WHERE redirect_uri = ?')
      .get('http://localhost:3000/auth/github/callback')
    
    if (!githubExists) {
      db.query(`
        INSERT INTO github_oauth_redirect_uris 
        (id, redirect_uri, name, enabled, created_at, updated_at) 
        VALUES (?, ?, ?, 1, ?, ?)
      `).run(
        nanoid(),
        'http://localhost:3000/auth/github/callback',
        '开发环境 - GitHub', 
        now,
        now
      )
      console.log('✅ 已添加GitHub OAuth开发环境回调URL')
    } else {
      console.log('ℹ️  GitHub OAuth开发环境回调URL已存在')
    }
    
  } catch (error) {
    console.error('❌ 添加回调URL失败:', error.message)
  }
}

// 主函数
function main() {
  const googleUris = checkGoogleOAuth()
  const githubUris = checkGitHubOAuth()
  
  // 如果没有配置回调URL，询问是否自动添加
  if ((!googleUris || googleUris.length === 0) || (!githubUris || githubUris.length === 0)) {
    console.log('\n⚠️  检测到缺少回调URL配置，这会导致redirect_uri_mismatch错误')
    console.log('🔧 正在自动添加开发环境的回调URL...')
    addDevelopmentRedirectUris()
    
    console.log('\n✅ 修复完成！请确保在Google/GitHub开发者控制台中也配置了相同的回调URL：')
    console.log('   - Google: http://localhost:3000/auth/google/callback')
    console.log('   - GitHub: http://localhost:3000/auth/github/callback')
  }
  
  console.log('\n🔗 如果是生产环境，请在管理面板中配置正确的回调URL')
  console.log('   格式：https://yourdomain.com/auth/google/callback')
  console.log('   格式：https://yourdomain.com/auth/github/callback')
  
  console.log('\n✨ 诊断完成！')
}

// 运行诊断
main()

// 关闭数据库连接
db.close() 