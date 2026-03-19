import { createServer } from 'vite';
import { chromium } from 'playwright';

const PORT = 4199;

async function main() {
    const server = await createServer({ server: { port: PORT, strictPort: true }, logLevel: 'silent' });
    await server.listen();
    console.log('Vite OK');

    const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();

    const errors = [];
    const pageErrors = [];

    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => pageErrors.push(err.message));

    try {
        await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    } catch (e) {
        console.log('NAV ERR:', e.message.split('\n')[0]);
    }

    // Poll for navigateTo to appear (scripts loaded via chain)
    let ready = false;
    for (let i = 0; i < 20; i++) {
        ready = await page.evaluate(() => typeof window.navigateTo === 'function').catch(() => false);
        if (ready) break;
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('navigateTo available:', ready);

    const state = await page.evaluate(() => ({
        tabBtns: document.querySelectorAll('.tab-btn').length,
        shells: document.querySelectorAll('.meta-feature-welcome-shell').length,
        activeTab: document.body?.getAttribute('data-active-tab') || 'none',
        hasNavigateTo: typeof window.navigateTo === 'function',
    })).catch(e => ({ error: e.message }));

    console.log('State:', JSON.stringify(state));

    // Try click
    if (state.hasNavigateTo) {
        const click = await page.evaluate(() => {
            const b = document.body?.getAttribute('data-active-tab');
            const btn = document.querySelector('.tab-btn[data-tab="practice-question"]');
            if (btn) btn.click();
            return new Promise(r => setTimeout(() => r({
                before: b,
                after: document.body?.getAttribute('data-active-tab')
            }), 200));
        }).catch(e => ({ error: e.message }));
        console.log('Click:', JSON.stringify(click));
    }

    console.log('Errors:', errors.length ? errors : 'none');
    console.log('Page errors:', pageErrors.length ? pageErrors : 'none');

    await browser.close();
    await server.close();
    process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
