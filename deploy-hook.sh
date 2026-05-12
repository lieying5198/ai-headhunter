#!/bin/bash
# GitHub Webhook 自动部署脚本
# 放在服务器上，配合 GitHub Webhook 使用

# ============== 配置 ==============
REPO_DIR="/opt/ai-headhunter"
GITHUB_REPO="https://github.com/YOUR_USERNAME/ai-headhunter.git"
BRANCH="main"
APP_NAME="ai-headhunter"
PM2_APP_NAME="ai-headhunter"

# 如果是私有仓库，需要创建 SSH 部署密钥或使用 token
# GITHUB_TOKEN="ghp_xxxxxxxxxxxxx"
# REPO_URL="https://${GITHUB_TOKEN}@github.com/YOUR_USERNAME/ai-headhunter.git"

# =================================

cd $REPO_DIR || exit

echo "========== $(date) =========="
echo "开始部署..."

# 方式一：使用 git pull（如果已经 clone 过了）
if [ -d ".git" ]; then
    echo "使用 git pull 方式..."
    git fetch origin $BRANCH
    git reset --hard origin/$BRANCH
else
    echo "首次部署，克隆仓库..."
    # 如果是私有仓库，改用：
    # git clone --branch $BRANCH $REPO_URL $REPO_DIR
    git clone --branch $BRANCH $GITHUB_REPO $REPO_DIR
fi

# 安装依赖
echo "安装依赖..."
npm install

# 构建
echo "构建项目..."
npm run build

# 重启 PM2
echo "重启服务..."
pm2 restart $PM2_APP_NAME --update-env || pm2 start npm --name $PM2_APP_NAME -- start

# 查看状态
pm2 status

echo "========== 部署完成 =========="
