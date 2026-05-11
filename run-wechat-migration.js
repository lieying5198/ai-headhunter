const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 手动加载 .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

// 从环境变量获取 Supabase 连接信息
// Supabase 连接格式：postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres
// 我们需要解析 NEXT_PUBLIC_SUPABASE_URL 来获取项目 ID，然后使用服务角色密钥

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 解析连接信息
function parseSupabaseUrl(url) {
  // https://kiylvnmxtorqbqlqcssv.supabase.co -> kiylvnmxtorqbqlqcssv.supabase.co
  const host = url.replace('https://', '').replace('http://', '');
  return {
    host: `db.${host}`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
  };
}

async function executeMigration() {
  const config = parseSupabaseUrl(SUPABASE_URL);

  const client = new Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: SERVICE_KEY,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 正在连接数据库...');
    await client.connect();
    console.log('✅ 连接成功');

    // Migration SQL
    const sql = `
      -- 添加 wechat 字段到 consultants 表
      ALTER TABLE consultants ADD COLUMN IF NOT EXISTS wechat TEXT UNIQUE;

      -- 添加注释
      COMMENT ON COLUMN consultants.wechat IS '顾问微信号，用于Excel导入时匹配顾问';

      -- 确保 jobs 表有必要的字段（防止之前 migration 缺失）
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
    `;

    console.log('🔄 执行 Migration...');
    await client.query(sql);
    console.log('✅ Migration 执行成功');

    // 验证字段是否添加成功
    console.log('🔍 验证 consultants 表结构...');
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'consultants' AND column_name = 'wechat'
    `);

    if (result.rows.length > 0) {
      console.log('✅ wechat 字段验证成功');
    } else {
      console.log('⚠️ wechat 字段可能未创建，请检查');
    }

  } catch (error) {
    console.error('❌ Migration 失败:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 数据库连接已关闭');
  }
}

executeMigration();
