import { readFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const projectRoot = process.cwd();
const VITE_BIN = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const MANAGED_SCREENS = new Set(['sentence-map', 'practice-question', 'practice-radar', 'practice-triples-radar']);
const MANAGED_CONTENT_SELECTOR_BY_SCREEN = Object.freeze({
    'sentence-map': '#sentence-map .practice-section-sentence-map',
    'practice-question': '#practice-question .practice-section-question',
    'practice-radar': '#practice-radar .practice-section-radar',
    'practice-triples-radar': '#practice-triples-radar .practice-section-triples-radar'
});
const TEST_GAMIFICATION_STATE = Object.freeze({
    xp: 600,
    streak: 4,
    bestStreak: 7,
    streakFreezes: 1,
    lastActiveDate: '2026-03-14',
    lastCelebratedLevel: 5,
    starsPerFeature: {
        sentenceMap: 6,
        practiceQuestion: 8,
        triplesRadar: 4,
        practiceRadar: 3,
        blueprint: 2
    }
});

const mustContain = (label, source, regex) => {
    if (!regex.test(source)) {
        throw new Error(`Missing expected rule: ${label}`);
    }
};

const readText = async (relativePath) => {
    const fullPath = path.join(projectRoot, relativePath);
    return readFile(fullPath, 'utf8');
};

const resolvePrimaryHtmlPath = async () => {
    try {
        await readText('index.html');
        return 'index.html';
    } catch (error) {
        await readText('index2.html');
        return 'index2.html';
    }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const listenProbe = async (port) => new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
});

async function findAvailablePort(start = 4260, end = 4272) {
    for (let port = start; port <= end; port += 1) {
        if (await listenProbe(port)) return port;
    }
    throw new Error(`No free port found between ${start} and ${end}`);
}

async function waitForHttp(url, timeoutMs = 30000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(url, { redirect: 'manual' });
            if (response.ok || response.status === 304) return;
        } catch (_error) {
            // keep polling
        }
        await wait(250);
    }
    throw new Error(`Timed out waiting for ${url}`);
}

async function startLocalServer() {
    const port = await findAvailablePort();
    const base = `http://127.0.0.1:${port}`;
    const server = spawn(process.execPath, [VITE_BIN, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    try {
        await waitForHttp(base);
        return { base, server };
    } catch (error) {
        await stopServer(server);
        throw error;
    }
}

async function stopServer(server) {
    if (!server || server.exitCode !== null || server.killed) return;
    server.kill('SIGINT');
    const closed = await Promise.race([
        new Promise((resolve) => server.once('exit', () => resolve(true))),
        wait(3000).then(() => false)
    ]);
    if (!closed && server.exitCode === null) {
        server.kill('SIGTERM');
    }
}

async function dismissOnboardingIfVisible(page) {
    const overlay = page.locator('#mm-onboarding').first();
    if ((await overlay.count()) === 0) return false;
    await page.waitForTimeout(4200);
    const overlayVisibleNow = await overlay.evaluate((node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return node.classList.contains('is-visible')
            && !node.hidden
            && style.display !== 'none'
            && style.visibility !== 'hidden'
            && style.pointerEvents !== 'none'
            && rect.width > 0
            && rect.height > 0;
    }).catch(() => false);
    if (!overlayVisibleNow) return false;
    const dismissBtn = page.locator('#mm-onboarding [data-ob-dismiss]:visible').first();
    if ((await dismissBtn.count()) > 0) {
        await dismissBtn.click();
    } else {
        await page.locator('#mm-ob-explore-btn:visible').click();
    }
    await page.waitForFunction(() => {
        const overlay = document.getElementById('mm-onboarding');
        if (!overlay) return true;
        const style = getComputedStyle(overlay);
        return overlay.hidden || style.display === 'none' || style.pointerEvents === 'none';
    });
    return true;
}

async function seedTestState(page) {
    await page.addInitScript((seed) => {
        if (window.top !== window) return;
        [
            'meta_feature_shell_v3',
            'meta_shell_continue_v1',
            'meta_home_last_tab_v1',
            'meta_home_shell_ui_v2',
            'meta_shell_preferences_v1',
            'practice_active_tab_v1'
        ].forEach((key) => window.localStorage.removeItem(key));
        window.localStorage.setItem('meta_gamification_v1', JSON.stringify(seed));
        window.localStorage.setItem('mm_onboarding_dismissed_v1', '1');
    }, TEST_GAMIFICATION_STATE);
}

async function waitForActiveScreen(page, screenId) {
    await page.waitForFunction((id) => {
        if (id === 'home') {
            const root = document.getElementById('meta-home-shell');
            if (!root || document.body?.dataset?.activeTab !== 'home') return false;
            const style = getComputedStyle(root);
            const rect = root.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        }
        const section = document.getElementById(id);
        return !!section && section.classList.contains('active') && getComputedStyle(section).display !== 'none';
    }, screenId);
}

async function navigateToScreen(page, screenId) {
    await page.evaluate((id) => window.navigateTo(id), screenId);
    await waitForActiveScreen(page, screenId);
    await page.waitForTimeout(400);
}

async function enterManagedFeatureStage(page, screenId) {
    if (!MANAGED_SCREENS.has(screenId)) return false;
    const contentSelector = MANAGED_CONTENT_SELECTOR_BY_SCREEN[screenId] || '';
    const stage = await page.evaluate((id) => document.getElementById(id)?.dataset?.metaFeatureStage || '', screenId);
    if (stage !== 'feature') {
        const cta = page.locator(`#${screenId} [data-feature-enter]:visible`).first();
        if ((await cta.count()) === 0) {
            throw new Error(`Missing managed feature CTA on ${screenId}`);
        }
        await cta.click();
        await page.waitForFunction((id) => document.getElementById(id)?.dataset?.metaFeatureStage === 'feature', screenId);
    }
    await page.waitForFunction(({ id, selector }) => {
        const section = document.getElementById(id);
        const content = selector ? document.querySelector(selector) : null;
        if (!section || section.dataset?.metaFeatureStage !== 'feature' || !content) return false;
        const style = getComputedStyle(content);
        const rect = content.getBoundingClientRect();
        return !content.hasAttribute('data-intro-locked')
            && !content.hidden
            && style.display !== 'none'
            && style.visibility !== 'hidden'
            && rect.width > 0
            && rect.height > 0;
    }, { id: screenId, selector: contentSelector });
    await page.waitForTimeout(500);
    return stage !== 'feature';
}

async function verifyRuntimeMobileLayout(baseUrl) {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
        await seedTestState(page);
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await dismissOnboardingIfVisible(page);

        for (const screenId of ['home', 'sentence-map', 'practice-question', 'practice-radar', 'practice-wizard', 'blueprint']) {
            await navigateToScreen(page, screenId);
            await enterManagedFeatureStage(page, screenId);

            const overflow = await page.evaluate(() => ({
                innerWidth: window.innerWidth,
                scrollWidth: document.documentElement.scrollWidth,
                activeTab: document.querySelector('.tab-btn.active')?.getAttribute('data-tab') || ''
            }));

            if (overflow.scrollWidth > overflow.innerWidth + 1) {
                throw new Error(`Runtime mobile overflow on ${screenId}: ${overflow.scrollWidth}/${overflow.innerWidth}`);
            }
            if (overflow.activeTab !== screenId) {
                throw new Error(`Active tab mismatch on mobile: expected ${screenId}, got ${overflow.activeTab}`);
            }
        }

        for (const screenId of ['sentence-map', 'practice-wizard', 'blueprint']) {
            await navigateToScreen(page, screenId);
            await enterManagedFeatureStage(page, screenId);

            const overlapCheck = await page.evaluate(() => {
                const sticky = document.getElementById('mobile-sticky-cta');
                const stickyVisible = !!sticky && !sticky.classList.contains('hidden');
                const stickyRect = stickyVisible ? sticky.getBoundingClientRect() : null;
                const audioRects = Array.from(document.querySelectorAll('.audio-floating-control'))
                    .map((node) => node.getBoundingClientRect())
                    .filter((rect) => rect.width > 0 && rect.height > 0);
                const overlaps = stickyRect
                    ? audioRects.some((rect) => !(rect.right <= stickyRect.left || rect.left >= stickyRect.right || rect.bottom <= stickyRect.top || rect.top >= stickyRect.bottom))
                    : false;
                return { stickyVisible, overlaps, audioCount: audioRects.length };
            });

            if (!overlapCheck.stickyVisible) {
                throw new Error(`Missing sticky CTA on ${screenId}`);
            }
            if (overlapCheck.overlaps) {
                throw new Error(`Floating audio overlaps sticky CTA on ${screenId}: ${JSON.stringify(overlapCheck)}`);
            }
        }
    } finally {
        await browser.close();
    }
}

try {
    const htmlPath = await resolvePrimaryHtmlPath();
    const [html, css, js] = await Promise.all([
        readText(htmlPath),
        readText('css/style.css'),
        readText('js/app.js')
    ]);

    mustContain(
        'viewport meta tag',
        html,
        /<meta\s+name="viewport"\s+content="width=device-width,\s*initial-scale=1\.0">/i
    );

    mustContain('dynamic viewport css variable', css, /--app-dvh:\s*100dvh;/);
    mustContain('safe area top variable', css, /--safe-top:\s*env\(safe-area-inset-top,\s*0px\);/);
    mustContain('mobile fullscreen media query', css, /@media\s*\(max-width:\s*768px\)\s*\{/);
    mustContain('mobile body zero padding', css, /@media\s*\(max-width:\s*768px\)[\s\S]*?body\s*\{\s*padding:\s*0;\s*\}/);
    mustContain('mobile container full height', css, /@media\s*\(max-width:\s*768px\)[\s\S]*?\.container\s*\{[\s\S]*?min-height:\s*var\(--app-dvh\);/);
    mustContain(
        'mobile tab content safe-area padding',
        css,
        /@media\s*\(max-width:\s*768px\)[\s\S]*?\.tab-content\s*\{[\s\S]*?var\(--safe-bottom\)/
    );

    mustContain('viewport sizing setup function', js, /function\s+setupMobileViewportSizing\s*\(/);
    mustContain('viewport css var update in js', js, /setProperty\('--app-dvh',\s*`\$\{height\}px`\)/);
    mustContain('viewport sizing called inside app init', js, /initializeMetaModelApp[\s\S]*setupMobileViewportSizing\(\)/);
    mustContain(
        'app init wired for dynamic script load path',
        js,
        /document\.addEventListener\('DOMContentLoaded',\s*initializeMetaModelApp[\s\S]*queueMicrotask\(initializeMetaModelApp\)|document\.addEventListener\('DOMContentLoaded',\s*initializeMetaModelApp[\s\S]*setTimeout\(initializeMetaModelApp,\s*0\)/
    );

    const serverBundle = await startLocalServer();
    try {
        await verifyRuntimeMobileLayout(serverBundle.base);
    } finally {
        await stopServer(serverBundle.server);
    }

    console.log(`PASS: mobile fullscreen, runtime layout, and sticky CTA safety verified (${htmlPath}).`);
} catch (error) {
    console.error('FAIL:', error.message);
    process.exitCode = 1;
}
