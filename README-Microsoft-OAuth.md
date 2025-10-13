# Microsoft OAuth 集成说明

## 🎯 概述

本项目已成功集成 Microsoft OAuth 2.0 认证，基于[微软身份平台OAuth 2.0授权代码流文档](https://docs.azure.cn/zh-cn/entra/identity-platform/v2-oauth2-auth-code-flow)实现，采用与 GitHub OAuth 和 Google OAuth 相同的配置方式。

## 🚀 特色功能

- ✅ **自动数据库初始化** - 程序启动时自动检查并创建所需的数据库表
- ✅ **多租户支持** - 支持个人账户、工作账户或混合模式
- ✅ **中国区支持** - 使用 Azure 中国区端点
- ✅ **智能回调** - 自动匹配域名对应的回调链接
- ✅ **完整管理界面** - 与其他 OAuth 提供商相同的管理体验
- ✅ **详细日志** - 便于调试的详细日志记录

## 📋 使用步骤

### 1. 启动服务

数据库表将在程序启动时自动创建，无需手动运行迁移脚本：

```bash
cd backend && bun run dev
```

### 2. 访问管理后台

登录管理后台，在 OAuth 配置中找到 "Microsoft OAuth 配置" 选项。

### 3. 在 Azure Portal 中创建应用注册

1. 访问 [Azure Portal](https://portal.azure.cn/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. 创建新的应用注册
3. 获取以下信息：
   - 应用程序 ID (Client ID)
   - 客户端密钥 (Client Secret)
   - 租户 ID (可选，默认为 'common')

### 4. 配置重定向 URI

在 Azure 应用注册中添加重定向 URI：
- 格式：`https://yourdomain.com/auth/microsoft/callback`
- 类型：Web

### 5. 设置权限

确保应用程序具有以下 Microsoft Graph 权限：
- `openid` - 基本登录
- `profile` - 用户基本信息
- `email` - 邮箱地址
- `User.Read` - 读取用户详细信息

### 6. 在管理后台配置

1. 填写应用程序 ID 和客户端密钥
2. 选择租户类型：
   - `common` - 支持个人和工作/学校账户
   - `organizations` - 仅支持工作/学校账户
   - `consumers` - 仅支持个人 Microsoft 账户
   - 或输入具体的租户 ID
3. 添加回调链接
4. 启用 Microsoft OAuth

## 🧪 测试配置

运行测试脚本验证配置：

```bash
cd backend && node test-microsoft-oauth.js
```

## 📁 文件结构

### 后端文件
- `backend/src/services/microsoft-oauth.ts` - Microsoft OAuth 服务类
- `backend/src/routes/admin-microsoft-oauth.ts` - 管理 API 路由
- `backend/src/db/schema.ts` - 数据库表定义
- `backend/src/db/index.ts` - 数据库初始化逻辑
- `backend/test-microsoft-oauth.js` - 测试脚本

### 前端文件
- `components/admin/microsoft-oauth-configuration.tsx` - 管理界面组件

## 🔧 技术细节

### 支持的端点
- **授权端点**: `https://login.partner.microsoftonline.cn/{tenant}/oauth2/v2.0/authorize`
- **令牌端点**: `https://login.partner.microsoftonline.cn/{tenant}/oauth2/v2.0/token`
- **Graph API**: `https://microsoftgraph.chinacloudapi.cn/v1.0/me`

### 数据库表
- `microsoft_oauth_config` - 存储 OAuth 配置
- `microsoft_oauth_redirect_uris` - 管理回调链接

### 权限范围
```
openid profile email User.Read
```

## 🔗 相关链接

- [Azure Portal (中国区)](https://portal.azure.cn)
- [Microsoft Graph Explorer](https://developer.microsoft.com/graph/graph-explorer)
- [微软身份平台文档](https://docs.azure.cn/zh-cn/entra/identity-platform/)

## 📝 注意事项

1. **自动化初始化** - 无需手动运行数据库迁移，程序启动时会自动创建表
2. **中国区域** - 确保使用中国区的 Azure 服务
3. **回调链接** - 必须在 Azure Portal 中配置与系统中相同的回调链接
4. **权限申请** - 某些权限可能需要管理员同意

---

现在您可以为用户提供更多的登录选择：GitHub、Google 和 Microsoft 账户！ 