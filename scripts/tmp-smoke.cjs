const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (msg) => logs.push(`[console.${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.stack || err.message}`));
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(4500);
  await browser.close();
  const bad = logs.filter((line) => line.includes('.pc') || line.includes('auth/v1/signup') || line.includes('normalizeText'));
  console.log(bad.length ? bad.join('\n') : 'NO_BAD_LOGS');
})();
