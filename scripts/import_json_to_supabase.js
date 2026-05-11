#!/usr/bin/env node
// 将 public/data/jobs.json 导入到 Supabase jobs 表

const fs = require('fs');
const path = require('path');

// 从 .env.local 读取配置
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ 请在 .env.local 中配置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// 读取职位数据
const jobsPath = path.join(__dirname, '..', 'public', 'data', 'jobs.json');
if (!fs.existsSync(jobsPath)) {
  console.error('❌ jobs.json 不存在:', jobsPath);
  process.exit(1);
}

const jobs = JSON.parse(fs.readFileSync(jobsPath, 'utf-8'));
console.log(`📂 读取到 ${jobs.length} 个职位`);

// 映射到数据库字段
const dbJobs = jobs
  .filter(j => j.is_published !== false)
  .map(j => ({
    id: j.id || undefined,  // 保留原 ID
    title: j.title || '未知职位',
    industry: j.industry || null,
    job_function: j.job_function || j.function || null,
    city: j.city || null,
    salary_min: j.salary_min || null,
    salary_max: j.salary_max || null,
    level: j.level || null,
    summary: j.summary || null,
    tags: j.tags || [],
    raw_jd: j.raw_jd || j.summary || null,
    anonymized_jd: j.anonymized_jd || j.summary || null,
    status: j.status || 'published',
    is_published: j.is_published !== false,
    view_count: j.view_count || 0,
    apply_count: j.apply_count || 0,
    consultant_id: null,  // 需要先创建 consultant 记录
    created_at: j.created_at || new Date().toISOString(),
    updated_at: j.updated_at || new Date().toISOString(),
  }));

console.log(`✅ 过滤后可导入 ${dbJobs.length} 个职位`);

// 分批导入（每批 100 条）
async function importJobs() {
  const batchSize = 100;
  let imported = 0;

  for (let i = 0; i < dbJobs.length; i += batchSize) {
    const batch = dbJobs.slice(i, i + batchSize);
    const from = i + 1;
    const to = Math.min(i + batchSize, dbJobs.length);

    try {
      const url = `${SUPABASE_URL}/rest/v1/jobs`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(batch),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`❌ 批次 ${from}-${to} 失败:`, errText);
      } else {
        imported += batch.length;
        console.log(`  ✅ 批次 ${from}-${to} / ${dbJobs.length} 导入成功`);
      }
    } catch (e) {
      console.error(`❌ 批次 ${from}-${to} 异常:`, e.message);
    }
  }

  console.log(`\n🎉 完成！共导入 ${imported} / ${dbJobs.length} 个职位`);
}

importJobs();
