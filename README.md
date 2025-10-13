## FireflyCloud 部署文档

前后端分离的云存储与文件分享系统：
- 后端：Bun + Elysia + SQLite（Drizzle ORM）
- 前端：Next.js（App Router）
- 特性：本地/R2/OneDrive/WebDAV 存储策略、文件分享与直链、下载令牌、配额与用量统计、SMTP 邮件验证码、管理面板、运行日志 WebSocket 流等。

---

### 环境配置
- [Bun](https://bun.sh/)
- [Node.js](https://nodejs.org/zh-cn)


### 目录结构（节选）
- `backend/`：后端服务（Bun + Elysia）
  - `src/`：核心源码（路由、服务、数据库、工具）
  - `netdisk.db`：SQLite 数据库（默认路径，可通过环境变量调整）
  - `uploads/`：上传文件目录（如使用本地存储）
  - `package.json`：后端运行脚本
- `app/`：Next.js App Router 页面
- `components/`：前端组件（鉴权、布局、文件管理、管理面板等）
- `lib/`：前端工具库（如通用下载、文件图标等）

---

## 一、快速开始（本地开发）

### 1. 克隆与安装依赖
```bash
# 克隆仓库
git clone https://github.com/ChuxinNeko/FireflyCloud.git
cd FireflyCloud

# 安装前端依赖（根目录）
npm install

# 安装后端依赖（backend 目录）
cd backend
bun install
```

### 2. 配置后端环境变量（backend/.env）
在 `backend` 目录下创建 `.env` 文件：
```bash
# 必填
JWT_SECRET=replace_with_a_strong_random_string
DATABASE_URL=./netdisk.db

# 可选
PORT=8080
LOG_LEVEL=INFO   # DEBUG, INFO, WARN, ERROR, FATAL
```
说明：
- SMTP、R2、OneDrive、WebDAV 等通常在管理面板内配置，无需写入环境变量。
- `DATABASE_URL` 可指向绝对或相对路径的 SQLite 文件。

### 3. 启动后端（开发模式）
```bash
cd backend
bun run dev
# 默认监听 http://localhost:8080
```

### 4. 启动前端（开发模式）
在项目根目录创建前端环境变量 `.env`：
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080  ##请确保前后端的协议一致，不可http与https混用
```
然后运行：
```bash
# 回到项目根目录
cd ..
npm run dev
# 默认监听 http://localhost:3000
```

### 5. 初始化管理员账号（可选）
在 `backend` 目录中提供了管理员初始化/重置脚本：
```bash
cd backend
# 重置管理员或创建管理员（按提示）
bun run reset-admin.js
# 或仅重置管理员密码
bun run reset-admin-password.js
```

---

## 二、生产部署

### 方案 A：同机双进程（后端 + 前端）+ 反向代理

1) 构建与启动后端（生产）
```bash
cd backend
bun run build      # 产物输出到 backend/dist
bun run start      # 以生产模式运行 dist/index.js
# 建议使用守护进程/服务托管（systemd/pm2/nssm 等）
```

2) 构建与启动前端（生产）
```bash
# 在项目根目录
npm run build
npm run start      # 以生产模式运行 Next.js (默认 3000)
```

3) 反向代理（Nginx 示例）
推荐为后端与前端分别使用子域名，如：
- 前端：`https://cloud.example.com`
- 后端：`https://api.example.com`

前端 `.env.production`：
```bash
NEXT_PUBLIC_API_URL=https://api.example.com
```

Nginx 示例（仅供参考，按需调整 SSL 证书路径与域名）：
```nginx
server {
  listen 80;
  listen 443 ssl http2;
  server_name api.example.com;

  # SSL 证书（示例）
  ssl_certificate     /etc/letsencrypt/live/api.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

  location / {
    proxy_pass         http://127.0.0.1:8080;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
  }
}

server {
  listen 80;
  listen 443 ssl http2;
  server_name cloud.example.com;

  ssl_certificate     /etc/letsencrypt/live/cloud.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/cloud.example.com/privkey.pem;

  location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
  }
}
```
```
前端环境变量需设为：
```bash
NEXT_PUBLIC_API_URL=https://cloud.example.com/api
```

---

## 三、环境变量与配置

### 后端（backend/.env）
必填：
- `JWT_SECRET`：JWT 签名密钥（请使用强随机字符串）
- `DATABASE_URL`：SQLite 数据库文件路径（相对/绝对）

可选：
- `PORT`：后端监听端口，默认 8080
- `LOG_LEVEL`：日志级别（`DEBUG`/`INFO`/`WARN`/`ERROR`/`FATAL`）

说明：
- SMTP/R2/OneDrive/WebDAV 等建议通过管理面板配置。

### 前端（.env.local / .env.production）
- `NEXT_PUBLIC_API_URL`：后端 API 基础地址，如 `http://localhost:8080`、`https://api.example.com` 或 `https://cloud.example.com/api`

---

## 四、功能配置与管理面板

- 管理面板入口：登录后访问“系统管理/管理面板”。
- 站点信息：`/site-config` 公开接口，前端 `Providers` 会在首次加载读取站点标题与描述。
- SMTP 配置：在管理面板填写参数，可通过“发送测试邮件”验证（后端路由 `/admin/test-smtp`）。
- 存储策略：支持本地、R2、OneDrive、WebDAV 挂载与策略化管理，可在管理面板配置并启用。
- 直链与分享：
  - 直链公开访问（新格式）：`/dl/:filename?token=xxxxx`
  - 分享与提取：`/share` 与 `/pickup` 流程
- 配额与统计：提供用户配额管理与整体用量统计（含 R2/OneDrive 实际用量查询）。

---

## 五、数据持久化与备份

- SQLite：默认数据库位于 `backend/netdisk.db`，请定期备份。
- 本地上传：如启用本地存储，请确保 `backend/uploads/`（或配置中的目标目录）具备持久化与备份策略。
- R2/OneDrive/WebDAV：对象存储或第三方盘数据依托其各自平台的持久化特性；建议仍保留关键文件的离线备份。

---

## 六、常见问题（FAQ）

- 访问 401/403：
  - 检查前端 `NEXT_PUBLIC_API_URL` 是否指向正确后端地址。
  - 确认浏览器本地 `token` 有效（可在登录后由后端 `/auth/me` 获取用户信息）。
  - 管理端需 `role=admin` 才能访问相关接口。

- CORS 问题：
  - 后端默认开启 `cors()`，如生产存在跨域策略，请在反向代理层统一域名或放通必要头部。

- 数据库路径错误：
  - 确认 `backend/.env` 中 `DATABASE_URL` 路径有效且进程可写。

- 下载打不开或跨域下载：
  - 前端 `lib/utils.ts` 内置 iframe 降级方案；建议在生产使用直链或同源代理以减少跨域跳转。

- 端口被占用：
  - 修改后端 `PORT` 或前端 Next 默认端口，或在反向代理层调度。

---

## 七、运维建议
- 使用守护进程（systemd/pm2/nssm）托管后端与前端进程，设置开机自启与重启策略。
- 为后端与前端分别使用子域名，前端仅通过 `NEXT_PUBLIC_API_URL` 访问后端，避免混用路径造成缓存/CORS 问题。
- 启用 HTTPS（Let’s Encrypt/ACME）并强制重定向到 HTTPS。
- 定期备份数据库与本地上传目录；对对象存储配置生命周期与版本控制。
- 配置日志轮转；按需接入外部监控/告警。

---

## 八、开发脚本速查

### 后端（在 backend 目录）
```bash
bun run dev        # 开发模式
bun run build      # 构建到 dist/
bun run start      # 生产运行 dist/index.js
bun run reset-admin.js           # 初始化/重置管理员
bun run reset-admin-password.js  # 重置管理员密码
```

### 前端（在项目根目录）
```bash
npm run dev    # 开发模式（默认 3000）
npm run build  # 生产构建
npm run start  # 生产运行
```

---
