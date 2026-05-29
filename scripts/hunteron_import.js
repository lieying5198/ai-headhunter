/**
 * 猎上职位抓取 + Supabase直接导入
 * 
 * 用法:
 *   1. 先运行 hunteron_refresh_cookie.js 刷新cookie
 *   2. 再运行本脚本: node scripts/hunteron_import.js
 * 
 * 流程: 猎上API抓取 → 详情补充 → 格式转换 → Supabase直接写入
 */

const fs = require('fs');
const path = require('path');

// ========== 配置 ==========
const SUPABASE_URL = 'https://kiylvnmxtorqbqlqcssv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const CONFIG_PATH = path.join(__dirname, '..', '..', '..', '..', '2026-05-15-task-9', 'hunteron_config.json');
const OUTPUT_DIR = path.join(__dirname, '..', '..', '..', '..', '2026-05-15-task-9');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    console.error('❌ 请先运行 hunteron_refresh_cookie.js 刷新cookie');
    process.exit(1);
  }
}

// ========== 猎上API ==========

async function fetchAPI(baseUrl, cookie, path, params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
  });
  const url = `${baseUrl}/api${path}?${sp.toString()}`;

  const resp = await fetch(url, {
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Referer': 'https://hh.hunteron.com/positions.html',
    }
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${path}`);
  return resp.json();
}

async function fetchAllPositions(baseUrl, cookie, keyword, maxPages = 5) {
  const all = [];
  let pageNo = 1;

  while (pageNo <= maxPages) {
    console.log(`    📄 第${pageNo}页...`);
    try {
      const json = await fetchAPI(baseUrl, cookie, '/v5/q/position/platform', {
        type: 1, pageNo, pageSize: 20, keyword, ifIgnoreMultipleRule: true,
      });
      if (!json.success) break;
      const list = json.data?.list || [];
      if (list.length === 0) break;
      all.push(...list);
      pageNo++;
      await sleep(800);
    } catch (err) {
      console.error(`    ⚠️ 请求出错: ${err.message}`);
      break;
    }
  }
  return all;
}

async function fetchPositionDetails(baseUrl, cookie, positionIds) {
  try {
    const json = await fetchAPI(baseUrl, cookie, '/v5/q/position/oho/detail', {
      positionIds: positionIds.join(','),
    });
    return json.data || {};
  } catch {
    return {};
  }
}

// ========== 格式转换 ==========

function convertToJob(raw, details) {
  const p = raw;
  const detail = details[String(p.positionId)] || {};

  // 薪资
  let salaryMin = 0, salaryMax = 0;
  if (p.annualSalary) {
    const m = p.annualSalary.match(/(\d+)[^\d]*(\d+)/);
    if (m) { salaryMin = parseInt(m[1]); salaryMax = parseInt(m[2]); }
  }

  // 城市
  let city = '';
  if (Array.isArray(p.locations) && p.locations.length > 0) {
    city = p.locations.map(l => l.workCityName || l.city || '').filter(Boolean).join('/');
  }
  if (!city) {
    city = [p.province, p.city].filter(Boolean).join(' ');
    if (typeof city === 'object') city = '';
  }

  // JD描述 - 优先从详情API取
  const description = detail.positionDesc || detail.description || p.positionDesc || '';
  const requirement = detail.requirement || p.requirement || '';
  const fullJD = [description, requirement ? `\n\n任职要求：\n${requirement}` : ''].filter(Boolean).join('\n');

  // 行业
  const industry = p.enterpriseIndustries || '';

  return {
    source: 'hunteron',
    source_id: String(p.positionId || p.id),
    source_url: `https://hh.hunteron.com/position/detail/${p.positionId}`,
    title: (p.positionTitle || '').replace(/<[^>]*>/g, ''),
    company_name: p.enterpriseName || '',
    city,
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_text: p.annualSalary || '',
    description: fullJD,
    requirements: [requirement].filter(Boolean),
    industry,
    department: p.department || '',
    degree_required: p.degreeRequired || '',
    experience_years: p.workExpYearDesc || '',
    experience: p.workExpYearDesc || '',
    head_count: p.headCount || 0,
    commission: p.rewardView || '',
    tags: [
      p.developStageDesc,
      p.enterpriseScaleDesc,
    ].filter(Boolean),
    status: 'draft',
    is_published: false,
  };
}

// ========== Supabase写入 ==========

async function importToSupabase(jobs) {
  if (jobs.length === 0) {
    console.log('  没有需要导入的职位');
    return [];
  }

  console.log(`\n📤 准备导入 ${jobs.length} 条职位到 Supabase...`);

  // 使用Excel作为中介格式（复用现有导入逻辑更可靠）
  // 但这里我们直接调REST API批量插入

  const results = [];
  const batchSize = 10;

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(jobs.length / batchSize);
    console.log(`  批次 ${batchNum}/${totalBatches} (${batch.length}条)...`);

    for (const job of batch) {
      try {
        // 检查是否已存在
        const checkResp = await fetch(
          `${SUPABASE_URL}/rest/v1/jobs?source_id=eq.${encodeURIComponent(job.source_id)}&select=id`,
          {
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
          }
        );
        const existing = await checkResp.json();

        if (existing && existing.length > 0) {
          // 更新已有职位
          const updateResp = await fetch(
            `${SUPABASE_URL}/rest/v1/jobs?id=eq.${existing[0].id}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify(job),
            }
          );
          results.push({ ...job, action: 'updated', id: existing[0].id });
        } else {
          // 插入新职位
          const insertResp = await fetch(
            `${SUPABASE_URL}/rest/v1/jobs`,
            {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
              },
              body: JSON.stringify(job),
            }
          );
          const inserted = await insertResp.json();
          if (insertResp.ok) {
            results.push({ ...job, action: 'created', id: inserted[0]?.id });
          } else {
            console.error(`    ❌ 插入失败: ${job.title}`, inserted);
            results.push({ ...job, action: 'failed', error: JSON.stringify(inserted) });
          }
        }
      } catch (err) {
        console.error(`    ❌ ${job.title}: ${err.message}`);
        results.push({ ...job, action: 'failed', error: err.message });
      }
      await sleep(200);
    }
  }

  return results;
}

// ========== 主流程 ==========

async function main() {
  const config = loadConfig();
  const { cookie, baseUrl } = config;

  console.log('========================================');
  console.log('猎上 → Supabase 职位导入');
  console.log('========================================\n');

  const searches = [
    { keywords: ['总监', '副总裁', 'VP', '总经理', '首席'] },
    { keywords: ['人力资源', 'HRD', 'HRVP', 'CHO', '人事总监', '招聘总监'] },
    { keywords: ['财务总监', 'CFO', '财务副总裁'] },
    { keywords: ['CTO', '首席技术官', '技术副总裁', '技术总监', '研发总监'] },
    { keywords: ['CIO', '首席信息官', 'IT总监', '数字化总监'] },
    { keywords: ['董秘', '董事会秘书', '证券事务代表'] },
    { keywords: ['总裁助理', '总经理助理', '董事长助理'] },
  ];

  const allRaw = [];

  for (const search of searches) {
    for (const kw of search.keywords) {
      console.log(`🔍 关键词: ${kw}`);
      const list = await fetchAllPositions(baseUrl, cookie, kw, 3); // 每关键词3页
      console.log(`    ✅ 获取 ${list.length} 条`);
      allRaw.push(...list);
      await sleep(500);
    }
  }

  // 去重
  const seen = new Set();
  const uniqueRaw = allRaw.filter(p => {
    const id = String(p.positionId || p.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  console.log(`\n📊 总计: ${allRaw.length} → 去重后: ${uniqueRaw.length}`);

  // 获取详情（补充description字段）
  console.log(`\n📋 获取职位详情（补充完整JD）...`);
  const positionIds = uniqueRaw.map(p => p.positionId).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < positionIds.length; i += 20) {
    chunks.push(positionIds.slice(i, i + 20));
  }

  let allDetails = {};
  for (let i = 0; i < chunks.length; i++) {
    console.log(`   详情批次 ${i + 1}/${chunks.length} (${chunks[i].length}个)...`);
    const details = await fetchPositionDetails(baseUrl, cookie, chunks[i]);
    Object.assign(allDetails, details);
    await sleep(1000);
  }

  // 转换格式
  console.log(`\n🔄 转换格式...`);
  const jobs = uniqueRaw.map(raw => convertToJob(raw, allDetails));
  console.log(`   转换完成: ${jobs.length} 条`);

  // 统计
  const withDesc = jobs.filter(j => j.description && j.description.length > 20).length;
  console.log(`   有完整JD: ${withDesc}/${jobs.length} (${(withDesc/jobs.length*100).toFixed(0)}%)`);

  // 保存本地备份
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'hunteron_jobs_latest.json'),
    JSON.stringify(jobs, null, 2)
  );
  console.log(`\n💾 本地备份: hunteron_jobs_latest.json`);

  // 导入Supabase
  const results = await importToSupabase(jobs);

  // 统计结果
  const created = results.filter(r => r.action === 'created').length;
  const updated = results.filter(r => r.action === 'updated').length;
  const failed = results.filter(r => r.action === 'failed').length;

  console.log(`\n========================================`);
  console.log(`导入完成: 新增 ${created} | 更新 ${updated} | 失败 ${failed}`);
  console.log(`========================================`);
}

main().catch(console.error);
