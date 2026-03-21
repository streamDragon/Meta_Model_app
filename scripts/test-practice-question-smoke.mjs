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

function extractFeedbackModalState(page) {
    return page.evaluate(() => {
        const modal = document.getElementById('question-drill-feedback-modal');
        const title = document.getElementById('question-drill-feedback-modal-title');
        const body = document.getElementById('question-drill-feedback-modal-body');
        const quote = document.getElementById('question-drill-feedback-modal-quote');
        const humor = document.getElementById('question-drill-feedback-modal-humor');
        const image = document.getElementById('question-drill-feedback-modal-image');
        const button = document.getElementById('question-drill-feedback-modal-continue');
        return {
            exists: !!modal,
            visible: !!modal && !modal.classList.contains('hidden') && modal.getAttribute('aria-hidden') !== 'true',
            tone: modal?.dataset?.tone || '',
            title: title?.textContent?.trim() || '',
            body: body?.textContent?.trim() || '',
            quote: quote?.textContent?.trim() || '',
            humor: humor?.textContent?.trim() || '',
            imageSrc: image?.getAttribute('src') || '',
            continueLabel: button?.textContent?.trim() || ''
        };
    });
}

function extractRoundState(page) {
    return page.evaluate(() => ({
        statement: document.getElementById('question-drill-statement')?.textContent?.trim() || '',
        expectedCategory: document.getElementById('question-drill-category')?.value || '',
        optionCategories: Array.from(document.querySelectorAll('#question-drill-options .question-drill-option'))
            .map((button) => String(button.getAttribute('data-category') || '').trim().toUpperCase())
            .filter(Boolean)
    }));
}

function extractSplashState(page) {
    return page.evaluate(() => {
        const splash = document.getElementById('splash-screen');
        if (!splash) return { exists: false };
        const style = window.getComputedStyle(splash);
        return {
            exists: true,
            className: splash.className,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            pointerEvents: style.pointerEvents,
            hiddenAttr: splash.hidden === true
        };
    });
}

let serverBundle = null;
let browser = null;

try {
    serverBundle = await startLocalServer();
    browser = await chromium.launch({ headless: true });

    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(5000);
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
    await page.waitForTimeout(400);
    const splash = page.locator('#splash-screen');
    if (await splash.count()) {
        try {
            await splash.waitFor({ state: 'hidden', timeout: 4000 });
        } catch (_error) {
            process.stdout.write(`SPLASH_STUCK ${JSON.stringify(await extractSplashState(page))}\n`);
            process.stdout.write(`INIT_STATE ${JSON.stringify(await extractState(page))}\n`);
            await page.evaluate(() => {
                const node = document.getElementById('splash-screen');
                if (!node) return;
                node.classList.add('hidden');
                node.style.pointerEvents = 'none';
                node.style.display = 'none';
            });
            await page.waitForTimeout(120);
        }
    }

    const homeButtons = page.locator([
        '[data-open-feature="practice-question"]:visible',
        '[data-home-nav="practice-question"]:visible',
        '[data-nav-key="practiceQuestion"]:visible'
    ].join(', '));
    const homeCount = await homeButtons.count();
    if (!homeCount) {
        throw new Error(`No visible home launcher found for practiceQuestion.\n${JSON.stringify(await extractState(page), null, 2)}`);
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

    const firstRound = await extractRoundState(page);
    const wrongCategory = firstRound.optionCategories.find((category) => category && category !== firstRound.expectedCategory);
    if (!firstRound.expectedCategory || !wrongCategory) {
        throw new Error(`Could not derive answer categories for the first round.\n${JSON.stringify(firstRound, null, 2)}`);
    }

    const firstStatement = firstRound.statement;
    await page.locator(`#question-drill-options .question-drill-option[data-category="${wrongCategory}"]`).first().click();
    await page.locator('#question-drill-feedback-modal:not(.hidden)').waitFor({ state: 'visible', timeout: 5000 });
    const wrongModal = await extractFeedbackModalState(page);
    process.stdout.write(`WRONG_MODAL ${JSON.stringify(wrongModal)}\n`);
    if (!wrongModal.visible || !['warn', 'danger'].includes(wrongModal.tone)) {
        throw new Error(`Wrong answer did not open a growth-feedback modal.\n${JSON.stringify(wrongModal, null, 2)}`);
    }
    if (!wrongModal.quote || !wrongModal.humor || !wrongModal.imageSrc.includes('bandler_grinder_icon.jpg')) {
        throw new Error(`Wrong answer modal is missing quote/humor/image.\n${JSON.stringify(wrongModal, null, 2)}`);
    }
    await page.locator('#question-drill-feedback-modal-continue').click();
    await page.locator('#question-drill-feedback-modal').waitFor({ state: 'hidden', timeout: 5000 });
    await page.waitForFunction(
        (previousStatement) => {
            const text = document.getElementById('question-drill-statement')?.textContent?.trim() || '';
            return text && text !== previousStatement;
        },
        firstStatement,
        { timeout: 5000 }
    );

    const secondRound = await extractRoundState(page);
    if (!secondRound.expectedCategory) {
        throw new Error(`Second round did not load correctly.\n${JSON.stringify(secondRound, null, 2)}`);
    }
    const secondStatement = secondRound.statement;
    await page.locator(`#question-drill-options .question-drill-option[data-category="${secondRound.expectedCategory}"]`).first().click();
    await page.locator('#question-drill-feedback-modal:not(.hidden)').waitFor({ state: 'visible', timeout: 5000 });
    const successModal = await extractFeedbackModalState(page);
    process.stdout.write(`SUCCESS_MODAL ${JSON.stringify(successModal)}\n`);
    if (!successModal.visible || successModal.tone !== 'success') {
        throw new Error(`Correct answer did not open a success-feedback modal.\n${JSON.stringify(successModal, null, 2)}`);
    }
    if (!successModal.quote || !successModal.humor || !successModal.body) {
        throw new Error(`Success modal is missing feedback copy.\n${JSON.stringify(successModal, null, 2)}`);
    }
    await page.locator('#question-drill-feedback-modal-continue').click();
    await page.locator('#question-drill-feedback-modal').waitFor({ state: 'hidden', timeout: 5000 });
    await page.waitForFunction(
        (previousStatement) => {
            const text = document.getElementById('question-drill-statement')?.textContent?.trim() || '';
            return text && text !== previousStatement;
        },
        secondStatement,
        { timeout: 5000 }
    );

    process.stdout.write('PASS: practice-question home -> welcome -> live feedback modal flow verified.\n');
} catch (error) {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
} finally {
    await browser?.close().catch(() => {});
    if (serverBundle) await stopLocalServer(serverBundle.server);
}
