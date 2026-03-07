import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

function parseArgs(argv) {
    const args = {
        base: process.env.BASE_URL || ''
    };

    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === '--base') {
            args.base = argv[i + 1] || '';
            i += 1;
            continue;
        }
        if (token.startsWith('--base=')) {
            args.base = token.slice('--base='.length);
        }
    }

    return args;
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatLogs(lines) {
    return lines.slice(-20).join('\n');
}

function listenProbe(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close(() => resolve(true));
        });
        server.listen(port, '127.0.0.1');
    });
}

async function findAvailablePort(start = 4176, end = 4190) {
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

async function createBrowser() {
    try {
        return await chromium.launch({ headless: true });
    } catch (error) {
        const message = String(error?.message || error);
        if (/Executable doesn't exist|browser.*not found/i.test(message)) {
            throw new Error('Playwright Chromium is not installed. Run: npx playwright install chromium');
        }
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

async function startLocalServer() {
    const port = await findAvailablePort();
    const base = `http://127.0.0.1:${port}`;
    const logs = [];

    const server = spawn(process.execPath, [VITE_BIN, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    server.stdout?.on('data', (chunk) => {
        logs.push(String(chunk));
    });
    server.stderr?.on('data', (chunk) => {
        logs.push(String(chunk));
    });

    try {
        await waitForHttp(base, 30000);
        return { base, server, logs };
    } catch (error) {
        await stopServer(server);
        throw new Error(`${error.message}\n${formatLogs(logs)}`);
    }
}

async function runShellSmoke(baseUrl) {
    const browser = await createBrowser();
    const checks = [];

    const assert = async (condition, label, detail = '') => {
        if (!condition) {
            throw new Error(detail ? `${label} :: ${detail}` : label);
        }
        checks.push(label + (detail ? ` :: ${detail}` : ''));
    };

    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

    const waitForActiveScreen = async (screenId, targetPage = page) => {
        await targetPage.waitForFunction((id) => {
            const section = document.getElementById(id);
            return !!section && section.classList.contains('active') && getComputedStyle(section).display !== 'none';
        }, screenId);
    };

    const navigate = async (screenId) => {
        await page.evaluate((id) => window.navigateTo(id), screenId);
        await waitForActiveScreen(screenId);
        await page.waitForTimeout(500);
    };

    const overlayVisible = async (targetPage = page) =>
        targetPage.evaluate(() => !!document.querySelector('.overlay-root:not(.hidden)'));

    const getOverlayTitle = async (targetPage = page) => {
        await targetPage.waitForSelector('.overlay-root:not(.hidden)');
        return ((await targetPage.locator('.overlay-root:not(.hidden) .overlay-title').textContent()) || '').trim();
    };

    const closeOverlayWithButton = async (targetPage = page) => {
        if (!(await overlayVisible(targetPage))) return;
        await targetPage.locator('.overlay-root:not(.hidden) [data-overlay-close]').click();
        await targetPage.waitForFunction(() => document.querySelector('.overlay-root')?.classList.contains('hidden'));
    };

    const closeOverlayIfOpen = async (targetPage = page) => {
        if (await overlayVisible(targetPage)) {
            await closeOverlayWithButton(targetPage);
        }
    };

    const clickHeaderButton = async (screenId, index, targetPage = page) => {
        await targetPage.locator(`#${screenId} .app-shell .app-shell-actions button`).nth(index).click();
    };

    const checkGenericScreen = async (screenId, buttonIndex) => {
        await navigate(screenId);
        await closeOverlayIfOpen();
        const shellInfo = await page.evaluate(({ screenId, buttonIndex }) => {
            const section = document.getElementById(screenId);
            const shell = section?.querySelector('.app-shell');
            const title = shell?.querySelector('.app-shell-title')?.textContent?.trim() || '';
            const entry = window.MetaShellRegistry?.getScreen?.(screenId);
            const expectedTitle = entry?.panels?.[buttonIndex]?.title || '';
            const scope = entry?.containerSelector ? section?.querySelector(entry.containerSelector) : section;
            const visibleHiddenTargets = [];
            for (const rawSelector of entry?.hideSelectors || []) {
                if (!scope) continue;
                const selector = rawSelector.trim().startsWith('>') ? `:scope ${rawSelector}` : rawSelector;
                const nodes = Array.from(scope.querySelectorAll(selector));
                const visible = nodes.filter((node) => {
                    const style = getComputedStyle(node);
                    const rect = node.getBoundingClientRect();
                    return style.display !== 'none' && style.visibility !== 'hidden' && !node.hidden && rect.width > 0 && rect.height > 0;
                }).length;
                if (visible > 0) visibleHiddenTargets.push(rawSelector);
            }
            return { shell: !!shell, title, visibleHiddenTargets, expectedTitle };
        }, { screenId, buttonIndex });
        await assert(shellInfo.shell, `${screenId} shell mounted`, shellInfo.title || '');
        await assert(shellInfo.visibleHiddenTargets.length === 0, `${screenId} inline secondary hidden`, shellInfo.visibleHiddenTargets.join(', '));
        await clickHeaderButton(screenId, buttonIndex);
        const overlayTitle = await getOverlayTitle();
        await assert(Boolean(overlayTitle), `${screenId} overlay opened`, overlayTitle);
        if (shellInfo.expectedTitle) {
            await assert(overlayTitle === shellInfo.expectedTitle, `${screenId} overlay title matches registry`, `${overlayTitle} === ${shellInfo.expectedTitle}`);
        }
        await closeOverlayWithButton();
        return overlayTitle;
    };

    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });

        await navigate('home');
        const homeTitle = ((await page.locator('#home .app-shell-title').textContent()) || '').trim();
        await assert(Boolean(homeTitle), 'home shell loaded', homeTitle);

        await clickHeaderButton('home', 0);
        const menuTitle = await getOverlayTitle();
        await assert(Boolean(menuTitle), 'home menu overlay', menuTitle);
        await page.goBack();
        await page.waitForFunction(() => document.querySelector('.overlay-root')?.classList.contains('hidden'));
        await assert(!(await overlayVisible()), 'history back closes overlay');

        await clickHeaderButton('home', 2);
        const helpTitle = await getOverlayTitle();
        await assert(Boolean(helpTitle), 'home help overlay', helpTitle);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.querySelector('.overlay-root')?.classList.contains('hidden'));
        const activeText = (await page.evaluate(() => document.activeElement?.textContent || '')).trim();
        await assert(Boolean(activeText), 'focus return after esc', activeText);

        await clickHeaderButton('home', 1);
        const aboutTitle = await getOverlayTitle();
        await assert(Boolean(aboutTitle), 'home about overlay', aboutTitle);
        await closeOverlayWithButton();

        await checkGenericScreen('practice-question', 1);
        const radarPanelTitle = await checkGenericScreen('practice-radar', 1);

        await navigate('home');
        const resumeButtonCount = await page.locator('#home .home-shell-resume-btn').count();
        await assert(resumeButtonCount > 0, 'home resume action visible');
        await page.locator('#home .home-shell-resume-btn').click();
        await waitForActiveScreen('practice-radar');
        const resumedOverlayTitle = await getOverlayTitle();
        await assert(resumedOverlayTitle === radarPanelTitle, 'home resume restores last panel', resumedOverlayTitle);
        await closeOverlayWithButton();

        await checkGenericScreen('practice-triples-radar', 1);
        await checkGenericScreen('practice-wizard', 1);

        await navigate('practice-verb-unzip');
        await closeOverlayIfOpen();
        await assert((await page.locator('#practice-verb-unzip .app-shell').count()) > 0, 'practice-verb-unzip shell mounted');
        await clickHeaderButton('practice-verb-unzip', 1);
        const verbTitle = await getOverlayTitle();
        await assert(Boolean(verbTitle), 'practice-verb-unzip overlay', verbTitle);
        await closeOverlayWithButton();

        await navigate('scenario-trainer');
        await closeOverlayIfOpen();
        await assert((await page.locator('#scenario-trainer .app-shell').count()) > 0, 'scenario-trainer shell mounted');
        await clickHeaderButton('scenario-trainer', 1);
        const scenarioTitle = await getOverlayTitle();
        await assert(Boolean(scenarioTitle), 'scenario-trainer overlay', scenarioTitle);
        await closeOverlayWithButton();

        await checkGenericScreen('comic-engine', 1);
        await checkGenericScreen('categories', 1);
        await checkGenericScreen('blueprint', 1);
        await checkGenericScreen('prismlab', 1);
        await checkGenericScreen('about', 0);

        const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
        await mobile.goto(baseUrl, { waitUntil: 'networkidle' });
        for (const screenId of ['home', 'practice-radar', 'blueprint']) {
            await mobile.evaluate((id) => window.navigateTo(id), screenId);
            await waitForActiveScreen(screenId, mobile);
            await mobile.waitForTimeout(400);
            const mobileCheck = await mobile.evaluate(() => ({
                innerWidth: window.innerWidth,
                scrollWidth: document.documentElement.scrollWidth,
                activeElement: document.querySelector('.tab-content.active')?.id || ''
            }));
            await assert(mobileCheck.scrollWidth <= mobileCheck.innerWidth + 1, `mobile ${screenId} no horizontal overflow`, `${mobileCheck.scrollWidth}/${mobileCheck.innerWidth}`);
            await assert(mobileCheck.activeElement === screenId, `mobile ${screenId} active`);
        }
        await mobile.evaluate(() => window.navigateTo('home'));
        await waitForActiveScreen('home', mobile);
        await mobile.locator('#home .app-shell .app-shell-actions button').nth(0).click();
        await mobile.waitForSelector('.overlay-root:not(.hidden)');
        const closeBox = await mobile.locator('.overlay-root:not(.hidden) [data-overlay-close]').boundingBox();
        await assert(!!closeBox && closeBox.x >= 0 && closeBox.y >= 0 && closeBox.x + closeBox.width <= 390 && closeBox.y + closeBox.height <= 844, 'mobile overlay close reachable', JSON.stringify(closeBox));
        await mobile.close();

        const reduced = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        await reduced.emulateMedia({ reducedMotion: 'reduce' });
        await reduced.goto(baseUrl, { waitUntil: 'networkidle' });
        await reduced.evaluate(() => window.navigateTo('home'));
        await waitForActiveScreen('home', reduced);
        const prefersReduced = await reduced.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        await assert(prefersReduced, 'reduced motion media applied');
        await reduced.locator('#home .app-shell .app-shell-actions button').nth(0).click();
        const reducedTitle = await getOverlayTitle(reduced);
        await assert(Boolean(reducedTitle), 'reduced motion overlay path', reducedTitle);
        await reduced.close();

        console.log(`PASS: shell smoke verified (${checks.length} checks).`);
    } finally {
        await browser.close();
    }
}

const args = parseArgs(process.argv.slice(2));
const externalBase = String(args.base || '').trim();
let serverBundle = null;

try {
    const baseUrl = externalBase || (serverBundle = await startLocalServer(), serverBundle.base);
    await runShellSmoke(baseUrl);
} catch (error) {
    console.error('FAIL:', error.message);
    process.exitCode = 1;
} finally {
    await stopServer(serverBundle?.server);
}
