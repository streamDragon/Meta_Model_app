import { createServer } from 'vite';
import { chromium } from 'playwright';

const PORT = 4199;

async function main() {
    const server = await createServer({ server: { port: PORT, strictPort: true }, logLevel: 'silent' });
    await server.listen();
    console.log('Vite OK');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const errors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('requestfailed', req => failedRequests.push(req.url()));

    // Use domcontentloaded which fires earlier
    try {
        await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        console.log('DOMContentLoaded OK');
    } catch (e) {
        console.log('NAV ERR: ' + e.message.split('\n')[0]);
    }

    // Give scripts time to load via the script chain
    await page.waitForTimeout(8000);

    const state = await page.evaluate(() => {
        return {
            tabBtns: document.querySelectorAll('.tab-btn').length,
            navigateTo: typeof window.navigateTo === 'function',
            shellReady: document.querySelectorAll('.is-meta-feature-shell-ready').length,
            welcomeShells: document.querySelectorAll('.meta-feature-welcome-shell').length,
            activeTab: document.body?.getAttribute('data-active-tab'),
            scripts: document.querySelectorAll('script[src]').length,
            blockers: (() => {
                const b = [];
                document.querySelectorAll('*').forEach(el => {
                    const s = getComputedStyle(el);
                    if (s.position === 'fixed' && s.display !== 'none' && !el.hidden &&
                        s.pointerEvents !== 'none' && el.offsetWidth > 200 && el.offsetHeight > 200) {
                        b.push({ id: el.id, cls: (el.className+'').slice(0,80), z: s.zIndex });
                    }
                });
                return b;
            })()
        };
    });
    console.log('STATE:', JSON.stringify(state, null, 2));

    // Test click
    const click = await page.evaluate(() => {
        const btn = document.querySelector('.tab-btn[data-tab="practice-question"]');
        if (!btn) return 'no btn';
        const before = document.body?.getAttribute('data-active-tab');
        btn.click();
        return new Promise(r => setTimeout(() => {
            r({ before, after: document.body?.getAttribute('data-active-tab') });
        }, 300));
    });
    console.log('CLICK:', JSON.stringify(click));

    console.log('Console errors:', errors.length, errors.length ? errors : '');
    console.log('Page errors:', pageErrors.length, pageErrors.length ? pageErrors : '');
    console.log('Failed requests:', failedRequests.length, failedRequests.length ? failedRequests : '');

    await browser.close();
    await server.close();
    process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
