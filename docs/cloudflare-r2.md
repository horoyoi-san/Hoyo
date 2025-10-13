---
title: Cloudflare R2 使用与配置
outline: deep
outlineTitle: "On this page"
---

# Cloudflare R2 使用与配置文档

本项目支持以 Cloudflare R2 作为对象存储后端（S3 兼容）。本文档介绍：
- 开通与注册 Cloudflare R2
- 获取 S3 兼容的访问密钥（Access Key/Secret Key）与 Endpoint
- 在本项目中通过管理面板配置 R2
- 验证上传/下载与排障

---

## 一、开通 Cloudflare R2
1. 访问 Cloudflare 控制台并登录：`https://dash.cloudflare.com/`
2. 左侧菜单选择「R2 存储」（R2 Storage）。
3. 首次使用按提示开通 R2（可能需绑定支付方式，具体以 Cloudflare 展示为准）。
4. 创建 Bucket：
   - 点击「Create bucket」。
   - 输入 Bucket 名称（建议全小写、短横线分隔），例如：`fireflycloud-data`。
   - 记下 Bucket 名称，后续需要在项目中填写。

---

## 二、获取 S3 兼容访问密钥与 Endpoint
R2 提供 S3 兼容 API，需要以下信息：
- Account ID（账号 ID）
- S3 兼容 Endpoint（形如 `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`）
- Access Key ID / Secret Access Key（访问密钥对）
- Bucket 名称（上一步创建）

获取步骤：
1. 在 R2 页面，进入顶部的「Settings」或左侧的「R2」→「S3 API」页面。
2. 复制「Account ID」。
3. 找到「S3-compatible API」的 Endpoint，通常为：
   - `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
4. 生成密钥对：
   - 点击「Create API token」或「Create Access Key」。
   - 选择 S3 兼容（Read/Write）模板或自定义权限。
   - 生成后会得到：Access Key ID 与 Secret Access Key。
   - 仅在创建时显示 Secret，请妥善保存，切勿泄露。

注意：
- 本项目使用服务端直传与预签名下载（GetObject 预签名），无需将密钥暴露到前端。
- Endpoint 与协议需与前端访问协议一致（http/https 不可混用），生产环境建议全站 https。

---

## 三、在本项目中配置 R2（推荐：管理面板）
本项目默认通过「管理面板 → 存储配置」写入数据库中的 `storage_config`，无需在环境变量中填 R2 凭据。

步骤：
1. 启动后端与前端（参考根目录 `README.md`）。
2. 登录系统并进入「系统管理/管理面板」。
3. 打开「存储配置」或「Storage Configuration」页面。
4. 选择存储类型为「R2」。
5. 填写以下字段：
   - R2 Endpoint：例如 `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   - R2 Access Key：上一步生成的 Access Key ID
   - R2 Secret Key：上一步生成的 Secret Access Key
   - R2 Bucket：你的存储桶名称（如 `fireflycloud-data`）
   - 是否启用混合模式（可选）：`enableMixedMode`（保留其他存储能力，用于平滑迁移或分策略）
6. 保存配置。

内部实现要点（便于排障与审计）：
- 后端通过 `@aws-sdk/client-s3` 初始化 S3 Client：
  - `region: "auto"`
  - `endpoint: <你的 R2 Endpoint>`
  - `credentials: { accessKeyId, secretAccessKey }`
  - `forcePathStyle: true`
- 代码位置：
  - `backend/src/services/storage/storage-service.ts`（R2 客户端与上传/下载逻辑）
  - `backend/src/services/storage/r2-helpers.ts`（PutObject/GetObject/ListObjects 及签名 URL 等）

---

## 四、验证与使用

### 1) 上传验证
- 使用前端文件管理或上传组件上传一个小文件。
- 若配置正确，后端会通过 `PutObject` 将文件写入 R2，对应日志可在后端日志或管理面板运行日志中查看。
- 数据库 `files` 表会记录：`storageType = "r2"`、`storagePath = <对象键>`。

### 2) 浏览与统计（可选）
- 若页面提供 R2 浏览/统计功能，将通过 `ListObjectsV2` 读取对象列表并计算使用量（带缓存）。

### 3) 下载验证
- 本项目默认使用预签名下载链接（GetObject + `getSignedUrl`）。
- 触发下载时，后端会生成临时有效的下载 URL 并返回给前端，避免公开暴露对象权限。

---

## 五、Next.js 侧需要的配置
- 前端仅需正确指向后端 API：在项目根目录配置：
```bash
# .env（或 .env.local / .env.production）
NEXT_PUBLIC_API_URL=https://your-api.example.com  # 确保与后端一致的协议（https/https），不可混用
```
- 切勿将 R2 的 Access Key/Secret Key 写入任何前端环境变量或代码中！密钥只应保存在后端配置（数据库）或后端私密环境中。

---

## 六、常见问题（FAQ）
- 无法上传（500 / R2 client not configured）：
  - 检查管理面板的 R2 字段是否完整：Endpoint、Access Key、Secret Key、Bucket。
  - 确认 Endpoint 正确，格式通常为 `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`。
  - 确保后端进程可访问外网，并且系统时间准确（签名请求依赖时钟）。

- 无法下载或下载链接过期：
  - 预签名链接默认有效期为 1 小时（代码可调整）。
  - 确认对象键（storagePath）存在且与上传时一致。

- 列表为空或前缀路径异常：
  - R2 采用 Key-Value 的对象命名，`/` 只是约定俗成的分隔符。确保前缀传递与对象键一致。

- 跨域或协议混用导致下载失败：
  - 本项目前端下载已内置若干降级策略（隐藏 iframe 等）。生产环境请统一使用 HTTPS，并确保 `NEXT_PUBLIC_API_URL` 与站点协议一致。

- 是否支持自定义域名直链：
  - R2 支持为 Bucket 绑定自定义域并配置访问策略。但本项目默认使用预签名下载，适合私有访问与短期授权场景。若需公共直链与 CDN，自行在 Cloudflare 中为 R2 绑定域名并调整项目策略。

---

## 七、进阶：混合模式（enableMixedMode）
- 启用后，项目可同时保留本地/OneDrive/R2 等能力，用于迁移或按用户策略分配存储。
- 用户级策略可在管理面板的「存储策略/挂载」中配置，将指定用户/目录映射到 R2 路径（如 `r2Path`）。

---

## 八、排障建议
- 打开后端日志的 DEBUG 级别（`LOG_LEVEL=DEBUG`），观察 R2 初始化与 PutObject/GetObject 的日志。
- 使用 Cloudflare R2 控制台检查对象是否写入，或通过 S3 工具（如 AWS CLI 配置自定义 Endpoint）验证。
- 检查服务器系统时间与时区（建议使用 NTP），避免预签名时间偏差导致的认证失败。

---

## 九、参考
- Cloudflare R2 文档：`https://developers.cloudflare.com/r2/`
- AWS SDK for JavaScript (v3)：`https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/` 