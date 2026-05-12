# Tencent Cloud COS 部署脚本 - Windows PowerShell 版本
# ai-headhunter Next.js 应用部署
# 使用方法: 右键 → 用 PowerShell 运行

# ============================================
# 配置区域 - 请根据实际情况修改
# ============================================
$COS_BUCKET = "ai-headhunter-1234567890"      # 替换为你的 COS Bucket 名称
$COS_REGION = "ap-guangzhou"                   # COS 区域
$COS_PREFIX = "ai-headhunter/"                 # 上传路径前缀

# ============================================
# 颜色
# ============================================
function Write-Info { Write-Host "[INFO]" -ForegroundColor Green $args }
function Write-Warn { Write-Host "[WARN]" -ForegroundColor Yellow $args }
function Write-Err { Write-Host "[ERROR]" -ForegroundColor Red $args }

# ============================================
# 主流程
# ============================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  腾讯云 COS 部署向导" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查构建产物
Write-Info "检查构建产物..."
if (-not (Test-Path ".next")) {
    Write-Err "未找到 .next 目录"
    Write-Host "请先运行: npm run build"
    Read-Host "按 Enter 退出"
    exit 1
}
Write-Info "构建产物大小: $((Get-ChildItem .next -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB) MB"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  步骤 1: 创建 COS Bucket" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 打开浏览器访问: https://console.cloud.tencent.com/cos/bucket"
Write-Host "2. 点击『创建Bucket』按钮"
Write-Host "3. 填写信息:"
Write-Host "   - 名称: ai-headhunter-你的姓名"
Write-Host "   - 地域: 选择离你最近的区域 (如: 广州)"
Write-Host "   - 访问权限: 私有读写"
Write-Host "4. 点击创建"
Write-Host ""

$createBucket = Read-Host "Bucket 创建好了吗? (y/n)"
if ($createBucket -ne "y") {
    Write-Host "请先创建 Bucket 后再继续"
    Read-Host "按 Enter 退出"
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  步骤 2: 获取 API 密钥" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 打开: https://console.cloud.tencent.com/cam/capi"
Write-Host "2. 点击『新建密钥』按钮"
Write-Host "3. 复制显示的 SecretId 和 SecretKey"
Write-Host ""

$COS_SECRET_ID = Read-Host "请输入 SecretId"
$COS_SECRET_KEY = Read-Host "请输入 SecretKey" -AsSecureString
$COS_SECRET_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($COS_SECRET_KEY))

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  步骤 3: 安装 COS CLI 工具" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 pip
if (-not (Get-Command pip -ErrorAction SilentlyContinue)) {
    Write-Info "安装 pip..."
    python -m ensurepip --default-pip
}

Write-Info "安装腾讯云 CLI..."
pip install tccli -i https://pypi.tuna.tsinghua.edu.cn/simple --quiet

Write-Info "配置凭证..."
tccli configure set --secretId $COS_SECRET_ID --secretKey $COS_SECRET_KEY --region $COS_REGION

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  步骤 4: 上传文件到 COS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 更新配置中的 Bucket 名称
Write-Host "请在控制台确认你的 Bucket 完整名称 (格式: xxx-1234567890)"
$COS_BUCKET = Read-Host "Bucket 名称"

Write-Info "开始上传..."
Write-Host "这可能需要几分钟，请耐心等待..."
Write-Host ""

# 使用 COS CLI 上传
$uploadCmd = "coscli sync . cos://$COS_BUCKET/$COS_PREFIX"
Write-Host "执行: $uploadCmd"

# 检查是否有 coscli
$hasCoscli = Get-Command coscli -ErrorAction SilentlyContinue
if (-not $hasCoscli) {
    Write-Info "安装 COSCLI..."
    pip install coscli -i https://pypi.tuna.tsinghua.edu.cn/simple --quiet
}

try {
    # 创建配置文件
    $cosConfigPath = "$env:USERPROFILE\.cos.yaml"
    @"
cos:
  bucket: $COS_BUCKET
  region: $COS_REGION
  secretid: $COS_SECRET_ID
  secretkey: $COS_SECRET_KEY
"@ | Out-File -FilePath $cosConfigPath -Encoding utf8

    coscli sync . "cos://$COS_BUCKET/$COS_PREFIX" --force
    Write-Info "上传完成!"
} catch {
    Write-Warn "上传遇到问题，请手动操作"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  步骤 5: 配置静态网站" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 在 COS 控制台点击你的 Bucket"
Write-Host "2. 左侧菜单 → 『基础配置』→『静态网站』"
Write-Host "3. 点击『编辑』"
Write-Host "   - 状态: 开启"
Write-Host "   - 索引文档: index.html"
Write-Host "   - 错误文档: index.html"
Write-Host "4. 点击保存"
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  步骤 6: 获取访问地址" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "静态网站配置完成后，访问地址为:"
Write-Host "  https://$COS_BUCKET.cos-website.$COS_REGION.myqcloud.com"
Write-Host ""
Write-Host "或者绑定自定义域名:"
Write-Host "  基础配置 → 域名管理 → 添加域名"
Write-Host ""

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  部署向导完成!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️ 注意: Next.js API 路由需要服务器端支持"
Write-Host "如需完整功能，建议使用腾讯云 Web 应用托管"
Write-Host ""

Read-Host "按 Enter 退出"
