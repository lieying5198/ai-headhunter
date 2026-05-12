# 创建腾讯云 COS Bucket 指南

## 步骤 1: 创建 COS Bucket

1. 打开 **腾讯云对象存储控制台**
   👉 https://console.cloud.tencent.com/cos/bucket

2. 点击 **『创建Bucket』** 按钮

3. 填写配置：
   ```
   存储桶名称: ai-headhunter-你的姓名
   地域: 广州 (ap-guangzhou)
   访问权限: 私有读写
   ```

4. 点击 **『创建』**

## 步骤 2: 获取 API 密钥

1. 打开 **访问密钥管理**
   👉 https://console.cloud.tencent.com/cam/capi

2. 点击 **『新建密钥』** (如果没有现有密钥)

3. 复制显示的：
   - SecretId
   - SecretKey

## 步骤 3: 把信息发给我

把以下信息发给我，我帮你自动上传：

1. COS Bucket 名称（格式: xxxx-1234567890）
2. SecretId
3. SecretKey

---

⚠️ 安全提示：这些密钥有权限操作你的云资源，谨慎保管！
