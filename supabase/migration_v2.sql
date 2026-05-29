-- ============================================
-- 猎英盟 v2 数据库迁移
-- 包含：微信绑定表 + 扫码登录 + 管理员RLS
-- 在执行 basic schema 之后运行
-- ============================================

-- ============================================
-- 1. 微信绑定表 (wechats)
-- ============================================
CREATE TABLE IF NOT EXISTS wechats (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wechat_id   VARCHAR(100) NOT NULL,
  nickname    VARCHAR(200),
  avatar_url  TEXT,
  is_primary  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, wechat_id)
);
CREATE INDEX IF NOT EXISTS idx_wechats_user ON wechats(user_id);
CREATE INDEX IF NOT EXISTS idx_wechats_wechat ON wechats(wechat_id);

-- ============================================
-- 2. 扫码登录Token表 (auth_qr_tokens)
-- ============================================
CREATE TABLE IF NOT EXISTS auth_qr_tokens (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token         VARCHAR(64) UNIQUE NOT NULL,
  user_id       UUID REFERENCES auth.users(id),
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
  session_data  JSONB,          -- 确认后存储session信息
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  confirmed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_qr_token ON auth_qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qr_status ON auth_qr_tokens(status);

-- 自动清理过期token
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM auth_qr_tokens WHERE expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_tokens ON auth_qr_tokens;
CREATE TRIGGER trigger_cleanup_tokens
  AFTER INSERT ON auth_qr_tokens
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_expired_tokens();

-- ============================================
-- 3. 管理员 RLS 策略
-- ============================================

-- 辅助函数：判断当前用户是否为管理员
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM consultants
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- consultants: 管理员可读全部
DROP POLICY IF EXISTS "consultant_admin_read" ON consultants;
CREATE POLICY "consultant_admin_read" ON consultants
  FOR SELECT USING (is_admin());

-- hidden_company_profiles: 管理员全部权限
DROP POLICY IF EXISTS "hcp_admin_all" ON hidden_company_profiles;
CREATE POLICY "hcp_admin_all" ON hidden_company_profiles
  FOR ALL USING (is_admin());

-- jobs: 管理员全部权限
DROP POLICY IF EXISTS "jobs_admin_all" ON jobs;
CREATE POLICY "jobs_admin_all" ON jobs
  FOR ALL USING (is_admin());

-- 管理员可读所有 candidates
DROP POLICY IF EXISTS "candidates_admin_all" ON candidates;
CREATE POLICY "candidates_admin_all" ON candidates
  FOR ALL USING (is_admin());

-- 管理员可读所有 resumes
DROP POLICY IF EXISTS "resumes_admin_all" ON resumes;
CREATE POLICY "resumes_admin_all" ON resumes
  FOR ALL USING (is_admin());

-- 管理员可读所有 ai_conversations
DROP POLICY IF EXISTS "conversations_admin_all" ON ai_conversations;
CREATE POLICY "conversations_admin_all" ON ai_conversations
  FOR SELECT USING (is_admin());

-- 管理员可读所有 ai_scores
DROP POLICY IF EXISTS "scores_admin_all" ON ai_scores;
CREATE POLICY "scores_admin_all" ON ai_scores
  FOR ALL USING (is_admin());

-- 管理员可操作所有 notification_subscriptions
DROP POLICY IF EXISTS "notif_admin_all" ON notification_subscriptions;
CREATE POLICY "notif_admin_all" ON notification_subscriptions
  FOR ALL USING (is_admin());

-- 管理员可操作 wechats 表
ALTER TABLE wechats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wechats_self_all" ON wechats;
CREATE POLICY "wechats_self_all" ON wechats
  FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "wechats_admin_all" ON wechats;
CREATE POLICY "wechats_admin_all" ON wechats
  FOR ALL USING (is_admin());

-- 管理员可操作 auth_qr_tokens  
ALTER TABLE auth_qr_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qrtokens_admin_all" ON auth_qr_tokens
  FOR ALL USING (is_admin());
-- Service role 可写（API调用用service key）
CREATE POLICY "qrtokens_service_insert" ON auth_qr_tokens
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "qrtokens_service_select" ON auth_qr_tokens
  FOR SELECT USING (TRUE);
CREATE POLICY "qrtokens_service_update" ON auth_qr_tokens
  FOR UPDATE USING (TRUE);

-- ============================================
-- 4. 修复已有管理员（确保你的账号是admin）
-- 将指定邮箱设为管理员，请替换为你的邮箱
-- ============================================
-- UPDATE consultants SET role = 'admin' WHERE email = 'your@email.com';

-- ============================================
-- 验证迁移结果
-- ============================================
SELECT 'v2 Migration 完成!' as status;

-- 查看当前 tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
