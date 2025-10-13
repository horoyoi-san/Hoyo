import { logger } from "../utils/logger"

export interface MicrosoftOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  tenantId: string // 支持多租户：common、organizations、consumers 或具体租户ID
}

export interface MicrosoftUserInfo {
  id: string
  displayName: string
  userPrincipalName: string
  mail: string
  givenName?: string
  surname?: string
  jobTitle?: string
  mobilePhone?: string
  businessPhones?: string[]
}

export interface MicrosoftTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  refresh_token?: string
  id_token?: string
}

export class MicrosoftOAuthService {
  private config: MicrosoftOAuthConfig

  constructor(config: MicrosoftOAuthConfig) {
    this.config = config
  }

  /**
   * 生成Microsoft OAuth授权URL
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: 'openid profile email User.Read', // 基础权限：获取用户信息和邮箱
      state: state || '',
      response_mode: 'query'
    })

    const authUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`
    logger.debug(`生成Microsoft授权URL: ${authUrl}`)
    return authUrl
  }

  /**
   * 使用授权码获取访问令牌
   */
  async getAccessToken(code: string): Promise<MicrosoftTokenResponse> {
    try {
      logger.info(`开始获取Microsoft访问令牌，授权码: ${code.substring(0, 10)}...`)
      
      const requestBody = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code'
      })
      
      logger.debug(`Microsoft OAuth请求参数: client_id=${this.config.clientId}, redirect_uri=${this.config.redirectUri}, tenant=${this.config.tenantId}`)
      
      const response = await fetch(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`, {
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
        logger.error('获取Microsoft访问令牌HTTP失败:', error)
        logger.error(`响应状态: ${response.status} ${response.statusText}`)
        throw new Error('获取访问令牌失败')
      }

      const data = await response.json()
      logger.debug(`Microsoft令牌响应数据:`, JSON.stringify(data, null, 2))
      
      if (data.error) {
        logger.error('Microsoft OAuth错误:', data.error_description || data.error)
        throw new Error(data.error_description || 'Microsoft OAuth认证失败')
      }

      if (!data.access_token) {
        logger.error('Microsoft OAuth响应中缺少access_token字段:', data)
        throw new Error('访问令牌缺失')
      }

      logger.info(`Microsoft访问令牌获取成功，类型: ${data.token_type}, 过期时间: ${data.expires_in}秒`)
      logger.debug(`访问令牌前缀: ${data.access_token.substring(0, 10)}...`)
      return data
    } catch (error) {
      logger.error('Microsoft OAuth令牌交换失败:', error)
      throw error
    }
  }

  /**
   * 验证访问令牌是否有效
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'FireflyCloud-OAuth-App'
        },
      })
      
      logger.debug(`Microsoft令牌验证响应: ${response.status} ${response.statusText}`)
      return response.ok
    } catch (error) {
      logger.error('Microsoft令牌验证失败:', error)
      return false
    }
  }

  /**
   * 使用访问令牌获取用户信息
   */
  async getUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
    try {
      logger.debug(`获取Microsoft用户信息，访问令牌: ${accessToken.substring(0, 10)}...`)
      
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'FireflyCloud-OAuth-App'
        },
      })

      if (!response.ok) {
        const error = await response.text()
        logger.error('获取Microsoft用户信息失败:', error)
        logger.error(`响应状态: ${response.status} ${response.statusText}`)
        logger.error(`访问令牌: ${accessToken.substring(0, 10)}...`)
        
        // 记录详细的错误信息用于调试
        try {
          const errorData = JSON.parse(error)
          logger.error('Microsoft Graph API错误详情:', errorData)
        } catch {
          // 如果不是JSON格式，直接记录原始错误
        }
        
        throw new Error(`获取用户信息失败: ${response.status} ${response.statusText}`)
      }

      const userInfo = await response.json()
      logger.info(`Microsoft用户信息获取成功: ${userInfo.displayName} (${userInfo.mail || userInfo.userPrincipalName})`)
      
      // 确保邮箱字段存在，优先使用mail字段，如果不存在则使用userPrincipalName
      if (!userInfo.mail && userInfo.userPrincipalName) {
        userInfo.mail = userInfo.userPrincipalName
      }
      
      return userInfo
    } catch (error) {
      logger.error('获取Microsoft用户信息失败:', error)
      throw error
    }
  }

  /**
   * 获取用户的主要邮箱地址
   */
  async getPrimaryEmail(accessToken: string): Promise<string> {
    const userInfo = await this.getUserInfo(accessToken)
    
    // 优先使用mail字段，如果不存在则使用userPrincipalName
    const email = userInfo.mail || userInfo.userPrincipalName
    
    if (!email) {
      throw new Error('Microsoft账户没有可用的邮箱地址')
    }
    
    return email
  }

  /**
   * 获取用户的主要邮箱和用户信息
   */
  async getPrimaryEmailAndUserInfo(accessToken: string): Promise<{
    email: string
    userInfo: MicrosoftUserInfo
  }> {
    const userInfo = await this.getUserInfo(accessToken)
    const email = userInfo.mail || userInfo.userPrincipalName
    
    if (!email) {
      throw new Error('Microsoft账户没有可用的邮箱地址')
    }
    
    return {
      email,
      userInfo
    }
  }
} 