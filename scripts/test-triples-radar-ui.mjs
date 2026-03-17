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

async function findAvailablePort(start = 4206, end = 4218) {
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
        throw new Error(`${error.message}\n${logs.slice(-20).join('\n')}`);
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
    if (!condition) {
        throw new Error(detail ? `${label} :: ${detail}` : label);
    }
}

async function enterTriplesRadarFeature(page) {
    await page.waitForFunction(() => {
        const section = document.getElementById('practice-triples-radar');
        return !!section && section.classList.contains('active');
    });

    const stage = await page.evaluate(() => (
        document.getElementById('practice-triples-radar')?.dataset.metaFeatureStage || ''
    ));

    if (stage === 'feature') return;

    const enterButton = page.locator('#practice-triples-radar [data-feature-enter]').first();
    await assert(await enterButton.count() > 0, 'triples radar welcome CTA available');
    await enterButton.click();
    await page.waitForFunction(() => (
        document.getElementById('practice-triples-radar')?.dataset.metaFeatureStage === 'feature'
    ));

    const introConfirm = page.locator('#practice-triples-radar [data-feature-confirm="practice-triples-radar"]').first();
    await assert((await introConfirm.count()) === 0, 'triples radar legacy intro gate removed');

    await page.waitForFunction(() => {
        const section = document.querySelector('#practice-triples-radar .practice-section-triples-radar');
        if (!section) return false;
        return !section.hasAttribute('data-intro-locked') && section.getBoundingClientRect().width > 0;
    });
}

let serverBundle = null;

try {
    serverBundle = await startLocalServer();
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
        await page.goto(serverBundle.base, { waitUntil: 'networkidle' });
        await page.evaluate(() => {
            localStorage.removeItem('triples_radar_ui_mode_v1');
            localStorage.removeItem('triples_radar_ui_mode_v2');
            localStorage.removeItem('triples_radar_session_mode_v1');
            localStorage.removeItem('meta_feature_shell_v3');
            window.navigateTo('practice-triples-radar');
        });

        await enterTriplesRadarFeature(page);
        await page.waitForFunction(() => document.querySelectorAll('#triples-radar-rows .triples-radar-row').length === 5);

        const detailsState = await page.evaluate(() => ({
            modeButtons: Array.from(document.querySelectorAll('#triples-radar-mode-switch [data-tr-ui-mode]')).map((btn) => btn.textContent.trim()),
            sessionButtons: Array.from(document.querySelectorAll('#triples-radar-session-switch [data-tr-session-mode]')).map((btn) => btn.textContent.trim()),
            modeTitle: document.getElementById('triples-radar-mode-title')?.textContent?.trim() || '',
            step: document.getElementById('triples-radar-step')?.textContent?.trim() || '',
            contextLine: document.getElementById('triples-radar-context-line')?.textContent?.trim() || '',
            sentenceHelper: document.getElementById('triples-radar-statement-helper')?.textContent?.trim() || '',
            rootText: document.getElementById('triples-radar-root')?.textContent?.replace(/\s+/g, ' ').trim() || '',
            strongestBadges: document.querySelectorAll('#triples-radar-rows .triples-radar-row-badge').length,
            catHintText: document.querySelector('#practice-triples-radar [data-tr-action="hint-category"]')?.textContent?.trim() || '',
            focusHint: document.getElementById('triples-radar-focus-hint')?.textContent?.trim() || '',
            conceptTrigger: document.querySelector('#practice-triples-radar [data-tr-action="open-concept"]')?.textContent?.trim() || ''
        }));

        await assert(
            JSON.stringify(detailsState.modeButtons) === JSON.stringify(['פרטים', 'כללים']),
            'triples radar mode labels',
            detailsState.modeButtons.join(', ')
        );
        await assert(
            JSON.stringify(detailsState.sessionButtons) === JSON.stringify(['למידה', 'מבחן']),
            'triples radar session labels',
            detailsState.sessionButtons.join(', ')
        );
        await assert(detailsState.rootText.length > 150, 'triples radar details content rendered', String(detailsState.rootText.length));
        await assert(detailsState.strongestBadges === 0, 'triples radar strongest direction hidden at start', String(detailsState.strongestBadges));
        await assert(detailsState.contextLine.length > 8, 'triples radar context line visible', detailsState.contextLine);
        await assert(/\u05de\u05d5\u05e7\u05d3\u05d9\u05dd/.test(detailsState.sentenceHelper), 'triples radar sentence helper visible', detailsState.sentenceHelper);
        await assert(/\u05d1\u05d7\u05e8\/\u05d9 \u05e9\u05d5\u05e8\u05d4|\u05db\u05e2\u05ea \u05d1\u05d5\u05d3\u05e7\u05d9\u05dd/.test(detailsState.focusHint), 'triples radar focus strip visible', detailsState.focusHint);
        await assert(/\u05e8\u05de\u05d6/.test(detailsState.catHintText), 'triples radar hint label clarified', detailsState.catHintText);
        await assert(/\u05d8\u05d1\u05dc\u05ea/.test(detailsState.conceptTrigger), 'triples radar concept trigger available', detailsState.conceptTrigger);
        await assert(!/[A-Z]{2,}/.test(detailsState.rootText), 'triples radar details avoids exposed english');

        await page.locator('#triples-radar-mode-switch [data-tr-ui-mode="rules"]').click();
        await page.waitForTimeout(250);

        const rulesState = await page.evaluate(() => ({
            modeTitle: document.getElementById('triples-radar-mode-title')?.textContent?.trim() || '',
            step: document.getElementById('triples-radar-step')?.textContent?.trim() || '',
            rootText: document.getElementById('triples-radar-root')?.textContent?.replace(/\s+/g, ' ').trim() || ''
        }));

        await assert(detailsState.modeTitle !== rulesState.modeTitle, 'triples radar mode title changes', `${detailsState.modeTitle} -> ${rulesState.modeTitle}`);
        await assert(detailsState.step !== rulesState.step, 'triples radar mode step changes', `${detailsState.step} -> ${rulesState.step}`);
        await assert(detailsState.rootText !== rulesState.rootText, 'triples radar content reframes input by mode');
        await assert(!/[A-Z]{2,}/.test(rulesState.rootText), 'triples radar rules avoids exposed english');

        await page.locator('#triples-radar-session-switch [data-tr-session-mode="exam"]').click();
        await page.waitForTimeout(250);
        const examState = await page.evaluate(() => ({
            sessionBadge: document.getElementById('triples-radar-session-badge')?.textContent?.trim() || '',
            timerLabel: document.getElementById('triples-radar-timer-label')?.textContent?.trim() || '',
            timerValue: document.getElementById('triples-radar-timer')?.textContent?.trim() || '',
            hintHidden: !!document.querySelector('#practice-triples-radar [data-tr-action="hint-category"]')?.hidden
        }));
        await assert(examState.sessionBadge === 'מבחן', 'triples radar exam badge updates', examState.sessionBadge);
        await assert(examState.timerLabel === 'זמן', 'triples radar exam timer label updates', examState.timerLabel);
        await assert(/^\d{2}:\d{2}$/.test(examState.timerValue), 'triples radar exam timer visible', examState.timerValue);
        await assert(examState.hintHidden, 'triples radar exam hides hints');

        await page.locator('#triples-radar-session-switch [data-tr-session-mode="learn"]').click();
        await page.waitForTimeout(250);
        await page.locator('#practice-triples-radar [data-tr-action="hint-category"]').click();
        await page.waitForTimeout(150);
        const revealCount = await page.evaluate(() => document.querySelectorAll('#triples-radar-rows .triples-radar-cat-btn.is-reveal').length);
        await assert(revealCount === 1, 'triples radar exact highlight works', String(revealCount));

        const counterBefore = ((await page.locator('#triples-radar-counter').textContent()) || '').trim();
        await page.locator('#practice-triples-radar [data-tr-action="next"]').click();
        await page.waitForTimeout(200);
        const counterAfterNext = ((await page.locator('#triples-radar-counter').textContent()) || '').trim();
        await assert(counterAfterNext !== counterBefore, 'triples radar next advances case', `${counterBefore} -> ${counterAfterNext}`);

        await page.locator('#practice-triples-radar [data-shell-chrome-restart="practice-triples-radar"]').click();
        await page.waitForTimeout(200);
        const counterAfterRestart = ((await page.locator('#triples-radar-counter').textContent()) || '').trim();
        await assert(counterAfterRestart === '1/15', 'triples radar restart resets case', counterAfterRestart);

        const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
        await mobile.goto(serverBundle.base, { waitUntil: 'networkidle' });
        await mobile.evaluate(() => window.navigateTo('practice-triples-radar'));
        await enterTriplesRadarFeature(mobile);
        await mobile.waitForFunction(() => document.querySelectorAll('#triples-radar-rows .triples-radar-row').length === 5);
        const mobileCheck = await mobile.evaluate(() => ({
            innerWidth: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth
        }));
        await assert(mobileCheck.scrollWidth <= mobileCheck.innerWidth + 1, 'triples radar mobile no horizontal overflow', `${mobileCheck.scrollWidth}/${mobileCheck.innerWidth}`);
        await mobile.close();

        console.log('PASS: triples radar UI verified.');
    } finally {
        await browser.close();
    }
} catch (error) {
    console.error('FAIL:', error.message);
    process.exitCode = 1;
} finally {
    await stopServer(serverBundle?.server);
}
