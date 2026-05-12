# -*- coding: utf-8 -*-
"""
腾讯云 COS 文件上传工具
自动上传 ai-headhunter 构建产物到腾讯云
"""

import os
import sys
import json
from pathlib import Path

try:
    from qcloud_cos import CosConfig
    from qcloud_cos import CosS3Client
except ImportError:
    print("[ERROR] 请先安装腾讯云 COS SDK:")
    print("  pip install cos-python-sdk-v5")
    sys.exit(1)

# ============================================
# 配置区域 - 请修改以下信息
# ============================================
COS_SECRET_ID = ""      # 你的 SecretId
COS_SECRET_KEY = ""     # 你的 SecretKey
COS_REGION = "ap-guangzhou"  # 区域: ap-guangzhou, ap-shanghai, ap-beijing 等
COS_BUCKET = ""        # Bucket 名称，格式: xxxx-1234567890

# 上传路径前缀
UPLOAD_PREFIX = "ai-headhunter/"

# ============================================
# 颜色输出
# ============================================
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'

def log_info(msg): print(f"{Colors.GREEN}[INFO]{Colors.NC} {msg}")
def log_warn(msg): print(f"{Colors.YELLOW}[WARN]{Colors.NC} {msg}")
def log_error(msg): print(f"{Colors.RED}[ERROR]{Colors.NC} {msg}")
def log_step(msg): print(f"\n{Colors.BLUE}{'='*50}{Colors.NC}")
def log_step_end(msg): print(f"{Colors.BLUE}{'='*50}{Colors.NC}\n")

# ============================================
# 主程序
# ============================================
def main():
    print(f"""
{Colors.BLUE}╔══════════════════════════════════════════════════════╗{Colors.NC}
{Colors.BLUE}║     腾讯云 COS 文件上传工具 - AI猎头平台              ║{Colors.NC}
{Colors.BLUE}╚══════════════════════════════════════════════════════╝{Colors.NC}
    """)

    # 检查配置
    if not COS_SECRET_ID or not COS_SECRET_KEY:
        log_error("请先配置 COS_SECRET_ID 和 COS_SECRET_KEY")
        print("""
获取方式:
1. 打开: https://console.cloud.tencent.com/cam/capi
2. 创建一个子账号或使用主账号
3. 复制 SecretId 和 SecretKey
4. 修改本文件的第 17-18 行

或者直接在下方输入:
        """)
        COS_SECRET_ID = input("请输入 SecretId: ").strip()
        COS_SECRET_KEY = input("请输入 SecretKey: ").strip()

    if not COS_BUCKET:
        log_info("请输入 COS Bucket 名称 (格式: xxxx-1234567890):")
        COS_BUCKET = input().strip()

    # 获取项目根目录
    project_dir = Path(__file__).parent
    build_dir = project_dir / ".next"

    if not build_dir.exists():
        log_error(f"未找到构建目录: {build_dir}")
        log_info("请先运行: npm run build")
        return

    log_step("步骤 1: 检查文件")
    log_info(f"构建目录: {build_dir}")
    log_info(f"文件数量: {len(list(build_dir.rglob('*')))}")

    # 计算大小
    total_size = sum(f.stat().st_size for f in build_dir.rglob('*') if f.is_file())
    log_info(f"总大小: {total_size / 1024 / 1024:.1f} MB")

    # 配置 COS 客户端
    log_step("步骤 2: 连接腾讯云")
    log_info("初始化 COS 客户端...")

    config = CosConfig(
        Region=COS_REGION,
        SecretId=COS_SECRET_ID,
        SecretKey=COS_SECRET_KEY,
    )
    client = CosS3Client(config)

    # 上传文件
    log_step("步骤 3: 上传文件")
    log_info(f"上传到: cos://{COS_BUCKET}/{UPLOAD_PREFIX}")

    uploaded = 0
    failed = 0

    for file_path in build_dir.rglob('*'):
        if file_path.is_file():
            relative_path = file_path.relative_to(build_dir)
            cos_key = f"{UPLOAD_PREFIX}{relative_path}"

            try:
                # 计算相对路径
                local_file = str(file_path)

                # 上传文件
                with open(local_file, 'rb') as f:
                    client.put_object(
                        Bucket=COS_BUCKET,
                        Body=f,
                        Key=cos_key,
                        StorageClass='STANDARD'
                    )

                uploaded += 1
                if uploaded % 100 == 0:
                    log_info(f"已上传: {uploaded} 个文件...")

            except Exception as e:
                failed += 1
                if failed <= 5:
                    log_warn(f"上传失败: {cos_key} - {str(e)[:50]}")

    log_step_end("上传完成")

    log_info(f"✅ 成功上传: {uploaded} 个文件")
    if failed > 0:
        log_warn(f"❌ 失败: {failed} 个文件")

    # 打印访问地址
    log_step("部署信息")
    website_url = f"https://{COS_BUCKET}.cos-website.{COS_REGION}.myqcloud.com"
    log_info(f"静态网站地址: {website_url}")

    print("""
下一步操作:
1. 登录腾讯云控制台: https://console.cloud.tencent.com/cos/bucket
2. 进入你的 Bucket
3. 基础配置 → 静态网站 → 开启
4. 配置索引文档: index.html
    """)

if __name__ == "__main__":
    main()
