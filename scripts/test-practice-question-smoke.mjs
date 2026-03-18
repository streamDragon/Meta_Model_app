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

async function findPort(start = 4189) {
    for (let port = start; port < start + 20; port += 1) {
        if (await isPortFree(port)) return port;
    }
    throw new Error('No free port found for practice-question smoke test.');
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
            // Retry until the server is ready.
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

function extractState(page) {
    return page.evaluate(() => ({
        activeTab: document.body?.dataset?.activeTab || '',
        route: `${window.location.pathname}${window.location.search}`,
        featureStage: document.getElementById('practice-question')?.dataset?.metaFeatureStage || '',
        drillStage: document.getElementById('question-drill')?.dataset?.stage || '',
        welcomeCtas: document.querySelectorAll('#practice-question [data-feature-enter="practice-question"]').length,
        prestartHidden: document.getElementById('question-drill-prestart')?.classList?.contains('hidden') || false,
        liveHidden: document.getElementById('question-drill-live-shell')?.classList?.contains('hidden') || false,
        statement: document.getElementById('question-drill-statement')?.textContent || '',
        note: document.getElementById('question-drill-session-note')?.textContent || '',
        feedback: document.getElementById('question-drill-feedback-body')?.textContent || ''
    }));
}

let serverBundle = null;
let browser = null;

try {
    serverBundle = await startLocalServer();
    browser = await chromium.launch({ headless: true });

    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(5000);

    page.on('console', (msg) => {
        process.stdout.write(`[browser:${msg.type()}] ${msg.text()}\n`);
    });
    page.on('pageerror', (error) => {
        process.stdout.write(`[pageerror] ${error.message}\n`);
    });

    await page.goto(`${serverBundle.base}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const homeButtons = page.locator('[data-nav-key="practiceQuestion"]');
    const homeCount = await homeButtons.count();
    if (!homeCount) {
        throw new Error(`No home launcher found for practiceQuestion.\n${JSON.stringify(await extractState(page), null, 2)}`);
    }

    await homeButtons.first().click();
    await page.waitForTimeout(1200);
    const afterHome = await extractState(page);
    process.stdout.write(`AFTER_HOME ${JSON.stringify(afterHome)}\n`);
    if (afterHome.activeTab !== 'practice-question' || afterHome.featureStage !== 'welcome') {
        throw new Error(`Home navigation failed.\n${JSON.stringify(afterHome, null, 2)}`);
    }

    const welcomeCta = page.locator('#practice-question [data-feature-enter="practice-question"]');
    if (!(await welcomeCta.count())) {
        throw new Error(`No welcome CTA found.\n${JSON.stringify(afterHome, null, 2)}`);
    }

    await welcomeCta.first().click();
    await page.waitForTimeout(1000);
    const afterWelcome = await extractState(page);
    process.stdout.write(`AFTER_WELCOME ${JSON.stringify(afterWelcome)}\n`);
    if (afterWelcome.featureStage !== 'feature') {
        throw new Error(`Welcome CTA did not enter feature stage.\n${JSON.stringify(afterWelcome, null, 2)}`);
    }

    const startBtn = page.locator('#question-drill-start-session');
    await startBtn.click();
    await page.waitForTimeout(1500);
    const afterStart = await extractState(page);
    process.stdout.write(`AFTER_START ${JSON.stringify(afterStart)}\n`);
    if (afterStart.drillStage === 'setup' || afterStart.liveHidden || !afterStart.statement.trim()) {
        throw new Error(`Question drill did not progress into live round.\n${JSON.stringify(afterStart, null, 2)}`);
    }

    process.stdout.write('PASS: practice-question home -> welcome -> live flow verified.\n');
} catch (error) {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
} finally {
    await browser?.close().catch(() => {});
    if (serverBundle) await stopLocalServer(serverBundle.server);
}
