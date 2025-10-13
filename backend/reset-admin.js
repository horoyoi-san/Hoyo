#!/usr/bin/env bun

import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"
import { users } from "./src/db/schema.js"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

const sqlite = new Database(process.env.DATABASE_PATH || "./netdisk.db")
const db = drizzle(sqlite, { schema: { users } })

async function resetAdmin() {
  try {
    console.log("开始重置管理员账户...")
    
    const adminEmail = "admin@cialloo.site"
    const adminPassword = "admin123" // 新密码
    
    // 生成新的密码哈希
    const hashedPassword = await bcrypt.hash(adminPassword, 10)
    
    // 查找现有的管理员账户
    const existingAdmin = await db.select().from(users).where(eq(users.id, "admin")).get()
    
    if (existingAdmin) {
      console.log(`找到现有管理员账户: ${existingAdmin.email}`)
      
      // 更新邮箱和密码
      await db.update(users)
        .set({ 
          email: adminEmail,
          password: hashedPassword,
          updatedAt: Date.now()
        })
        .where(eq(users.id, "admin"))
      
      console.log("✅ 管理员账户已更新")
    } else {
      // 创建新的管理员账户
      await db.insert(users).values({
        id: "admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
      
      console.log("✅ 管理员账户已创建")
    }
    
    console.log(`📧 管理员邮箱: ${adminEmail}`)
    console.log(`🔑 管理员密码: ${adminPassword}`)
    console.log("⚠️  请登录后立即修改密码！")
    
    // 验证账户
    const admin = await db.select().from(users).where(eq(users.id, "admin")).get()
    if (admin) {
      console.log(`✅ 验证成功，管理员邮箱: ${admin.email}`)
    }
    
  } catch (error) {
    console.error("❌ 重置失败:", error)
  } finally {
    sqlite.close()
  }
}

resetAdmin()
