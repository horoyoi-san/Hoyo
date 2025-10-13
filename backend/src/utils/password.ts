/**
 * 密码生成和管理工具
 */

import bcrypt from 'bcryptjs'

/**
 * 生成随机密码
 * @param length 密码长度，默认7位
 * @returns 随机密码字符串
 */
export function generateRandomPassword(length: number = 7): string {
  // 定义字符集：字母（大小写）、数字、特殊字符
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  
  // 组合所有字符
  const allChars = lowercase + uppercase + numbers + symbols
  
  let password = ''
  
  // 确保密码包含至少一个来自每个字符集的字符
  if (length >= 4) {
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += symbols[Math.floor(Math.random() * symbols.length)]
    
    // 填充剩余长度
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }
  } else {
    // 如果长度小于4，随机生成
    for (let i = 0; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }
  }
  
  // 打乱密码字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * 哈希密码
 * @param password 明文密码
 * @returns 哈希后的密码
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

/**
 * 验证密码
 * @param password 明文密码
 * @param hashedPassword 哈希密码
 * @returns 是否匹配
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

/**
 * 验证密码强度
 * @param password 密码
 * @returns 验证结果
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
} {
  const errors: string[] = []
  
  // 最小长度检查
  if (password.length < 6) {
    errors.push('密码长度至少6位')
  }
  
  // 最大长度检查
  if (password.length > 128) {
    errors.push('密码长度不能超过128位')
  }
  
  // 字符类型检查
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  
  let characterTypes = 0
  if (hasLowercase) characterTypes++
  if (hasUppercase) characterTypes++
  if (hasNumbers) characterTypes++
  if (hasSymbols) characterTypes++
  
  if (characterTypes < 2) {
    errors.push('密码应包含至少两种字符类型（大写字母、小写字母、数字、特殊字符）')
  }
  
  // 计算密码强度
  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  
  if (password.length >= 8 && characterTypes >= 3) {
    strength = 'strong'
  } else if (password.length >= 6 && characterTypes >= 2) {
    strength = 'medium'
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength
  }
}

/**
 * 生成安全的管理员密码
 * @returns 包含明文密码和哈希密码的对象
 */
export async function generateAdminPassword(): Promise<{
  plainPassword: string
  hashedPassword: string
}> {
  const plainPassword = generateRandomPassword(7)
  const hashedPassword = await hashPassword(plainPassword)
  
  return {
    plainPassword,
    hashedPassword
  }
}
