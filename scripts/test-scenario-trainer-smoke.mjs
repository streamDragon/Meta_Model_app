import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listenProbe(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => server.close(() => resolve(true)));
        server.listen(port, '127.0.0.1');
    });
}

async function findAvailablePort(start = 4206, end = 4216) {
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
        cwd: ROOT,
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
    if (!closed && server.exitCode === null) server.kill('SIGTERM');
}

async function assert(condition, label, detail = '') {
    if (!condition) throw new Error(detail ? `${label} :: ${detail}` : label);
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

async function openScenarioTrainer(page, baseUrl) {
    await page.goto(`${baseUrl}/scenario_trainer.html`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-trainer-platform="1"][data-trainer-id="scenario-trainer"]');
    await page.waitForSelector('.scenario-home-card--landing');
}

async function readText(page, selector) {
    return ((await page.locator(selector).first().textContent()) || '').trim();
}

async function setRangeValue(page, selector, value) {
    await page.locator(selector).evaluate((node, nextValue) => {
        node.value = String(nextValue);
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
}

async function setSelectToNonCurrent(page, selector) {
    await page.locator(selector).evaluate((node) => {
        const options = Array.from(node.options || []);
        const current = node.value;
        const next = options.find((option) => option.value && option.value !== current);
        if (!next) return;
        node.value = next.value;
        node.dispatchEvent(new Event('change', { bubbles: true }));
    });
}

async function runDesktopChecks(page, baseUrl) {
    await openScenarioTrainer(page, baseUrl);
    await assert(await visibleGlobalBlockers(page) === 0, 'scenario desktop no visible global blockers');

    const startButton = page.locator('[data-trainer-action="start-session"]').first();
    const startBox = await startButton.boundingBox();
    await assert(!!startBox && startBox.y < 980, 'scenario start visible in first viewport', JSON.stringify(startBox));

    const summaryBefore = await readText(page, '.scenario-home-setup-head h3');
    await page.locator('[data-trainer-action="open-settings"]').first().click();
    await page.waitForSelector('[data-trainer-settings-shell="1"][data-trainer-id="scenario-trainer"]');

    await setRangeValue(page, '#scenario-setting-run-size', 4);
    await setSelectToNonCurrent(page, '#scenario-setting-domain');
    const previewBeforeSave = await readText(page, '[data-trainer-summary="preview"]');
    await page.locator('[data-trainer-action="save-start"]').first().click();
    await page.waitForFunction(() => !document.querySelector('[data-trainer-settings-shell="1"][data-trainer-id="scenario-trainer"]'));
    await page.waitForSelector('.scenario-story-stage');
    const topbarStatus = await readText(page, '.scenario-play-topbar-status');

    await assert(previewBeforeSave !== summaryBefore, 'scenario preview summary changed', `${summaryBefore} -> ${previewBeforeSave}`);
    await assert(/1\/\d+/.test(topbarStatus), 'scenario play topbar reflects live session progress', topbarStatus);

    await page.waitForSelector('.scenario-compact-option');
    const stageLayout = await page.evaluate(() => ({
        stage: document.querySelector('.scenario-story-stage')?.getBoundingClientRect(),
        supportCount: document.querySelectorAll('.scenario-platform-support').length
    }));
    await assert(
        !!stageLayout.stage && stageLayout.stage.height > 480 && stageLayout.supportCount === 0,
        'scenario desktop stage dominates without support rail',
        JSON.stringify(stageLayout)
    );

    const frameBefore = await readText(page, '.scenario-story-frame-copy h3');
    await page.locator('.scenario-story-chip').nth(1).click();
    await page.waitForTimeout(150);
    const frameAfter = await readText(page, '.scenario-story-frame-copy h3');
    const stableHeights = await page.evaluate(() => {
        const stage = document.querySelector('.scenario-story-stage');
        const rect = stage?.getBoundingClientRect();
        return rect ? rect.height : 0;
    });
    await assert(frameAfter !== frameBefore, 'scenario desktop chip switch updates active story frame');
    await assert(stableHeights > 480, 'scenario desktop stage height remains stable');

    await page.locator('.scenario-compact-option').first().click();
    await page.waitForSelector('[data-scenario-feedback-thread="1"]');

    await assert((await page.locator('#scenario-feedback-choice-bubble').count()) > 0, 'scenario chosen reply visible');
    await assert((await page.locator('#scenario-feedback-other-bubble').count()) > 0, 'scenario likely other reply visible');
    await assert((await page.locator('[data-scenario-impact="emotion"]').count()) > 0, 'scenario emotional impact card visible');
    await assert((await page.locator('[data-scenario-impact="process"]').count()) > 0, 'scenario process impact card visible');
    await assert((await page.locator('[data-scenario-consequence="1"]').count()) > 0, 'scenario consequence box visible');
    await assert((await page.locator('.scenario-meta-accordion').count()) > 0, 'scenario feedback accordions visible');

    await page.locator('[data-scenario-action="show-blueprint"]').first().click();
    await page.waitForSelector('[data-scenario-analysis="1"]');
    await assert((await page.locator('[data-scenario-feedback-thread="1"]').count()) > 0, 'scenario analysis stays in same thread');

    await page.locator('[data-scenario-action="show-blueprint"]').first().click();
    await page.waitForFunction(() => !document.querySelector('[data-scenario-analysis="1"]'));
    console.log(`desktop scenario-trainer: ${summaryBefore} -> ${topbarStatus}`);
}

async function runMobileChecks(page, baseUrl) {
    await openScenarioTrainer(page, baseUrl);
    await assert(await visibleGlobalBlockers(page) === 0, 'scenario mobile no visible global blockers');

    const overflow = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth
    }));
    await assert(overflow.scrollWidth <= overflow.innerWidth + 1, 'scenario mobile no horizontal overflow', `${overflow.scrollWidth}/${overflow.innerWidth}`);

    await page.locator('[data-trainer-action="start-session"]').first().click();
    await page.waitForSelector('.scenario-compact-option');
    await assert((await page.locator('.scenario-play-topbar').count()) > 0, 'scenario mobile topbar visible');
    await assert((await page.locator('.scenario-story-frame-card').count()) > 0, 'scenario mobile story frame visible');
    const mobileFlowOrder = await page.evaluate(() => ({
        stage: document.querySelector('.scenario-story-stage')?.getBoundingClientRect(),
        supportCount: document.querySelectorAll('.scenario-platform-support').length
    }));
    await assert(
        !!mobileFlowOrder.stage && mobileFlowOrder.stage.height > 440 && mobileFlowOrder.supportCount === 0,
        'scenario mobile uses single-stage composition',
        JSON.stringify(mobileFlowOrder)
    );

    const mobileFirstOption = page.locator('.scenario-compact-option').first();
    await mobileFirstOption.click();
    await page.waitForSelector('[data-scenario-feedback-thread="1"]');

    await openScenarioTrainer(page, baseUrl);

    await page.locator('[data-trainer-action="open-settings"]').first().click();
    await page.waitForSelector('[data-trainer-settings-shell="1"][data-trainer-id="scenario-trainer"]');
    const saveButton = page.locator('[data-trainer-action="save-start"]').first();
    await saveButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const box = await saveButton.boundingBox();
    await assert(!!box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844, 'scenario mobile settings footer reachable', JSON.stringify(box));
    console.log(`mobile scenario-trainer: ${overflow.scrollWidth}/${overflow.innerWidth}`);
}

let serverBundle = null;

try {
    serverBundle = await startLocalServer();
    const browser = await chromium.launch({ headless: true });
    try {
        const desktop = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
        await runDesktopChecks(desktop, serverBundle.base);
        await desktop.close();

        const mobile = await browser.newPage({
            viewport: { width: 390, height: 844 },
            isMobile: true,
            hasTouch: true,
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        });
        await runMobileChecks(mobile, serverBundle.base);
        await mobile.close();
    } finally {
        await browser.close();
    }
    console.log('PASS: scenario trainer smoke verified.');
} catch (error) {
    console.error('FAIL:', error.message);
    process.exitCode = 1;
} finally {
    if (serverBundle) await stopServer(serverBundle.server);
}
