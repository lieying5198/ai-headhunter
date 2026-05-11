# AI猎头平台 MVP - 部署指南

## 📋 前置准备

### 1. 创建 Supabase 项目
1. 访问 https://supabase.com → New Project
2. 记录以下信息：
   - `Project URL`（即 NEXT_PUBLIC_SUPABASE_URL）
   - `anon key`（即 NEXT_PUBLIC_SUPABASE_ANON_KEY）
   - `service_role key`（即 SUPABASE_SERVICE_ROLE_KEY）

### 2. 执行数据库 SQL
1. Supabase Dashboard → SQL Editor
2. 打开 `supabase/schema.sql`
3. 全选内容，粘贴到 SQL Editor，点击 Run
4. 验证：Table Editor 中出现 `jobs`、`candidates` 等表

### 3. 获取 OpenAI API Key
- https://platform.openai.com/api-keys → Create new key

---

## 🚀 本地运行

```bash
# 1. 进入项目目录
cd ai-headhunter

# 2. 安装依赖
npm install

# 3. 复制环境变量
cp .env.local.example .env.local

# 4. 编辑 .env.local，填入真实的 Key
# NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
# SUPABASE_SERVICE_ROLE_KEY=xxx
# OPENAI_API_KEY=sk-xxx

# 5. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

---

## ☁️ 部署 Vercel

### 方式一：Vercel CLI（推荐）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 在项目目录执行
vercel

# 按提示操作，然后设置环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add OPENAI_API_KEY

# 重新部署
vercel --prod
```

### 方式二：GitHub + Vercel Dashboard

1. 推送代码到 GitHub
2. https://vercel.com/new → Import 你的 GitHub 仓库
3. 在 Environment Variables 中添加：
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = xxx
   SUPABASE_SERVICE_ROLE_KEY = xxx
   OPENAI_API_KEY = sk-xxx
   OPENAI_MODEL = gpt-4o
   ```
4. 点击 Deploy

---

## 🔑 Supabase Auth 配置

1. Supabase Dashboard → Authentication → URL Configuration
2. 设置 `Site URL` 为你的 Vercel 域名，例如：`https://your-app.vercel.app`
3. 添加 `Redirect URLs`：`https://your-app.vercel.app/api/auth/callback`

---

## 📖 功能说明

| 路径 | 说明 | 权限 |
|------|------|------|
| `/` | 职位列表 | 公开 |
| `/jobs/:id` | 职位详情 | 公开 |
| `/jobs/:id/chat` | AI客服聊天 | 公开 |
| `/upload` | 上传简历+AI初筛 | 公开 |
| `/auth/login` | 顾问登录/注册 | 公开 |
| `/consultant/jobs` | 职位管理 | 需登录 |
| `/consultant/import` | 导入职位 | 需登录 |
| `/consultant/candidates` | 候选人管理 | 需登录 |

---

## 🧪 测试流程

1. 注册顾问账号（`/auth/login` → 注册）
2. 验证邮箱后登录
3. 导入职位（`/consultant/import`）
4. AI处理完成后发布
5. 候选人浏览职位（`/`）
6. 与AI助手对话（`/jobs/:id/chat`）
7. 上传简历（`/upload?jobId=...`）
8. 顾问查看候选人和AI评分（`/consultant/candidates`）
