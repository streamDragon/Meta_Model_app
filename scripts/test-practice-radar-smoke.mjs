import { chromium } from 'playwright';
import net from 'net';
import path from 'path';
import { spawn } from 'child_process';

const ROOT = process.cwd();
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortFree(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => server.close(() => resolve(true)));
        server.listen(port, '127.0.0.1');
    });
}

async function findPort(start = 4191) {
    for (let port = start; port < start + 20; port += 1) {
        if (await isPortFree(port)) return port;
    }
    throw new Error('No free port found for practice-radar smoke test.');
}

async function startLocalServer() {
    const port = await findPort();
    const server = spawn(process.execPath, [VITE_BIN, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    const logs = [];
    server.stdout.on('data', (chunk) => logs.push(String(chunk)));
    server.stderr.on('data', (chunk) => logs.push(String(chunk)));

    for (let attempt = 0; attempt < 80; attempt += 1) {
        await wait(250);
        try {
            const response = await fetch(`http://127.0.0.1:${port}`);
            if (response.ok) {
                return { server, base: `http://127.0.0.1:${port}`, logs };
            }
        } catch (_error) {
            // keep waiting
        }
    }

    throw new Error(`Vite server did not start.\n${logs.join('\n')}`);
}

async function stopLocalServer(server) {
    if (!server || server.exitCode !== null) return;
    server.kill('SIGTERM');
    await Promise.race([
        new Promise((resolve) => server.once('exit', resolve)),
        wait(1500)
    ]);
    if (server.exitCode === null) server.kill('SIGKILL');
}

function extractRadarState(page) {
    return page.evaluate(() => ({
        activeTab: document.body?.dataset?.activeTab || '',
        featureStage: document.getElementById('practice-radar')?.dataset?.metaFeatureStage || '',
        prestartHidden: document.getElementById('rapid-radar-prestart')?.classList?.contains('hidden') || false,
        liveHidden: document.getElementById('rapid-radar-live-shell')?.classList?.contains('hidden') || false,
        monologue: document.getElementById('rapid-monologue-text')?.textContent?.replace(/\s+/g, ' ').trim() || '',
        modeNote: document.getElementById('rapid-mode-note')?.textContent?.trim() || '',
        modeChip: document.getElementById('rapid-compact-mode')?.textContent?.trim() || '',
        rowCount: document.querySelectorAll('#rapid-pattern-buttons [data-rapid-pattern-row]').length,
        buttonsPerRow: Array.from(document.querySelectorAll('#rapid-pattern-buttons [data-rapid-pattern-row]')).map((row) => row.querySelectorAll('.rapid-pattern-btn').length)
    }));
}

function extractOverlayState(page) {
    return page.evaluate(() => {
        const root = document.getElementById('app-overlay-root');
        return {
            visible: !!root && !root.classList.contains('hidden'),
            type: root?.getAttribute('data-overlay-type') || '',
            title: root?.querySelector('.overlay-title')?.textContent?.trim() || '',
            tone: root?.querySelector('.rapid-radar-feedback-coach')?.dataset?.tone || '',
            body: root?.querySelector('.question-drill-feedback-modal-body')?.textContent?.trim() || '',
            quote: root?.querySelector('.question-drill-feedback-modal-quote')?.textContent?.trim() || '',
            humor: root?.querySelector('.question-drill-feedback-modal-humor')?.textContent?.trim() || '',
            imageSrc: root?.querySelector('.question-drill-feedback-modal-image')?.getAttribute('src') || '',
            continueLabel: root?.querySelector('.question-drill-feedback-modal-actions .btn')?.textContent?.trim() || ''
        };
    });
}

let serverBundle = null;
let browser = null;

try {
    serverBundle = await startLocalServer();
    browser = await chromium.launch({ headless: true });

    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(6000);
    await page.addInitScript(() => {
        try {
            localStorage.setItem('mm_onboarding_dismissed_v2', '1');
        } catch (_error) {
            // ignore
        }
    });

    page.on('console', (msg) => {
        process.stdout.write(`[browser:${msg.type()}] ${msg.text()}\n`);
    });
    page.on('pageerror', (error) => {
        process.stdout.write(`[pageerror] ${error.message}\n`);
    });

    await page.goto(`${serverBundle.base}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);

    await page.evaluate(() => {
        if (typeof window.navigateByNavKey === 'function') {
            window.navigateByNavKey('practiceRadar');
            return;
        }
        if (typeof window.navigateTo === 'function') {
            window.navigateTo('practice-radar');
        }
    });
    await page.waitForTimeout(1200);

    let state = await extractRadarState(page);
    process.stdout.write(`AFTER_HOME ${JSON.stringify(state)}\n`);
    if (state.activeTab !== 'practice-radar') {
        throw new Error(`Failed to open practice-radar.\n${JSON.stringify(state, null, 2)}`);
    }

    const welcomeCta = page.locator('#practice-radar [data-feature-enter="practice-radar"], #practice-radar [data-feature-enter]').first();
    if (state.featureStage === 'welcome' && await welcomeCta.count()) {
        await welcomeCta.click();
        await page.waitForTimeout(900);
        state = await extractRadarState(page);
        process.stdout.write(`AFTER_WELCOME ${JSON.stringify(state)}\n`);
        if (state.featureStage !== 'feature') {
            throw new Error(`Welcome CTA did not enter feature stage.\n${JSON.stringify(state, null, 2)}`);
        }
    }

    await page.locator('#rapid-start-btn').click();
    await page.waitForTimeout(1200);
    state = await extractRadarState(page);
    process.stdout.write(`LEARNING_START ${JSON.stringify(state)}\n`);
    if (state.liveHidden || !state.monologue || state.rowCount !== 5 || state.buttonsPerRow.some((count) => count !== 3)) {
        throw new Error(`Rapid radar learning view did not hydrate into 5x3 board.\n${JSON.stringify(state, null, 2)}`);
    }
    if (!state.modeChip.includes('לימוד')) {
        throw new Error(`Learning mode chip missing.\n${JSON.stringify(state, null, 2)}`);
    }

    await page.locator('#rapid-open-menu').click();
    await page.locator('#app-overlay-root .overlay-body .btn').first().click();
    await page.waitForFunction(() => {
        const root = document.getElementById('app-overlay-root');
        return !!root && !root.classList.contains('hidden') && root.getAttribute('data-overlay-type') === 'rapid-pattern-help';
    }, { timeout: 5000 });
    const helpState = await page.evaluate(() => {
        const helpText = document.querySelector('#app-overlay-root .overlay-body')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const labels = Array.from(document.querySelectorAll('#rapid-pattern-buttons .rapid-pattern-btn'))
            .map((button) => button.textContent?.trim() || '')
            .filter(Boolean);
        return {
            helpText,
            correctLabel: labels.find((label) => helpText.includes(label)) || ''
        };
    });
    process.stdout.write(`HELP_OVERLAY ${JSON.stringify(helpState)}\n`);
    if (!helpState.helpText || !helpState.helpText.includes('רמז מהיר')) {
        throw new Error(`Learning help overlay did not render expected guidance.\n${JSON.stringify(helpState, null, 2)}`);
    }
    if (!helpState.correctLabel) {
        throw new Error('Could not derive the correct pattern label from the learning help overlay.');
    }
    await page.locator('#app-overlay-root [data-overlay-close]').click();
    await page.waitForTimeout(250);

    const firstMonologue = state.monologue;
    await page.locator('#rapid-pattern-buttons .rapid-pattern-btn', { hasText: helpState.correctLabel }).first().click();
    await page.waitForFunction(() => {
        const root = document.getElementById('app-overlay-root');
        return !!root && !root.classList.contains('hidden') && root.getAttribute('data-overlay-type') === 'rapid-pattern-feedback';
    }, { timeout: 5000 });
    let overlay = await extractOverlayState(page);
    process.stdout.write(`SUCCESS_OVERLAY ${JSON.stringify(overlay)}\n`);
    if (overlay.tone !== 'success' || !overlay.quote || !overlay.humor || !overlay.imageSrc.includes('bandler_grinder_icon.jpg')) {
        throw new Error(`Success overlay missing expected coach content.\n${JSON.stringify(overlay, null, 2)}`);
    }
    await page.locator('#app-overlay-root .question-drill-feedback-modal-actions .btn').click();
    await page.waitForFunction(
        (previousMonologue) => {
            const root = document.getElementById('app-overlay-root');
            const hidden = !root || root.classList.contains('hidden');
            const text = document.getElementById('rapid-monologue-text')?.textContent?.replace(/\s+/g, ' ').trim() || '';
            return hidden && text && text !== previousMonologue;
        },
        firstMonologue,
        { timeout: 6000 }
    );

    await page.locator('#rapid-open-menu').click();
    await page.locator('#app-overlay-root .overlay-body .btn.btn-primary').click();
    await page.waitForTimeout(700);
    await page.locator('#rapid-mode-exam-btn').click();
    await page.waitForTimeout(200);
    state = await extractRadarState(page);
    process.stdout.write(`EXAM_SETUP ${JSON.stringify(state)}\n`);
    if (!state.modeNote.includes('מבחן')) {
        throw new Error(`Exam mode note did not update.\n${JSON.stringify(state, null, 2)}`);
    }

    await page.locator('#rapid-start-btn').click();
    await page.waitForTimeout(1000);
    state = await extractRadarState(page);
    process.stdout.write(`EXAM_START ${JSON.stringify(state)}\n`);
    if (state.liveHidden || !state.modeChip.includes('מבחן')) {
        throw new Error(`Exam mode did not propagate into the live HUD.\n${JSON.stringify(state, null, 2)}`);
    }

    const examMonologue = state.monologue;
    await page.locator('#rapid-skip-btn').click();
    await page.waitForFunction(() => {
        const root = document.getElementById('app-overlay-root');
        return !!root && !root.classList.contains('hidden') && root.getAttribute('data-overlay-type') === 'rapid-pattern-feedback';
    }, { timeout: 5000 });
    overlay = await extractOverlayState(page);
    process.stdout.write(`WARN_OVERLAY ${JSON.stringify(overlay)}\n`);
    if (!['warn', 'danger'].includes(overlay.tone) || !overlay.quote || !overlay.humor) {
        throw new Error(`Failure overlay missing growth feedback.\n${JSON.stringify(overlay, null, 2)}`);
    }
    await page.locator('#app-overlay-root .question-drill-feedback-modal-actions .btn').click();
    await page.waitForFunction(
        (previousMonologue) => {
            const root = document.getElementById('app-overlay-root');
            const hidden = !root || root.classList.contains('hidden');
            const text = document.getElementById('rapid-monologue-text')?.textContent?.replace(/\s+/g, ' ').trim() || '';
            return hidden && text && text !== previousMonologue;
        },
        examMonologue,
        { timeout: 6000 }
    );

    process.stdout.write('PASS: practice-radar 5x3 board, coach overlay, and learning/exam flow verified.\n');
} catch (error) {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
} finally {
    await browser?.close().catch(() => {});
    if (serverBundle) await stopLocalServer(serverBundle.server);
}
