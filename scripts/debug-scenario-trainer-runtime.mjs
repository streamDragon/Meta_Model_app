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

async function findAvailablePort(start = 4290, end = 4300) {
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

    server.stdout.on('data', (chunk) => {
        process.stdout.write(`[vite] ${chunk}`);
    });
    server.stderr.on('data', (chunk) => {
        process.stdout.write(`[vite-err] ${chunk}`);
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

let serverBundle = null;

try {
    serverBundle = await startLocalServer();
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        page.on('console', (msg) => {
            console.log(`[console:${msg.type()}] ${msg.text()}`);
        });
        page.on('pageerror', (error) => {
            console.log('[pageerror]', error?.stack || String(error));
        });
        page.on('requestfailed', (request) => {
            console.log('[requestfailed]', request.url(), request.failure()?.errorText || '');
        });

        const response = await page.goto(`${serverBundle.base}/scenario_trainer.html`, {
            waitUntil: 'networkidle'
        });

        console.log('status', response?.status());
        await page.waitForTimeout(1000);
        const visibility = await page.locator('[data-trainer-platform="1"][data-trainer-id="scenario-trainer"]').isVisible().catch(() => false);
        console.log('trainer visible', visibility);

        const snapshot = await page.evaluate(() => ({
            title: document.title,
            bodyText: document.body.innerText,
            bodyHtml: document.body.innerHTML.slice(0, 3000),
            hasMount: !!document.getElementById('scenario-trainer-root'),
            hasTrainerShell: !!document.querySelector('[data-trainer-platform="1"][data-trainer-id="scenario-trainer"]'),
            hasNav: !!document.querySelector('.trainer-shell-nav')
        }));

        console.log(JSON.stringify(snapshot, null, 2));
    } finally {
        await browser.close();
    }
} finally {
    await stopServer(serverBundle?.server);
}
