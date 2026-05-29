/**
 * 猎英盟 v2 数据库迁移脚本
 * 通过 pg 直连 Supabase PostgreSQL 执行 SQL
 * 
 * 用法: node scripts/run_migration_v2.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

// Supabase 连接配置
// 优先尝试 session pooler (port 5432), 然后 transaction pooler (port 6543)
const CONFIGS = [
  {
    name: 'Session Pooler',
    host: 'aws-1-ap-northeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.kiylvnmxtorqbqlqcssv',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  },
  {
    name: 'Transaction Pooler',
    host: 'aws-1-ap-northeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.kiylvnmxtorqbqlqcssv',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  },
  {
    name: 'Direct Connection',
    host: 'db.kiylvnmxtorqbqlqcssv.supabase.co',
    port: 5432,
    user: 'postgres',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  }
];

// 尝试多个可能的密码
const POSSIBLE_PASSWORDS = [
  process.env.SUPABASE_DB_PASSWORD,
  process.env.POSTGRES_PASSWORD,
  process.env.DATABASE_PASSWORD,
  process.env.SUPABASE_SERVICE_ROLE_KEY,  // service_role key (不太可能是DB密码但尝试下)
].filter(Boolean);

// 如果没有找到环境变量中的密码，输出帮助信息
if (POSSIBLE_PASSWORDS.length === 0) {
  console.log('⚠️  未在环境变量中找到数据库密码。');
  console.log('');
  console.log('请按以下步骤获取数据库密码：');
  console.log('1. 打开 https://supabase.com/dashboard/project/kiylvnmxtorqbqlqcssv/settings/database');
  console.log('2. 在 Connection string 中复制密码');
  console.log('3. 设置环境变量：set SUPABASE_DB_PASSWORD=你的密码');
  console.log('4. 重新运行此脚本');
  console.log('');
  console.log('或者直接在 Supabase SQL Editor 中执行：');
  console.log(`   ${path.resolve(__dirname, '..', 'supabase', 'migration_v2.sql')}`);
  process.exit(1);
}

async function executeSQL(pool, sql) {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅ SQL 执行成功');
  } finally {
    client.release();
  }
}

async function tryConnection(config, password) {
  const pool = new Pool({ ...config, password });
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`✅ ${config.name} 连接成功! 服务器时间: ${result.rows[0].current_time}`);
    client.release();
    return pool;
  } catch (err) {
    console.log(`❌ ${config.name} 连接失败: ${err.message.split('\n')[0]}`);
    await pool.end().catch(() => {});
    return null;
  }
}

async function main() {
  console.log('=== 猎英盟 v2 数据库迁移 ===\n');
  
  // 读取迁移 SQL
  const sqlPath = path.resolve(__dirname, '..', 'supabase', 'migration_v2.sql');
  const migrationSQL = fs.readFileSync(sqlPath, 'utf8');
  console.log(`📄 读取迁移 SQL: ${sqlPath}\n`);
  
  // 尝试连接
  let pool = null;
  
  for (const config of CONFIGS) {
    for (const password of POSSIBLE_PASSWORDS) {
      console.log(`🔗 尝试 ${config.name} (port ${config.port})...`);
      pool = await tryConnection(config, password);
      if (pool) break;
    }
    if (pool) break;
  }
  
  if (!pool) {
    console.log('\n❌ 所有连接尝试均失败。');
    console.log('请手动在 Supabase SQL Editor 中执行迁移 SQL：');
    console.log(`   ${sqlPath}`);
    console.log('\n或设置正确的 SUPABASE_DB_PASSWORD 环境变量后重试。');
    process.exit(1);
  }
  
  // 执行迁移
  console.log('\n🚀 开始执行迁移...\n');
  
  // 将完整 SQL 按语句分割并逐条执行
  // 使用简单的方式：按分号分割，跳过空语句和注释
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  let success = 0;
  let skipped = 0;
  
  for (const stmt of statements) {
    try {
      await executeSQL(pool, stmt);
      success++;
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log(`⏭️  已存在，跳过`);
        skipped++;
      } else {
        console.log(`⚠️  警告: ${err.message.split('\n')[0]}`);
        skipped++;
      }
    }
  }
  
  // 执行最后的验证查询
  console.log('\n📊 迁移结果:');
  const verifyClient = await pool.connect();
  try {
    const tables = await verifyClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`   表数量: ${tables.rows.length}`);
    tables.rows.forEach(r => console.log(`   - ${r.table_name}`));
    
    // 检查是否存在 wechats 和 auth_qr_tokens 表
    const newTables = tables.rows.filter(r => 
      ['wechats', 'auth_qr_tokens'].includes(r.table_name)
    );
    console.log(`\n   新表状态: ${newTables.length === 2 ? '✅ 全部创建' : '⚠️ 部分创建'}`);
  } finally {
    verifyClient.release();
  }
  
  await pool.end();
  
  console.log(`\n✅ 迁移完成! 成功: ${success}, 跳过: ${skipped}`);
  
  // 下一步提示
  console.log('\n📌 下一步：设置管理员账号');
  console.log('   在 Supabase SQL Editor 中执行：');
  console.log('   UPDATE consultants SET role = \'admin\' WHERE email = \'你的邮箱\';');
}

main().catch(err => {
  console.error('迁移失败:', err.message);
  process.exit(1);
});
