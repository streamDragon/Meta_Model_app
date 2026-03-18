(function attachTrainerShellNav() {
    if (window.__trainerShellNavBooted) return;
    window.__trainerShellNavBooted = true;

    function isStandaloneTrainerPage() {
        try {
            return /_trainer\.html$/i.test((location.pathname || '').split('/').pop() || '');
        } catch (e) {
            return false;
        }
    }

    function isStandaloneShellPage() {
        try {
            var pathname = String(location.pathname || '').toLowerCase();
            if (/_trainer\.html$/i.test(pathname.split('/').pop() || '')) {
                return true;
            }
            return /\/worksheets\/verb-unzip\/?$/.test(pathname) || /\/lab\/context-radar\/?$/.test(pathname);
        } catch (e) {
            return false;
        }
    }

    function withBuildQuery(path) {
        try {
            var rawPath = String(path || '');
            var pathname = String(location.pathname || '').toLowerCase();
            if (rawPath && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|\.{1,2}\/|\/)/i.test(rawPath)) {
                if (/\/worksheets\/verb-unzip(?:\/index\.html)?$/i.test(pathname) || /\/lab\/context-radar(?:\/index\.html)?$/i.test(pathname)) {
                    rawPath = '../../' + rawPath;
                }
            }
            var current = new URL(window.location.href);
            var target = new URL(rawPath, window.location.href);
            ['v', 't'].forEach(function (key) {
                var val = current.searchParams.get(key);
                if (val) target.searchParams.set(key, val);
            });
            return target.toString();
        } catch (e) {
            return path;
        }
    }

    function getStandaloneShellMetaLabel() {
        try {
            var url = new URL(window.location.href);
            var version = String(url.searchParams.get('v') || '').trim();
            return version ? 'Standalone · v' + version : 'Standalone';
        } catch (e) {
            return 'Standalone';
        }
    }

    function canUseHistoryBack() {
        try {
            return window.history.length > 1;
        } catch (e) {
            return false;
        }
    }

    function getNavIconSvg(kind) {
        if (kind === 'home') {
            return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 10.5 12 4l8 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"></path><path d="M6.5 10v9h11v-9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"></path><path d="M10 19v-5h4v5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"></path></svg>';
        }
        if (kind === 'restart') {
            return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 12a8 8 0 1 1-2.34-5.66" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"></path><path d="M20 4v6h-6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"></path></svg>';
        }
        return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"></path></svg>';
    }

    var STANDALONE_CONTROLLER_KEY_BY_PATH = {
        '/scenario_trainer.html': 'scenario-trainer',
        '/prism_lab_trainer.html': 'prismlab',
        '/classic_classic_trainer.html': 'classic-classic',
        '/classic2_trainer.html': 'classic2',
        '/iceberg_templates_trainer.html': 'iceberg-templates',
        '/prism_research_trainer.html': 'prism-research',
        '/living_triples_trainer.html': 'living-triples',
        '/verb_unzip_trainer.html': 'practice-verb-unzip',
        '/worksheets/verb-unzip/': 'practice-verb-unzip',
        '/worksheets/verb-unzip/index.html': 'practice-verb-unzip',
        '/lab/context-radar/': 'context-radar',
        '/lab/context-radar/index.html': 'context-radar'
    };

    function normalizeStandalonePath(value) {
        var raw = String(value || '').trim().toLowerCase();
        if (!raw) return '';
        if (raw.charAt(0) !== '/') raw = '/' + raw;
        raw = raw.replace(/\/{2,}/g, '/');
        if (raw === '/index.html') return '/';
        return raw;
    }

    function detectStandaloneControllerKey() {
        var trainerRoot = document.querySelector('[data-trainer-platform="1"][data-trainer-id]');
        if (trainerRoot) {
            var trainerId = String(trainerRoot.getAttribute('data-trainer-id') || '').trim();
            if (trainerId) return trainerId;
        }
        if (document.querySelector('[data-prism-necessity-app]')) {
            return 'prismlab';
        }
        return STANDALONE_CONTROLLER_KEY_BY_PATH[normalizeStandalonePath(location.pathname)] || '';
    }

    function getStandaloneController() {
        var key = detectStandaloneControllerKey();
        var registry = window.__metaFeatureControllers;
        if (!key || !registry || typeof registry !== 'object') return null;
        return registry[key] || null;
    }

    function syncControllerActionState(navRoot) {
        var nav = navRoot || document.querySelector('.trainer-shell-nav');
        if (!nav) return;
        var controller = getStandaloneController();
        var restartBtn = nav.querySelector('[data-nav-action="restart"]');
        var backBtn = nav.querySelector('[data-nav-action="back"]');
        var hasInternalBack = !!(controller && typeof controller.stepBack === 'function');
        var canRestart = !!(controller && typeof controller.restart === 'function');

        if (canRestart && typeof controller.canRestart === 'function') {
            try {
                canRestart = controller.canRestart() !== false;
            } catch (e) {
                canRestart = true;
            }
        }

        if (restartBtn) {
            restartBtn.hidden = !canRestart;
            restartBtn.disabled = !canRestart;
            restartBtn.setAttribute('aria-disabled', canRestart ? 'false' : 'true');
            restartBtn.setAttribute('aria-hidden', canRestart ? 'false' : 'true');
            restartBtn.title = canRestart ? 'התחלה מחדש של התרגול הנוכחי' : '';
        }

        if (backBtn) {
            backBtn.title = hasInternalBack
                ? 'חזרה למסך הקודם בתוך התרגול'
                : 'חזרה לעמוד הקודם';
        }
    }

    function injectStyles() {
        if (document.getElementById('trainer-shell-nav-style')) return;
        var style = document.createElement('style');
        style.id = 'trainer-shell-nav-style';
        style.textContent = [
            '.trainer-shell-nav {',
            '  position: sticky;',
            '  top: calc(8px + env(safe-area-inset-top, 0px));',
            '  z-index: 1000;',
            '  display: grid;',
            '  gap: 10px;',
            '  width: min(1180px, calc(100% - 16px));',
            '  margin: 8px auto 10px;',
            '  padding: 10px 12px;',
            '  border-radius: 16px;',
            '  border: 1px solid rgba(125, 211, 252, 0.28);',
            '  background: linear-gradient(135deg, rgba(15, 118, 110, 0.96), rgba(3, 105, 161, 0.94));',
            '  box-shadow: 0 14px 34px rgba(12, 18, 44, 0.18), inset 0 1px 0 rgba(255,255,255,0.12);',
            '  backdrop-filter: blur(8px);',
            '}',
            '.trainer-shell-nav__group {',
            '  display: flex;',
            '  align-items: center;',
            '  gap: 8px;',
            '  flex-wrap: wrap;',
            '}',
            '.trainer-shell-nav__group--title {',
            '  justify-content: space-between;',
            '  min-width: 0;',
            '}',
            '.trainer-shell-nav__title-block {',
            '  display: grid;',
            '  gap: 2px;',
            '  min-width: 0;',
            '  text-align: end;',
            '}',
            '.trainer-shell-nav__brand {',
            '  color: rgba(224, 242, 254, 0.9);',
            '  font-size: 0.74rem;',
            '  font-weight: 800;',
            '  letter-spacing: 0.08em;',
            '  text-transform: uppercase;',
            '}',
            '.trainer-shell-nav__btn {',
            '  display: inline-flex;',
            '  align-items: center;',
            '  justify-content: center;',
            '  gap: 6px;',
            '  border: 1px solid rgba(255,255,255,0.28);',
            '  color: #fff;',
            '  background: rgba(255,255,255,0.08);',
            '  border-radius: 999px;',
            '  padding: 8px 12px;',
            '  cursor: pointer;',
            '  font: inherit;',
            '  font-weight: 800;',
            '  line-height: 1;',
            '  transition: transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease;',
            '}',
            '.trainer-shell-nav__btn:hover {',
            '  transform: translateY(-1px);',
            '  background: rgba(255,255,255,0.16);',
            '  box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.14);',
            '}',
            '.trainer-shell-nav__btn:focus-visible {',
            '  outline: 2px solid #facc15;',
            '  outline-offset: 2px;',
            '}',
            '.trainer-shell-nav__btn--icon {',
            '  width: 40px;',
            '  min-width: 40px;',
            '  min-height: 40px;',
            '  padding: 0;',
            '  border-radius: 12px;',
            '}',
            '.trainer-shell-nav__btn--icon svg {',
            '  width: 18px;',
            '  height: 18px;',
            '}',
            '.trainer-shell-nav__btn--theory {',
            '  background: linear-gradient(135deg, rgba(251,191,36,0.24), rgba(34,211,238,0.12));',
            '  border-color: rgba(251,191,36,0.35);',
            '  box-shadow: 0 0 0 1px rgba(251,191,36,0.12) inset;',
            '}',
            '.trainer-shell-nav__meta {',
            '  color: #ffffff;',
            '  font-size: 0.98rem;',
            '  font-weight: 900;',
            '  line-height: 1.3;',
            '  white-space: normal;',
            '  overflow: visible;',
            '  text-overflow: clip;',
            '}',
            '.trainer-shell-nav__meta-sub {',
            '  color: rgba(239, 246, 255, 0.82);',
            '  font-size: 0.76rem;',
            '  font-weight: 700;',
            '}',
            '.trainer-shell-nav__spark {',
            '  width: 7px;',
            '  height: 7px;',
            '  border-radius: 50%;',
            '  background: #facc15;',
            '  box-shadow: 0 0 14px rgba(250, 204, 21, 0.9);',
            '  animation: trainerShellNavPulse 1.9s ease-in-out infinite;',
            '}',
            '@keyframes trainerShellNavPulse {',
            '  0%, 100% { transform: scale(0.85); opacity: 0.6; }',
            '  50% { transform: scale(1.15); opacity: 1; }',
            '}',
            '@keyframes trainerShellNavFloat {',
            '  0%, 100% { transform: translateY(0px); }',
            '  50% { transform: translateY(-1px); }',
            '}',
            'body.trainer-shell-help-open { overflow: hidden; }',
            'body.trainer-shell-modal-open .trainer-shell-nav { pointer-events: none; opacity: 0.58; }',
            '.trainer-shell-help-overlay {',
            '  position: fixed;',
            '  inset: 0;',
            '  z-index: 2100;',
            '  background: rgba(2, 6, 23, 0.55);',
            '  backdrop-filter: blur(5px);',
            '  padding: 16px;',
            '  display: grid;',
            '  place-items: center;',
            '}',
            '.trainer-shell-help-overlay__dialog {',
            '  width: min(1100px, 100%);',
            '  max-height: min(92vh, 960px);',
            '  overflow: auto;',
            '  border-radius: 18px;',
            '  border: 1px solid rgba(255,255,255,0.18);',
            '  background: linear-gradient(160deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98));',
            '  box-shadow: 0 24px 60px rgba(2,6,23,0.35);',
            '  padding: 12px;',
            '  display: grid;',
            '  gap: 12px;',
            '}',
            '.trainer-shell-help-overlay__head {',
            '  display: flex;',
            '  align-items: flex-start;',
            '  justify-content: space-between;',
            '  gap: 12px;',
            '  flex-wrap: wrap;',
            '}',
            '.trainer-shell-help-overlay__kicker {',
            '  font-size: 0.8rem;',
            '  color: #1d4ed8;',
            '  font-weight: 800;',
            '}',
            '.trainer-shell-help-overlay__title {',
            '  margin: 2px 0 0;',
            '  color: #0f172a;',
            '  font-size: 1.15rem;',
            '}',
            '.trainer-shell-help-overlay__actions {',
            '  display: flex;',
            '  gap: 8px;',
            '  flex-wrap: wrap;',
            '}',
            '.trainer-shell-help-overlay__btn {',
            '  border-radius: 999px;',
            '  border: 1px solid #cbd5e1;',
            '  background: #fff;',
            '  color: #0f172a;',
            '  min-height: 38px;',
            '  padding: 8px 12px;',
            '  cursor: pointer;',
            '  font: inherit;',
            '  font-weight: 700;',
            '}',
            '.trainer-shell-help-overlay__btn--theory {',
            '  border-color: rgba(250, 204, 21, 0.48);',
            '  background: linear-gradient(135deg, #fef3c7, #ecfeff);',
            '  color: #92400e;',
            '}',
            '.trainer-shell-help-overlay__body {',
            '  display: grid;',
            '  gap: 10px;',
            '}',
            '.trainer-shell-help-overlay__card {',
            '  border: 1px solid #dbe7f5;',
            '  border-radius: 14px;',
            '  background: #ffffff;',
            '  padding: 10px;',
            '  overflow: auto;',
            '}',
            '.trainer-shell-help-overlay__card--empty h3 { margin: 0 0 6px; color: #153b6a; }',
            '.trainer-shell-help-overlay__card--empty p { margin: 0; color: #475569; line-height: 1.4; }',
            '.trainer-shell-help-overlay__card--empty p + p { margin-top: 6px; }',
            '.trainer-shell-help-overlay__card details { margin: 0; }',
            '.trainer-shell-help-overlay__card summary { cursor: default; }',
            '@media (max-width: 720px) {',
            '  .trainer-shell-nav { width: calc(100% - 10px); margin: 6px auto 8px; padding: 8px; }',
            '  .trainer-shell-nav__group--title { align-items: flex-start; }',
            '  .trainer-shell-nav__meta { font-size: 0.88rem; }',
            '  .trainer-shell-nav__meta-sub { font-size: 0.72rem; }',
            '  .trainer-shell-nav__btn { padding: 8px 10px; }',
            '  .trainer-shell-nav__btn--icon { width: 38px; min-width: 38px; min-height: 38px; padding: 0; }',
            '  .trainer-shell-help-overlay { padding: 10px; }',
            '  .trainer-shell-help-overlay__dialog { max-height: 94vh; padding: 10px; }',
            '  .trainer-shell-help-overlay__actions { width: 100%; }',
            '  .trainer-shell-help-overlay__btn { flex: 1 1 auto; }',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function isVisibleDialog(el) {
        if (!el) return false;
        if (el.hidden) return false;
        if (el.getAttribute('aria-hidden') === 'true') return false;
        // Check ancestors for aria-hidden or display:none
        var node = el.parentElement;
        while (node && node !== document.body) {
            if (node.getAttribute('aria-hidden') === 'true') return false;
            node = node.parentElement;
        }
        try {
            var st = window.getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) < 0.01) return false;
        } catch (e) {}
        return true;
    }

    function syncNavModalState() {
        if (!document.body) return;
        // Check for help overlay first (always blocking when open)
        var helpOpen = !!document.querySelector('.trainer-shell-help-overlay');
        // Check for cc-layer dialogs (classic-classic) - only when actually visible
        var ccOpen = Array.from(document.querySelectorAll('.cc-layer[role="dialog"],.trs-overlay,.it-onboarding-layer')).some(isVisibleDialog);
        // Check generic dialogs — must be visible, not just in DOM
        var genericOpen = Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]:not([hidden])')).some(isVisibleDialog);
        var hasBlockingDialog = helpOpen || ccOpen || genericOpen;
        document.body.classList.toggle('trainer-shell-modal-open', hasBlockingDialog);
    }

    function watchStandaloneDialogs(navRoot) {
        if (!document.body || document.body.__trainerShellDialogWatch) return;
        document.body.__trainerShellDialogWatch = true;
        syncNavModalState();
        syncControllerActionState(navRoot);
        var observer = new MutationObserver(function () {
            syncNavModalState();
            syncControllerActionState(navRoot);
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'hidden', 'style', 'open', 'aria-hidden']
        });
    }

    function ensureExternalCss(id, path) {
        if (document.getElementById(id)) return;
        var link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = withBuildQuery(path);
        document.head.appendChild(link);
    }

    function ensureExternalScript(id, path, options) {
        if (document.getElementById(id)) return;
        var opts = options || {};
        var script = document.createElement('script');
        script.id = id;
        script.src = withBuildQuery(path);
        if (opts.type) script.type = opts.type;
        if (typeof opts.defer === 'boolean') script.defer = opts.defer;
        else script.defer = false;
        if (typeof opts.async === 'boolean') script.async = opts.async;
        else script.async = false;
        if (opts.onload && typeof opts.onload === 'function') {
            script.addEventListener('load', opts.onload, { once: true });
        }
        document.head.appendChild(script);
    }

    function ensureAlchemyLayer() {
        if (!isStandaloneTrainerPage()) return;
        ensureExternalCss('alchemy-global-style', 'css/alchemy-global.css');
        ensureExternalScript('alchemy-global-script', 'js/alchemy-global.js');
    }

    function ensureFreemiumLayer() {
        if (!isStandaloneTrainerPage()) return;
        ensureExternalCss('freemium-style', 'css/freemium.css');

        var runtimeScript = document.getElementById('meta-runtime-env-script');
        var ensureBootstrap = function () {
            ensureExternalScript('meta-freemium-bootstrap', 'js/freemium/bootstrap-entry.js', {
                type: 'module',
                defer: true
            });
        };

        if (!runtimeScript) {
            ensureExternalScript('meta-runtime-env-script', 'js/runtime-env.js', {
                defer: false,
                async: false,
                onload: function () {
                    var loadedScript = document.getElementById('meta-runtime-env-script');
                    if (loadedScript) loadedScript.dataset.loaded = '1';
                    ensureBootstrap();
                }
            });
            return;
        }

        if (runtimeScript.dataset.loaded === '1') {
            ensureBootstrap();
            return;
        }

        runtimeScript.addEventListener('load', function () {
            runtimeScript.dataset.loaded = '1';
            ensureBootstrap();
        }, { once: true });
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function summaryLooksLikeHelp(summaryEl) {
        if (!summaryEl) return false;
        var text = String(summaryEl.textContent || '').toLowerCase();
        return /(help|guide|theory|philosophy|instruction|הסבר|עזרה|תיאוריה|פילוסופ|מה עושים)/i.test(text);
    }

    function classLooksLikeHelp(el) {
        if (!el) return false;
        var cls = String(el.className || '').toLowerCase();
        return /(help|guide|theory|philosoph|instruction|intro)/.test(cls);
    }

    function collapseInlineHelpDefaults(rootNode) {
        var scope = rootNode && rootNode.querySelectorAll ? rootNode : document;
        var detailNodes = scope.querySelectorAll ? scope.querySelectorAll('details') : [];
        Array.prototype.forEach.call(detailNodes, function (detailsEl) {
            if (!detailsEl || !detailsEl.open) return;
            if (classLooksLikeHelp(detailsEl) || summaryLooksLikeHelp(detailsEl.querySelector('summary'))) {
                detailsEl.open = false;
            }
        });
        var bridgeNodes = scope.querySelectorAll ? scope.querySelectorAll('.prm-theory-bridge, [class*="theory-bridge"]') : [];
        Array.prototype.forEach.call(bridgeNodes, function (node) {
            if (!node || node.dataset.trainerShellSuppressedHelp === '1') return;
            if (node.closest && node.closest('.trainer-shell-help-overlay')) return;
            node.dataset.trainerShellSuppressedHelp = '1';
            node.hidden = true;
        });
    }

    var trainerHelpObserver = null;
    function watchForLateHelpContent() {
        if (trainerHelpObserver || !window.MutationObserver || !document.body) return;
        trainerHelpObserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
                    if (!node || node.nodeType !== 1) return;
                    collapseInlineHelpDefaults(node);
                });
            });
        });
        trainerHelpObserver.observe(document.body, { childList: true, subtree: true });
    }

    function isVisibleHelpCandidate(el) {
        if (!el || !(el instanceof Element)) return false;
        if (el.closest('.trainer-shell-nav') || el.closest('.trainer-shell-help-overlay')) return false;
        var style = window.getComputedStyle ? window.getComputedStyle(el) : null;
        if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
        var rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    function collectHelpCandidates() {
        var selectors = [
            '.cc-round-guide',
            '.cc-help-box',
            '.cc-task-compass',
            '.cc-flow-guide',
            '.prm-theory-bridge',
            '.prm-card.prm-theory-bridge',
            '[class*="inline-theory"]',
            '[class*="theory-bridge"]',
            '[class*="help-box"]',
            '[class*="guide-panel"]',
            '[class*="instruction"]',
            'details[class*="theory"]',
            'details[class*="help"]',
            'details[class*="guide"]'
        ];
        var found = [];
        var seen = new Set();
        selectors.forEach(function (selector) {
            Array.prototype.forEach.call(document.querySelectorAll(selector), function (el) {
                if (!(el && (isVisibleHelpCandidate(el) || el.dataset.trainerShellSuppressedHelp === '1'))) return;
                if (seen.has(el)) return;
                seen.add(el);
                found.push(el);
            });
        });
        if (!found.length) {
            Array.prototype.forEach.call(document.querySelectorAll('details'), function (el) {
                if (!isVisibleHelpCandidate(el)) return;
                if (!summaryLooksLikeHelp(el.querySelector('summary'))) return;
                if (seen.has(el)) return;
                seen.add(el);
                found.push(el);
            });
        }
        return found.slice(0, 8);
    }

    function cloneHelpNodeForOverlay(el) {
        var clone = el.cloneNode(true);
        clone.hidden = false;
        clone.removeAttribute('hidden');
        delete clone.dataset.trainerShellSuppressedHelp;
        Array.prototype.forEach.call(clone.querySelectorAll('details'), function (detailsEl) {
            if (classLooksLikeHelp(detailsEl) || summaryLooksLikeHelp(detailsEl.querySelector('summary'))) {
                detailsEl.open = true;
            }
        });
        Array.prototype.forEach.call(clone.querySelectorAll('[hidden]'), function (node) {
            node.hidden = false;
            node.removeAttribute('hidden');
        });
        Array.prototype.forEach.call(clone.querySelectorAll('[id]'), function (node) {
            node.removeAttribute('id');
        });
        Array.prototype.forEach.call(clone.querySelectorAll('button, input, select, textarea, [data-cc-action], [data-action]'), function (node) {
            if (node.tagName === 'BUTTON') {
                node.disabled = true;
                node.setAttribute('aria-disabled', 'true');
            } else {
                node.setAttribute('disabled', 'disabled');
            }
        });
        return clone;
    }

    function closeTrainerHelpOverlay() {
        var overlay = document.querySelector('.trainer-shell-help-overlay');
        if (!overlay) return;
        if (overlay.__trainerHelpEscHandler) {
            document.removeEventListener('keydown', overlay.__trainerHelpEscHandler, true);
        }
        overlay.remove();
        document.body.classList.remove('trainer-shell-help-open');
    }

    function openTrainerHelpOverlay(opts) {
        closeTrainerHelpOverlay();
        var title = (opts && opts.title) || (document.title || 'Trainer');
        var theoryUrl = (opts && opts.theoryUrl) || withBuildQuery('index.html?tab=categories');
        var candidates = collectHelpCandidates();

        var overlay = document.createElement('div');
        overlay.className = 'trainer-shell-help-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'עזרה למסך');

        var dialog = document.createElement('div');
        dialog.className = 'trainer-shell-help-overlay__dialog';

        var head = document.createElement('div');
        head.className = 'trainer-shell-help-overlay__head';
        head.innerHTML = [
            '<div class="trainer-shell-help-overlay__title-wrap">',
            '  <div class="trainer-shell-help-overlay__kicker">עזרה למסך הנוכחי</div>',
            '  <h2 class="trainer-shell-help-overlay__title">' + escapeHtml(title) + '</h2>',
            '</div>',
            '<div class="trainer-shell-help-overlay__actions">',
            '  <button type="button" class="trainer-shell-help-overlay__btn trainer-shell-help-overlay__btn--theory" data-help-action="theory">לתיאוריה המרכזית</button>',
            '  <button type="button" class="trainer-shell-help-overlay__btn" data-help-action="close">סגור</button>',
            '</div>'
        ].join('');

        var body = document.createElement('div');
        body.className = 'trainer-shell-help-overlay__body';

        if (candidates.length) {
            candidates.forEach(function (el) {
                var card = document.createElement('section');
                card.className = 'trainer-shell-help-overlay__card';
                card.appendChild(cloneHelpNodeForOverlay(el));
                body.appendChild(card);
            });
        } else {
            var empty = document.createElement('section');
            empty.className = 'trainer-shell-help-overlay__card trainer-shell-help-overlay__card--empty';
            empty.innerHTML = [
                '<h3>מסך תרגול נקי</h3>',
                '<p>במסך הזה אין שכבת הסבר מקומית מורחבת. מטרת המסך היא עבודה ישירה.</p>',
                '<p>לתיאוריה מלאה, הגדרות, דוגמאות והרחבות עברו לדף התאוריה המרכזי.</p>'
            ].join('');
            body.appendChild(empty);
        }

        dialog.appendChild(head);
        dialog.appendChild(body);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        document.body.classList.add('trainer-shell-help-open');

        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) {
                closeTrainerHelpOverlay();
                return;
            }
            var btn = event.target.closest('[data-help-action]');
            if (!btn) return;
            var action = btn.getAttribute('data-help-action');
            if (action === 'close') {
                closeTrainerHelpOverlay();
                return;
            }
            if (action === 'theory') {
                window.location.assign(theoryUrl);
            }
        });

        var onKey = function (event) {
            if (event.key !== 'Escape') return;
            closeTrainerHelpOverlay();
        };
        overlay.__trainerHelpEscHandler = onKey;
        document.addEventListener('keydown', onKey, true);
    }

    function buildNav() {
        if (!isStandaloneShellPage()) return;
        if (!document.body || document.querySelector('.trainer-shell-nav')) return;

        ensureAlchemyLayer();
        ensureFreemiumLayer();
        injectStyles();

        var nav = document.createElement('div');
        nav.className = 'trainer-shell-nav';
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', '\u05E0\u05D9\u05D5\u05D5\u05D8 \u05E2\u05DE\u05D5\u05D3 standalone');

        var titleText = (document.title || 'Trainer')
            .replace(/\s*-\s*Meta Model Trainer\s*$/i, '')
            .replace(/\s*-\s*Meta Model Lab\s*$/i, '')
            .trim();
        var metaLabel = getStandaloneShellMetaLabel();
        var homeUrl = withBuildQuery('index.html');
        var theoryUrl = withBuildQuery('index.html?tab=categories');

        nav.innerHTML = [
            '<div class="trainer-shell-nav__group trainer-shell-nav__group--title">',
            '  <div class="trainer-shell-nav__title-block">',
            '    <div class="trainer-shell-nav__brand">Meta Model</div>',
            '    <div class="trainer-shell-nav__meta">' + String(titleText)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;') + '</div>',
            '    <div class="trainer-shell-nav__meta-sub">' + String(metaLabel)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;') + '</div>',
            '  </div>',
            '  <span class="trainer-shell-nav__spark" aria-hidden="true"></span>',
            '</div>',
            '<div class="trainer-shell-nav__group">',
            '  <button type="button" class="trainer-shell-nav__btn trainer-shell-nav__btn--icon" data-nav-action="back" aria-label="\u05D7\u05D6\u05E8\u05D4 \u05DC\u05E2\u05DE\u05D5\u05D3 \u05D4\u05E7\u05D5\u05D3\u05DD" title="\u05D7\u05D6\u05E8\u05D4 \u05DC\u05E2\u05DE\u05D5\u05D3 \u05D4\u05E7\u05D5\u05D3\u05DD">' + getNavIconSvg('back') + '</button>',
            '  <button type="button" class="trainer-shell-nav__btn trainer-shell-nav__btn--icon" data-nav-action="home" aria-label="\u05DE\u05E2\u05D1\u05E8 \u05DC\u05E2\u05DE\u05D5\u05D3 \u05D4\u05D1\u05D9\u05EA" title="\u05DE\u05E2\u05D1\u05E8 \u05DC\u05E2\u05DE\u05D5\u05D3 \u05D4\u05D1\u05D9\u05EA">' + getNavIconSvg('home') + '</button>',
            '  <button type="button" class="trainer-shell-nav__btn trainer-shell-nav__btn--icon" data-nav-action="restart" hidden aria-label="\u05D4\u05EA\u05D7\u05DC\u05D4 \u05DE\u05D7\u05D3\u05E9" title="\u05D4\u05EA\u05D7\u05DC\u05D4 \u05DE\u05D7\u05D3\u05E9">' + getNavIconSvg('restart') + '</button>',
            '  <button type="button" class="trainer-shell-nav__btn trainer-shell-nav__btn--theory" data-nav-action="theory" title="\u05D3\u05E3 \u05D4\u05EA\u05D0\u05D5\u05E8\u05D9\u05D4 \u05D4\u05DE\u05E8\u05DB\u05D6\u05D9">\u05EA\u05D9\u05D0\u05D5\u05E8\u05D9\u05D4</button>',
            '  <button type="button" class="trainer-shell-nav__btn" data-nav-action="help-overlay" title="\u05E2\u05D6\u05E8\u05D4 \u05DC\u05DE\u05E1\u05DA \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9 (\u05DE\u05E1\u05DA \u05DE\u05DC\u05D0)">\u05E2\u05D6\u05E8\u05D4 \u05DC\u05DE\u05E1\u05DA</button>',
            '</div>'
        ].join('');

        var firstChild = document.body.firstChild;
        document.body.insertBefore(nav, firstChild);

        nav.addEventListener('click', function (event) {
            var btn = event.target.closest('[data-nav-action]');
            if (!btn) return;
            var action = btn.getAttribute('data-nav-action');
            var controller = getStandaloneController();
            if (action === 'home') {
                window.location.assign(homeUrl);
                return;
            }
            if (action === 'theory') {
                window.location.assign(theoryUrl);
                return;
            }
            if (action === 'help-overlay') {
                openTrainerHelpOverlay({ title: titleText, theoryUrl: theoryUrl });
                return;
            }
            if (action === 'restart') {
                if (controller && typeof controller.restart === 'function') {
                    try {
                        if (controller.restart() === true) {
                            syncControllerActionState(nav);
                        }
                    } catch (e) {}
                }
                return;
            }
            if (action === 'back') {
                if (controller && typeof controller.stepBack === 'function') {
                    try {
                        if (controller.stepBack() === true) {
                            syncControllerActionState(nav);
                            return;
                        }
                    } catch (e) {}
                }
                if (canUseHistoryBack()) {
                    window.history.back();
                } else {
                    window.location.assign(homeUrl);
                }
            }
        });

        syncControllerActionState(nav);
        collapseInlineHelpDefaults();
        watchForLateHelpContent();
        watchStandaloneDialogs(nav);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildNav, { once: true });
    } else {
        buildNav();
    }

    if (isStandaloneTrainerPage()) {
        ensureFreemiumLayer();
    }
})();
