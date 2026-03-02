import { chromium } from 'playwright';

const pageUrl = process.argv[2] || 'http://127.0.0.1:4173/?debug_bad_urls=1';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const logs = [];

page.on('console', (msg) => logs.push(`[console.${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.stack || err.message}`));

await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(5000);
await browser.close();

const interesting = logs.filter((line) => (
    line.includes('[BAD_URL]') ||
    line.toLowerCase().includes('auth/v1/signup') ||
    line.toLowerCase().includes('.pc/') ||
    line.includes('normalizeText')
));

console.log('---INTERESTING_LOGS_START---');
if (!interesting.length) {
    console.log('NO_INTERESTING_LOGS');
} else {
    for (const line of interesting) {
        console.log(line);
    }
}
console.log('---INTERESTING_LOGS_END---');
