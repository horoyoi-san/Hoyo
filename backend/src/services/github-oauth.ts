import { logger } from "../utils/logger"

export interface GitHubOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface GitHubUserInfo {
  id: number
  login: string
  email: string
  name: string
  avatar_url?: string
  type: string
  site_admin?: boolean
}

export interface GitHubUserEmail {
  email: string
  verified: boolean
  primary: boolean
  visibility?: string
}

export class GitHubOAuthService {
  private config: GitHubOAuthConfig

  constructor(config: GitHubOAuthConfig) {
    this.config = config
  }

  /**
   * 生成GitHub OAuth授权URL
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'user user:email',  // 修复权限范围：user 用于获取用户信息，user:email 用于获取邮箱
      state: state || '',
      response_type: 'code'  // 明确指定响应类型
    })

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`
    logger.debug(`生成GitHub授权URL: ${authUrl}`)
    return authUrl
  }

  /**
   * 使用授权码获取访问令牌
   */
  async getAccessToken(code: string): Promise<{
    access_token: string
    token_type: string
    scope: string
  }> {
    try {
      logger.info(`开始获取GitHub访问令牌，授权码: ${code.substring(0, 10)}...`)
      
      const requestBody = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      })
      
      logger.debug(`GitHub OAuth请求参数: client_id=${this.config.clientId}, redirect_uri=${this.config.redirectUri}`)
      
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'FireflyCloud-OAuth-App'
        },
        body: requestBody,
      })

      if (!response.ok) {
        const error = await response.text()
        logger.error('获取GitHub访问令牌HTTP失败:', error)
        logger.error(`响应状态: ${response.status} ${response.statusText}`)
        throw new Error('获取访问令牌失败')
      }

      const data = await response.json()
      logger.debug(`GitHub令牌响应数据:`, JSON.stringify(data, null, 2))
      
      if (data.error) {
        logger.error('GitHub OAuth错误:', data.error_description || data.error)
        throw new Error(data.error_description || 'GitHub OAuth认证失败')
      }

      if (!data.access_token) {
        logger.error('GitHub OAuth响应中缺少access_token字段:', data)
        throw new Error('访问令牌缺失')
      }

      logger.info(`GitHub访问令牌获取成功，类型: ${data.token_type}, 作用域: ${data.scope}`)
      logger.debug(`访问令牌前缀: ${data.access_token.substring(0, 10)}...`)
      return data
    } catch (error) {
      logger.error('GitHub OAuth令牌交换失败:', error)
      throw error
    }
  }

  /**
   * 验证访问令牌是否有效
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'FireflyCloud-OAuth-App'
        },
      })
      
      logger.debug(`令牌验证响应: ${response.status} ${response.statusText}`)
      return response.ok
    } catch (error) {
      logger.error('令牌验证失败:', error)
      return false
    }
  }

  /**
   * 使用访问令牌获取用户信息
   */
  async getUserInfo(accessToken: string): Promise<GitHubUserInfo> {
    try {
      logger.debug(`获取GitHub用户信息，访问令牌: ${accessToken.substring(0, 10)}...`)
      
      // GitHub OAuth Apps 应该使用 Bearer 认证方式
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'FireflyCloud-OAuth-App'
        },
      })

      if (!response.ok) {
        const error = await response.text()
        logger.error('获取GitHub用户信息失败:', error)
        logger.error(`响应状态: ${response.status} ${response.statusText}`)
        logger.error(`访问令牌: ${accessToken.substring(0, 10)}...`)
        
        // 记录详细的错误信息用于调试
        try {
          const errorData = JSON.parse(error)
          logger.error('GitHub API错误详情:', errorData)
        } catch {
          // 如果不是JSON格式，直接记录原始错误
        }
        
        throw new Error(`获取用户信息失败: ${response.status} ${response.statusText}`)
      }

      const userInfo = await response.json()
      logger.info(`GitHub用户信息获取成功: ${userInfo.login} (${userInfo.email || '邮箱私有'})`)
      return userInfo
    } catch (error) {
      logger.error('获取GitHub用户信息失败:', error)
      throw error
    }
  }

  /**
   * 获取用户邮箱列表
   */
  async getUserEmails(accessToken: string): Promise<GitHubUserEmail[]> {
    try {
      const response = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'FireflyCloud-OAuth-App'
        },
      })

      if (!response.ok) {
        const error = await response.text()
        logger.error('获取GitHub用户邮箱失败:', error)
        logger.error(`响应状态: ${response.status} ${response.statusText}`)
        
        // 记录详细的错误信息用于调试
        try {
          const errorData = JSON.parse(error)
          logger.error('GitHub API错误详情:', errorData)
        } catch {
          // 如果不是JSON格式，直接记录原始错误
        }
        
        throw new Error(`获取用户邮箱失败: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('获取GitHub用户邮箱失败:', error)
      throw error
    }
  }

  /**
   * 获取用户的主要邮箱和用户信息
   */
  async getPrimaryEmailAndUserInfo(accessToken: string): Promise<{
    email: string
    userInfo: GitHubUserInfo
  }> {
    try {
      // 首先尝试从用户信息中获取邮箱
      const userInfo = await this.getUserInfo(accessToken)
      if (userInfo.email) {
        return {
          email: userInfo.email,
          userInfo: userInfo
        }
      }

      // 如果用户信息中没有邮箱，从邮箱列表中获取
      const emails = await this.getUserEmails(accessToken)
      
      // 寻找已验证的主邮箱
      const primaryEmail = emails.find(email => email.primary && email.verified)
      if (primaryEmail) {
        return {
          email: primaryEmail.email,
          userInfo: userInfo
        }
      }

      // 寻找任何已验证的邮箱
      const verifiedEmail = emails.find(email => email.verified)
      if (verifiedEmail) {
        return {
          email: verifiedEmail.email,
          userInfo: userInfo
        }
      }

      // 如果没有验证的邮箱，抛出错误
      throw new Error('GitHub账户没有已验证的邮箱地址')
    } catch (error) {
      logger.error('获取GitHub用户主邮箱失败:', error)
      throw error
    }
  }

  /**
   * 获取用户的主要邮箱（保留向后兼容性）
   */
  async getPrimaryEmail(accessToken: string): Promise<string> {
    const result = await this.getPrimaryEmailAndUserInfo(accessToken)
    return result.email
  }
} 