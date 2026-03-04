const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://127.0.0.1:4175/feature/prismlab?v=1.0.161&t=1772536996950', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const list = await page.evaluate(() => {
    const out = {};
    out.libraryVisible = !document.getElementById('prism-library')?.classList.contains('hidden');
    out.prismCards = Array.from(document.querySelectorAll('#prism-library .prism-card h4')).map(el => el.textContent.trim()).slice(0,5);
    out.topButtons = Array.from(document.querySelectorAll('#prismlab button')).map(b => b.textContent.trim()).filter(Boolean).slice(0,20);
    out.guideTexts = Array.from(document.querySelectorAll('#prismlab .prism-guide-launch-btn span')).map(e=>e.textContent.trim());
    return out;
  });
  console.log(JSON.stringify(list, null, 2));
  await page.click('#prism-library .prism-open-btn');
  await page.waitForTimeout(600);
  const detail = await page.evaluate(() => {
    return {
      detailVisible: !document.getElementById('prism-detail')?.classList.contains('hidden'),
      buttons: Array.from(document.querySelectorAll('#prism-detail button')).map(b=>b.textContent.trim()).filter(Boolean),
      summaries: Array.from(document.querySelectorAll('#prism-detail summary')).map(s=>s.textContent.replace(/\s+/g,' ').trim()),
      labels: Array.from(document.querySelectorAll('#prism-detail .q-card > label')).map(l=>l.textContent.trim()),
      panelTitles: Array.from(document.querySelectorAll('#prism-detail h4')).map(h=>h.textContent.trim())
    };
  });
  console.log(JSON.stringify(detail, null, 2));
  await page.screenshot({ path: 'reports/prism-mobile-current.png', fullPage: true });
  await browser.close();
})();
