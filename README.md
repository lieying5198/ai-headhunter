# AI猎头平台 (ai-headhunter)

> 一人猎头的AI加速器 — 用AI做信息不对称的生意

## 项目简介

基于 Next.js 14 + Supabase + OpenAI 的 AI 猎头招聘平台 MVP：
- **候选人端**：浏览脱敏职位、AI客服问答、一键投递简历
- **顾问后台**：AI解析JD并自动脱敏、候选人管理、AI初筛评分

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | Next.js 14 App Router |
| 样式 | Tailwind CSS |
| 数据库 | Supabase (PostgreSQL + RLS) |
| 认证 | Supabase Auth |
| AI | OpenAI GPT-4o（结构化输出 + 流式SSE）|
| 部署 | Vercel |

## 快速开始

### 1. 克隆并安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，填写：

| 变量 | 来源 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目设置 → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 项目设置 → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 项目设置 → API（服务角色密钥）|
| `OPENAI_API_KEY` | platform.openai.com |

### 3. 初始化数据库

在 Supabase SQL Editor 中执行：

```bash
# 打开 supabase/schema.sql 并在 Supabase 执行
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 功能路由

| 路由 | 说明 | 用户 |
|---|---|---|
| `/` | 职位列表（筛选+搜索）| 候选人 |
| `/jobs/[id]` | 职位详情（脱敏JD）| 候选人 |
| `/jobs/[id]/chat` | AI职位客服（SSE流式）| 候选人 |
| `/upload?jobId=xxx` | 上传简历 + AI初筛结果 | 候选人 |
| `/auth/login` | 顾问登录/注册 | 顾问 |
| `/consultant/jobs` | 职位列表管理 | 顾问 |
| `/consultant/import` | AI导入JD（4步骤）| 顾问 |
| `/consultant/candidates` | 候选人管理（主从布局）| 顾问 |

## API 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/jobs` | 获取已发布职位（筛选+分页）|
| POST | `/api/jobs` | 创建职位（顾问）|
| GET | `/api/jobs/[id]` | 职位详情（自增浏览量）|
| PUT | `/api/jobs/[id]` | 更新职位状态 |
| POST | `/api/ai/parse-jd` | AI解析+脱敏JD |
| POST | `/api/ai/chat` | AI客服对话（SSE流式）|
| POST | `/api/upload/resume` | 上传简历 + AI初筛 |
| GET | `/api/candidates` | 候选人列表（筛选+分页）|
| PUT | `/api/candidates/[id]` | 更新候选人状态 |

## 核心 AI 能力

### 1. JD 解析 (`parseJD`)
- 输入：原始JD文本或PDF/DOCX文件
- 输出：结构化JSON（职位/行业/职责/要求/薪资/标签）

### 2. JD 脱敏 (`anonymizeJD`)
- 自动模糊公司名、人名、财务数据
- 保留职责描述、薪资范围、任职要求

### 3. 简历初筛 (`screenResume`)
- 5个维度评分：行业匹配、职级匹配、稳定性、管理经验、项目经验
- 综合评级 A/B/C/D + 推荐理由 + 风险提示

### 4. AI 职位客服 (SSE流式)
- 系统Prompt严格保护公司信息
- 会话持久化到 `ai_conversations` 表

## 数据库表结构

```
jobs                  - 职位信息（含脱敏JD和hidden_company_id关联）
hidden_company_profiles - 隐藏公司信息（与职位分离存储）
candidates            - 候选人
resumes               - 简历（关联候选人+职位）
ai_scores             - AI初筛评分记录
ai_conversations      - AI对话历史
consultants           - 顾问用户（关联Supabase Auth）
```

## 部署到 Vercel

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 部署
vercel --prod

# 3. 在 Vercel 设置中添加环境变量（同 .env.local）
```

完整部署指南见 `DEPLOY.md`

## 项目结构

```
src/
├── app/
│   ├── api/              # API 路由
│   ├── auth/login/       # 顾问登录
│   ├── consultant/       # 顾问后台（受Auth保护）
│   ├── jobs/[id]/        # 职位详情+AI聊天
│   └── upload/           # 简历上传
├── components/
│   ├── ConsultantNav.tsx  # 顾问导航栏
│   └── job/JobListPage.tsx # 职位列表页
└── lib/
    ├── ai/openai.ts       # OpenAI 封装（懒加载）
    ├── supabase/          # Supabase 客户端
    └── utils/             # 工具函数
```
