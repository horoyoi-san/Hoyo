import nodemailer from 'nodemailer'
import { nanoid } from 'nanoid'
import { db } from '../db'
import { smtpConfig } from '../db/schema'
import { logger } from '../utils/logger'

// 检查必要的环境变量（作为后备配置）
function validateEmailConfig() {
  const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    logger.warn('环境变量中缺少 SMTP 配置，将使用数据库配置')
    logger.warn(`缺少的环境变量: ${missingVars.join(', ')}`)
  } else {
    logger.info('环境变量 SMTP 配置检查通过')
  }
}

// 验证环境变量
validateEmailConfig()

// 获取 SMTP 配置
async function getSmtpConfig() {
  try {
    // 首先尝试从数据库获取配置
    const config = await db.select().from(smtpConfig).get()

    if (config && config.enabled) {
      return {
        host: config.host!,
        port: config.port!,
        secure: config.secure,
        auth: {
          user: config.user!,
          pass: config.pass!
        },
        emailTemplate: config.emailTemplate
      }
    }

    // 如果数据库中没有启用的配置，使用环境变量
    if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
      return {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        emailTemplate: null
      }
    }

    throw new Error('No SMTP configuration available')
  } catch (error) {
    logger.error('Failed to get SMTP config:', error)
    throw error
  }
}

// 生成6位数验证码
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 邮件HTML模板 - shadcn UI 风格
function getEmailTemplate(code: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="th-TH">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FireflyCloud 邮箱验证</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: hsl(0, 0%, 3.9%);
            background-color: hsl(0, 0%, 96.1%);
            padding: 20px;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: hsl(0, 0%, 100%);
            border: 1px solid hsl(0, 0%, 89.8%);
            border-radius: 8px;
            overflow: hidden;
        }
        .header {
            background-color: hsl(0, 0%, 9%);
            color: hsl(0, 0%, 98%);
            padding: 32px;
            text-align: center;
        }
        .logo {
            width: 48px;
            height: 48px;
            background-color: hsl(0, 0%, 98%);
            border-radius: 6px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
        }
        .logo svg {
            width: 24px;
            height: 24px;
            color: hsl(0, 0%, 9%);
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            margin: 0;
        }
        .subtitle {
            color: hsl(0, 0%, 71%);
            font-size: 14px;
            margin: 4px 0 0 0;
            font-weight: 400;
        }
        .content {
            padding: 32px;
        }
        .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: hsl(0, 0%, 3.9%);
        }
        .description {
            color: hsl(0, 0%, 45.1%);
            margin-bottom: 24px;
            line-height: 1.5;
        }
        .code-container {
            background-color: hsl(0, 0%, 96.1%);
            border: 1px solid hsl(0, 0%, 89.8%);
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            margin: 24px 0;
        }
        .code {
            font-size: 32px;
            font-weight: 700;
            color: hsl(0, 0%, 9%);
            letter-spacing: 6px;
            margin-bottom: 8px;
            font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
        }
        .code-label {
            color: hsl(0, 0%, 45.1%);
            font-size: 14px;
            font-weight: 500;
        }
        .warning {
            background-color: hsl(0, 0%, 98%);
            border: 1px solid hsl(0, 0%, 89.8%);
            border-left: 4px solid hsl(38, 92%, 50%);
            border-radius: 6px;
            padding: 16px;
            margin: 24px 0;
        }
        .warning-title {
            color: hsl(0, 0%, 9%);
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 8px;
        }
        .warning-text {
            color: hsl(0, 0%, 45.1%);
            font-size: 14px;
            line-height: 1.5;
        }
        .warning-list {
            margin: 8px 0 0 16px;
            color: hsl(0, 0%, 45.1%);
        }
        .footer {
            background-color: hsl(0, 0%, 98%);
            padding: 24px 32px;
            text-align: center;
            border-top: 1px solid hsl(0, 0%, 89.8%);
            color: hsl(0, 0%, 45.1%);
            font-size: 14px;
        }
        .footer-link {
            color: hsl(0, 0%, 9%);
            text-decoration: none;
            font-weight: 500;
        }
        .footer-link:hover {
            text-decoration: underline;
        }
        .copyright {
            margin-top: 16px;
            color: hsl(0, 0%, 64%);
            font-size: 12px;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .content, .footer {
                padding: 20px;
            }
            .header {
                padding: 24px 20px;
            }
            .code {
                font-size: 24px;
                letter-spacing: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            <h1 class="title">FireflyCloud</h1>
            <p class="subtitle">การจัดเก็บข้อมูลบนคลาวด์ที่ทันสมัย</p>
        </div>

        <div class="content">
            <p class="greeting">您好！</p>
            <p class="description">感谢您注册 FireflyCloud 账户。为了确保您的邮箱地址有效，请使用以下验证码完成注册：</p>

            <div class="code-container">
                <div class="code">${code}</div>
                <div class="code-label">邮箱验证码</div>
            </div>

            <p class="description">请在注册页面输入此验证码以完成账户创建。</p>

            <div class="warning">
                <div class="warning-title">重要提示</div>
                <div class="warning-text">
                    <ul class="warning-list">
                        <li>此验证码将在 10 分钟后过期</li>
                        <li>请勿将验证码分享给他人</li>
                        <li>如果您没有注册 FireflyCloud 账户，请忽略此邮件</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>此邮件由 FireflyCloud 系统自动发送，请勿回复。</p>
            <p>如有疑问，请访问 <a href="#" class="footer-link">帮助中心</a> 或联系客服。</p>
            <p class="copyright">© 2024 FireflyCloud. 保留所有权利。</p>
        </div>
    </div>
</body>
</html>
  `
}

// 发送验证码邮件
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    const config = await getSmtpConfig()

    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport(config)

    // 使用自定义模板或默认模板
    const template = config.emailTemplate || getEmailTemplate(code, email)

    const mailOptions = {
      from: {
        name: 'FireflyCloud',
        address: config.auth.user
      },
      to: email,
      subject: '【FireflyCloud】邮箱验证码',
      html: template.replace(/\{\{CODE\}\}/g, code),
      text: `您的 FireflyCloud 邮箱验证码是：${code}，有效期10分钟。请勿将验证码分享给他人。`
    }

    const result = await transporter.sendMail(mailOptions)
    logger.email(email, '【FireflyCloud】邮箱验证码', true)
    logger.info(`邮件发送成功: ${result.messageId}`)
    return true
  } catch (error) {
    logger.email(email, '【FireflyCloud】邮箱验证码', false, error instanceof Error ? error : new Error(String(error)))
    logger.error('邮件发送失败:', error)
    return false
  }
}

// 验证邮件配置
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    const config = await getSmtpConfig()
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport(config)

    await transporter.verify()
    logger.info('邮件服务配置正确')
    return true
  } catch (error) {
    logger.error('邮件服务配置错误:', error)
    return false
  }
}
