/**
 * 禾蛙 (hewa.cn) 职位抓取 + Supabase导入
 * 
 * 用法: node scripts/hewoo_import.js
 * 禾蛙职位列表完全公开，无需登录！
 * 
 * 流程: Playwright隐身抓取 → 详情提取 → 格式转换 → Supabase写入
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://kiylvnmxtorqbqlqcssv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const OUTPUT_DIR = path.join(__dirname, '..', '..', '..', '..', '2026-05-15-task-9');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ========== 抓取逻辑 ==========

async function scrapeListPage(page, pageNum = 1) {
  const url = `https://hewa.cn/list/page=${pageNum}`;
  console.log(`    📄 第${pageNum}页: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 提取职位卡片数据
  const positions = await page.evaluate(() => {
    const cards = document.querySelectorAll('.position-item, .position-card, [class*="position"]');
    const results = [];

    cards.forEach(card => {
      // 提取详情链接
      const linkEl = card.querySelector('a[href*="positionDetails"]');
      if (!linkEl) return;

      const detailUrl = linkEl.getAttribute('href');
      const title = card.querySelector('.position-title, .title, h3, h4')?.textContent?.trim() || '';
      const salaryText = card.querySelector('[class*="salary"], .salary')?.textContent?.trim() || '';
      const city = card.querySelector('[class*="city"], .location, [class*="location"]')?.textContent?.trim() || '';
      const degree = card.querySelector('[class*="degree"], [class*="education"]')?.textContent?.trim() || '';
      const experience = card.querySelector('[class*="experience"], [class*="year"]')?.textContent?.trim() || '';
      const companyName = card.querySelector('[class*="company"], .enterprise-name')?.textContent?.trim() || '';
      const commissionText = card.querySelector('[class*="commission"], [class*="reward"]')?.textContent?.trim() || '';
      const tags = Array.from(card.querySelectorAll('.tag, .label, [class*="tag"]')).map(t => t.textContent?.trim()).filter(Boolean);

      // 提取HC数
      const hcText = card.textContent?.match(/HC\s*(\d+)/);
      const headCount = hcText ? parseInt(hcText[1]) : 0;

      results.push({
        title,
        salaryText,
        city,
        degree,
        experience,
        companyName,
        commissionText,
        tags,
        headCount,
        detailUrl: detailUrl.startsWith('/') ? `https://hewa.cn${detailUrl}` : detailUrl,
      });
    });

    return results;
  });

  return positions;
}

async function scrapeDetailPage(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1500);

    const detail = await page.evaluate(() => {
      // 尝试多种选择器提取内容
      const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || '';

      const description = getText('.job-desc, .position-desc, .job-description, .jd-content, [class*="description"]') ||
        getText('.detail-content, .position-content, .job-content');

      const requirement = getText('.job-requirement, .position-requirement, [class*="requirement"]') ||
        getText('.requirements');

      // 如果没有专门的description字段，尝试获取主体内容
      const mainContent = getText('.detail-main, .position-detail, .job-detail, main');

      // 提取结构化信息
      const infoItems = {};
      document.querySelectorAll('.info-item, .detail-item, [class*="info-item"]').forEach(item => {
        const label = item.querySelector('.label, dt, [class*="label"]')?.textContent?.trim();
        const value = item.querySelector('.value, dd, [class*="value"]')?.textContent?.trim();
        if (label && value) infoItems[label] = value;
      });

      return {
        description: description || mainContent || '',
        requirement,
        infoItems,
        fullText: document.body.textContent?.substring(0, 5000) || '',
      };
    });

    return detail;
  } catch (err) {
    console.error(`      ⚠️ 详情页抓取失败: ${err.message}`);
    return { description: '', requirement: '', infoItems: {} };
  }
}

// ========== 格式转换 ==========

function convertToJob(item, detail) {
  // 薪资解析
  let salaryMin = 0, salaryMax = 0;
  if (item.salaryText) {
    const m = item.salaryText.match(/(\d+)[^\d]*(\d+)/);
    if (m) { salaryMin = parseInt(m[1]); salaryMax = parseInt(m[2]); }
  }

  // 佣金估算
  let commission = 0;
  if (item.commissionText) {
    const cm = item.commissionText.match(/([\d.]+)\s*[Kk万]/);
    if (cm) commission = parseFloat(cm[1]) * (item.commissionText.includes('K') ? 1000 : 10000);
  }

  // JD拼接
  const fullJD = [
    detail.description || '',
    detail.requirement ? `\n\n任职要求：\n${detail.requirement}` : '',
    Object.entries(detail.infoItems || {}).map(([k, v]) => `${k}: ${v}`).join('\n'),
  ].filter(Boolean).join('\n');

  // 提取source_id
  const urlMatch = item.detailUrl.match(/positionDetails\/(.+?)_hw2_\.html/);
  const sourceId = urlMatch ? urlMatch[1] : item.detailUrl;

  return {
    source: 'hewoo',
    source_id: sourceId,
    source_url: item.detailUrl,
    title: item.title,
    company_name: item.companyName || '',
    city: item.city || '',
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_text: item.salaryText || '',
    description: fullJD,
    requirements: [detail.requirement].filter(Boolean),
    tags: item.tags || [],
    industry: '',
    degree_required: item.degree || '',
    experience_years: item.experience || '',
    head_count: item.headCount,
    commission: item.commissionText || '',
    status: 'draft',
    is_published: false,
  };
}

// ========== Supabase写入 ==========

async function importToSupabase(jobs) {
  if (jobs.length === 0) return [];

  console.log(`\n📤 导入 ${jobs.length} 条到 Supabase...`);
  const results = [];

  for (const job of jobs) {
    try {
      // 检查是否存在
      const checkResp = await fetch(
        `${SUPABASE_URL}/rest/v1/jobs?source_id=eq.${encodeURIComponent(job.source_id)}&select=id`,
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
      );
      const existing = await checkResp.json();

      if (existing && existing.length > 0) {
        // 更新
        await fetch(`${SUPABASE_URL}/rest/v1/jobs?id=eq.${existing[0].id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(job),
        });
        results.push({ ...job, action: 'updated' });
      } else {
        // 插入
        const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/jobs`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(job),
        });
        if (insertResp.ok) {
          results.push({ ...job, action: 'created' });
        } else {
          const err = await insertResp.text();
          results.push({ ...job, action: 'failed', error: err });
        }
      }
    } catch (err) {
      results.push({ ...job, action: 'failed', error: err.message });
    }
    await sleep(200);
  }

  return results;
}

// ========== 主流程 ==========

async function main() {
  console.log('========================================');
  console.log('禾蛙 (hewa.cn) → Supabase 职位导入');
  console.log('========================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const page = await context.newPage();

  // ========== 阶段1: 抓取职位列表 ==========
  console.log('📋 阶段1: 抓取职位列表...');
  const allPositions = [];
  const maxPages = 10; // 前10页，200条职位

  for (let p = 1; p <= maxPages; p++) {
    try {
      const positions = await scrapeListPage(page, p);
      if (positions.length === 0) {
        console.log(`    第${p}页无数据，停止翻页`);
        break;
      }
      allPositions.push(...positions);
      console.log(`    ✅ 第${p}页: ${positions.length}条, 累计: ${allPositions.length}条`);
      await sleep(2000); // 限速
    } catch (err) {
      console.error(`    ❌ 第${p}页抓取失败: ${err.message}`);
      break;
    }
  }

  console.log(`\n📊 列表抓取完成: ${allPositions.length} 条职位`);

  // ========== 阶段2: 抓取详情 ==========
  console.log(`\n📋 阶段2: 抓取职位详情（补充完整JD）...`);
  const details = [];

  // 只抓取前50条详情（控制时间），其余用列表信息
  const detailCount = Math.min(50, allPositions.length);
  for (let i = 0; i < detailCount; i++) {
    if (i % 10 === 0) {
      console.log(`   详情 ${i + 1}/${detailCount}...`);
    }
    const detail = await scrapeDetailPage(page, allPositions[i].detailUrl);
    details.push(detail);
    await sleep(1000);
  }

  console.log(`   详情抓取完成: ${details.length} 条`);

  await browser.close();
  console.log('🔒 浏览器已关闭');

  // ========== 阶段3: 转换格式 ==========
  console.log(`\n🔄 阶段3: 转换格式...`);
  const jobs = allPositions.map((item, i) => {
    const detail = i < details.length ? details[i] : { description: '', requirement: '', infoItems: {} };
    return convertToJob(item, detail);
  });

  console.log(`   转换完成: ${jobs.length} 条`);

  // 统计JD完整度
  const withDesc = jobs.filter(j => j.description && j.description.length > 30).length;
  console.log(`   有完整JD: ${withDesc}/${jobs.length} (${(withDesc/jobs.length*100).toFixed(0)}%)`);

  // ========== 阶段4: 保存本地备份 ==========
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'hewoo_jobs_latest.json'),
    JSON.stringify(jobs, null, 2)
  );
  console.log(`\n💾 本地备份: hewoo_jobs_latest.json`);

  // ========== 阶段5: 导入Supabase ==========
  const results = await importToSupabase(jobs);

  const created = results.filter(r => r.action === 'created').length;
  const updated = results.filter(r => r.action === 'updated').length;
  const failed = results.filter(r => r.action === 'failed').length;

  console.log(`\n========================================`);
  console.log(`导入完成: 新增 ${created} | 更新 ${updated} | 失败 ${failed}`);
  console.log(`========================================`);
}

main().catch(console.error);
