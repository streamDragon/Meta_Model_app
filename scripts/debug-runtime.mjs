/**
 * Debug script: starts Vite dev server, launches headless browser,
 * captures all console messages, JS errors, and checks button binding state.
 */
import { createServer } from 'vite';
import { chromium } from 'playwright';

const PORT = 4199;
let server;

async function main() {
    // 1. Start Vite
    server = await createServer({ server: { port: PORT, strictPort: true }, logLevel: 'silent' });
    await server.listen();
    console.log(`Vite running on http://localhost:${PORT}`);

    // 2. Launch browser
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', msg => {
        const text = msg.text();
        const type = msg.type();
        consoleMessages.push({ type, text });
        if (type === 'error') {
            console.log(`[CONSOLE ERROR] ${text}`);
        }
    });

    page.on('pageerror', err => {
        pageErrors.push(err.message);
        console.log(`[PAGE ERROR] ${err.message}`);
    });

    // 3. Navigate
    try {
        await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (e) {
        console.log(`[NAV ERROR] ${e.message}`);
    }

    // Wait for scripts to load
    await page.waitForTimeout(3000);

    // 4. Check app state
    const state = await page.evaluate(() => {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const navKeyBtns = document.querySelectorAll('[data-nav-key]');
        const activeTab = document.querySelector('.tab-btn.active');
        const shellReady = document.querySelectorAll('.is-meta-feature-shell-ready');
        const hasNavigateTo = typeof window.navigateTo === 'function';
        const hasMetaAppShell = !!window.MetaAppShell;
        const hasInitImageController = !!(window.__metaFeatureControllers && window.__metaFeatureControllers['initial-image-vs-deep-structure']);

        // Check for visible overlays that might block clicks
        const allElements = document.querySelectorAll('*');
        const blockers = [];
        for (const el of allElements) {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' && style.display !== 'none' && !el.hidden &&
                style.pointerEvents !== 'none' && style.opacity !== '0' &&
                el.offsetWidth > 0 && el.offsetHeight > 0) {
                const rect = el.getBoundingClientRect();
                if (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5) {
                    blockers.push({
                        tag: el.tagName,
                        id: el.id,
                        className: (el.className || '').toString().substring(0, 100),
                        zIndex: style.zIndex,
                        width: Math.round(rect.width),
                        height: Math.round(rect.height)
                    });
                }
            }
        }

        // Check if any tab-btn has click listeners (indirect check via onclick)
        let boundBtns = 0;
        tabBtns.forEach(btn => {
            // We can't directly check addEventListener, but we can try clicking
        });

        return {
            tabBtnCount: tabBtns.length,
            navKeyBtnCount: navKeyBtns.length,
            activeTabName: activeTab ? activeTab.getAttribute('data-tab') : 'none',
            shellReadyCount: shellReady.length,
            hasNavigateTo,
            hasMetaAppShell,
            hasInitImageController,
            blockers,
            bodyDataActiveTab: document.body.getAttribute('data-active-tab'),
            visibleTabContents: Array.from(document.querySelectorAll('.tab-content')).filter(el => {
                const s = window.getComputedStyle(el);
                return s.display !== 'none' && !el.hidden;
            }).map(el => el.id)
        };
    });

    console.log('\n=== APP STATE ===');
    console.log(JSON.stringify(state, null, 2));

    // 5. Try clicking a tab button and see if navigation works
    const clickResult = await page.evaluate(() => {
        const btn = document.querySelector('.tab-btn[data-tab="practice-question"]');
        if (!btn) return { error: 'button not found' };

        const beforeTab = document.body.getAttribute('data-active-tab');
        btn.click();

        // Wait a tick
        return new Promise(resolve => {
            setTimeout(() => {
                const afterTab = document.body.getAttribute('data-active-tab');
                resolve({
                    beforeTab,
                    afterTab,
                    changed: beforeTab !== afterTab
                });
            }, 500);
        });
    });

    console.log('\n=== CLICK TEST ===');
    console.log(JSON.stringify(clickResult, null, 2));

    // 6. Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Console errors: ${consoleMessages.filter(m => m.type === 'error').length}`);
    console.log(`Page errors: ${pageErrors.length}`);
    console.log(`Warnings: ${consoleMessages.filter(m => m.type === 'warning').length}`);

    if (consoleMessages.filter(m => m.type === 'error').length > 0) {
        console.log('\nAll console errors:');
        consoleMessages.filter(m => m.type === 'error').forEach(m => console.log(`  - ${m.text}`));
    }
    if (consoleMessages.filter(m => m.type === 'warning').length > 0) {
        console.log('\nAll warnings:');
        consoleMessages.filter(m => m.type === 'warning').forEach(m => console.log(`  - ${m.text}`));
    }

    await browser.close();
    await server.close();
}

main().catch(err => {
    console.error('FATAL:', err);
    if (server) server.close();
    process.exit(1);
});
