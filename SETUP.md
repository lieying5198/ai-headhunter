# AI猎头平台 - 完整配置指南

本指南将帮助你从零开始配置并运行 AI猎头平台。

## 前置条件

确保已安装：
- Node.js 18+ （推荐 20+）
- npm 或 pnpm

---

## 第一步：配置环境变量

### 1.1 复制环境变量模板

```bash
cp .env.local.example .env.local
```

### 1.2 获取 Supabase 配置

1. 访问 [Supabase](https://supabase.com) 并登录
2. 点击 "New Project" 创建新项目
3. 等待项目创建完成（约 1-2 分钟）
4. 进入项目 Dashboard，点击左侧 **Settings** > **API**
5. 复制以下信息到 `.env.local`：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ `SERVICE_ROLE_KEY` 是超级权限密钥，请勿在前端使用或泄露！

### 1.3 获取 OpenAI API Key

1. 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
2. 点击 "Create new secret key"
3. 复制 API Key 到 `.env.local`：

```
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_MODEL=gpt-4o
```

> 💰 确保账户有充足余额，gpt-4o 约 $0.005/1K tokens

### 1.4 确认 App URL

```bash
# 开发环境
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 生产环境（部署后修改）
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 第二步：初始化数据库

### 2.1 执行 Schema SQL

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 左侧菜单点击 **SQL Editor**
4. 点击 **New Query**
5. 打开项目文件 `supabase/schema.sql`
6. 复制全部内容粘贴到 SQL Editor
7. 点击 **Run** 执行

### 2.2 验证表创建成功

在 SQL Editor 中运行：

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

应看到以下表：
- `consultants`
- `hidden_company_profiles`
- `jobs`
- `candidates`
- `resumes`
- `ai_conversations`
- `ai_scores`
- `notification_subscriptions`

### 2.3 验证 Storage Bucket 创建成功

在 Supabase Dashboard 中：
1. 点击左侧 **Storage**
2. 应看到两个 Bucket：
   - `resumes` (private)
   - `jd-files` (private)

如果未自动创建，手动创建：
1. 点击 **New Bucket**
2. 名称输入 `resumes`，取消勾选 "Public Bucket"
3. 重复创建 `jd-files` bucket

---

## 第三步：启动开发服务器

```bash
# 安装依赖（首次或 package.json 变更后）
npm install

# 启动开发服务器
npm run dev
```

服务器启动后访问：http://localhost:3000

---

## 第四步：创建首个顾问账号

1. 点击右上角 **顾问登录**
2. 点击 **注册账号**
3. 输入邮箱和密码
4. 首次注册的用户建议作为管理员使用

---

## 第五步：测试核心功能

### 5.1 发布测试职位

1. 登录后点击 **发布职位**
2. 填写职位信息（公司名会自动脱敏）
3. 提交后状态为 `published` 即成功

### 5.2 测试简历上传

1. 访问首页，点击任意职位
2. 点击 **投递简历**
3. 上传 PDF 或 DOCX 格式简历
4. 等待 AI 分析完成

### 5.3 查看 AI 评分

1. 登录顾问账号
2. 进入 **候选人管理**
3. 查看 AI 给出的评分和推荐理由

---

## 常见问题排查

### Q1: `npm run dev` 启动后立即退出

**原因**：端口被占用

**解决**：
```bash
# 修改 package.json 中的 dev 脚本
"dev": "next dev -p 3456"

# 或直接指定端口
npm run dev -- -p 3456
```

### Q2: Supabase 连接失败

**错误信息**：`AuthApiError: Invalid API key`

**原因**：`.env.local` 中的 Supabase URL 或 Key 不正确

**解决**：
1. 确认 `.env.local` 已保存到项目根目录
2. 重新复制 Supabase Dashboard 中的 URL 和 Key
3. 重启开发服务器

### Q3: 简历上传失败

**错误信息**：`StorageApiError: Bucket not found`

**原因**：Storage Bucket 未创建

**解决**：参考第二步 2.3 手动创建 Bucket

### Q4: AI 分析失败

**错误信息**：`OpenAI API error: Insufficient quota`

**原因**：OpenAI 账户余额不足

**解决**：
1. 访问 [OpenAI Billing](https://platform.openai.com/account/billing/overview)
2. 充值后重试

---

## 生产部署

### Vercel 部署（推荐）

1. 推送代码到 GitHub
2. 访问 [Vercel](https://vercel.com)
3. 点击 **New Project**
4. 选择你的 GitHub 仓库
5. 在 **Environment Variables** 中填入所有环境变量
6. 点击 **Deploy**

### 环境变量配置（生产）

在 Vercel 中添加以下环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_MODEL=gpt-4o
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

---

## 项目结构说明

```
ai-headhunter/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── upload/resume   # 简历上传
│   │   │   ├── ai/chat         # AI 对话
│   │   │   └── ai/analyze      # AI 分析
│   │   ├── auth/               # 认证页面
│   │   ├── consultant/         # 顾问后台
│   │   └── page.tsx            # 首页
│   ├── lib/                    # 工具库
│   │   ├── supabase/           # Supabase 客户端
│   │   └── ai/                # OpenAI 封装
│   └── components/             # React 组件
│       ├── job/                # 职位相关
│       └── candidate/          # 候选人相关
├── supabase/
│   └── schema.sql              # 数据库 Schema
├── .env.local                  # 环境变量（不提交）
└── README.md                   # 项目说明
```

---

## 需要帮助？

- **Supabase 文档**: https://supabase.com/docs
- **Next.js 文档**: https://nextjs.org/docs
- **OpenAI API 文档**: https://platform.openai.com/docs
