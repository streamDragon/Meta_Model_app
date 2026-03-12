import net from 'node:net';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const REPORTS_DIR = path.join(ROOT, 'reports');
const REPORT_PATH = path.join(REPORTS_DIR, 'nav-audit.json');
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const ONBOARDING_DISMISSED_KEY = 'mm_onboarding_dismissed_v1';

function parseArgs(argv) {
    const args = { base: process.env.BASE_URL || '' };
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === '--base') {
            args.base = argv[i + 1] || '';
            i += 1;
        } else if (token.startsWith('--base=')) {
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

function nowIso() {
    return new Date().toISOString();
}

function short(text, max = 120) {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function normalizeText(text) {
    return short(text, 140);
}

function resolveMaybeUrl(raw, pageUrl) {
    const value = String(raw || '').trim();
    if (!value) return null;
    if (value.startsWith('javascript:') || value.startsWith('#')) return null;
    try {
        return new URL(value, pageUrl).toString();
    } catch (_error) {
        return null;
    }
}

function parseInlineOnclick(onclick) {
    const source = String(onclick || '').trim();
    if (!source) return null;

    const navMatch = source.match(/navigateTo\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (navMatch) {
        return { kind: 'spa-tab', targetTab: navMatch[1] };
    }

    const locationMatch = source.match(/(?:window\.)?location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/i);
    if (locationMatch) {
        return { kind: 'url', targetUrl: locationMatch[1] };
    }

    const openMatch = source.match(/window\.open\(\s*['"]([^'"]+)['"]/i);
    if (openMatch) {
        return { kind: 'url', targetUrl: openMatch[1] };
    }

    return { kind: 'unknown', source: short(source, 200) };
}

function selectorIsLikelyStable(selector) {
    return typeof selector === 'string' && selector.length > 0;
}

async function ensureReportsDir() {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
}

async function seedAuditLocalState(context) {
    await context.addInitScript((dismissedKey) => {
        try {
            window.localStorage.setItem(dismissedKey, '1');
        } catch (_error) {
            // Ignore storage restrictions in automation.
        }
    }, ONBOARDING_DISMISSED_KEY);
}

async function capturePageIssues(page, action) {
    const issues = {
        consoleErrors: [],
        pageErrors: [],
        requestFailures: [],
        topLevelResponses: [],
        action
    };

    const onConsole = (msg) => {
        if (msg.type() !== 'error') return;
        issues.consoleErrors.push(short(msg.text(), 300));
    };
    const onPageError = (err) => {
        issues.pageErrors.push(short(err?.message || String(err), 300));
    };
    const onRequestFailed = (request) => {
        const failure = request.failure();
        issues.requestFailures.push({
            url: request.url(),
            method: request.method(),
            errorText: short(failure?.errorText || 'requestfailed', 200),
            resourceType: request.resourceType()
        });
    };
    const onResponse = (response) => {
        try {
            const request = response.request();
            if (request.frame() !== page.mainFrame()) return;
            issues.topLevelResponses.push({
                url: response.url(),
                status: response.status(),
                method: request.method()
            });
        } catch (_error) {
            // ignore response introspection failures
        }
    };

    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('requestfailed', onRequestFailed);
    page.on('response', onResponse);

    return {
        issues,
        detach() {
            page.off('console', onConsole);
            page.off('pageerror', onPageError);
            page.off('requestfailed', onRequestFailed);
            page.off('response', onResponse);
        }
    };
}

async function createBrowser() {
    try {
        return await chromium.launch({ headless: true });
    } catch (error) {
        const e = String(error?.message || error);
        if (/Executable doesn't exist|browser.*not found/i.test(e)) {
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

async function collectCandidates(page) {
    return page.evaluate(() => {
        const isVisible = (el) => {
            if (!el || !(el instanceof Element)) return false;
            const closedDetails = el.closest('details:not([open])');
            if (closedDetails) {
                const summary = el.closest('summary');
                if (!summary || summary.parentElement !== closedDetails) return false;
            }
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        };

        const cssEscapeSafe = (value) => {
            try {
                return CSS.escape(value);
            } catch (_error) {
                return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
            }
        };

        const cssAttrEscape = (value) => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

        const navigateTargetFromOnclick = (value) => {
            const source = String(value || '');
            const match = source.match(/navigateTo\(\s*['"]([^'"]+)['"]\s*\)/i);
            return match ? match[1] : '';
        };

        const buildSelector = (el) => {
            if (!(el instanceof Element)) return '';
            if (el.id) return `#${cssEscapeSafe(el.id)}`;

            const dataTab = el.getAttribute('data-tab') || '';
            if (dataTab && el.matches('.tab-btn[data-tab], [data-tab]')) {
                return `[data-tab="${cssAttrEscape(dataTab)}"]`;
            }

            const dataRoute = el.getAttribute('data-route') || '';
            if (dataRoute) {
                return `[data-route="${cssAttrEscape(dataRoute)}"]`;
            }

            const dataHref = el.getAttribute('data-href') || '';
            if (dataHref) {
                return `[data-href="${cssAttrEscape(dataHref)}"]`;
            }

            if (el.tagName === 'A' && el.getAttribute('href')) {
                const href = el.getAttribute('href');
                return `a[href="${cssAttrEscape(href)}"]`;
            }

            const onclick = el.getAttribute('onclick') || '';
            const navTarget = navigateTargetFromOnclick(onclick);
            if (navTarget) {
                return `${el.tagName.toLowerCase()}[onclick*="navigateTo"][onclick*="${cssAttrEscape(navTarget)}"]`;
            }

            const parts = [];
            let node = el;
            while (node && node.nodeType === 1 && parts.length < 6) {
                let part = node.tagName.toLowerCase();
                const cls = Array.from(node.classList || []).slice(0, 2);
                if (cls.length) {
                    part += `.${cls.map(cssEscapeSafe).join('.')}`;
                }
                if (node.parentElement) {
                    const siblings = Array.from(node.parentElement.children).filter((c) => c.tagName === node.tagName);
                    if (siblings.length > 1) {
                        const idx = siblings.indexOf(node);
                        part += `:nth-of-type(${idx + 1})`;
                    }
                }
                parts.unshift(part);
                node = node.parentElement;
            }
            return parts.join(' > ');
        };

        const getText = (el) => {
            const aria = el.getAttribute('aria-label') || '';
            const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
            return (text || aria || '').trim();
        };

        const out = [];
        const seen = new Set();
        const push = (candidate) => {
            if (!candidate) return;
            const key = JSON.stringify([
                candidate.kind,
                candidate.selector,
                candidate.hrefAttr || '',
                candidate.onclick || '',
                candidate.dataTab || '',
                candidate.dataHref || '',
                candidate.dataRoute || ''
            ]);
            if (seen.has(key)) return;
            seen.add(key);
            out.push(candidate);
        };

        Array.from(document.querySelectorAll('a[href]')).forEach((el) => {
            push({
                kind: 'anchor',
                selector: buildSelector(el),
                text: getText(el),
                visible: isVisible(el),
                hrefAttr: el.getAttribute('href') || '',
                hrefResolved: el.href || '',
                target: el.getAttribute('target') || '',
                onclick: el.getAttribute('onclick') || '',
                classes: Array.from(el.classList || []),
                tagName: el.tagName
            });
        });

        const allButtons = Array.from(document.querySelectorAll('button, [role="button"], [data-href], [data-route], [onclick]'));
        allButtons.forEach((el) => {
            const tag = el.tagName.toLowerCase();
            const onclick = el.getAttribute('onclick') || '';
            const dataTab = el.getAttribute('data-tab') || '';
            const dataHref = el.getAttribute('data-href') || '';
            const dataRoute = el.getAttribute('data-route') || '';
            const text = getText(el);
            const classes = Array.from(el.classList || []);
            const isTab = !!dataTab && classes.includes('tab-btn');
            const looksNav =
                isTab ||
                !!onclick ||
                !!dataHref ||
                !!dataRoute ||
                classes.some((c) => /(?:nav|menu|tab|cta|feature|launch)/i.test(c)) ||
                /(?:Prism|Radar|Wizard|Blueprint|Comic|Scenario|Triples|Classic|Iceberg|קטגוריות|סצנות|בית|תרגול|מסך|מודל)/i.test(text);

            if (!looksNav) return;

            push({
                kind: isTab ? 'tab-button' : 'button',
                selector: buildSelector(el),
                text,
                visible: isVisible(el),
                disabled: (typeof el.matches === 'function' && el.matches(':disabled')) || el.getAttribute('aria-disabled') === 'true',
                onclick,
                dataTab,
                dataHref,
                dataRoute,
                typeAttr: el.getAttribute('type') || '',
                classes,
                tagName: el.tagName
            });
        });

        return out;
    });
}

async function getPageSnapshot(page) {
    return page.evaluate(() => {
        const activeTabBtn = document.querySelector('.tab-btn.active')?.getAttribute('data-tab') || '';
        const activeTabSections = Array.from(document.querySelectorAll('.tab-content'))
            .filter((el) => el.classList.contains('active'))
            .map((el) => el.id);
        const visibleTabSections = Array.from(document.querySelectorAll('.tab-content'))
            .filter((el) => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden';
            })
            .map((el) => el.id);
        const openDetails = Array.from(document.querySelectorAll('details[open]'))
            .map((el) => el.id || el.className || el.tagName)
            .sort();
        const bodyClass = Array.from(document.body.classList).sort();
        const visibleDialogs = Array.from(document.querySelectorAll('dialog, [role="dialog"]'))
            .filter((el) => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && !el.classList.contains('hidden');
            })
            .map((el) => el.id || el.className || el.tagName)
            .sort();
        return {
            url: location.href,
            activeTabBtn,
            activeTabSections,
            visibleTabSections,
            openDetails,
            visibleDialogs,
            bodyClass
        };
    });
}

function buildCandidateIntended(candidate, basePageUrl) {
    const onclickParsed = parseInlineOnclick(candidate.onclick);
    if (candidate.kind === 'anchor' && candidate.hrefAttr) {
        return {
            type: 'url',
            target: resolveMaybeUrl(candidate.hrefAttr, basePageUrl) || candidate.hrefResolved || candidate.hrefAttr
        };
    }
    if (candidate.dataHref) {
        return {
            type: 'url',
            target: resolveMaybeUrl(candidate.dataHref, basePageUrl) || candidate.dataHref
        };
    }
    if (candidate.dataRoute) {
        const maybeUrl = resolveMaybeUrl(candidate.dataRoute, basePageUrl);
        return maybeUrl
            ? { type: 'url', target: maybeUrl }
            : { type: 'route', target: candidate.dataRoute };
    }
    if (candidate.dataTab) {
        return { type: 'spa-tab', target: candidate.dataTab };
    }
    if (onclickParsed?.kind === 'spa-tab') {
        return { type: 'spa-tab', target: onclickParsed.targetTab };
    }
    if (onclickParsed?.kind === 'url') {
        return {
            type: 'url',
            target: resolveMaybeUrl(onclickParsed.targetUrl, basePageUrl) || onclickParsed.targetUrl
        };
    }
    return onclickParsed?.kind === 'unknown'
        ? { type: 'onclick-unknown', target: onclickParsed.source }
        : { type: 'click', target: null };
}

async function auditUrlTarget(browser, baseUrl, candidate, targetUrl) {
    const context = await browser.newContext();
    await seedAuditLocalState(context);
    const page = await context.newPage();
    const capture = await capturePageIssues(page, { mode: 'goto', targetUrl });
    let responseStatus = null;
    let finalUrl = '';
    let error = null;
    try {
        const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        responseStatus = response ? response.status() : null;
        await page.waitForTimeout(800);
        finalUrl = page.url();
    } catch (e) {
        error = short(e?.message || String(e), 300);
        finalUrl = page.url();
    } finally {
        capture.detach();
    }
    const issues = capture.issues;
    await context.close();

    const failed = Boolean(error)
        || (responseStatus !== null && responseStatus >= 400)
        || issues.pageErrors.length > 0
        || issues.requestFailures.some((req) => req.resourceType === 'document');

    return {
        candidate,
        intended: { type: 'url', target: targetUrl },
        mode: 'goto',
        ok: !failed,
        error: error || (responseStatus >= 400 ? `HTTP ${responseStatus}` : (issues.pageErrors[0] || null)),
        responseStatus,
        finalUrl,
        issues
    };
}

async function auditSpaClick(browser, baseUrl, candidate, intended) {
    const context = await browser.newContext();
    await seedAuditLocalState(context);
    const page = await context.newPage();
    const capture = await capturePageIssues(page, { mode: 'click', selector: candidate.selector });
    let responseStatus = null;
    let clickError = null;
    let before = null;
    let after = null;

    try {
        const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        responseStatus = response ? response.status() : null;
        await page.waitForTimeout(1200);
        before = await getPageSnapshot(page);
        if (!selectorIsLikelyStable(candidate.selector)) {
            throw new Error('No stable selector');
        }
        const locator = page.locator(candidate.selector).first();
        await locator.waitFor({ state: 'attached', timeout: 5000 });
        if (!(await locator.isVisible())) {
            throw new Error('Element is not visible');
        }
        const isDisabled = await locator.evaluate((el) =>
            (typeof el.matches === 'function' && el.matches(':disabled')) || el.getAttribute('aria-disabled') === 'true'
        );
        if (isDisabled) {
            throw new Error('Element is disabled');
        }
        await locator.click({ timeout: 10000 });
        await page.waitForTimeout(900);
        after = await getPageSnapshot(page);
    } catch (e) {
        clickError = short(e?.message || String(e), 300);
    } finally {
        capture.detach();
    }

    const issues = capture.issues;
    const targetTab = intended?.target || '';
    const activeTarget =
        !!targetTab && (
            (after?.activeTabBtn || '') === targetTab
            || (after?.activeTabSections || []).includes(targetTab)
            || (after?.visibleTabSections || []).includes(targetTab)
        );
    const stateChanged =
        !!after && !!before && (
            before.url !== after.url
            || before.activeTabBtn !== after.activeTabBtn
            || JSON.stringify(before.activeTabSections) !== JSON.stringify(after.activeTabSections)
            || JSON.stringify(before.openDetails) !== JSON.stringify(after.openDetails)
            || JSON.stringify(before.visibleDialogs) !== JSON.stringify(after.visibleDialogs)
            || JSON.stringify(before.bodyClass) !== JSON.stringify(after.bodyClass)
        );

    const disabledSkip = typeof clickError === 'string' && clickError.includes('Element is disabled');
    const ok = disabledSkip || (
        !clickError && !!after && (
            activeTarget
            || (intended?.type !== 'spa-tab' && stateChanged)
        ) && issues.pageErrors.length === 0
    );

    let error = null;
    if (!ok) {
        if (clickError) error = clickError;
        else if (issues.pageErrors.length) error = issues.pageErrors[0];
        else if (intended?.type === 'spa-tab' && targetTab) error = `No active tab/section for "${targetTab}" after click`;
        else if (!stateChanged) error = 'No handler / no visible navigation change';
        else error = 'Navigation click did not complete';
    }

    await context.close();
    return {
        candidate,
        intended,
        mode: 'click',
        ok,
        skipped: disabledSkip,
        note: disabledSkip ? 'Disabled candidate (skipped click)' : null,
        error,
        responseStatus,
        finalUrl: after?.url || null,
        before,
        after,
        issues
    };
}

async function run(baseUrl) {
    if (!baseUrl) {
        throw new Error('Missing base URL');
    }

    const browser = await createBrowser();
    try {
        const bootstrapContext = await browser.newContext();
        await seedAuditLocalState(bootstrapContext);
        const bootstrapPage = await bootstrapContext.newPage();
        const bootstrapCapture = await capturePageIssues(bootstrapPage, { mode: 'bootstrap', targetUrl: baseUrl });
        const bootstrapResponse = await bootstrapPage.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await bootstrapPage.waitForTimeout(1800);
        const bootstrapStatus = bootstrapResponse ? bootstrapResponse.status() : null;
        const bootstrapUrl = bootstrapPage.url();
        const candidates = await collectCandidates(bootstrapPage);
        bootstrapCapture.detach();
        const bootstrapIssues = bootstrapCapture.issues;
        await bootstrapContext.close();

        const results = [];
        for (const candidate of candidates) {
            const intended = buildCandidateIntended(candidate, bootstrapUrl || baseUrl);
            const label = normalizeText(candidate.text || '');
            const normalizedTarget = typeof intended.target === 'string' ? intended.target.trim() : '';

            if (candidate.disabled && intended.type !== 'url') {
                results.push({
                    candidate,
                    intended,
                    mode: 'skip',
                    ok: true,
                    skipped: true,
                    error: null,
                    note: 'Disabled candidate (skipped click)'
                });
                continue;
            }

            if (candidate.visible === false && intended.type !== 'url') {
                results.push({
                    candidate,
                    intended,
                    mode: 'skip',
                    ok: true,
                    skipped: true,
                    error: null,
                    note: 'Hidden candidate (skipped click)'
                });
                continue;
            }

            if (intended.type === 'url' && normalizedTarget) {
                results.push(await auditUrlTarget(browser, baseUrl, candidate, normalizedTarget));
                continue;
            }

            if (['spa-tab', 'route', 'onclick-unknown', 'click'].includes(intended.type)) {
                results.push(await auditSpaClick(browser, baseUrl, candidate, intended));
                continue;
            }

            results.push({
                candidate,
                intended,
                mode: 'skip',
                ok: false,
                error: `Unsupported candidate type for audit (${intended.type || 'unknown'})`,
                note: label
            });
        }

        const mainMenuRegex = /(?:home|about|practice|radar|wizard|blueprint|comic|scenario|prism|categories|triples|iceberg|classic|verb|sentence|living|בית|תרגול|רדאר|גשר|בלופרינט|קומיק|סצנות|פריזם|קטגוריות|שלשות|קרחון|פועל)/i;
        const summarizeItem = (entry) => ({
            text: normalizeText(entry.candidate?.text || ''),
            selector: entry.candidate?.selector || '',
            kind: entry.candidate?.kind || '',
            intended: entry.intended?.target || entry.intended?.type || '',
            mode: entry.mode,
            ok: !!entry.ok,
            skipped: !!entry.skipped,
            responseStatus: entry.responseStatus ?? null,
            finalUrl: entry.finalUrl || null,
            error: entry.error || null,
            issues: entry.issues || null
        });

        const summaryItems = results.map(summarizeItem);
        const broken = summaryItems.filter((item) => !item.ok && !item.skipped);
        const ok = summaryItems.filter((item) => item.ok && !item.skipped);
        const mainMenuBroken = broken.filter((item) => mainMenuRegex.test(`${item.text} ${item.selector} ${item.intended}`));

        const report = {
            generatedAt: nowIso(),
            baseUrl,
            bootstrap: {
                status: bootstrapStatus,
                finalUrl: bootstrapUrl,
                issues: bootstrapIssues
            },
            counts: {
                candidates: summaryItems.length,
                ok: ok.length,
                broken: broken.length,
                skipped: summaryItems.filter((item) => item.skipped).length,
                mainMenuBroken: mainMenuBroken.length
            },
            items: summaryItems
        };

        await ensureReportsDir();
        await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

        console.log(`Navigation audit for ${baseUrl}`);
        console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
        console.log(`Counts: candidates=${report.counts.candidates}, ok=${report.counts.ok}, broken=${report.counts.broken}, skipped=${report.counts.skipped}, mainMenuBroken=${report.counts.mainMenuBroken}`);
        if (bootstrapIssues.pageErrors.length || bootstrapIssues.consoleErrors.length || bootstrapIssues.requestFailures.length) {
            console.log('BOOTSTRAP ISSUES:');
            bootstrapIssues.pageErrors.forEach((e) => console.log(`BROKEN: [bootstrap/pageerror] ${e}`));
            bootstrapIssues.consoleErrors.forEach((e) => console.log(`BROKEN: [bootstrap/console] ${e}`));
            bootstrapIssues.requestFailures.forEach((e) => console.log(`BROKEN: [bootstrap/request] ${e.method} ${e.url} :: ${e.errorText}`));
        }

        broken.forEach((item) => {
            console.log(`BROKEN: ${item.text || '(no text)'} | ${item.selector || '(no selector)'} | ${item.intended || '(no target)'} | ${item.error || 'Unknown error'}`);
        });
        ok.forEach((item) => {
            console.log(`OK: ${item.text || '(no text)'} -> ${item.intended || item.finalUrl || '(spa click)'}`);
        });
    } finally {
        await browser.close();
    }
}

const args = parseArgs(process.argv.slice(2));
const externalBase = String(args.base || '').trim();
let serverBundle = null;

try {
    const baseUrl = externalBase || (serverBundle = await startLocalServer(), serverBundle.base);
    await run(baseUrl);
} catch (error) {
    console.error(`FAIL: ${error?.message || error}`);
    process.exitCode = 1;
} finally {
    await stopServer(serverBundle?.server);
}
