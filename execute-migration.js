const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL() {
  const sql = `
    -- 添加职位编号和详细信息字段到 jobs 表
    
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
    
    -- 确保职位编号唯一
    ALTER TABLE jobs ADD CONSTRAINT IF NOT EXISTS jobs_job_number_unique UNIQUE (job_number);
    
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
  `;

  try {
    // Supabase 不直接支持通过 JS 客户端执行任意 SQL
    // 需要使用 rpc 或直接在 SQL Editor 中执行
    console.log('请手动在 Supabase Dashboard 的 SQL Editor 中执行迁移 SQL');
    console.log('SQL 内容已保存在 migration.sql 文件中');
    
    const fs = require('fs');
    fs.writeFileSync('migration.sql', sql);
    console.log('迁移 SQL 已保存到 migration.sql');
  } catch (error) {
    console.error('执行失败:', error);
  }
}

executeSQL();
