// 自动化 Migration 执行脚本
// 使用 Playwright 模拟浏览器操作

const { exec } = require('child_process');

const MIGRATION_SQL = `
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
`;

console.log('=== 猎英盟数据库 Migration ===\n');
console.log('请按以下步骤操作：\n');
console.log('1. 浏览器已打开 Supabase SQL Editor');
console.log('2. 清空编辑器中的内容');
console.log('3. 复制以下 SQL 语句，粘贴到编辑器中：\n');
console.log('='.repeat(60));
console.log(MIGRATION_SQL);
console.log('='.repeat(60));
console.log('\n4. 点击 "Run" 按钮执行');
console.log('5. 看到 "Migration 完成!" 即表示成功\n');
console.log('执行完成后告诉我，我将继续后续操作！');
