# 小兔快跑 - Vercel 部署指南

## 架构说明

```
┌─────────────────┐     API请求      ┌─────────────────┐
│   Vercel        │ ───────────────► │   后端服务       │
│   (前端 H5)     │                  │   (NestJS)      │
│   dist-web      │                  │   Python脚本    │
└─────────────────┘                  └─────────────────┘
```

## 部署步骤

### 步骤 1：推送代码到 GitHub

```bash
# 初始化 Git（如果尚未初始化）
git init

# 添加远程仓库
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 提交代码
git add .
git commit -m "feat: 小兔快跑项目初始化"

# 推送到 GitHub
git push -u origin main
```

### 步骤 2：在 Vercel 创建项目

1. 访问 [Vercel](https://vercel.com)
2. 点击 `Add New...` → `Project`
3. 选择 `Import Git Repository`
4. 授权 GitHub 并选择你的仓库

### 步骤 3：配置构建设置

在 Vercel 项目设置中配置：

| 配置项 | 值 |
|--------|-----|
| **Framework Preset** | Other |
| **Build Command** | `pnpm build:web` |
| **Output Directory** | `dist-web` |
| **Install Command** | `pnpm install` |

### 步骤 4：配置环境变量

在 Vercel 项目设置 → Environment Variables 中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PROJECT_DOMAIN` | `https://你的后端域名.com` | 后端 API 地址 |

**重要**：需要将 `vercel.json` 中的 `your-backend-url.com` 替换为实际的后端地址。

### 步骤 5：部署

点击 `Deploy` 按钮，等待构建完成。

---

## 后端部署选项

由于项目使用了 Python 脚本（AKSHARE），后端无法直接部署到 Vercel。推荐以下方案：

### 选项 A：Railway（推荐）

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 部署后端
railway up
```

### 选项 B：Render

1. 访问 [Render](https://render.com)
2. 创建新的 Web Service
3. 连接 GitHub 仓库
4. 配置：
   - **Build Command**: `cd server && pnpm install && pnpm build`
   - **Start Command**: `cd server && pnpm start:prod`

### 选项 C：Fly.io

```bash
# 安装 Fly CLI
curl -L https://fly.io/install.sh | sh

# 登录
fly auth login

# 部署
fly launch
```

---

## 完整部署流程

### 1. 部署后端（选择一个平台）

```bash
# 以 Railway 为例
railway up
# 记录分配的域名，如: https://xiaotu-backend.railway.app
```

### 2. 更新前端配置

修改 `vercel.json`：

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://xiaotu-backend.railway.app/api/:path*"
    }
  ]
}
```

### 3. 设置 Vercel 环境变量

```
PROJECT_DOMAIN=https://xiaotu-backend.railway.app
```

### 4. 重新部署前端

```bash
git add .
git commit -m "chore: 更新后端 API 地址"
git push
```

---

## 注意事项

1. **Python 环境**：后端需要 Python 3.x 和 AKSHARE 库
2. **数据库**：项目使用 Supabase，无需额外配置
3. **对象存储**：项目使用 S3 兼容存储，确保环境变量正确
4. **CORS**：后端已配置允许跨域请求

---

## 故障排查

### 前端访问 API 404

1. 检查 `vercel.json` 中的 rewrites 配置
2. 确认后端服务正常运行
3. 检查 `PROJECT_DOMAIN` 环境变量

### 后端启动失败

1. 检查 Python 环境
2. 安装 AKSHARE：`pip install akshare`
3. 检查数据库连接字符串

### 样式不显示

1. 确认 Tailwind CSS 正确构建
2. 检查 `dist-web/css` 目录是否存在
