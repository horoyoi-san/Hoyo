#!/usr/bin/env bun

/**
 * 批量替换数据库日志为dbInfo
 */

const fs = require('fs')
const path = require('path')

const dbIndexPath = path.join(__dirname, 'src/db/index.ts')

console.log('🔧 修复数据库日志...')

// 读取文件
let content = fs.readFileSync(dbIndexPath, 'utf8')

// 替换所有的logger.info为logger.dbInfo（除了startup相关的）
const replacements = [
  // 保留startup日志，替换其他info日志
  { from: /logger\.info\('(?!🔧|数据库初始化完成)/g, to: "logger.dbInfo('" },
  { from: /logger\.info\(`(?!🔧|数据库初始化完成)/g, to: "logger.dbInfo(`" },
]

let changeCount = 0
replacements.forEach(({ from, to }) => {
  const matches = content.match(from)
  if (matches) {
    changeCount += matches.length
    content = content.replace(from, to)
  }
})

// 写回文件
fs.writeFileSync(dbIndexPath, content, 'utf8')

console.log(`✅ 完成！替换了 ${changeCount} 个数据库日志`)
console.log('现在数据库详细日志只在DEBUG级别显示')
