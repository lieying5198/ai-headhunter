/**
 * 猎上 (hunteron.com) Cookie 刷新脚本
 * 用法: node scripts/hunteron_refresh_cookie.js
 * 
 * 打开浏览器 → 手动登录猎上 → 自动提取cookie → 保存到配置
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', '..', '..', '2026-05-15-task-9', 'hunteron_config.json');

async function main() {
  console.log('========================================');
  console.log('猎上 Cookie 刷新工具');
  console.log('========================================\n');
  console.log('即将打开浏览器，请手动登录猎上...\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });

  // 注入隐身脚本
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    delete navigator.__proto__.webdriver;
  });

  const page = await context.newPage();

  // 打开猎上
  await page.goto('https://hh.hunteron.com/login.html', { waitUntil: 'networkidle' });
  console.log('✅ 猎上登录页已打开');
  console.log('⏳ 请在浏览器中完成登录...');
  console.log('   （登录成功后，脚本会自动检测并提取cookie）\n');

  // 等待用户登录完成（检测是否跳转到职位页或首页）
  try {
    await page.waitForURL(
      url => !url.includes('/login') && url.hostname.includes('hunteron.com'),
      { timeout: 300000 } // 5分钟超时
    );
    console.log('✅ 检测到登录成功！');

    // 等待页面稳定
    await page.waitForTimeout(2000);

    // 提取cookie
    const cookies = await context.cookies();
    console.log(`\n📋 提取到 ${cookies.length} 个cookie:`);

    // 构建cookie字符串
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // 保存到配置
    const config = {
      cookie: cookieStr,
      baseUrl: 'https://hh.hunteron.com',
      updated_at: new Date().toISOString(),
    };

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`\n✅ Cookie已保存到: ${CONFIG_PATH}`);
    console.log(`   cookie预览: ${cookieStr.substring(0, 80)}...`);

  } catch (err) {
    console.log('\n⏰ 登录超时（5分钟），或未能检测到登录成功');
    console.log('   请在下次运行时重试');
  }

  await browser.close();
  console.log('\n浏览器已关闭');
}

main().catch(console.error);
