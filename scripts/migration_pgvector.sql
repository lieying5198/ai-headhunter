-- ============================================================
-- 猎英盟 AI 猎头助手 - Phase 1 数据库迁移
-- 执行方式：在 Supabase SQL Editor 中运行，或通过 wrangler d1 execute
-- ============================================================

-- 1. 启用 pgvector 扩展（向量数据库支持）
CREATE EXTENSION IF NOT EXISTS pgvector;

-- 2. 创建对话记录表（AI 对话持久化）
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  session_id VARCHAR(64) NOT NULL,
  candidate_name VARCHAR(100),
  candidate_phone VARCHAR(20),
  candidate_wechat VARCHAR(50),
  messages JSONB NOT NULL DEFAULT '[]',
  context JSONB DEFAULT '{}',
  message_count INTEGER DEFAULT 1,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 对话会话索引（支持按 sessionId 查询）
CREATE INDEX IF NOT EXISTS idx_conversations_session ON ai_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_job ON ai_conversations(job_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON ai_conversations(last_message_at DESC);

-- 3. 给 jobs 表添加 embedding 列（1024维，对应 BAAI/bge-large-zh-v1.5）
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS embedding vector(1024);
CREATE INDEX IF NOT EXISTS idx_jobs_embedding ON jobs USING hnsw (embedding vector_cosine_ops);

-- 4. 创建向量检索函数 match_jobs（语义搜索）
-- 用法：SELECT * FROM match_jobs('[0.123, 0.456, ...]'::vector, 0.7, 5)
-- 注意：embedding 由应用层（embedding.ts）生成后写入，match_jobs 只做检索
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

-- 5. 创建候选人信息表（收集用户主动留的联系方式）
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

-- 6. 顾问上下文表（AI 持续学习核心：顾问个性化信息）
CREATE TABLE IF NOT EXISTS consultant_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL,
  specialty TEXT,           -- 专注领域，如 "CFO猎头"、"互联网技术"
  preferred_industries TEXT[],  -- 偏好行业
  candidate_pool_notes TEXT,    -- 候选人库特点
  communication_style TEXT,     -- 沟通风格
  working_hours TEXT,          -- 方便联系时间
  recent_wins TEXT,           -- 最近成功案例（脱敏后）
  context_data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 反馈记录表（AI 持续改进：顾问标记 AI 回复质量）
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
-- 注释说明：
--
-- embedding 向量维度说明：
-- - BAAI/bge-large-zh-v1.5（SiliconFlow 默认，中文优化）: 1024 维 ← 当前使用
-- - text-embedding-3-small（OpenAI）: 1536 维
-- - text-embedding-3-large: 3072 维
-- - Qwen Embedding: 通常 1024 维
--
-- 如需更换 embedding 模型，先查清其维度，再执行：
-- ALTER TABLE jobs DROP COLUMN embedding;
-- ALTER TABLE jobs ADD COLUMN embedding vector(新的维度);
-- DROP INDEX idx_jobs_embedding;
-- CREATE INDEX idx_jobs_embedding ON jobs USING hnsw (embedding vector_cosine_ops);
-- ============================================================
