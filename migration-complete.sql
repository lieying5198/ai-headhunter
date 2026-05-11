-- ============================================
-- AI猎头平台 - 数据库迁移 SQL
-- 执行方式：在 Supabase Dashboard > SQL Editor 中完整执行
-- ============================================

-- 添加职位编号和详细信息字段到 jobs 表
-- 运行前请备份数据库

-- 添加职位编号字段
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_number TEXT;

-- 添加新字段
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS visit_notes TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_conditions TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS preferred_conditions TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS target_companies TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS must_ask_questions TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hire_count INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS detailed_address TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS education_requirement TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_years TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills_certificates TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_benefits TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS subordinate_count INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS department_structure TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS reports_to TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rank_title TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS interview_rounds TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS interview_process TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS video_interview_acceptable BOOLEAN;

-- 为现有记录生成职位编号（格式：JOB + 8位随机数）
UPDATE jobs 
SET job_number = 'JOB-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8))
WHERE job_number IS NULL;

-- 确保职位编号唯一（使用 DO 块安全添加约束）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'jobs_job_number_unique' 
    AND conrelid = 'jobs'::regclass
  ) THEN
    ALTER TABLE jobs ADD CONSTRAINT jobs_job_number_unique UNIQUE (job_number);
  END IF;
END $$;

-- 添加注释
COMMENT ON COLUMN jobs.job_number IS '职位编号，格式：JOB-XXXXXXXX';
COMMENT ON COLUMN jobs.visit_notes IS '寻访须知';
COMMENT ON COLUMN jobs.required_conditions IS '必备条件数组';
COMMENT ON COLUMN jobs.preferred_conditions IS '优先条件数组';
COMMENT ON COLUMN jobs.target_companies IS '目标公司/行业数组';
COMMENT ON COLUMN jobs.must_ask_questions IS '必问问题数组';
COMMENT ON COLUMN jobs.hire_count IS '招聘人数';
COMMENT ON COLUMN jobs.detailed_address IS '详细地址';
COMMENT ON COLUMN jobs.education_requirement IS '学历要求';
COMMENT ON COLUMN jobs.experience_years IS '工作年限';
COMMENT ON COLUMN jobs.skills_certificates IS '技能/证书数组';
COMMENT ON COLUMN jobs.salary_benefits IS '薪资福利';
COMMENT ON COLUMN jobs.department IS '所属部门';
COMMENT ON COLUMN jobs.subordinate_count IS '下属人数';
COMMENT ON COLUMN jobs.department_structure IS '部门架构';
COMMENT ON COLUMN jobs.reports_to IS '汇报对象';
COMMENT ON COLUMN jobs.rank_title IS '职级职称';
COMMENT ON COLUMN jobs.interview_rounds IS '面试轮次';
COMMENT ON COLUMN jobs.interview_process IS '面试流程';
COMMENT ON COLUMN jobs.video_interview_acceptable IS '是否接受视频面试';

-- 验证：查看 jobs 表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
ORDER BY ordinal_position;
