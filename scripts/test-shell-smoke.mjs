import net from 'node:net';
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

    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

    const seedTestState = async (targetPage = page) => {
        await targetPage.addInitScript((seed) => {
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
        await page.locator(`#${screenId} [data-feature-modal-box]:not([hidden]) .meta-feature-modal__close`).click();
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
            await page.waitForSelector('#meta-home-shell .meta-home-shell__hero h2');
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
                affordanceText: (affordance?.textContent || '').trim(),
                affordanceState: affordance?.dataset?.state || '',
                backDisabled: !!backButton?.disabled,
                overlayVisible: !!overlay && !overlay.classList.contains('hidden'),
                hudLinkText: (hudLink?.textContent || '').trim()
            };
        });
        await assert(initialState.choiceCount > 0, 'comic choices rendered', String(initialState.choiceCount));
        await assert(initialState.enabledChoices > 0, 'comic choices enabled', String(initialState.enabledChoices));
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
            return {
                selectedCount: document.querySelectorAll('#ceflow-choice-deck .ceflow-choice.is-selected').length,
                disabledChoices: document.querySelectorAll('#ceflow-choice-deck button[data-choice-id][disabled]').length,
                replyVisible: !!replyBox && !replyBox.classList.contains('hidden'),
                affordanceState: affordance?.dataset?.state || '',
                backDisabled: !!backButton?.disabled,
                replyBackVisible: !!replyBack && !replyBack.disabled
            };
        });
        await assert(selectedState.selectedCount === 1, 'comic choice selection visible');
        await assert(selectedState.disabledChoices > 0, 'comic choice lock after selection', String(selectedState.disabledChoices));
        await assert(selectedState.replyVisible, 'comic reply step opens');
        await assert(selectedState.affordanceState === 'locked', 'comic affordance locked after selection');
        await assert(!selectedState.backDisabled, 'comic back enabled after action');
        await assert(selectedState.replyBackVisible, 'comic reply-local back visible');

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
        await assert(rolledBackState.enabledChoices > 0, 'comic choices re-enabled after back', String(rolledBackState.enabledChoices));
        await assert(rolledBackState.replyHidden, 'comic back restores pre-reply step');
        await assert(rolledBackState.affordanceState === 'ready', 'comic affordance ready after back');
        await assert(rolledBackState.backDisabled, 'comic back disabled when history empty');

        await page.locator('#ceflow-choice-deck button[data-choice-id]:not([disabled])').first().click();
        await page.locator('#ceflow-reply-input').fill('אני עוצר רגע ומנסה לדייק מה בעצם מפריע לך.');
        await page.locator('#ceflow-reply-confirm').click();
        await page.waitForTimeout(160);
        const postReplyState = await page.evaluate(() => {
            const feedback = document.getElementById('ceflow-feedback');
            const snapshot = document.getElementById('ceflow-turn-snapshot');
            const feedbackBack = feedback?.querySelector('button[data-feedback-step-back]');
            return {
                feedbackVisible: !!feedback && !feedback.classList.contains('hidden'),
                snapshotVisible: !!snapshot && !snapshot.classList.contains('hidden'),
                retryEnabled: !document.getElementById('ceflow-retry')?.disabled,
                nextEnabled: !document.getElementById('ceflow-next-scene')?.disabled,
                hudLinkText: (document.querySelector('#ceflow-overlay .ceflow-hud-link')?.textContent || '').trim(),
                feedbackBackVisible: !!feedbackBack && !feedbackBack.disabled
            };
        });
        await assert(postReplyState.feedbackVisible, 'comic feedback panel visible after reply');
        await assert(postReplyState.snapshotVisible, 'comic turn snapshot visible after reply');
        await assert(postReplyState.retryEnabled, 'comic retry enabled after reply');
        await assert(postReplyState.nextEnabled, 'comic next scene enabled after reply');
        await assert(/משפט ההמשך/.test(postReplyState.hudLinkText), 'comic evaluation panel linked to user reply');
        await assert(postReplyState.feedbackBackVisible, 'comic feedback-local back visible');
    };

    try {
        trace('boot:start');
        await seedTestState(page);
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await dismissOnboardingIfVisible(page);
        trace('boot:ready');

        await navigate('home');
        const homeTitle = ((await page.locator('#meta-home-shell .meta-home-shell__hero h2').textContent()) || '').trim();
        await assert(Boolean(homeTitle), 'home shell loaded', homeTitle);

        await page.locator('#meta-home-shell [data-open-feature="sentence-map"]').first().click();
        await waitForActiveScreen('sentence-map');
        await assert((await page.evaluate(() => document.querySelector('.tab-btn.active')?.getAttribute('data-tab'))) === 'sentence-map', 'home hero CTA opens sentence map');

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
        await page.waitForSelector('#meta-home-shell .meta-home-shell__hero h2');

        await page.locator('#meta-home-shell [data-home-menu]').click();
        await page.waitForSelector('.meta-home-drawer.is-open');
        await page.locator('.meta-home-drawer.is-open [data-home-nav="about"]').click();
        await waitForActiveScreen('about');
        await assert((await page.evaluate(() => document.querySelector('.tab-btn.active')?.getAttribute('data-tab'))) === 'about', 'home drawer nav opens about');
        await navigate('home');

        await checkManagedScreen('sentence-map', { verifyStatsRoute: true, verifyRestart: true });
        await checkManagedScreen('practice-question');
        await checkManagedScreen('practice-triples-radar');
        await checkManagedScreen('practice-wizard');
        await checkManagedScreen('practice-verb-unzip');
        await checkManagedScreen('categories');
        await checkManagedScreen('blueprint');
        await checkManagedScreen('prismlab');
        await checkManagedScreen('about');
        await checkManagedScreen('comic-engine');

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

        await navigate('home');
        await closeOverlayIfOpen();
        await assert(
            (await page.locator('#meta-home-shell [data-home-href*="scenario_trainer.html"]').count()) > 0,
            'scenario launcher visible from home'
        );
        const scenarioPage = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
        await scenarioPage.goto(new URL('scenario_trainer.html', baseUrl).toString(), { waitUntil: 'networkidle' });
        await assert((await scenarioPage.locator('[data-trainer-platform="1"][data-trainer-id="scenario-trainer"]').count()) > 0, 'scenario standalone shell mounted');
        await assert((await scenarioPage.locator('.mtp-nav').count()) > 0, 'scenario standalone nav mounted');
        await scenarioPage.close();

        await checkComicExperience();
        trace('desktop:done');

        const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
        await seedTestState(mobile);
        await mobile.goto(baseUrl, { waitUntil: 'networkidle' });
        await dismissOnboardingIfVisible(mobile);
        for (const screenId of ['home', 'sentence-map', 'practice-question', 'practice-radar', 'practice-wizard', 'blueprint']) {
            trace('mobile:start', screenId);
            await mobile.evaluate((id) => window.navigateTo(id), screenId);
            await waitForActiveScreen(screenId, mobile);
            await enterManagedFeatureStage(screenId, mobile);
            await mobile.waitForTimeout(400);
            const mobileCheck = await mobile.evaluate(() => ({
                innerWidth: window.innerWidth,
                scrollWidth: document.documentElement.scrollWidth,
                activeElement: document.querySelector('.tab-content.active')?.id || ''
            }));
            await assert(mobileCheck.scrollWidth <= mobileCheck.innerWidth + 1, `mobile ${screenId} no horizontal overflow`, `${mobileCheck.scrollWidth}/${mobileCheck.innerWidth}`);
            await assert(mobileCheck.activeElement === screenId, `mobile ${screenId} active`);
            trace('mobile:done', screenId);
        }
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
