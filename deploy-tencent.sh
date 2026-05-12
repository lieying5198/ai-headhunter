#!/bin/bash
# Tencent Cloud COS 部署脚本
# ai-headhunter Next.js 应用部署

set -e

# ============================================
# 配置区域 - 请根据实际情况修改
# ============================================
COS_BUCKET="ai-headhunter-1234567890"      # 替换为你的 COS Bucket 名称
COS_REGION="ap-guangzhou"                   # COS 区域：ap-guangzhou=广州, ap-shanghai=上海, etc.
COS_PREFIX="ai-headhunter/"                  # 上传路径前缀

# ============================================
# 颜色输出
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# 步骤 1: 检查并安装 COS CLI
# ============================================
install_cos_cli() {
    log_info "步骤 1: 检查 COS CLI..."

    if command -v coscmd &> /dev/null; then
        log_info "COS CLI 已安装: $(coscmd --version)"
    else
        log_info "安装 COS CLI..."
        pip install cos-python-sdk-v5 -i https://pypi.tuna.tsinghua.edu.cn/simple
        pip install tccli -i https://pypi.tuna.tsinghua.edu.cn/simple

        log_warn "请先配置腾讯云凭证："
        log_warn "  运行: tccli configure"
        log_warn "  或访问: https://console.cloud.tencent.com/cam/capi"
        exit 1
    fi
}

# ============================================
# 步骤 2: 检查构建产物
# ============================================
check_build() {
    log_info "步骤 2: 检查构建产物..."

    if [ ! -d ".next" ]; then
        log_error "未找到 .next 目录，请先运行 npm run build"
        exit 1
    fi

    log_info "构建产物大小: $(du -sh .next | cut -f1)"
}

# ============================================
# 步骤 3: 上传到 COS
# ============================================
upload_to_cos() {
    log_info "步骤 3: 上传到 COS..."

    # 创建配置
    cos_config_file="/tmp/cos_config.ini"
    cat > $cos_config_file << EOF
[common]
secret_id = ${COS_SECRET_ID}
secret_key = ${COS_SECRET_KEY}
bucket = ${COS_BUCKET}
region = ${COS_REGION}
EOF

    log_info "上传文件到 COS..."

    # 上传所有文件
    coscmd -c $cos_config_file -s upload ./ ${COS_PREFIX} --force

    log_info "上传完成!"
}

# ============================================
# 步骤 4: 配置静态网站
# ============================================
config_website() {
    log_info "步骤 4: 配置静态网站托管..."

    # 注意: 静态网站需要额外的 API 服务支持
    log_warn "Next.js API 路由需要服务器端支持"
    log_warn "建议使用腾讯云 Web 应用托管或云函数 SCF"
}

# ============================================
# 主函数
# ============================================
main() {
    echo ""
    echo "=========================================="
    echo "  腾讯云 COS 部署脚本"
    echo "=========================================="
    echo ""

    # 检查环境变量
    if [ -z "$COS_SECRET_ID" ] || [ -z "$COS_SECRET_KEY" ]; then
        log_warn "请先设置环境变量:"
        echo "  export COS_SECRET_ID=你的SecretId"
        echo "  export COS_SECRET_KEY=你的SecretKey"
        echo ""
        log_warn "获取方式: https://console.cloud.tencent.com/cam/capi"
        echo ""
    fi

    # 执行部署步骤
    check_build
    install_cos_cli

    if [ -n "$COS_SECRET_ID" ] && [ -n "$COS_SECRET_KEY" ]; then
        upload_to_cos
        log_info "部署完成!"
    fi

    echo ""
    echo "=========================================="
    echo "  后续步骤"
    echo "=========================================="
    echo ""
    echo "1. 登录腾讯云控制台: https://console.cloud.tencent.com"
    echo "2. 进入对象存储 COS → 选择 Bucket"
    echo "3. 配置静态网站托管"
    echo "4. 绑定自定义域名（如需要）"
    echo ""
}

main "$@"
