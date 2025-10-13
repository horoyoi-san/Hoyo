import { logger } from "../utils/logger"

export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface GoogleUserInfo {
  id: string
  email: string
  name: string
  picture?: string
  verified_email: boolean
}

export class GoogleOAuthService {
  private config: GoogleOAuthConfig

  constructor(config: GoogleOAuthConfig) {
    this.config = config
  }

  /**
   * 生成谷歌OAuth授权URL
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent'
    })

    if (state) {
      params.append('state', state)
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * 使用授权码获取访问令牌
   */
  async getAccessToken(code: string): Promise<{
    access_token: string
    token_type: string
    expires_in: number
    refresh_token?: string
    id_token?: string
  }> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.config.redirectUri,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        logger.error('获取谷歌访问令牌失败:', error)
        throw new Error('获取访问令牌失败')
      }

      return await response.json()
    } catch (error) {
      logger.error('谷歌OAuth令牌交换失败:', error)
      throw error
    }
  }

  /**
   * 使用访问令牌获取用户信息
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const error = await response.text()
        logger.error('获取谷歌用户信息失败:', error)
        throw new Error('获取用户信息失败')
      }

      const userInfo = await response.json()
      
      // 验证必需字段
      if (!userInfo.email || !userInfo.verified_email) {
        throw new Error('谷歌账户邮箱未验证')
      }

      return userInfo
    } catch (error) {
      logger.error('获取谷歌用户信息失败:', error)
      throw error
    }
  }

  /**
   * 验证ID令牌
   */
  async verifyIdToken(idToken: string): Promise<any> {
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`)
      
      if (!response.ok) {
        throw new Error('ID令牌验证失败')
      }

      const tokenInfo = await response.json()
      
      // 验证客户端ID
      if (tokenInfo.aud !== this.config.clientId) {
        throw new Error('ID令牌客户端ID不匹配')
      }

      return tokenInfo
    } catch (error) {
      logger.error('谷歌ID令牌验证失败:', error)
      throw error
    }
  }
}