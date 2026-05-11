-- ==============================================
-- AI猎头平台 Supabase 完整数据库 Schema
-- 执行顺序：在Supabase SQL Editor中完整执行
-- ==============================================

-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 枚举类型
-- ==============================================
CREATE TYPE user_role AS ENUM ('admin', 'consultant');
CREATE TYPE job_status AS ENUM ('draft', 'processing', 'published', 'closed');
CREATE TYPE candidate_status AS ENUM (
  'new', 'screening', 'screened', 'contacted',
  'interviewing', 'offered', 'hired', 'rejected'
);
CREATE TYPE score_grade AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE file_type AS ENUM ('pdf', 'docx', 'xlsx', 'txt');

-- ==============================================
-- 1. 猎头顾问表 (consultants)
-- 与 Supabase Auth 关联
-- ==============================================
CREATE TABLE consultants (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       VARCHAR(255) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  phone       VARCHAR(20),
  role        user_role DEFAULT 'consultant',
  company     VARCHAR(100),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 2. 脱敏公司档案表 (hidden_company_profiles)
-- ==============================================
CREATE TABLE hidden_company_profiles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  real_name        VARCHAR(200) NOT NULL,
  anonymized_name  VARCHAR(200) NOT NULL,
  industry         VARCHAR(100),
  description      TEXT,
  scale            VARCHAR(50),   -- '初创(<50人)', '中型(50-500人)', '大型(>500人)', '上市公司'
  stage            VARCHAR(50),   -- '天使轮', 'A轮', 'B轮', 'IPO', '上市'
  is_listed        BOOLEAN DEFAULT FALSE,
  created_by       UUID REFERENCES consultants(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 3. 职位表 (jobs)
-- ==============================================
CREATE TABLE jobs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id       UUID REFERENCES consultants(id) ON DELETE SET NULL,
  hidden_company_id   UUID REFERENCES hidden_company_profiles(id) ON DELETE SET NULL,

  -- 基础信息
  title               VARCHAR(200) NOT NULL,
  industry            VARCHAR(100),
  job_function        VARCHAR(100),
  city                VARCHAR(100),
  salary_min          INTEGER,         -- 万/年
  salary_max          INTEGER,         -- 万/年
  level               VARCHAR(50),     -- '初级', '中级', '高级', '专家', '总监', 'VP', 'C-level'

  -- 内容字段
  raw_jd              TEXT,            -- 原始JD（仅顾问可见）
  anonymized_jd       TEXT,            -- 脱敏后JD（公开显示）
  summary             TEXT,            -- AI生成的摘要（50-80字）
  tags                JSONB DEFAULT '[]',
  requirements        JSONB DEFAULT '[]',
  responsibilities    JSONB DEFAULT '[]',

  -- 状态
  status              job_status DEFAULT 'draft',
  is_published        BOOLEAN DEFAULT FALSE,

  -- 统计
  view_count          INTEGER DEFAULT 0,
  apply_count         INTEGER DEFAULT 0,

  -- 时间
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 4. 候选人表 (candidates)
-- ==============================================
CREATE TABLE candidates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(100) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(20),
  current_company   VARCHAR(200),
  current_title     VARCHAR(200),
  current_industry  VARCHAR(100),
  years_exp         INTEGER,
  status            candidate_status DEFAULT 'new',
  source            VARCHAR(50) DEFAULT 'platform',  -- 'platform', 'referral', 'headhunt'
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 5. 简历表 (resumes)
-- ==============================================
CREATE TABLE resumes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id  UUID REFERENCES candidates(id) ON DELETE CASCADE,
  job_id        UUID REFERENCES jobs(id) ON DELETE SET NULL,
  file_url      TEXT NOT NULL,           -- Supabase Storage URL
  file_name     VARCHAR(255),
  file_type     VARCHAR(20),
  file_size     INTEGER,                 -- bytes
  parsed_text   TEXT,                    -- 解析后纯文本
  parsed_data   JSONB,                   -- 结构化数据
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 6. AI对话表 (ai_conversations)
-- ==============================================
CREATE TABLE ai_conversations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id        UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id  UUID REFERENCES candidates(id) ON DELETE SET NULL,
  session_id    VARCHAR(100) NOT NULL,
  messages      JSONB DEFAULT '[]',   -- [{role, content, timestamp}]
  context       JSONB DEFAULT '{}',   -- 存储职位脱敏上下文
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 7. AI评分表 (ai_scores)
-- ==============================================
CREATE TABLE ai_scores (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id     UUID REFERENCES candidates(id) ON DELETE CASCADE,
  job_id           UUID REFERENCES jobs(id) ON DELETE CASCADE,
  resume_id        UUID REFERENCES resumes(id) ON DELETE SET NULL,

  -- 评分维度 (0-100)
  industry_match   INTEGER CHECK (industry_match BETWEEN 0 AND 100),
  level_match      INTEGER CHECK (level_match BETWEEN 0 AND 100),
  stability        INTEGER CHECK (stability BETWEEN 0 AND 100),
  management_exp   INTEGER CHECK (management_exp BETWEEN 0 AND 100),
  project_exp      INTEGER CHECK (project_exp BETWEEN 0 AND 100),

  -- 综合结果
  overall_score    score_grade,
  overall_numeric  INTEGER CHECK (overall_numeric BETWEEN 0 AND 100),
  recommendation   TEXT,
  risks            TEXT,
  summary          TEXT,

  -- AI原始输出（调试用）
  raw_response     TEXT,

  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 8. 通知订阅表 (notification_subscriptions)
-- ==============================================
CREATE TABLE notification_subscriptions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id  UUID REFERENCES consultants(id) ON DELETE CASCADE,
  channel        VARCHAR(20) NOT NULL,  -- 'serverchan', 'pushplus', 'email'
  webhook_url    TEXT,
  token          TEXT,
  events         JSONB DEFAULT '["candidate.new","candidate.screening.done"]',
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 索引
-- ==============================================
CREATE INDEX idx_jobs_consultant     ON jobs(consultant_id);
CREATE INDEX idx_jobs_industry       ON jobs(industry);
CREATE INDEX idx_jobs_function       ON jobs(job_function);
CREATE INDEX idx_jobs_city           ON jobs(city);
CREATE INDEX idx_jobs_published      ON jobs(is_published) WHERE is_published = TRUE;
CREATE INDEX idx_jobs_status         ON jobs(status);
CREATE INDEX idx_jobs_created_at     ON jobs(created_at DESC);

CREATE INDEX idx_candidates_status   ON candidates(status);
CREATE INDEX idx_candidates_email    ON candidates(email);

CREATE INDEX idx_resumes_candidate   ON resumes(candidate_id);
CREATE INDEX idx_resumes_job         ON resumes(job_id);

CREATE INDEX idx_scores_candidate    ON ai_scores(candidate_id);
CREATE INDEX idx_scores_job          ON ai_scores(job_id);
CREATE INDEX idx_scores_grade        ON ai_scores(overall_score);

CREATE INDEX idx_conversations_job   ON ai_conversations(job_id);
CREATE INDEX idx_conversations_session ON ai_conversations(session_id);

-- ==============================================
-- RLS 行级安全策略
-- ==============================================
ALTER TABLE consultants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_company_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates               ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scores                ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- consultants: 只能读写自己的记录
CREATE POLICY "consultant_self_read" ON consultants
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "consultant_self_update" ON consultants
  FOR UPDATE USING (id = auth.uid());

-- hidden_company_profiles: 登录用户可读，自己创建的可改
CREATE POLICY "hcp_auth_read" ON hidden_company_profiles
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "hcp_creator_write" ON hidden_company_profiles
  FOR ALL USING (created_by = auth.uid());

-- jobs: 已发布的公开可读；顾问管理自己的职位
CREATE POLICY "jobs_public_read" ON jobs
  FOR SELECT USING (is_published = TRUE);
CREATE POLICY "jobs_consultant_all" ON jobs
  FOR ALL USING (consultant_id = auth.uid());

-- candidates: 仅登录顾问可操作
CREATE POLICY "candidates_auth_all" ON candidates
  FOR ALL USING (auth.role() = 'authenticated');

-- resumes: 仅登录顾问可操作
CREATE POLICY "resumes_auth_all" ON resumes
  FOR ALL USING (auth.role() = 'authenticated');

-- ai_conversations: 公开插入（候选人聊天），顾问读全部
CREATE POLICY "conversations_insert_public" ON ai_conversations
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "conversations_read_auth" ON ai_conversations
  FOR SELECT USING (auth.role() = 'authenticated');

-- ai_scores: 仅登录顾问可操作
CREATE POLICY "scores_auth_all" ON ai_scores
  FOR ALL USING (auth.role() = 'authenticated');

-- notification_subscriptions: 自己的记录
CREATE POLICY "notif_self_all" ON notification_subscriptions
  FOR ALL USING (consultant_id = auth.uid());

-- ==============================================
-- 触发器：自动更新 updated_at
-- ==============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_consultants_updated_at
  BEFORE UPDATE ON consultants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hcp_updated_at
  BEFORE UPDATE ON hidden_company_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 触发器：新顾问注册后自动创建 consultants 记录
-- ==============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.consultants (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==============================================
-- Storage Bucket 配置
-- 在 Supabase Dashboard > Storage 中执行
-- 或通过 SQL 执行
-- ==============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  FALSE,
  10485760,  -- 10MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'jd-files',
  'jd-files',
  FALSE,
  10485760,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "resumes_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resumes' AND auth.role() IN ('authenticated', 'anon')
  );
CREATE POLICY "resumes_auth_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resumes' AND auth.role() = 'authenticated'
  );

CREATE POLICY "jd_files_auth_all" ON storage.objects
  FOR ALL USING (
    bucket_id = 'jd-files' AND auth.role() = 'authenticated'
  );
