#!/usr/bin/env bun

/**
 * 重置管理员密码脚本
 * 用于在忘记密码时重置管理员账户密码
 */

import { Database } from "bun:sqlite"
import { generateAdminPassword } from './src/utils/password.js'

const DATABASE_URL = process.env.DATABASE_URL || "./netdisk.db"

async function resetAdminPassword() {
  console.log('🔄 开始重置管理员密码...\n')

  try {
    // 连接数据库
    const sqlite = new Database(DATABASE_URL)
    console.log(`📁 连接数据库: ${DATABASE_URL}`)

    // 检查管理员账户是否存在
    const adminExists = sqlite.prepare("SELECT COUNT(*) as count FROM users WHERE id = 'admin'").get()
    
    if (adminExists.count === 0) {
      console.log('❌ 管理员账户不存在')
      console.log('💡 请先启动服务以创建管理员账户')
      process.exit(1)
    }

    console.log('✅ 找到管理员账户')

    // 生成新密码
    console.log('🔐 生成新密码...')
    const { plainPassword, hashedPassword } = await generateAdminPassword()

    // 更新密码
    const updateStmt = sqlite.prepare(`
      UPDATE users 
      SET password = ?, updated_at = ? 
      WHERE id = 'admin'
    `)
    
    const result = updateStmt.run(hashedPassword, Date.now())
    
    if (result.changes > 0) {
      console.log('✅ 密码重置成功\n')
      
      // 显示新的登录信息
      console.log('='.repeat(80))
      console.log('🔐 新的管理员登录信息')
      console.log('='.repeat(80))
      console.log(`📧 登录邮箱: admin@cialloo.site`)
      console.log(`🔑 新密码: ${plainPassword}`)
      console.log('='.repeat(80))
      console.log('⚠️  请妥善保存上述密码，建议登录后立即修改')
      console.log('='.repeat(80))
    } else {
      console.log('❌ 密码重置失败')
      process.exit(1)
    }

    sqlite.close()
    console.log('\n✅ 操作完成')

  } catch (error) {
    console.error('❌ 重置密码时发生错误:', error)
    process.exit(1)
  }
}

// 确认操作
console.log('⚠️  警告: 此操作将重置管理员密码')
console.log('📧 管理员邮箱: admin@cialloo.site')
console.log('')

// 在Bun环境中，我们直接执行重置
// 在生产环境中，你可能想要添加确认提示
resetAdminPassword()
