# -*- coding: utf-8 -*-
"""
腾讯云 COS 自动上传脚本 - ai-headhunter
请设置环境变量:
  - TENCENT_SECRET_ID: 腾讯云 Secret ID
  - TENCENT_SECRET_KEY: 腾讯云 Secret Key
  - TENCENT_REGION: 区域 (默认 ap-guangzhou)
  - TENCENT_APP_ID: APP ID
"""
import os
import sys
import mimetypes
from pathlib import Path

from qcloud_cos import CosConfig, CosS3Client

# 从环境变量读取（安全）
SECRET_ID = os.environ.get('TENCENT_SECRET_ID', 'YOUR_SECRET_ID')
SECRET_KEY = os.environ.get('TENCENT_SECRET_KEY', 'YOUR_SECRET_KEY')
REGION = os.environ.get('TENCENT_REGION', 'ap-guangzhou')
APPID = os.environ.get('TENCENT_APP_ID', 'YOUR_APP_ID')
BUCKET = f'ai-headhunter-{APPID}'

# 初始化客户端
config = CosConfig(Region=REGION, SecretId=SECRET_ID, SecretKey=SECRET_KEY)
client = CosS3Client(config)

project_dir = Path(__file__).parent

def upload_file(local_path, cos_key):
    """上传单个文件"""
    mime_type, _ = mimetypes.guess_type(str(local_path))
    if not mime_type:
        mime_type = 'application/octet-stream'

    with open(local_path, 'rb') as f:
        client.put_object(
            Bucket=BUCKET,
            Body=f,
            Key=cos_key,
            StorageClass='STANDARD',
            ContentType=mime_type,
        )

def upload_directory(local_dir, cos_prefix=''):
    """批量上传目录"""
    local_dir = Path(local_dir)
    uploaded = 0
    failed = 0
    errors = []

    files = [f for f in local_dir.rglob('*') if f.is_file()]
    total = len(files)
    print(f"准备上传 {total} 个文件...")

    for i, file_path in enumerate(files, 1):
        relative_path = file_path.relative_to(local_dir)
        cos_key = f"{cos_prefix}{relative_path}".replace('\\', '/')

        try:
            upload_file(file_path, cos_key)
            uploaded += 1
            if i % 50 == 0 or i == total:
                pct = int(i / total * 100)
                bar = '█' * (pct // 5) + '░' * (20 - pct // 5)
                print(f"\r  [{bar}] {pct}% ({i}/{total})", end='', flush=True)
        except Exception as e:
            failed += 1
            errors.append(f"{cos_key}: {str(e)[:80]}")

    print()  # 换行
    return uploaded, failed, errors

def enable_static_website():
    """开启静态网站"""
    try:
        client.put_bucket_website(
            Bucket=BUCKET,
            Website={
                'IndexDocument': {'Suffix': 'index.html'},
                'ErrorDocument': {'Key': '404.html'},
            }
        )
        print("✅ 静态网站已开启")
    except Exception as e:
        print(f"⚠️  静态网站配置失败: {e}")

def set_bucket_public_read():
    """设置 Bucket 为公读"""
    try:
        client.put_bucket_acl(
            Bucket=BUCKET,
            ACL='public-read',
        )
        print("✅ Bucket 已设置为公读")
    except Exception as e:
        print(f"⚠️  ACL 设置失败: {e}")

def main():
    print("=" * 55)
    print("  腾讯云 COS 文件上传 - AI猎头平台")
    print("=" * 55)
    print(f"  Bucket: {BUCKET}")
    print(f"  区域: {REGION}")
    print()

    # 1. 上传 .next/static（静态资源）
    static_dir = project_dir / '.next' / 'static'
    if static_dir.exists():
        print("📦 正在上传 .next/static (静态资源)...")
        up, fail, errs = upload_directory(static_dir, '_next/static/')
        print(f"   ✅ 成功: {up}  ❌ 失败: {fail}")

    # 2. 上传 public 目录
    public_dir = project_dir / 'public'
    if public_dir.exists():
        print("📦 正在上传 public (公共资源)...")
        up, fail, errs = upload_directory(public_dir, '')
        print(f"   ✅ 成功: {up}  ❌ 失败: {fail}")

    # 3. 上传 .next/server/app 目录（HTML 页面）
    app_dir = project_dir / '.next' / 'server' / 'app'
    if app_dir.exists():
        print("📦 正在上传 .next/server/app (HTML 页面)...")
        uploaded = 0
        failed = 0
        for file_path in app_dir.rglob('*.html'):
            relative = file_path.relative_to(app_dir)
            cos_key = str(relative).replace('\\', '/')
            try:
                upload_file(file_path, cos_key)
                uploaded += 1
            except Exception as e:
                failed += 1
        print(f"   ✅ 成功: {uploaded}  ❌ 失败: {failed}")

    # 4. 设置公读权限
    print()
    print("🔧 配置权限和静态网站...")
    set_bucket_public_read()
    enable_static_website()

    # 5. 打印访问地址
    website_url = f"https://{BUCKET}.cos-website.{REGION}.myqcloud.com"
    print()
    print("=" * 55)
    print("  🎉 部署完成!")
    print("=" * 55)
    print(f"  访问地址: {website_url}")
    print()

if __name__ == '__main__':
    main()
