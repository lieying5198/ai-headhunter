-- ============================================================
-- 猎英盟 AI 猎头助手 - Phase 1 增量迁移（补充缺失的部分）
-- 执行方式：在 Supabase SQL Editor 中运行
-- 已确认：ai_conversations 表已存在，无需重复创建
-- ============================================================

-- 1. 给 jobs 表添加 embedding 列（1024维，对应 BAAI/bge-large-zh-v1.5）
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- 创建 HNSW 索引加速向量检索
CREATE INDEX IF NOT EXISTS idx_jobs_embedding ON jobs USING hnsw (embedding vector_cosine_ops);

-- 2. 创建向量检索函数 match_jobs（语义搜索）
CREATE OR REPLACE FUNCTION match_jobs(
  query_embedding vector(1024),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  city TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  level TEXT,
  summary TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.city,
    j.salary_min,
    j.salary_max,
    j.level,
    j.summary,
    1 - (j.embedding <=> query_embedding) AS similarity
  FROM jobs j
  WHERE j.embedding IS NOT NULL
    AND j.is_published = true
    AND 1 - (j.embedding <=> query_embedding) > match_threshold
  ORDER BY j.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 3. 创建候选人信息表（收集用户主动留的联系方式）
CREATE TABLE IF NOT EXISTS conversation_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  wechat VARCHAR(50),
  current_title VARCHAR(100),
  current_company VARCHAR(100),
  experience_years INTEGER,
  source VARCHAR(50) DEFAULT 'ai_chat',
  status VARCHAR(20) DEFAULT 'new',
  consultant_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON conversation_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_job ON conversation_leads(job_id);

-- 4. 顾问上下文表（AI 持续学习核心：顾问个性化信息）
CREATE TABLE IF NOT EXISTS consultant_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL,
  specialty TEXT,
  preferred_industries TEXT[],
  candidate_pool_notes TEXT,
  communication_style TEXT,
  working_hours TEXT,
  recent_wins TEXT,
  context_data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 反馈记录表（AI 持续改进：顾问标记 AI 回复质量）
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  message_index INTEGER,
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  user_comment TEXT,
  consultant_rating INTEGER CHECK (consultant_rating BETWEEN 1 AND 5),
  consultant_comment TEXT,
  is_positive BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_conversation ON ai_feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON ai_feedback(user_rating);

-- ============================================================
-- 验证：执行以下查询确认迁移成功
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- ============================================================
