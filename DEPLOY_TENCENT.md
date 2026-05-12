# 腾讯云 Web 应用托管部署指南

## 支持的部署方式

### 方式一：CloudBase CLI（推荐）

```bash
# 1. 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 2. 登录腾讯云
tcb login

# 3. 初始化项目（如果还没初始化）
tcb framework init

# 4. 部署
tcb framework deploy
```

### 方式二：从 Git 仓库自动部署（最简单）

1. 登录 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 进入「Web 应用托管」
3. 点击「创建应用」
4. 选择你的 Git 仓库（GitHub/GitLab/私库）
5. 框架自动识别为 Next.js
6. 设置环境变量（见下方）
7. 点击部署

## 环境变量配置

在 CloudBase 控制台「环境变量」中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase 项目地址 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_xxx` | Supabase 公开密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_xxx` | Supabase 服务密钥（私密） |
| `SILICONFLOW_API_KEY` | `sk-xxx` | 硅基流动 API 密钥 |
| `SILICONFLOW_MODEL` | `Qwen/Qwen2.5-72B-Instruct` | 默认模型 |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.cloudbase.net` | 部署后填入你的域名 |

> ⚠️ **重要**: 请在 CloudBase 控制台添加真实的环境变量值，不要将真实密钥提交到 Git！

## 绑定自定义域名（可选）

1. 在 CloudBase 控制台进入「域名管理」
2. 添加你的域名
3. 配置 DNS 解析（添加 CNAME 记录）
4. 申请 SSL 证书（CloudBase 自动申请）

## 常见问题

### Q: 部署失败怎么办？
A: 查看 CloudBase 控制台的「构建日志」，常见问题：
- Node.js 版本不兼容 → 在 cloudbase.json 中指定
- 依赖安装失败 → 检查 package.json

### Q: 如何查看日志？
A: CloudBase 控制台 → 你的应用 → 「日志」

### Q: 如何开启自动部署？
A: 在 Git 仓库设置 Webhook，提交代码后自动触发部署
