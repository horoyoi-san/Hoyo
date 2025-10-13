---
title: OneDrive 配置与使用
outline: deep
outlineTitle: "On this page"
---

# OneDrive 配置与使用文档

本文档介绍如何在本项目中启用 OneDrive 存储能力，包含：
- 在 Azure 注册应用、配置重定向 URI 与权限
- 获取 Client ID / Client Secret / Tenant ID
- 在系统中完成授权与挂载
- 可选：使用 WebDAV 作为 OneDrive 接入方案
- 验证与常见问题

---

## 一、先决条件
- 一个可正常访问的站点域名（用于 OAuth 回调）。
- 可登录 Azure 门户（Microsoft Entra ID / Azure AD）：`https://portal.azure.com/`。
- 已部署本项目前后端，并确保前端能访问后端 API：
```bash
# 前端环境变量（示例）
NEXT_PUBLIC_API_URL=https://your-api.example.com  # 协议需与后端一致
```

---

## 二、在 Azure 注册应用（Graph API 模式）
> Graph API 模式为推荐方案，具备更完整的能力与更好的性能；若因策略限制无法使用，可见后文 WebDAV 方案。

### 2.1 创建应用
1. 登录 `https://portal.azure.com/`，进入「Microsoft Entra ID（Azure AD）」。
2. 选择「应用注册（App registrations）」→「新注册（New registration）」。
3. 填写：
   - 名称：自定义，如 `FireflyCloud OneDrive`
   - 支持的帐户类型：可选「任何组织目录中的帐户和个人 Microsoft 帐户」
   - 重定向 URI（平台选择 Web）：先暂留，稍后填写；或直接填写你的站点回调地址
     - 例如：`https://your-site.com/onedrive/callback`
4. 创建完成后，记录以下信息：
   - 应用程序（客户端）ID：Client ID
   - 目录（租户）ID：Tenant ID

### 2.2 配置重定向 URI
1. 在应用的「身份验证（Authentication）」页：
   - 平台选择 Web，添加重定向 URI：`https://你的域名/onedrive/callback`
   - 若有多域名环境，可在系统挂载页复制动态生成的 URI 添加至 Azure（详见挂载管理提示）。
2. 勾选「允许公用客户端流」一般无需开启；保持默认。

### 2.3 生成 Client Secret
1. 在「证书和密码（Certificates & secrets）」页：
   - 选择「新客户端密码（New client secret）」→ 添加 → 复制生成的值（只显示一次）。

### 2.4 配置 API 权限（最小权限）
进入「API 权限（API permissions）」→ 添加权限：
- Microsoft Graph → 委托的权限（Delegated permissions）：
  - Files.ReadWrite
  - User.Read
  - offline_access
- 保存后，可能需要管理员同意（Grant admin consent）。

---

## 三、在系统中填写 OneDrive API 配置
1. 以管理员登录系统，进入「系统管理 / 存储配置」。
2. 在 OneDrive 区域填写：
   - Client ID：Azure 门户的应用程序 ID
   - Client Secret：客户端密码
   - Tenant ID：目录（租户）ID（如需个人账户/多租户，可配置 `common`，但推荐准确填写租户 ID）
3. 保存配置。

提示：
- 本项目服务端会使用上述配置与 Microsoft Graph 通信；令牌存储在数据库表 `onedrive_auth` 中。
- 上传等操作默认使用管理员的 OneDrive 令牌（见后端实现），建议用管理员账户完成授权。

---

## 四、完成授权（连接 OneDrive）
> 授权通过前端挂载管理页进行，授权用户的令牌会写入 `onedrive_auth` 表，并在到期前自动刷新。

1. 前往「挂载管理 → OneDrive 挂载点」。
2. 若系统检测到已配置 OneDrive API，将显示「连接 OneDrive」按钮。
3. 点击「连接 OneDrive」：
   - 系统会调用后端 `GET /storage/onedrive/auth-url?redirectUri=<当前站点>/onedrive/callback` 获取授权链接
   - 跳转到 Microsoft 登录并同意权限
   - 授权完成后，浏览器回到 `https://你的域名/onedrive/callback`
4. 回调页会将 `code` 与 `redirectUri` 发送给后端 `POST /storage/onedrive/callback`，后端写库保存令牌。
5. 授权成功后，「挂载管理」会显示已连接状态以及容量信息（`GET /storage/onedrive/status`）。

注意：
- 回调路径必须与 Azure 门户中登记的重定向 URI 完全一致（协议、域名、路径）。
- 若部署多域名，挂载页会提示当前域名的回调 URI，建议都添加到 Azure 应用中。

---

## 五、创建 OneDrive 挂载点
授权完成后，可将某个本地文件夹映射到 OneDrive 路径：
1. 在「挂载管理 → OneDrive 挂载点」点击「创建挂载点」。
2. 选择本地目标文件夹。
3. 填写 OneDrive 路径（示例：`Documents/Projects`，留空表示根目录）。
4. 可选填写 OneDrive 文件夹 ID（已知时能更快定位）。
5. 填写挂载点名称并保存。

说明：
- 浏览/上传时，系统将使用 Graph API 访问该路径。
- 后端按实现策略会在必要时使用管理员的令牌进行上传、下载与路径创建（见 `StorageService`）。

---

## 六、可选方案：WebDAV 接入 OneDrive
若 Graph 模式受限，可在「存储配置」填写 OneDrive WebDAV：
- WebDAV URL、用户名、密码（根据你的 OneDrive/SharePoint 环境提供）。
- 填写后，列目录时将优先走 WebDAV（代码参考 `folders.ts` 中 `/:id/onedrive-contents`）。
- 该模式下部分高级能力可能不如 Graph 丰富。

---

## 七、验证
- 授权状态：`GET /storage/onedrive/status`（挂载页会自动调用并显示剩余/已用空间）。
- 授权回调：`POST /storage/onedrive/callback`（由回调页触发）。
- 创建挂载：`POST /storage/onedrive/mount`。
- 列出挂载：`GET /storage/onedrive/mounts`。

---

## 八、常见问题（FAQ）
- 授权失败：`redirect_uri_mismatch`
  - 确认 Azure 门户中登记的回调 URI 与实际回调完全一致（含协议与路径）。

- `invalid_client` 或 `AADSTS700016`
  - 检查 Client ID/Secret 是否正确；Secret 是否过期；Tenant ID 是否匹配。

- 401 获取驱动器信息失败
  - 令牌过期或权限不足。系统会在过期前 5 分钟自动刷新，仍失败请重新授权或检查 API 权限（需 Files.ReadWrite / offline_access / User.Read）。

- 多域名部署
  - 需要在 Azure 应用中添加所有可能使用的回调 URI；挂载页可复制当前域名下的回调 URI。

- 与本项目的存储策略关系
  - 项目支持多存储策略（本地/R2/OneDrive 等）与挂载点；可按需为不同目录/用户分配。

---

## 九、参考与代码位置
- Azure 应用注册指南：`https://learn.microsoft.com/azure/active-directory/develop/quickstart-register-app`
- Microsoft Graph 权限说明：`https://learn.microsoft.com/graph/permissions-reference`
- 本项目关键代码：
  - OneDrive 服务：`backend/src/services/onedrive.ts`
  - 授权路由：`backend/src/routes/storage/onedrive-auth.ts`
  - 挂载路由：`backend/src/routes/storage/onedrive-mounts.ts`
  - 回调页面：`app/onedrive/callback/page.tsx`
  - 挂载管理 UI：`components/mounts/onedrive-mount-management.tsx` 