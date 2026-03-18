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
    await page.goto(`${baseUrl}/scenario_trainer.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
        () => !!document.querySelector('[data-trainer-platform="1"][data-trainer-id="scenario-trainer"]')
    );
    await page.waitForFunction(() => !!document.querySelector('.scenario-home-card--landing'));
    await page.waitForFunction(() => !!document.querySelector('.trainer-shell-nav'));
}

async function readText(page, selector) {
    await page.waitForFunction((css) => !!document.querySelector(css), selector);
    return page.evaluate((css) => {
        const node = document.querySelector(css);
        return (node?.textContent || '').trim();
    }, selector);
}

async function countMatches(page, selector) {
    return page.evaluate((css) => document.querySelectorAll(css).length, selector);
}

async function readRect(page, selector, index = 0) {
    await page.waitForFunction(
        ([css, nth]) => document.querySelectorAll(css).length > nth,
        [selector, index]
    );
    return page.evaluate(
        ([css, nth]) => {
            const node = document.querySelectorAll(css)[nth];
            if (!node) return null;
            const rect = node.getBoundingClientRect();
            return {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            };
        },
        [selector, index]
    );
}

async function clickStable(page, selector, index = 0) {
    await page.waitForFunction(
        ([css, nth]) => document.querySelectorAll(css).length > nth,
        [selector, index]
    );
    await page.evaluate(
        ([css, nth]) => {
            const target = document.querySelectorAll(css)[nth];
            if (!target) throw new Error(`Missing click target: ${css} @ ${nth}`);
            target.click();
        },
        [selector, index]
    );
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

    const startBox = await readRect(page, '[data-trainer-action="start-session"]');
    await assert(!!startBox && startBox.y < 980, 'scenario start visible in first viewport', JSON.stringify(startBox));

    const summaryBefore = await readText(page, '.scenario-home-setup-head h3');
    await clickStable(page, '[data-trainer-action="open-settings"]');
    await page.waitForSelector('[data-trainer-settings-shell="1"][data-trainer-id="scenario-trainer"]');

    await setRangeValue(page, '#scenario-setting-run-size', 4);
    await setSelectToNonCurrent(page, '#scenario-setting-domain');
    const previewBeforeSave = await readText(page, '[data-trainer-summary="preview"]');
    await clickStable(page, '[data-trainer-action="save-start"]');
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
    await assert(
        (await countMatches(page, '.trainer-shell-nav [data-nav-action="restart"]:not([hidden])')) > 0,
        'scenario desktop standalone restart visible during active scene'
    );

    await clickStable(page, '.scenario-play-topbar [data-scenario-action="open-help"]');
    await page.waitForSelector('.scenario-help-list');
    await clickStable(page, '.trainer-shell-nav [data-nav-action="back"]');
    await page.waitForSelector('.scenario-story-stage');
    await assert((await countMatches(page, '.scenario-help-list')) === 0, 'scenario standalone back returns from help to play');

    const frameBefore = await readText(page, '.scenario-story-frame-copy h3');
    await clickStable(page, '.scenario-story-chip', 1);
    await page.waitForTimeout(150);
    const frameAfter = await readText(page, '.scenario-story-frame-copy h3');
    const stableHeights = await page.evaluate(() => {
        const stage = document.querySelector('.scenario-story-stage');
        const rect = stage?.getBoundingClientRect();
        return rect ? rect.height : 0;
    });
    await assert(frameAfter !== frameBefore, 'scenario desktop chip switch updates active story frame');
    await assert(stableHeights > 480, 'scenario desktop stage height remains stable');

    await clickStable(page, '.scenario-compact-option');
    await page.waitForSelector('[data-scenario-feedback-thread="1"]');

    await assert((await countMatches(page, '#scenario-feedback-choice-bubble')) > 0, 'scenario chosen reply visible');
    await assert((await countMatches(page, '#scenario-feedback-other-bubble')) > 0, 'scenario likely other reply visible');
    await assert((await countMatches(page, '[data-scenario-impact="emotion"]')) > 0, 'scenario emotional impact card visible');
    await assert((await countMatches(page, '[data-scenario-impact="process"]')) > 0, 'scenario process impact card visible');
    await assert((await countMatches(page, '[data-scenario-consequence="1"]')) > 0, 'scenario consequence box visible');
    await assert((await countMatches(page, '.scenario-meta-accordion')) > 0, 'scenario feedback accordions visible');

    await clickStable(page, '.trainer-shell-nav [data-nav-action="restart"]:not([hidden])');
    await page.waitForSelector('.scenario-story-stage');
    await page.waitForFunction(() => !document.querySelector('[data-scenario-feedback-thread="1"]'));
    const restartedStatus = await readText(page, '.scenario-play-topbar-status');
    await assert(/1\/\d+/.test(restartedStatus), 'scenario standalone restart keeps current scene progress shell', restartedStatus);

    await clickStable(page, '.scenario-compact-option');
    await page.waitForSelector('[data-scenario-feedback-thread="1"]');

    await clickStable(page, '[data-scenario-action="show-blueprint"]');
    await page.waitForSelector('[data-scenario-analysis="1"]');
    await assert((await countMatches(page, '[data-scenario-feedback-thread="1"]')) > 0, 'scenario analysis stays in same thread');

    await clickStable(page, '[data-scenario-action="show-blueprint"]');
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

    await clickStable(page, '[data-trainer-action="start-session"]');
    await page.waitForSelector('.scenario-compact-option');
    await assert((await countMatches(page, '.scenario-play-topbar')) > 0, 'scenario mobile topbar visible');
    await assert((await countMatches(page, '.scenario-story-frame-card')) > 0, 'scenario mobile story frame visible');
    const mobileFlowOrder = await page.evaluate(() => ({
        stage: document.querySelector('.scenario-story-stage')?.getBoundingClientRect(),
        supportCount: document.querySelectorAll('.scenario-platform-support').length
    }));
    await assert(
        !!mobileFlowOrder.stage && mobileFlowOrder.stage.height > 440 && mobileFlowOrder.supportCount === 0,
        'scenario mobile uses single-stage composition',
        JSON.stringify(mobileFlowOrder)
    );

    await clickStable(page, '.scenario-compact-option');
    await page.waitForSelector('[data-scenario-feedback-thread="1"]');

    await openScenarioTrainer(page, baseUrl);

    await clickStable(page, '[data-trainer-action="open-settings"]');
    await page.waitForSelector('[data-trainer-settings-shell="1"][data-trainer-id="scenario-trainer"]');
    await page.waitForTimeout(150);
    const box = await readRect(page, '[data-trainer-action="save-start"]');
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
    console.error('FAIL:', error?.stack || error?.message || String(error));
    process.exitCode = 1;
} finally {
    if (serverBundle) await stopServer(serverBundle.server);
}
