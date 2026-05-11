#!/bin/bash
# AI猎头平台 - 环境配置验证脚本

echo "==========================================="
echo "  AI猎头平台 - 配置检查工具"
echo "==========================================="
echo ""

# 读取 .env.local
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local 文件不存在"
    echo "   请复制 .env.local.example 为 .env.local"
    exit 1
fi

echo "✅ .env.local 文件存在"
echo ""

# 检查 Supabase 配置
echo "--- Supabase 配置检查 ---"
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
SUPABASE_ANON=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d '=' -f2)
SUPABASE_SERVICE=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f2)

if [[ "$SUPABASE_URL" == *"your-project"* ]]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL 仍是占位符"
    echo "   请替换为你的 Supabase 项目 URL"
else
    echo "✅ NEXT_PUBLIC_SUPABASE_URL 已配置: $SUPABASE_URL"
fi

if [[ "$SUPABASE_ANON" == *"your-anon-key"* ]]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY 仍是占位符"
else
    echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY 已配置"
fi

if [[ "$SUPABASE_SERVICE" == *"your-service-role-key"* ]]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY 仍是占位符"
else
    echo "✅ SUPABASE_SERVICE_ROLE_KEY 已配置"
fi

echo ""

# 检查 OpenAI 配置
echo "--- OpenAI 配置检查 ---"
OPENAI_KEY=$(grep OPENAI_API_KEY .env.local | cut -d '=' -f2)
OPENAI_MODEL=$(grep OPENAI_MODEL .env.local | cut -d '=' -f2)

if [[ "$OPENAI_KEY" == *"sk-your"* ]]; then
    echo "❌ OPENAI_API_KEY 仍是占位符"
    echo "   请替换为你的 OpenAI API Key"
else
    echo "✅ OPENAI_API_KEY 已配置"
fi

echo "✅ OPENAI_MODEL: $OPENAI_MODEL"
echo ""

# 检查 App 配置
echo "--- App 配置检查 ---"
APP_URL=$(grep NEXT_PUBLIC_APP_URL .env.local | cut -d '=' -f2)
echo "✅ NEXT_PUBLIC_APP_URL: $APP_URL"
echo ""

# 总结
echo "==========================================="
echo "  配置总结"
echo "==========================================="
echo ""
echo "下一步操作："
echo ""
echo "1. 完成 .env.local 配置"
echo "   - 创建 Supabase 项目: https://supabase.com"
echo "   - 获取 URL 和 Keys: https://supabase.com/dashboard/project/_/settings/api"
echo "   - 获取 OpenAI API Key: https://platform.openai.com/api-keys"
echo ""
echo "2. 在 Supabase SQL Editor 中执行数据库 Schema"
echo "   文件位置: supabase/schema.sql"
echo "   打开 Supabase Dashboard > SQL Editor > New Query"
echo "   粘贴 schema.sql 内容并执行"
echo ""
echo "3. 创建 Storage Bucket (如果 SQL 中 INSERT 失败)"
echo "   打开 Supabase Dashboard > Storage > New Bucket"
echo "   - 创建 'resumes' bucket (private)"
echo "   - 创建 'jd-files' bucket (private)"
echo ""
echo "4. 启动开发服务器"
echo "   npm run dev"
echo "   访问 http://localhost:3000"
echo ""
echo "5. 注册第一个顾问账号"
echo "   点击右上角'顾问登录' -> '注册账号'"
echo "   首个注册用户建议用作管理员"
echo ""
echo "==========================================="
echo "  快速测试命令"
echo "==========================================="
echo ""
echo "# 启动开发服务器"
echo "npm run dev"
echo ""
echo "# 构建生产版本"
echo "npm run build"
echo ""
echo "# 启动生产服务器"
echo "npm run start"
echo ""
