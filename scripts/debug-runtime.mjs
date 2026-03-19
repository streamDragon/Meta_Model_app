import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = 4199;
const DIST = path.join(process.cwd(), 'dist');

const MIME = {
    '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
    '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
    let url = new URL(req.url, `http://localhost:${PORT}`);
    let filePath = path.join(DIST, decodeURIComponent(url.pathname));
    if (filePath.endsWith('/') || filePath === DIST) filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const indexPath = path.join(filePath, 'index.html');
        if (fs.existsSync(indexPath)) { filePath = indexPath; }
        else { res.writeHead(404); res.end('Not found'); return; }
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
});

async function main() {
    await new Promise(r => server.listen(PORT, r));
    console.log('Server OK on', PORT);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const errors = [];
    const pageErrors = [];

    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => pageErrors.push(err.message));

    try {
        await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 10000 });
        console.log('Page loaded');
    } catch (e) {
        console.log('NAV ERR:', e.message.split('\n')[0]);
    }

    // Poll for navigateTo
    let ready = false;
    for (let i = 0; i < 15; i++) {
        ready = await page.evaluate(() => typeof window.navigateTo === 'function').catch(() => false);
        if (ready) break;
        await new Promise(r => setTimeout(r, 500));
    }
    console.log('navigateTo:', ready);

    const state = await page.evaluate(() => ({
        tabBtns: document.querySelectorAll('.tab-btn').length,
        shells: document.querySelectorAll('.meta-feature-welcome-shell').length,
        activeTab: document.body?.getAttribute('data-active-tab') || 'none',
        hasNavigateTo: typeof window.navigateTo === 'function',
    })).catch(e => ({ error: e.message }));
    console.log('State:', JSON.stringify(state));

    if (state.hasNavigateTo) {
        const click = await page.evaluate(() => {
            const before = document.body?.getAttribute('data-active-tab');
            document.querySelector('.tab-btn[data-tab="practice-question"]')?.click();
            return new Promise(r => setTimeout(() => r({
                before, after: document.body?.getAttribute('data-active-tab')
            }), 200));
        }).catch(e => ({ error: e.message }));
        console.log('Click:', JSON.stringify(click));
    }

    console.log('Console errors:', errors.length ? errors : 'none');
    console.log('Page errors:', pageErrors.length ? pageErrors : 'none');

    await browser.close();
    server.close();
    process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); server.close(); process.exit(1); });
