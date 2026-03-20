import net from 'node:net';
import { writeFile } from 'node:fs/promises';
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
    const prismMobileReportPath = path.join(ROOT, 'reports', 'prismlab-mobile-verify.json');
    const prismMobileShotPath = path.join(ROOT, 'reports', 'prismlab-mobile-verify.png');
    const mobileUiReportPath = path.join(ROOT, 'reports', 'mobile-ui-cleanup-report.json');
    const MANAGED_SCREENS = new Set([
        'sentence-map',
        'practice-question',
        'practice-radar',
        'practice-triples-radar',
        'practice-wizard',
        'practice-verb-unzip',
        'blueprint',
        'prismlab',
        'categories',
        'comic-engine',
        'about'
    ]);
    const MANAGED_CONTENT_SELECTOR_BY_SCREEN = Object.freeze({
        'sentence-map': '#sentence-map .practice-section-sentence-map',
        'practice-question': '#practice-question .practice-section-question',
        'practice-radar': '#practice-radar .practice-section-radar',
        'practice-triples-radar': '#practice-triples-radar .practice-section-triples-radar',
        'practice-wizard': '#practice-wizard .practice-section-wizard'
    });
    const trace = (...args) => {
        if (process.env.SHELL_SMOKE_TRACE === '1') {
            console.log('[shell-smoke]', ...args);
        }
    };
    const FULL_SHELL_SWEEP = process.env.SHELL_SMOKE_FULL === '1';
    const TEST_GAMIFICATION_STATE = Object.freeze({
        xp: 600,
        streak: 4,
        bestStreak: 7,
        streakFreezes: 1,
        lastActiveDate: '2026-03-14',
        lastCelebratedLevel: 5,
        starsPerFeature: {
            sentenceMap: 6,
            practiceQuestion: 8,
            triplesRadar: 4,
            practiceRadar: 3,
            blueprint: 2
        }
    });

    const assert = async (condition, label, detail = '') => {
        if (!condition) {
            throw new Error(detail ? `${label} :: ${detail}` : label);
        }
        checks.push(label + (detail ? ` :: ${detail}` : ''));
    };

    const MOBILE_UI_AUDIT_CONFIG = Object.freeze({
        'practice-question': Object.freeze({
            contextSelectors: ['#question-drill-prestart .question-drill-session-panel', '[data-meta-context-frame]'],
            instructionSelectors: ['#question-drill-session-note', '[data-meta-instruction-frame]'],
            taskSelectors: ['#question-drill-start-session', '#question-drill-check'],
            duplicateSelectors: ['#question-drill-secondary-actions', '#question-drill-compact-score', '#question-drill-compact-streak', '#question-drill-game-hud'],
            maxLargeBodyActions: 2
        }),
        'practice-radar': Object.freeze({
            contextSelectors: ['#rapid-radar-prestart', '[data-meta-context-frame]'],
            instructionSelectors: ['#rapid-session-note', '[data-meta-instruction-frame]'],
            taskSelectors: ['#rapid-start-btn', '#rapid-next-btn', '#rapid-skip-btn'],
            duplicateSelectors: ['.rapid-radar-secondary-actions', '#rapid-compact-correct', '#rapid-compact-streak'],
            maxLargeBodyActions: 2
        }),
        'practice-triples-radar': Object.freeze({
            contextSelectors: ['[data-meta-context-frame]', '.triples-radar-statement-wrap'],
            instructionSelectors: ['[data-meta-instruction-frame]', '.triples-radar-support-strip'],
            taskSelectors: ['.triples-radar-action--next', '.triples-radar-actions'],
            duplicateSelectors: ['.triples-radar-topbar-item--score', '.triples-radar-topbar-item--solved', '.triples-radar-action--restart'],
            maxLargeBodyActions: 2
        }),
        blueprint: Object.freeze({
            contextSelectors: ['[data-meta-context-frame]', '.blueprint-progress-highlight'],
            instructionSelectors: ['[data-meta-instruction-frame]', '.blueprint-stage-card--feedback'],
            taskSelectors: ['.blueprint-composer', '#do-it-now-btn', '.step-buttons .btn.btn-primary'],
            duplicateSelectors: [],
            maxLargeBodyActions: 2
        }),
        'comic-engine': Object.freeze({
            contextSelectors: ['[data-meta-context-frame]', '#ceflow-context-card'],
            instructionSelectors: ['[data-meta-instruction-frame]', '#ceflow-choice-affordance'],
            taskSelectors: ['.ceflow-choice-panel', '#ceflow-next-scene'],
            duplicateSelectors: ['#ceflow-level', '#ceflow-info-btn', '#ceflow-expand-stage', '#ceflow-retry'],
            maxLargeBodyActions: 2
        }),
        prismlab: Object.freeze({
            contextSelectors: ['#prismlab .pnm-context-card'],
            instructionSelectors: ['#prismlab .pnm-instruction-card'],
            taskSelectors: ['#prismlab .pnm-question-card'],
            duplicateSelectors: [],
            maxLargeBodyActions: 2
        })
    });

    const collectMobileUiAudit = async (screenId, targetPage = page) => {
        const config = MOBILE_UI_AUDIT_CONFIG[screenId];
        if (!config) return null;
        return targetPage.evaluate((entry) => {
            const active = document.getElementById(entry.screenId);
            const top = active?.querySelector('[data-meta-feature-chrome="top"]');
            const bottom = active?.querySelector('[data-meta-feature-chrome="bottom"]');
            const isVisible = (node) => {
                if (!(node instanceof HTMLElement)) return false;
                const style = getComputedStyle(node);
                const rect = node.getBoundingClientRect();
                return !node.hidden && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
            };
            const anyVisible = (selectors) => (selectors || []).some((selector) => Array.from(active?.querySelectorAll(selector) || []).some((node) => isVisible(node)));
            const visibleDuplicates = (entry.duplicateSelectors || []).filter((selector) => Array.from(active?.querySelectorAll(selector) || []).some((node) => isVisible(node)));
            const visibleButtons = Array.from(active?.querySelectorAll('.btn') || []).filter((node) => {
                if (!isVisible(node)) return false;
                if (node.closest('[data-meta-feature-chrome]') || node.closest('.meta-feature-welcome-shell')) return false;
                return true;
            });
            const largeBodyButtons = visibleButtons.filter((node) => node.getBoundingClientRect().height >= 38).map((node) => ({
                label: (node.textContent || '').trim(),
                height: Math.round(node.getBoundingClientRect().height)
            }));
            const taskNode = (entry.taskSelectors || []).map((selector) => active?.querySelector(selector)).find((node) => isVisible(node)) || null;
            const taskRect = taskNode?.getBoundingClientRect() || null;
            const bottomRect = bottom?.getBoundingClientRect() || null;
            return {
                screenId: entry.screenId,
                topIcons: {
                    back: !!top?.querySelector('[data-shell-chrome-back]'),
                    home: !!top?.querySelector('[data-shell-chrome-home]'),
                    restart: !!top?.querySelector('[data-shell-chrome-restart]'),
                    stats: !!top?.querySelector('[data-shell-chrome-stats]')
                },
                contextVisible: anyVisible(entry.contextSelectors),
                instructionVisible: anyVisible(entry.instructionSelectors),
                largeBodyButtons,
                duplicateSelectorsVisible: visibleDuplicates,
                taskBottom: taskRect ? Math.round(taskRect.bottom) : null,
                bottomBarTop: bottomRect ? Math.round(bottomRect.top) : null,
                taskMostlyInView: !!taskRect && (!bottomRect || taskRect.bottom <= bottomRect.top),
                quickComprehensionLikely: anyVisible(entry.contextSelectors) && anyVisible(entry.instructionSelectors) && largeBodyButtons.length <= (entry.maxLargeBodyActions || 2)
            };
        }, { ...config, screenId });
    };

    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

    const seedTestState = async (targetPage = page) => {
        await targetPage.addInitScript((seed) => {
            if (window.top !== window) return;
            [
                'meta_feature_shell_v3',
                'meta_shell_continue_v1',
                'meta_home_last_tab_v1',
                'meta_home_shell_ui_v2',
                'meta_shell_preferences_v1',
                'practice_active_tab_v1'
            ].forEach((key) => window.localStorage.removeItem(key));
            window.localStorage.setItem('meta_gamification_v1', JSON.stringify(seed));
            window.localStorage.setItem('mm_onboarding_dismissed_v1', '1');
        }, TEST_GAMIFICATION_STATE);
    };

    const waitForActiveScreen = async (screenId, targetPage = page) => {
        await targetPage.waitForFunction((id) => {
            if (id === 'home') {
                const root = document.getElementById('meta-home-shell');
                if (!root || document.body?.dataset?.activeTab !== 'home') return false;
                const style = getComputedStyle(root);
                const rect = root.getBoundingClientRect();
                return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
            }
            const section = document.getElementById(id);
            return !!section && section.classList.contains('active') && getComputedStyle(section).display !== 'none';
        }, screenId);
    };

    const navigate = async (screenId) => {
        trace('navigate:start', screenId);
        await page.evaluate((id) => window.navigateTo(id), screenId);
        await waitForActiveScreen(screenId);
        await page.waitForTimeout(500);
        trace('navigate:ready', screenId);
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

    const installNavigationTrace = async (targetPage = page) => {
        await targetPage.evaluate(() => {
            if (window.__shellSmokeNavTraceInstalled) return;
            const trace = [];
            const push = (type, value) => {
                trace.push({
                    type: String(type || ''),
                    value: String(value || ''),
                    ts: Math.round(performance.now())
                });
                if (trace.length > 200) trace.splice(0, trace.length - 200);
            };
            const wrap = (name) => {
                const original = window[name];
                if (typeof original !== 'function' || original.__shellSmokeWrapped) return;
                const wrapped = function (...args) {
                    push(name, args[0]);
                    return original.apply(this, args);
                };
                wrapped.__shellSmokeWrapped = true;
                window[name] = wrapped;
            };
            wrap('navigateTo');
            wrap('navigateByNavKey');
            if (document.body && !window.__shellSmokeNavTraceObserver) {
                const observer = new MutationObserver(() => {
                    push('activeTab', document.body?.dataset?.activeTab || '');
                });
                observer.observe(document.body, { attributes: true, attributeFilter: ['data-active-tab'] });
                window.__shellSmokeNavTraceObserver = observer;
            }
            window.__shellSmokeNavTrace = trace;
            window.__shellSmokeNavTraceInstalled = true;
        });
    };

    const resetNavigationTrace = async (targetPage = page) => {
        await installNavigationTrace(targetPage);
        await targetPage.evaluate(() => {
            if (!Array.isArray(window.__shellSmokeNavTrace)) window.__shellSmokeNavTrace = [];
            window.__shellSmokeNavTrace.length = 0;
        });
    };

    const readNavigationTrace = async (targetPage = page) => (
        targetPage.evaluate(() => Array.isArray(window.__shellSmokeNavTrace) ? window.__shellSmokeNavTrace.slice() : [])
    );

    const installProductGuidanceTrace = async (targetPage = page) => {
        await targetPage.evaluate(() => {
            if (window.__shellSmokeProductGuidanceTraceInstalled) return;
            const trace = [];
            const captureArgs = (level, args) => {
                const text = args.map((arg) => {
                    if (typeof arg === 'string') return arg;
                    try {
                        return JSON.stringify(arg);
                    } catch (_error) {
                        return String(arg);
                    }
                }).join(' ');
                if (!text.includes('[product-guidance]')) return;
                trace.push({
                    level: String(level || ''),
                    text,
                    ts: Math.round(performance.now())
                });
                if (trace.length > 400) trace.splice(0, trace.length - 400);
            };
            const wrapConsole = (level) => {
                const original = console[level];
                if (typeof original !== 'function' || original.__shellSmokeWrapped) return;
                const wrapped = function (...args) {
                    captureArgs(level, args);
                    return original.apply(this, args);
                };
                wrapped.__shellSmokeWrapped = true;
                console[level] = wrapped;
            };
            wrapConsole('log');
            wrapConsole('warn');
            wrapConsole('error');
            window.__shellSmokeProductGuidanceTrace = trace;
            window.__shellSmokeProductGuidanceTraceInstalled = true;
        });
    };

    const resetProductGuidanceTrace = async (targetPage = page) => {
        await installProductGuidanceTrace(targetPage);
        await targetPage.evaluate(() => {
            if (!Array.isArray(window.__shellSmokeProductGuidanceTrace)) window.__shellSmokeProductGuidanceTrace = [];
            window.__shellSmokeProductGuidanceTrace.length = 0;
        });
    };

    const readProductGuidanceTrace = async (targetPage = page) => (
        targetPage.evaluate(() => Array.isArray(window.__shellSmokeProductGuidanceTrace) ? window.__shellSmokeProductGuidanceTrace.slice() : [])
    );

    const openStandalonePage = async (relativePath, viewport = { width: 1440, height: 1100 }) => {
        const targetPage = await browser.newPage({ viewport });
        await seedTestState(targetPage);
        await targetPage.goto(new URL(relativePath, baseUrl).toString(), { waitUntil: 'networkidle' });
        return targetPage;
    };

    const openTrainerHelpOverlay = async (targetPage) => {
        await targetPage.locator('.trainer-shell-nav [data-nav-action="help-overlay"]').click();
        await targetPage.waitForSelector('.trainer-shell-help-overlay');
        return ((await targetPage.locator('.trainer-shell-help-overlay').innerText()) || '').trim();
    };

    const closeTrainerHelpOverlay = async (targetPage) => {
        await targetPage.locator('.trainer-shell-help-overlay [data-help-action="close"]').click();
        await targetPage.waitForFunction(() => !document.querySelector('.trainer-shell-help-overlay'));
    };

    const assertOverlayComicLaunch = async ({ label, openOverlay }) => {
        await navigate('home');
        await closeOverlayIfOpen();
        await resetNavigationTrace();
        await openOverlay();
        await page.waitForSelector('.overlay-root:not(.hidden) [data-nav-key="comicEngine"]');
        await page.evaluate(() => {
            document.querySelector('.overlay-root:not(.hidden) [data-nav-key="comicEngine"]')?.click();
        });
        await waitForActiveScreen('comic-engine');
        await page.waitForTimeout(450);
        const trace = await readNavigationTrace();
        const firstComicIndex = trace.findIndex((entry) => entry.value === 'comicEngine' || entry.value === 'comic-engine');
        const homeHits = firstComicIndex >= 0
            ? trace.slice(firstComicIndex + 1).filter((entry) => entry.value === 'home')
            : trace.filter((entry) => entry.value === 'home');
        const navKeyCalls = trace.filter((entry) => entry.type === 'navigateByNavKey' && entry.value === 'comicEngine');
        const tabCalls = trace.filter((entry) => entry.type === 'navigateTo' && entry.value === 'comic-engine');
        await assert(homeHits.length === 0, `${label} avoids intermediate home after comic navigation starts`, JSON.stringify(trace));
        await assert(navKeyCalls.length <= 1, `${label} triggers one nav-key call`, JSON.stringify(trace));
        await assert(tabCalls.length <= 1, `${label} triggers one tab navigation`, JSON.stringify(trace));
    };

    const checkStandaloneScenarioGuidance = async () => {
        const targetPage = await openStandalonePage('scenario_trainer.html');
        try {
            await targetPage.waitForSelector('[data-trainer-platform="1"][data-trainer-id="scenario-trainer"]');
            await assert((await targetPage.locator('.trainer-shell-nav').count()) > 0, 'scenario standalone nav mounted');
            await targetPage.waitForFunction(() => document.querySelector('[data-trainer-id="scenario-trainer"]')?.getAttribute('data-screen') === 'home');
            const welcomeText = ((await targetPage.locator('#scenario-trainer').innerText()) || '').trim();
            await assert(welcomeText.length > 300, 'scenario welcome keeps long-form orientation', String(welcomeText.length));
            await assert((await targetPage.locator('[data-product-guidance="scenario-trainer"][data-trainer-help-content="1"]').count()) > 0, 'scenario hidden help guidance mounted');
            await targetPage.locator('[data-trainer-action="start-session"]').first().click();
            await targetPage.waitForFunction(() => document.querySelector('[data-trainer-id="scenario-trainer"]')?.getAttribute('data-screen') === 'play');
            const runtimeText = ((await targetPage.locator('#scenario-trainer').innerText()) || '').trim();
            for (const heading of ['מה הכלי הזה עושה', 'מה הוא מאמן', 'מתי משתמשים בו', 'למה זה חשוב', 'דוגמה קצרה']) {
                await assert(!runtimeText.includes(heading), `scenario runtime hides ${heading}`);
            }
            const helpText = await openTrainerHelpOverlay(targetPage);
            await assert(helpText.includes('מה הכלי הזה עושה'), 'scenario help overlay shows long explanation');
            await closeTrainerHelpOverlay(targetPage);
            const currentScreen = await targetPage.locator('[data-trainer-id="scenario-trainer"]').getAttribute('data-screen');
            await assert(currentScreen === 'play', 'scenario help close preserves play screen', String(currentScreen || ''));
        } finally {
            await targetPage.close();
        }
    };

    const checkLegacyStandaloneWelcomeMount = async (relativePath, featureKey) => {
        const targetPage = await openStandalonePage(relativePath);
        try {
            await targetPage.waitForSelector(`[data-product-guidance-welcome="${featureKey}"]`);
            await assert((await targetPage.locator(`[data-product-guidance-welcome="${featureKey}"]`).count()) > 0, `${featureKey} welcome shell mounted`);
            await assert((await targetPage.locator(`[data-product-guidance="${featureKey}"][data-trainer-help-content="1"]`).count()) > 0, `${featureKey} hidden help guidance mounted`);
        } finally {
            await targetPage.close();
        }
    };

    const checkStandaloneVerbUnzipGuidance = async () => {
        const targetPage = await openStandalonePage('verb_unzip_trainer.html');
        try {
            const welcomeSelector = '[data-product-guidance-welcome="practice-verb-unzip-standalone"]';
            await targetPage.waitForSelector(welcomeSelector);
            await assert(await targetPage.locator(welcomeSelector).isVisible(), 'verb unzip welcome visible');
            await assert(!(await targetPage.locator('main.page').isVisible()), 'verb unzip runtime hidden before start');
            const welcomeText = ((await targetPage.locator(welcomeSelector).innerText()) || '').trim();
            await assert(welcomeText.includes('מה הכלי הזה עושה'), 'verb unzip welcome keeps long explanation');
            await targetPage.locator('[data-product-guidance-start="practice-verb-unzip-standalone"]').click();
            await targetPage.waitForFunction(() => {
                const main = document.querySelector('main.page');
                return !!main && !main.hidden && getComputedStyle(main).display !== 'none';
            });
            await assert(!(await targetPage.locator(welcomeSelector).isVisible()), 'verb unzip welcome hidden during play');
            await targetPage.locator('#startBtn').click();
            await targetPage.locator('.zip-target').click();
            await targetPage.waitForSelector('#answerInput');
            const answerValue = 'אני אשלח לו הודעה קצרה ומדויקת אחרי העבודה';
            await targetPage.locator('#answerInput').fill(answerValue);
            const runtimeText = ((await targetPage.locator('main.page').innerText()) || '').trim();
            for (const heading of ['מה הכלי הזה עושה', 'מה הוא מאמן', 'מתי משתמשים בו', 'למה זה חשוב', 'דוגמה קצרה']) {
                await assert(!runtimeText.includes(heading), `verb unzip runtime hides ${heading}`);
            }
            const helpText = await openTrainerHelpOverlay(targetPage);
            await assert(helpText.includes('מה הכלי הזה עושה'), 'verb unzip help overlay shows long explanation');
            await assert(helpText.includes('דוגמה קצרה'), 'verb unzip help overlay keeps example copy');
            await closeTrainerHelpOverlay(targetPage);
            await assert((await targetPage.locator('#answerInput').inputValue()) === answerValue, 'verb unzip help close preserves current answer');
        } finally {
            await targetPage.close();
        }
    };

    const dismissOnboardingIfVisible = async (targetPage = page) => {
        const overlay = targetPage.locator('#mm-onboarding').first();
        if ((await overlay.count()) === 0) return false;
        await targetPage.waitForTimeout(4200);
        const overlayVisibleNow = await overlay.evaluate((node) => {
            const style = getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            return node.classList.contains('is-visible')
                && !node.hidden
                && style.display !== 'none'
                && style.visibility !== 'hidden'
                && style.pointerEvents !== 'none'
                && rect.width > 0
                && rect.height > 0;
        }).catch(() => false);
        if (!overlayVisibleNow) return false;
        const dismissBtn = targetPage.locator('#mm-onboarding [data-ob-dismiss]:visible').first();
        if ((await dismissBtn.count()) > 0) {
            await dismissBtn.click();
        } else {
            await targetPage.locator('#mm-ob-explore-btn:visible').click();
        }
        await targetPage.waitForFunction(() => {
            const overlay = document.getElementById('mm-onboarding');
            if (!overlay) return true;
            const style = getComputedStyle(overlay);
            return overlay.hidden || style.display === 'none' || style.pointerEvents === 'none';
        });
        return true;
    };

    const enterManagedFeatureStage = async (screenId, targetPage = page) => {
        if (!MANAGED_SCREENS.has(screenId)) return false;
        trace('managed:enter:start', screenId);
        const contentSelector = MANAGED_CONTENT_SELECTOR_BY_SCREEN[screenId] || '';
        const stage = await targetPage.evaluate((id) => document.getElementById(id)?.dataset?.metaFeatureStage || '', screenId);
        await closeOverlayIfOpen(targetPage);
        if (stage !== 'feature') {
            const cta = targetPage.locator(`#${screenId} [data-feature-enter]:visible`).first();
            if ((await cta.count()) === 0) {
                throw new Error(`Missing managed feature CTA on ${screenId}`);
            }
            await cta.click();
            await targetPage.waitForFunction((id) => document.getElementById(id)?.dataset?.metaFeatureStage === 'feature', screenId);
        }
        await targetPage.waitForFunction(({ id, selector }) => {
            const section = document.getElementById(id);
            const contentNodes = selector
                ? [document.querySelector(selector)].filter(Boolean)
                : Array.from(section?.children || []).filter((node) => {
                    if (!(node instanceof HTMLElement)) return false;
                    if (node.classList.contains('meta-feature-welcome-shell')) return false;
                    if (node.hasAttribute('data-meta-feature-chrome')) return false;
                    return true;
                });
            if (!section || section.dataset?.metaFeatureStage !== 'feature' || !contentNodes.length) return false;
            return contentNodes.some((content) => {
                const style = getComputedStyle(content);
                const rect = content.getBoundingClientRect();
                return !content.hasAttribute('data-intro-locked')
                    && !content.hidden
                    && style.display !== 'none'
                    && style.visibility !== 'hidden'
                    && rect.width > 0
                    && rect.height > 0;
            });
        }, { id: screenId, selector: contentSelector });
        await targetPage.waitForTimeout(500);
        trace('managed:enter:ready', screenId);
        return stage !== 'feature';
    };

    const clickHeaderButton = async (screenId, index, targetPage = page) => {
        await targetPage.locator(`#${screenId} .app-shell .app-shell-actions button`).nth(index).click();
    };

    const checkGenericScreen = async (screenId, buttonIndex) => {
        trace('generic:start', screenId);
        await navigate(screenId);
        await closeOverlayIfOpen();
        await enterManagedFeatureStage(screenId);
        await page.waitForSelector(`#${screenId} .app-shell`);
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
        trace('generic:done', screenId);
        return overlayTitle;
    };

    const checkManagedScreen = async (screenId, options = {}) => {
        const { verifyStatsRoute = false, verifyRestart = false } = options;
        trace('managed:start', screenId);
        await navigate(screenId);
        await closeOverlayIfOpen();
        if (screenId === 'prismlab') {
            await enterManagedFeatureStage(screenId);
            const landingState = await page.evaluate((id) => {
                const section = document.getElementById(id);
                return {
                    stage: section?.dataset?.metaFeatureStage || '',
                    landingVisible: !!section?.querySelector('.pnm-view--landing'),
                    startVisible: !!section?.querySelector('[data-action="start-lab"]'),
                    homeVisible: !!section?.querySelector('[data-shell-chrome-home]'),
                    restartVisible: !!section?.querySelector('[data-shell-chrome-restart]')
                };
            }, screenId);
            await assert(landingState.stage === 'feature', 'prismlab feature stage active from entry', landingState.stage);
            await assert(landingState.landingVisible, 'prismlab landing visible');
            await assert(landingState.startVisible, 'prismlab landing CTA visible');
            await assert(landingState.homeVisible, 'prismlab home shortcut visible');
            await assert(landingState.restartVisible, 'prismlab restart shortcut visible');

            await page.locator('#prismlab [data-action="start-lab"]').click();
            await page.waitForSelector('#prismlab .pnm-view--categories');
            await page.locator('#prismlab [data-action="open-category"]').first().click();
            await page.waitForSelector('#prismlab .pnm-view--workspace');
            await page.locator('#prismlab [data-shell-chrome-back]').click();
            await page.waitForSelector('#prismlab .pnm-view--categories');
            await page.locator('#prismlab [data-shell-chrome-back]').click();
            await page.waitForSelector('#prismlab .pnm-view--landing');
            trace('managed:done', screenId);
            return;
        }
        const welcomeState = await page.evaluate((id) => {
            const section = document.getElementById(id);
            const welcomeShell = section?.querySelector('.meta-feature-welcome-shell');
            const cta = section?.querySelector('[data-feature-enter]');
            return {
                stage: section?.dataset?.metaFeatureStage || '',
                hasWelcomeShell: !!welcomeShell && getComputedStyle(welcomeShell).display !== 'none',
                ctaDisabled: !!cta?.disabled,
                welcomeChromeVisible: !!section?.querySelector('[data-meta-feature-chrome="top"] .meta-feature-chrome__bar--welcome')
            };
        }, screenId);
        await assert(welcomeState.stage === 'welcome', `${screenId} welcome stage active`, welcomeState.stage);
        await assert(welcomeState.hasWelcomeShell, `${screenId} welcome shell visible`);
        await assert(!welcomeState.ctaDisabled, `${screenId} welcome CTA unlocked`);
        await assert(welcomeState.welcomeChromeVisible, `${screenId} welcome chrome visible`);

        const modalTrigger = page.locator(`#${screenId} [data-feature-modal]:visible`).first();
        await assert((await modalTrigger.count()) > 0, `${screenId} welcome modal action visible`);
        await modalTrigger.click();
        await page.waitForSelector(`#${screenId} [data-feature-modal-box]:not([hidden])`);
        await assert((await page.locator(`#${screenId} [data-feature-modal-box]:not([hidden])`).count()) > 0, `${screenId} welcome sheet opens`);
        await page.waitForTimeout(180);
        await page.locator(`#${screenId} [data-feature-modal-box]:not([hidden]) .meta-feature-modal__close`).click({ force: true });
        await page.waitForFunction((id) => {
            const node = document.querySelector(`#${id} [data-feature-modal-box]:not([hidden])`);
            return !node;
        }, screenId);

        await enterManagedFeatureStage(screenId);
        const featureState = await page.evaluate((id) => {
            const section = document.getElementById(id);
            const legacyConfirm = section?.querySelector(`[data-feature-confirm="${id}"]`);
            return {
                stage: section?.dataset?.metaFeatureStage || '',
                statsVisible: !!section?.querySelector('[data-shell-chrome-stats]'),
                homeVisible: !!section?.querySelector('[data-shell-chrome-home]'),
                restartVisible: !!section?.querySelector('[data-shell-chrome-restart]'),
                legacyConfirmVisible: !!legacyConfirm && getComputedStyle(legacyConfirm).display !== 'none'
            };
        }, screenId);
        await assert(featureState.stage === 'feature', `${screenId} feature stage active`, featureState.stage);
        await assert(featureState.statsVisible, `${screenId} stats shortcut visible`);
        await assert(featureState.homeVisible, `${screenId} home shortcut visible`);
        await assert(featureState.restartVisible, `${screenId} restart shortcut visible`);
        await assert(!featureState.legacyConfirmVisible, `${screenId} legacy intro gate removed`);

        if (verifyStatsRoute) {
            trace('managed:stats:start', screenId);
            await page.locator(`#${screenId} [data-shell-chrome-stats]`).click();
            await waitForActiveScreen('home');
            const statsTitle = ((await page.locator('#meta-home-shell .meta-home-screen__header h2').textContent()) || '').trim();
            await assert(Boolean(statsTitle), `${screenId} stats route opens home stats`, statsTitle);
            await page.locator('#meta-home-shell .meta-home-screen__header [data-home-view="home"]').click();
            await page.waitForSelector('#meta-home-shell .hhc-title');
            trace('managed:stats:done', screenId);
        }

        if (verifyRestart) {
            trace('managed:restart:start', screenId);
            await navigate(screenId);
            await enterManagedFeatureStage(screenId);
            await page.locator(`#${screenId} [data-shell-chrome-restart]`).click();
            await page.waitForFunction((id) => document.getElementById(id)?.dataset?.metaFeatureStage === 'welcome', screenId);
            await assert(
                (await page.evaluate((id) => document.getElementById(id)?.dataset?.metaFeatureStage || '', screenId)) === 'welcome',
                `${screenId} restart returns to welcome`
            );
            trace('managed:restart:done', screenId);
        }
        trace('managed:done', screenId);
    };

    const checkComicExperience = async () => {
        await navigate('comic-engine');
        await closeOverlayIfOpen();
        await enterManagedFeatureStage('comic-engine');
        await page.waitForSelector('#ceflow-choice-deck button[data-choice-id]');

        const initialState = await page.evaluate(() => {
            const choiceButtons = Array.from(document.querySelectorAll('#ceflow-choice-deck button[data-choice-id]'));
            const enabledChoices = choiceButtons.filter((button) => !button.disabled).length;
            const affordance = document.getElementById('ceflow-choice-affordance');
            const backButton = document.getElementById('ceflow-step-back');
            const overlay = document.getElementById('ceflow-overlay');
            const hudLink = document.querySelector('#ceflow-overlay .ceflow-hud-link');
            const firstChoice = choiceButtons[0];
            return {
                choiceTitle: (document.getElementById('ceflow-choice-title')?.textContent || '').trim(),
                choiceCount: choiceButtons.length,
                enabledChoices,
                firstChoiceCursor: firstChoice ? getComputedStyle(firstChoice).cursor : '',
                affordanceState: affordance?.dataset?.state || '',
                backDisabled: !!backButton?.disabled,
                overlayVisible: !!overlay && !overlay.classList.contains('hidden'),
                hudLinkText: (hudLink?.textContent || '').trim()
            };
        });
        await assert(initialState.choiceCount === 4, 'comic renders 4 arc choices', String(initialState.choiceCount));
        await assert(initialState.enabledChoices === 4, 'comic choices enabled', String(initialState.enabledChoices));
        await assert(initialState.firstChoiceCursor === 'pointer', 'comic choices look clickable');
        await assert(initialState.affordanceState === 'ready', 'comic affordance ready state');
        await assert(Boolean(initialState.choiceTitle), 'comic choice title visible', initialState.choiceTitle);
        await assert(initialState.backDisabled, 'comic back disabled before action');
        await assert(initialState.overlayVisible, 'comic evaluation panel visible');
        await assert(Boolean(initialState.hudLinkText), 'comic evaluation link copy visible');

        await page.locator('#ceflow-choice-deck button[data-choice-id]:not([disabled])').first().click();
        await page.waitForTimeout(160);
        const selectedState = await page.evaluate(() => {
            const affordance = document.getElementById('ceflow-choice-affordance');
            const backButton = document.getElementById('ceflow-step-back');
            const replyBox = document.getElementById('ceflow-reply-box');
            const replyBack = document.getElementById('ceflow-reply-step-back');
            const replyInput = document.getElementById('ceflow-reply-input');
            return {
                selectedCount: document.querySelectorAll('#ceflow-choice-deck .ceflow-choice.is-selected').length,
                disabledChoices: document.querySelectorAll('#ceflow-choice-deck button[data-choice-id][disabled]').length,
                replyVisible: !!replyBox && !replyBox.classList.contains('hidden'),
                affordanceState: affordance?.dataset?.state || '',
                backDisabled: !!backButton?.disabled,
                replyBackVisible: !!replyBack && !replyBack.disabled,
                previewValue: (replyInput?.value || '').trim()
            };
        });
        await assert(selectedState.selectedCount === 1, 'comic choice selection visible');
        await assert(selectedState.disabledChoices > 0, 'comic choice lock after selection', String(selectedState.disabledChoices));
        await assert(selectedState.replyVisible, 'comic reply step opens');
        await assert(selectedState.affordanceState === 'locked', 'comic affordance locked after selection');
        await assert(!selectedState.backDisabled, 'comic back enabled after action');
        await assert(selectedState.replyBackVisible, 'comic reply-local back visible');
        await assert(Boolean(selectedState.previewValue), 'comic selected sentence preview visible', selectedState.previewValue);

        await page.locator('#ceflow-step-back').click();
        await page.waitForTimeout(160);
        const rolledBackState = await page.evaluate(() => {
            const affordance = document.getElementById('ceflow-choice-affordance');
            const backButton = document.getElementById('ceflow-step-back');
            const replyBox = document.getElementById('ceflow-reply-box');
            return {
                selectedCount: document.querySelectorAll('#ceflow-choice-deck .ceflow-choice.is-selected').length,
                enabledChoices: document.querySelectorAll('#ceflow-choice-deck button[data-choice-id]:not([disabled])').length,
                replyHidden: !!replyBox && replyBox.classList.contains('hidden'),
                affordanceState: affordance?.dataset?.state || '',
                backDisabled: !!backButton?.disabled
            };
        });
        await assert(rolledBackState.selectedCount === 0, 'comic back clears selected choice');
        await assert(rolledBackState.enabledChoices === 4, 'comic choices re-enabled after back', String(rolledBackState.enabledChoices));
        await assert(rolledBackState.replyHidden, 'comic back restores pre-reply step');
        await assert(rolledBackState.affordanceState === 'ready', 'comic affordance ready after back');
        await assert(rolledBackState.backDisabled, 'comic back disabled when history empty');

        await page.locator('#ceflow-choice-deck button[data-choice-id]:not([disabled])').first().click();
        await page.locator('#ceflow-reply-confirm').click();
        await page.waitForTimeout(760);
        const postReplyState = await page.evaluate(() => {
            const feedback = document.getElementById('ceflow-feedback');
            const snapshot = document.getElementById('ceflow-turn-snapshot');
            return {
                feedbackVisible: !!feedback && !feedback.classList.contains('hidden'),
                snapshotVisible: !!snapshot && !snapshot.classList.contains('hidden'),
                retryVisible: !!document.getElementById('ceflow-retry'),
                nextHidden: !!document.getElementById('ceflow-next-scene')?.classList.contains('hidden'),
                hudLinkText: (document.querySelector('#ceflow-overlay .ceflow-hud-link')?.textContent || '').trim(),
                progressText: (document.getElementById('ceflow-progress')?.textContent || '').trim(),
                affordanceState: document.getElementById('ceflow-choice-affordance')?.dataset?.state || '',
                choiceCount: document.querySelectorAll('#ceflow-choice-deck button[data-choice-id]').length,
                dialogCount: document.querySelectorAll('#ceflow-dialog .ceflow-bubble').length,
                analysisHidden: !!document.getElementById('ceflow-analysis')?.classList.contains('hidden')
            };
        });
        await assert(postReplyState.feedbackVisible, 'comic feedback panel visible after reply');
        await assert(postReplyState.snapshotVisible, 'comic turn snapshot visible after reply');
        await assert(postReplyState.retryVisible, 'comic retry control visible after reply');
        await assert(postReplyState.nextHidden, 'comic next-scene button hidden in auto-analysis flow');
        await assert(Boolean(postReplyState.hudLinkText), 'comic metrics banner keeps detail affordance');
        await assert(/2\s*\/\s*3/.test(postReplyState.progressText), 'comic advances to next escalation layer', postReplyState.progressText);
        await assert(postReplyState.affordanceState === 'ready', 'comic affordance resets for next layer');
        await assert(postReplyState.choiceCount === 4, 'comic next layer still shows 4 arc choices', String(postReplyState.choiceCount));
        await assert(postReplyState.dialogCount >= 4, 'comic chat flow shows sent + reply + narrator', String(postReplyState.dialogCount));
        await assert(postReplyState.analysisHidden, 'comic analysis waits until final outcome');
    };

    try {
        trace('boot:start');
        await seedTestState(page);
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await dismissOnboardingIfVisible(page);
        trace('boot:ready');

        await navigate('home');
        const homeTitle = ((await page.locator('#meta-home-shell .hhc-title').textContent()) || '').trim();
        await assert(Boolean(homeTitle), 'home shell loaded', homeTitle);

        await page.locator('#meta-home-shell [data-open-feature="initial-image-vs-deep-structure"]').first().click();
        await waitForActiveScreen('initial-image-vs-deep-structure');
        await assert((await page.evaluate(() => document.querySelector('.tab-btn.active')?.getAttribute('data-tab'))) === 'initial-image-vs-deep-structure', 'home hero CTA opens initial-image-vs-deep-structure');

        await navigate('home');
        await page.locator('#meta-home-shell [data-open-feature="practice-question"]').first().click();
        await waitForActiveScreen('practice-question');
        await assert((await page.evaluate(() => document.querySelector('.tab-btn.active')?.getAttribute('data-tab'))) === 'practice-question', 'home feature CTA opens practice-question');
        await navigate('home');

        await page.locator('#meta-home-shell [data-home-menu]').click();
        await page.waitForSelector('.meta-home-drawer.is-open');
        const drawerVersion = ((await page.locator('.meta-home-drawer.is-open .meta-home-drawer__footer strong').textContent()) || '').trim();
        await assert(Boolean(drawerVersion), 'home drawer opens', drawerVersion);
        await page.locator('.meta-home-drawer.is-open [data-home-view="help"]').click();
        const helpTitle = ((await page.locator('#meta-home-shell .meta-home-screen__header h2').textContent()) || '').trim();
        await assert(Boolean(helpTitle), 'home help view opens', helpTitle);
        await page.locator('#meta-home-shell .meta-home-screen__header [data-home-view="home"]').click();
        await page.waitForSelector('#meta-home-shell .hhc-title');

        await page.locator('#meta-home-shell [data-home-menu]').click();
        await page.waitForSelector('.meta-home-drawer.is-open');
        await page.locator('.meta-home-drawer.is-open [data-home-nav="about"]').click();
        await waitForActiveScreen('about');
        await assert((await page.evaluate(() => document.querySelector('.tab-btn.active')?.getAttribute('data-tab'))) === 'about', 'home drawer nav opens about');
        await navigate('home');

        await assertOverlayComicLaunch({
            label: 'feature-map overlay comic launch',
            openOverlay: async () => {
                await page.evaluate(() => window.openFeatureMapMenu?.());
                await page.waitForSelector('.overlay-root:not(.hidden) .feature-map-overlay-clone');
            }
        });

        await assertOverlayComicLaunch({
            label: 'home menu overlay comic launch',
            openOverlay: async () => {
                await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('#home .app-shell .app-shell-actions button'));
                    const target = buttons.find((button) => (button.textContent || '').includes('תפריט'));
                    target?.click();
                });
                await page.waitForSelector('.overlay-root:not(.hidden) .home-shell-menu-clone');
            }
        });

        await navigate('home');
        await resetProductGuidanceTrace();
        await navigate('comic-engine');
        await enterManagedFeatureStage('comic-engine');
        await page.waitForTimeout(1200);
        const productGuidanceTrace = await readProductGuidanceTrace();
        const productGuidanceSummary = {
            scheduleObserver: productGuidanceTrace.filter((entry) => entry.text.includes('scheduleApply reason=observer')).length,
            applyStart: productGuidanceTrace.filter((entry) => entry.text.includes('apply start reason=observer')).length,
            applyDone: productGuidanceTrace.filter((entry) => entry.text.includes('apply done duration=')).length,
            mutationStorm: productGuidanceTrace.some((entry) => entry.text.includes('mutation storm detected'))
        };
        await assert(!productGuidanceSummary.mutationStorm, 'comic product-guidance avoids mutation storm', JSON.stringify(productGuidanceSummary));
        await assert(productGuidanceSummary.scheduleObserver <= 8, 'comic product-guidance observer stays bounded', JSON.stringify(productGuidanceSummary));
        await assert(productGuidanceSummary.applyStart <= 8, 'comic product-guidance apply stays bounded', JSON.stringify(productGuidanceSummary));

        await checkManagedScreen('sentence-map', { verifyStatsRoute: true });
        await checkManagedScreen('practice-question');
        await checkManagedScreen('comic-engine');

        if (FULL_SHELL_SWEEP) {
            await checkManagedScreen('practice-triples-radar');
            await checkManagedScreen('practice-wizard');
            await checkManagedScreen('practice-verb-unzip');
            await checkManagedScreen('categories');
            await checkManagedScreen('blueprint');
            await checkManagedScreen('prismlab');
            await checkManagedScreen('about');

            await navigate('home');
            await navigate('practice-radar');
            await enterManagedFeatureStage('practice-radar');
            await page.locator('#practice-radar [data-shell-chrome-home]').click();
            await waitForActiveScreen('home');
            const resumeButtonCount = await page.locator('#meta-home-shell [data-home-resume]').count();
            await assert(resumeButtonCount > 0, 'home resume action visible');
            await page.locator('#meta-home-shell [data-home-resume]').click();
            await waitForActiveScreen('practice-radar');
            await assert(
                (await page.evaluate(() => document.querySelector('.tab-btn.active')?.getAttribute('data-tab') || '')) === 'practice-radar',
                'home resume restores last managed tab'
            );
        }

        await navigate('home');
        await closeOverlayIfOpen();
        await assert(
            (await page.locator('#meta-home-shell [data-home-href*="scenario_trainer.html"]').count()) > 0,
            'scenario launcher visible from home'
        );
        await checkStandaloneScenarioGuidance();
        await checkStandaloneVerbUnzipGuidance();
        await checkLegacyStandaloneWelcomeMount('sentence_morpher_trainer.html', 'sentence-morpher');
        await checkLegacyStandaloneWelcomeMount('prism_research_trainer.html', 'prism-research');

        await checkComicExperience();
        trace('desktop:done');

        if (FULL_SHELL_SWEEP) {
            const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
            const mobileUiAudit = {};
            await seedTestState(mobile);
            await mobile.goto(baseUrl, { waitUntil: 'networkidle' });
            await dismissOnboardingIfVisible(mobile);
            for (const screenId of ['home', 'sentence-map', 'practice-question', 'practice-radar', 'practice-wizard', 'blueprint', 'prismlab']) {
                trace('mobile:start', screenId);
                await mobile.evaluate((id) => window.navigateTo(id), screenId);
                await waitForActiveScreen(screenId, mobile);
                await enterManagedFeatureStage(screenId, mobile);
                if (screenId === 'prismlab') {
                    await mobile.locator('#prismlab [data-action="start-lab"]').click();
                    await mobile.waitForSelector('#prismlab .pnm-view--categories');
                    await mobile.locator('#prismlab [data-action="open-category"]').first().click();
                    await mobile.waitForSelector('#prismlab .pnm-view--workspace');
                }
                await mobile.waitForTimeout(400);
                const mobileCheck = await mobile.evaluate(() => ({
                    innerWidth: window.innerWidth,
                    scrollWidth: document.documentElement.scrollWidth,
                    activeElement: document.querySelector('.tab-content.active')?.id || ''
                }));
                await assert(mobileCheck.scrollWidth <= mobileCheck.innerWidth + 1, `mobile ${screenId} no horizontal overflow`, `${mobileCheck.scrollWidth}/${mobileCheck.innerWidth}`);
                await assert(mobileCheck.activeElement === screenId, `mobile ${screenId} active`);
                if (MOBILE_UI_AUDIT_CONFIG[screenId]) {
                    const audit = await collectMobileUiAudit(screenId, mobile);
                    mobileUiAudit[screenId] = audit;
                    await assert(audit.topIcons.back && audit.topIcons.home && audit.topIcons.restart, `mobile ${screenId} top icon bar visible`);
                    await assert(audit.largeBodyButtons.length <= (MOBILE_UI_AUDIT_CONFIG[screenId].maxLargeBodyActions || 2), `mobile ${screenId} keeps body CTA count`, audit.largeBodyButtons.map((item) => item.label).join(', '));
                    await assert(audit.duplicateSelectorsVisible.length === 0, `mobile ${screenId} removes duplicate stats/actions`, audit.duplicateSelectorsVisible.join(', '));
                }
                if (screenId === 'prismlab') {
                    const prismMetrics = await mobile.evaluate(() => {
                        const active = document.querySelector('#prismlab.active');
                        const top = active?.querySelector('[data-meta-feature-chrome="top"]');
                        const bottom = active?.querySelector('[data-meta-feature-chrome="bottom"]');
                        const contextCard = active?.querySelector('.pnm-context-card');
                        const instructionCard = active?.querySelector('.pnm-instruction-card');
                        const questionCard = active?.querySelector('.pnm-question-card');
                        const primaryButton = active?.querySelector('.pnm-question-card [data-action="reveal-answer"], .pnm-question-card [data-action="go-reflect"]');
                        const bodyActions = Array.from(active?.querySelectorAll('.pnm-question-card .pnm-btn') || []).filter((el) => {
                            const rect = el.getBoundingClientRect();
                            const style = getComputedStyle(el);
                            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
                        });
                        const questionRect = questionCard?.getBoundingClientRect();
                        const primaryRect = primaryButton?.getBoundingClientRect();
                        const bottomRect = bottom?.getBoundingClientRect();
                        return {
                            icons: {
                                back: !!top?.querySelector('[data-shell-chrome-back]'),
                                home: !!top?.querySelector('[data-shell-chrome-home]'),
                                restart: !!top?.querySelector('[data-shell-chrome-restart]'),
                                stats: !!top?.querySelector('[data-shell-chrome-stats]')
                            },
                            bottomBar: {
                                meta: Array.from(bottom?.querySelectorAll('.meta-feature-chrome__meta span') || []).map((el) => (el.textContent || '').trim()),
                                hasExtraActions: !!active?.querySelector('[data-shell-chrome-home-bottom]'),
                                duplicatedMetaInsideBody: !!active?.querySelector('.pnm-stage-card .meta-feature-chrome__meta')
                            },
                            contextVisible: !!contextCard,
                            instructionVisible: !!instructionCard,
                            bodyActionCount: bodyActions.length,
                            bodyActionLabels: bodyActions.map((el) => (el.textContent || '').trim()),
                            progressElements: active ? active.querySelectorAll('.pnm-stage-progress, .pnm-progress-ring').length : 0,
                            viewportHeight: window.innerHeight,
                            questionCardBottom: questionRect ? Math.round(questionRect.bottom) : null,
                            questionMostlyInView: !!questionRect && questionRect.bottom <= window.innerHeight,
                            bottomBarTop: bottomRect ? Math.round(bottomRect.top) : null,
                            primaryButtonTop: primaryRect ? Math.round(primaryRect.top) : null,
                            primaryButtonBottom: primaryRect ? Math.round(primaryRect.bottom) : null,
                            primaryButtonClearOfBottomBar: !!primaryRect && !!bottomRect && primaryRect.bottom <= bottomRect.top,
                            contextTop: contextCard ? Math.round(contextCard.getBoundingClientRect().top) : null,
                            instructionTop: instructionCard ? Math.round(instructionCard.getBoundingClientRect().top) : null,
                            questionTop: questionCard ? Math.round(questionCard.getBoundingClientRect().top) : null
                        };
                    });
                    await mobile.screenshot({ path: prismMobileShotPath, fullPage: true });
                    await writeFile(prismMobileReportPath, JSON.stringify(prismMetrics, null, 2), 'utf8');
                    await assert(prismMetrics.contextVisible, 'mobile prismlab context card visible');
                    await assert(prismMetrics.instructionVisible, 'mobile prismlab instruction card visible');
                    await assert(prismMetrics.bodyActionCount <= 2, 'mobile prismlab keeps two main body actions', prismMetrics.bodyActionLabels.join(', '));
                    await assert(prismMetrics.icons.back && prismMetrics.icons.home && prismMetrics.icons.restart, 'mobile prismlab top icon bar keeps nav controls');
                    await assert(!prismMetrics.bottomBar.hasExtraActions, 'mobile prismlab bottom bar has no extra action buttons');
                }
                trace('mobile:done', screenId);
            }
            await mobile.evaluate(() => window.navigateTo('practice-triples-radar'));
            await waitForActiveScreen('practice-triples-radar', mobile);
            await enterManagedFeatureStage('practice-triples-radar', mobile);
            await mobile.waitForTimeout(400);
            mobileUiAudit['practice-triples-radar'] = await collectMobileUiAudit('practice-triples-radar', mobile);
            await assert(mobileUiAudit['practice-triples-radar'].topIcons.back && mobileUiAudit['practice-triples-radar'].topIcons.home && mobileUiAudit['practice-triples-radar'].topIcons.restart, 'mobile practice-triples-radar top icon bar visible');
            await assert(mobileUiAudit['practice-triples-radar'].largeBodyButtons.length <= 2, 'mobile practice-triples-radar keeps body CTA count', mobileUiAudit['practice-triples-radar'].largeBodyButtons.map((item) => item.label).join(', '));
            await assert(mobileUiAudit['practice-triples-radar'].duplicateSelectorsVisible.length === 0, 'mobile practice-triples-radar removes duplicate stats/actions', mobileUiAudit['practice-triples-radar'].duplicateSelectorsVisible.join(', '));
            await mobile.evaluate(() => window.navigateTo('comic-engine'));
            await waitForActiveScreen('comic-engine', mobile);
            await enterManagedFeatureStage('comic-engine', mobile);
            await mobile.waitForTimeout(400);
            mobileUiAudit['comic-engine'] = await collectMobileUiAudit('comic-engine', mobile);
            await assert(mobileUiAudit['comic-engine'].topIcons.back && mobileUiAudit['comic-engine'].topIcons.home && mobileUiAudit['comic-engine'].topIcons.restart, 'mobile comic-engine top icon bar visible');
            await assert(mobileUiAudit['comic-engine'].largeBodyButtons.length <= 2, 'mobile comic-engine keeps body CTA count', mobileUiAudit['comic-engine'].largeBodyButtons.map((item) => item.label).join(', '));
            await assert(mobileUiAudit['comic-engine'].duplicateSelectorsVisible.length === 0, 'mobile comic-engine removes duplicate stats/actions', mobileUiAudit['comic-engine'].duplicateSelectorsVisible.join(', '));
            await writeFile(mobileUiReportPath, JSON.stringify(mobileUiAudit, null, 2), 'utf8');
            for (const screenId of ['sentence-map', 'practice-wizard', 'blueprint']) {
                trace('sticky:start', screenId);
                await mobile.evaluate((id) => window.navigateTo(id), screenId);
                await waitForActiveScreen(screenId, mobile);
                await enterManagedFeatureStage(screenId, mobile);
                await mobile.waitForTimeout(500);
                const stickyCheck = await mobile.evaluate(() => {
                    const sticky = document.getElementById('mobile-sticky-cta');
                    const stickyVisible = !!sticky && !sticky.classList.contains('hidden');
                    const stickyRect = stickyVisible ? sticky.getBoundingClientRect() : null;
                    const audioRects = Array.from(document.querySelectorAll('.audio-floating-control')).map((node) => node.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
                    const overlaps = stickyRect
                        ? audioRects.some((rect) => !(rect.right <= stickyRect.left || rect.left >= stickyRect.right || rect.bottom <= stickyRect.top || rect.top >= stickyRect.bottom))
                        : false;
                    return { stickyVisible, overlaps, audioCount: audioRects.length };
                });
                await assert(stickyCheck.stickyVisible, `mobile ${screenId} sticky CTA visible`);
                await assert(!stickyCheck.overlaps, `mobile ${screenId} sticky CTA not covered by floating audio`, JSON.stringify(stickyCheck));
                trace('sticky:done', screenId);
            }
            await mobile.evaluate(() => window.navigateTo('home'));
            await waitForActiveScreen('home', mobile);
            await mobile.locator('#meta-home-shell [data-home-menu]').click();
            await mobile.waitForSelector('.meta-home-drawer.is-open');
            const closeBox = await mobile.locator('.meta-home-drawer.is-open .meta-home-drawer__close').boundingBox();
            await assert(!!closeBox && closeBox.x >= 0 && closeBox.y >= 0 && closeBox.x + closeBox.width <= 390 && closeBox.y + closeBox.height <= 844, 'mobile overlay close reachable', JSON.stringify(closeBox));
            await mobile.close();

            const reduced = await browser.newPage({ viewport: { width: 1280, height: 900 } });
            await seedTestState(reduced);
            await reduced.emulateMedia({ reducedMotion: 'reduce' });
            await reduced.goto(baseUrl, { waitUntil: 'networkidle' });
            await dismissOnboardingIfVisible(reduced);
            await reduced.evaluate(() => window.navigateTo('home'));
            await waitForActiveScreen('home', reduced);
            const prefersReduced = await reduced.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
            await assert(prefersReduced, 'reduced motion media applied');
            await reduced.locator('#meta-home-shell [data-home-menu]').click();
            await reduced.waitForSelector('.meta-home-drawer.is-open');
            const reducedDrawer = ((await reduced.locator('.meta-home-drawer.is-open .meta-home-drawer__head strong').textContent()) || '').trim();
            await assert(Boolean(reducedDrawer), 'reduced motion drawer path', reducedDrawer);
            await reduced.close();
            trace('reduced:done');
        }

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
