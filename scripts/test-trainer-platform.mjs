import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const TRAINERS = [
    { id: 'classic2', path: 'classic2_trainer.html' },
    { id: 'classic-classic', path: 'classic_classic_trainer.html' },
    { id: 'iceberg-templates', path: 'iceberg_templates_trainer.html' }
];

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

async function findAvailablePort(start = 4191, end = 4205) {
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
    const logs = [];

    const server = spawn(process.execPath, [VITE_BIN, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    server.stdout?.on('data', (chunk) => logs.push(String(chunk)));
    server.stderr?.on('data', (chunk) => logs.push(String(chunk)));

    try {
        await waitForHttp(base, 30000);
        return { base, server, logs };
    } catch (error) {
        await stopServer(server);
        throw new Error(`${error.message}\n${formatLogs(logs)}`);
    }
}

async function stopServer(server) {
    if (!server || server.exitCode !== null || server.killed) return;
    server.kill('SIGINT');
    const closed = await Promise.race([
        new Promise((resolve) => server.once('exit', () => resolve(true))),
        wait(3000).then(() => false)
    ]);
    if (!closed && server.exitCode === null) server.kill('SIGTERM');
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

async function textContent(locator) {
    return ((await locator.first().textContent()) || '').trim();
}

async function dismissOnboardingIfPresent(page) {
    const button = page.locator('[data-trainer-onboarding="1"] [data-trainer-action="dismiss-onboarding"]').first();
    if (await button.count()) {
        await button.click();
        await page.waitForFunction(() => !document.querySelector('[data-trainer-onboarding="1"]'));
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(150);
    }
}

async function assert(condition, label, detail = '') {
    if (!condition) throw new Error(detail ? `${label} :: ${detail}` : label);
}

async function assertMobileZoneOrder(page, trainerId) {
    const ordering = await page.evaluate((id) => {
        const root = document.querySelector(`[data-trainer-platform="1"][data-trainer-id="${id}"]`);
        if (!root) return null;
        const declared = String(root.getAttribute('data-trainer-mobile-order') || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        const visible = declared
            .map((zone) => {
                const node = root.querySelector(`[data-trainer-zone="${zone}"]`);
                if (!node) return null;
                const style = getComputedStyle(node);
                const rect = node.getBoundingClientRect();
                if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) return null;
                return { zone, top: Math.round(rect.top) };
            })
            .filter(Boolean);
        return {
            declaredVisible: visible.map((item) => item.zone),
            actualVisible: visible.slice().sort((a, b) => a.top - b.top).map((item) => item.zone)
        };
    }, trainerId);
    await assert(!!ordering, `${trainerId} mobile order metadata exists`);
    await assert(
        JSON.stringify(ordering.actualVisible) === JSON.stringify(ordering.declaredVisible),
        `${trainerId} mobile order follows contract`,
        `${ordering.declaredVisible.join(' > ')} :: ${ordering.actualVisible.join(' > ')}`
    );
}

async function openSettings(page, trainerId) {
    await page.locator(`[data-trainer-platform="1"][data-trainer-id="${trainerId}"] [data-trainer-action="open-settings"]`).first().click();
    await page.waitForSelector(`[data-trainer-settings-shell="1"][data-trainer-id="${trainerId}"]`);
}

async function mutateSessionSummary(page, trainerId) {
    const summaryBefore = await textContent(page.locator(`[data-trainer-platform="1"][data-trainer-id="${trainerId}"] [data-trainer-summary="current"]`));
    const shell = page.locator(`[data-trainer-settings-shell="1"][data-trainer-id="${trainerId}"]`).first();
    const preview = shell.locator('[data-trainer-summary="preview"]').first();
    const previewBefore = await textContent(preview);

    const compact = shell.locator('[data-trainer-preset="compact"]').first();
    const standard = shell.locator('[data-trainer-preset="standard"]').first();
    if (await compact.count()) {
        await compact.click();
    }
    let previewAfter = await textContent(preview);
    if (previewAfter === previewBefore && await standard.count()) {
        await standard.click();
        previewAfter = await textContent(preview);
    }

    await assert(previewAfter !== previewBefore, `${trainerId} preview summary changed`, `${previewBefore} -> ${previewAfter}`);

    const saveStart = shell.locator('[data-trainer-action="save-start"]').first();
    const saveSettings = shell.locator('[data-trainer-action="save-settings"]').first();
    if (await saveStart.count()) {
        await saveStart.click();
    } else if (await saveSettings.count()) {
        await saveSettings.click();
    } else {
        throw new Error(`${trainerId} missing save action`);
    }

    await page.waitForFunction((id) => !document.querySelector(`[data-trainer-settings-shell="1"][data-trainer-id="${id}"]`), trainerId);
    await page.waitForTimeout(250);

    const summaryAfter = await textContent(page.locator(`[data-trainer-platform="1"][data-trainer-id="${trainerId}"] [data-trainer-summary="current"]`));
    await assert(summaryAfter !== summaryBefore, `${trainerId} current summary changed`, `${summaryBefore} -> ${summaryAfter}`);

    return { summaryBefore, summaryAfter };
}

async function visibleGlobalBlockers(page) {
    return page.evaluate(() =>
        Array.from(document.querySelectorAll('.alchemy-consent,.alchemy-companion,.alchemy-mute')).filter((node) => {
            const style = getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && !node.hidden && rect.width > 0 && rect.height > 0;
        }).length
    );
}

async function runDesktopChecks(page, baseUrl, trainer) {
    await page.goto(`${baseUrl}/${trainer.path}`, { waitUntil: 'networkidle' });
    await dismissOnboardingIfPresent(page);
    await page.waitForSelector(`[data-trainer-platform="1"][data-trainer-id="${trainer.id}"]`);

    const startButton = page.locator(`[data-trainer-platform="1"][data-trainer-id="${trainer.id}"] [data-trainer-action="start-session"]`).first();
    await assert(await startButton.count(), `${trainer.id} start button exists`);
    const startBox = await startButton.boundingBox();
    await assert(!!startBox && startBox.y < 660, `${trainer.id} start visible in first viewport`, JSON.stringify(startBox));
    await assert((await page.locator('.mtp-nav').count()) > 0, `${trainer.id} wrapper nav mounted`);
    await assert(await visibleGlobalBlockers(page) === 0, `${trainer.id} no visible global blockers`);

    await openSettings(page, trainer.id);
    const { summaryBefore, summaryAfter } = await mutateSessionSummary(page, trainer.id);

    const zones = await page.evaluate(() => {
        const main = document.querySelector('[data-trainer-zone="main"]');
        const support = document.querySelector('[data-trainer-zone="support"]');
        if (!main || !support) return null;
        return {
            mainWidth: Math.round(main.getBoundingClientRect().width),
            supportWidth: Math.round(support.getBoundingClientRect().width)
        };
    });
    await assert(!!zones, `${trainer.id} main/support zones exist`);
    await assert(zones.supportWidth < zones.mainWidth, `${trainer.id} support rail secondary`, `${zones.supportWidth}/${zones.mainWidth}`);

    console.log(`desktop ${trainer.id}: ${summaryBefore} -> ${summaryAfter}`);
}

async function runMobileChecks(page, baseUrl, trainer) {
    await page.goto(`${baseUrl}/${trainer.path}`, { waitUntil: 'networkidle' });
    await dismissOnboardingIfPresent(page);
    await page.waitForSelector(`[data-trainer-platform="1"][data-trainer-id="${trainer.id}"]`);
    await assert(await visibleGlobalBlockers(page) === 0, `${trainer.id} mobile no visible global blockers`);

    const overflow = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth
    }));
    await assert(overflow.scrollWidth <= overflow.innerWidth + 1, `${trainer.id} mobile no horizontal overflow`, `${overflow.scrollWidth}/${overflow.innerWidth}`);
    await assertMobileZoneOrder(page, trainer.id);

    await openSettings(page, trainer.id);
    const footerAction = page.locator(`[data-trainer-settings-shell="1"][data-trainer-id="${trainer.id}"] [data-trainer-action="save-start"], [data-trainer-settings-shell="1"][data-trainer-id="${trainer.id}"] [data-trainer-action="save-settings"]`).first();
    await footerAction.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const box = await footerAction.boundingBox();
    await assert(!!box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844, `${trainer.id} mobile footer reachable`, JSON.stringify(box));
    console.log(`mobile ${trainer.id}: ${overflow.scrollWidth}/${overflow.innerWidth}`);
}

async function runPlatformChecks(baseUrl) {
    const browser = await createBrowser();
    try {
        for (const trainer of TRAINERS) {
            const desktop = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
            await runDesktopChecks(desktop, baseUrl, trainer);
            await desktop.close();

            const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
            await runMobileChecks(mobile, baseUrl, trainer);
            await mobile.close();
        }
        console.log(`PASS: trainer platform verified (${TRAINERS.length} trainers).`);
    } finally {
        await browser.close();
    }
}

let serverBundle = null;

try {
    serverBundle = await startLocalServer();
    await runPlatformChecks(serverBundle.base);
} catch (error) {
    console.error('FAIL:', error.message);
    process.exitCode = 1;
} finally {
    if (serverBundle) {
        await stopServer(serverBundle.server);
    }
}
