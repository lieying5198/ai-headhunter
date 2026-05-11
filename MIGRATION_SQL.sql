-- ============================================================
-- 猎英盟 AI 猎头助手 - 数据库 Migration
-- 执行方式：复制以下所有内容，粘贴到 Supabase SQL Editor，按 Run
-- ============================================================

-- 1. 添加顾问微信号字段
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS wechat TEXT UNIQUE;
COMMENT ON COLUMN consultants.wechat IS '顾问微信号，用于Excel导入时匹配顾问';

-- 2. 确保 jobs 表有所有必要字段
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_number TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_conditions TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS preferred_conditions TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_benefits TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS education_requirement TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_years TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills_certificates TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS subordinate_count INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS reports_to TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rank_title TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS interview_rounds TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS interview_process TEXT;

-- 3. 验证结果
SELECT 'Migration 完成!' as status;
