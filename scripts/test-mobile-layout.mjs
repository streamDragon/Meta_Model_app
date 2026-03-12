import { readFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const projectRoot = process.cwd();
const VITE_BIN = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');

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
    if ((await page.locator('#mm-onboarding').count()) === 0) return false;
    await page.waitForTimeout(4200);
    if ((await page.locator('#mm-onboarding.is-visible').count()) === 0) return false;
    const dismissBtn = page.locator('#mm-onboarding [data-ob-dismiss]').first();
    if ((await dismissBtn.count()) > 0) {
        await dismissBtn.click();
    } else {
        await page.locator('#mm-ob-explore-btn').click();
    }
    await page.waitForFunction(() => {
        const overlay = document.getElementById('mm-onboarding');
        if (!overlay) return true;
        const style = getComputedStyle(overlay);
        return overlay.hidden || style.display === 'none' || style.pointerEvents === 'none';
    });
    return true;
}

async function waitForActiveScreen(page, screenId) {
    await page.waitForFunction((id) => {
        const section = document.getElementById(id);
        return !!section && section.classList.contains('active') && getComputedStyle(section).display !== 'none';
    }, screenId);
}

async function verifyRuntimeMobileLayout(baseUrl) {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await dismissOnboardingIfVisible(page);

        for (const screenId of ['home', 'sentence-map', 'practice-question', 'practice-radar', 'practice-wizard', 'blueprint']) {
            await page.evaluate((id) => window.navigateTo(id), screenId);
            await waitForActiveScreen(page, screenId);
            await page.waitForTimeout(400);

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
            await page.evaluate((id) => window.navigateTo(id), screenId);
            await waitForActiveScreen(page, screenId);
            await page.waitForTimeout(500);

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
