# AI猎头平台 - 环境配置验证脚本 (PowerShell)
# 使用方法: .\setup-check.ps1

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  AI猎头平台 - 配置检查工具" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# 读取 .env.local
if (-not (Test-Path ".env.local")) {
    Write-Host "❌ .env.local 文件不存在" -ForegroundColor Red
    Write-Host "   请复制 .env.local.example 为 .env.local" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ .env.local 文件存在" -ForegroundColor Green
Write-Host ""

# 读取环境变量
$envContent = Get-Content ".env.local" -Raw

# 检查 Supabase 配置
Write-Host "--- Supabase 配置检查 ---" -ForegroundColor Yellow
$supabaseUrl = ($envContent | Select-String "NEXT_PUBLIC_SUPABASE_URL=(.*)").Matches.Groups[1].Value
$supabaseAnon = ($envContent | Select-String "NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)").Matches.Groups[1].Value
$supabaseService = ($envContent | Select-String "SUPABASE_SERVICE_ROLE_KEY=(.*)").Matches.Groups[1].Value

if ($supabaseUrl -like "*your-project*") {
    Write-Host "❌ NEXT_PUBLIC_SUPABASE_URL 仍是占位符" -ForegroundColor Red
    Write-Host "   请替换为你的 Supabase 项目 URL" -ForegroundColor Yellow
} else {
    Write-Host "✅ NEXT_PUBLIC_SUPABASE_URL 已配置: $supabaseUrl" -ForegroundColor Green
}

if ($supabaseAnon -like "*your-anon-key*") {
    Write-Host "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY 仍是占位符" -ForegroundColor Red
} else {
    Write-Host "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY 已配置" -ForegroundColor Green
}

if ($supabaseService -like "*your-service-role-key*") {
    Write-Host "❌ SUPABASE_SERVICE_ROLE_KEY 仍是占位符" -ForegroundColor Red
} else {
    Write-Host "✅ SUPABASE_SERVICE_ROLE_KEY 已配置" -ForegroundColor Green
}

Write-Host ""

# 检查 OpenAI 配置
Write-Host "--- OpenAI 配置检查 ---" -ForegroundColor Yellow
$openaiKey = ($envContent | Select-String "OPENAI_API_KEY=(.*)").Matches.Groups[1].Value
$openaiModel = ($envContent | Select-String "OPENAI_MODEL=(.*)").Matches.Groups[1].Value

if ($openaiKey -like "*sk-your*") {
    Write-Host "❌ OPENAI_API_KEY 仍是占位符" -ForegroundColor Red
    Write-Host "   请替换为你的 OpenAI API Key" -ForegroundColor Yellow
} else {
    Write-Host "✅ OPENAI_API_KEY 已配置" -ForegroundColor Green
}

Write-Host "✅ OPENAI_MODEL: $openaiModel" -ForegroundColor Green
Write-Host ""

# 检查 App 配置
Write-Host "--- App 配置检查 ---" -ForegroundColor Yellow
$appUrl = ($envContent | Select-String "NEXT_PUBLIC_APP_URL=(.*)").Matches.Groups[1].Value
Write-Host "✅ NEXT_PUBLIC_APP_URL: $appUrl" -ForegroundColor Green
Write-Host ""

# 总结
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  配置总结" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

$allConfigured = 
    ($supabaseUrl -notlike "*your-project*") -and
    ($supabaseAnon -notlike "*your-anon-key*") -and
    ($supabaseService -notlike "*your-service-role-key*") -and
    ($openaiKey -notlike "*sk-your*")

if ($allConfigured) {
    Write-Host "✅ 所有环境变量已配置完成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "现在可以:" -ForegroundColor Yellow
    Write-Host "  1. 执行数据库 Schema (supabase/schema.sql)"
    Write-Host "  2. 运行 npm run dev 启动开发服务器"
    Write-Host "  3. 访问 http://localhost:3000 开始使用"
} else {
    Write-Host "⚠️  部分环境变量仍需配置" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "下一步操作：" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. 完成 .env.local 配置"
    Write-Host "   - 创建 Supabase 项目: https://supabase.com"
    Write-Host "   - 获取 URL 和 Keys: https://supabase.com/dashboard/project/_/settings/api"
    Write-Host "   - 获取 OpenAI API Key: https://platform.openai.com/api-keys"
    Write-Host ""
    Write-Host "2. 在 Supabase SQL Editor 中执行数据库 Schema"
    Write-Host "   文件位置: supabase/schema.sql"
    Write-Host "   打开 Supabase Dashboard > SQL Editor > New Query"
    Write-Host "   粘贴 schema.sql 内容并执行"
    Write-Host ""
    Write-Host "3. 创建 Storage Bucket (如果 SQL 中 INSERT 失败)"
    Write-Host "   打开 Supabase Dashboard > Storage > New Bucket"
    Write-Host "   - 创建 'resumes' bucket (private)"
    Write-Host "   - 创建 'jd-files' bucket (private)"
    Write-Host ""
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  快速测试命令" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "# 启动开发服务器"
Write-Host "npm run dev"
Write-Host ""
Write-Host "# 构建生产版本"
Write-Host "npm run build"
Write-Host ""
Write-Host "# 启动生产服务器"
Write-Host "npm run start"
Write-Host ""
