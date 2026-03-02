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

    function withBuildQuery(path) {
        try {
            var current = new URL(window.location.href);
            var target = new URL(path, window.location.href);
            ['v', 't'].forEach(function (key) {
                var val = current.searchParams.get(key);
                if (val) target.searchParams.set(key, val);
            });
            return target.toString();
        } catch (e) {
            return path;
        }
    }

    function canUseHistoryBack() {
        if (window.history.length < 2) return false;
        var ref = String(document.referrer || '');
        if (!ref) return false;
        try {
            var refUrl = new URL(ref);
            return refUrl.origin === window.location.origin;
        } catch (e) {
            return false;
        }
    }

    function injectStyles() {
        if (document.getElementById('trainer-shell-nav-style')) return;
        var style = document.createElement('style');
        style.id = 'trainer-shell-nav-style';
        style.textContent = [
            '.trainer-shell-nav {',
            '  position: sticky;',
            '  top: 8px;',
            '  z-index: 1000;',
            '  display: flex;',
            '  align-items: center;',
            '  justify-content: space-between;',
            '  gap: 10px;',
            '  width: min(1180px, calc(100% - 16px));',
            '  margin: 8px auto 10px;',
            '  padding: 8px 10px;',
            '  border-radius: 14px;',
            '  border: 1px solid rgba(250, 204, 21, 0.35);',
            '  background: linear-gradient(135deg, rgba(76, 29, 149, 0.92), rgba(34, 211, 238, 0.18));',
            '  box-shadow: 0 14px 34px rgba(12, 18, 44, 0.18), inset 0 1px 0 rgba(255,255,255,0.12);',
            '  backdrop-filter: blur(8px);',
            '  animation: trainerShellNavFloat 7s ease-in-out infinite;',
            '}',
            '.trainer-shell-nav__group {',
            '  display: flex;',
            '  align-items: center;',
            '  gap: 8px;',
            '  flex-wrap: wrap;',
            '}',
            '.trainer-shell-nav__btn {',
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
            '.trainer-shell-nav__btn--theory {',
            '  background: linear-gradient(135deg, rgba(251,191,36,0.24), rgba(34,211,238,0.12));',
            '  border-color: rgba(251,191,36,0.35);',
            '  box-shadow: 0 0 0 1px rgba(251,191,36,0.12) inset;',
            '}',
            '.trainer-shell-nav__meta {',
            '  color: rgba(255,255,255,0.88);',
            '  font-size: 0.82rem;',
            '  font-weight: 700;',
            '  white-space: nowrap;',
            '  overflow: hidden;',
            '  text-overflow: ellipsis;',
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
            '  .trainer-shell-nav__meta { font-size: 0.75rem; max-width: 44vw; }',
            '  .trainer-shell-nav__btn { padding: 8px 10px; }',
            '  .trainer-shell-help-overlay { padding: 10px; }',
            '  .trainer-shell-help-overlay__dialog { max-height: 94vh; padding: 10px; }',
            '  .trainer-shell-help-overlay__actions { width: 100%; }',
            '  .trainer-shell-help-overlay__btn { flex: 1 1 auto; }',
            '}'
        ].join('\n');
        document.head.appendChild(style);
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
        if (!isStandaloneTrainerPage()) return;
        if (!document.body || document.querySelector('.trainer-shell-nav')) return;

        ensureAlchemyLayer();
        ensureFreemiumLayer();
        injectStyles();

        var nav = document.createElement('div');
        nav.className = 'trainer-shell-nav';
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', '\u05E0\u05D9\u05D5\u05D5\u05D8 \u05E2\u05DE\u05D5\u05D3 standalone');

        var titleText = (document.title || 'Trainer').replace(/\s*-\s*Meta Model Trainer\s*$/i, '').trim();
        var homeUrl = withBuildQuery('index.html');
        var theoryUrl = withBuildQuery('index.html?tab=categories');

        nav.innerHTML = [
            '<div class="trainer-shell-nav__group">',
            '  <button type="button" class="trainer-shell-nav__btn" data-nav-action="back" title="\u05D7\u05D6\u05E8\u05D4 \u05DC\u05E2\u05DE\u05D5\u05D3 \u05D4\u05E7\u05D5\u05D3\u05DD">\u2190 \u05D7\u05D6\u05E8\u05D4</button>',
            '  <button type="button" class="trainer-shell-nav__btn" data-nav-action="home" title="\u05D7\u05D6\u05E8\u05D4 \u05DC\u05D3\u05E3 \u05D4\u05E8\u05D0\u05E9\u05D9">\u05D3\u05E3 \u05E8\u05D0\u05E9\u05D9</button>',
            '  <button type="button" class="trainer-shell-nav__btn trainer-shell-nav__btn--theory" data-nav-action="theory" title="\u05D3\u05E3 \u05D4\u05EA\u05D0\u05D5\u05E8\u05D9\u05D4 \u05D4\u05DE\u05E8\u05DB\u05D6\u05D9">\u05EA\u05D9\u05D0\u05D5\u05E8\u05D9\u05D4</button>',
            '  <button type="button" class="trainer-shell-nav__btn" data-nav-action="help-overlay" title="\u05E2\u05D6\u05E8\u05D4 \u05DC\u05DE\u05E1\u05DA \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9 (\u05DE\u05E1\u05DA \u05DE\u05DC\u05D0)">\u05E2\u05D6\u05E8\u05D4 \u05DC\u05DE\u05E1\u05DA</button>',
            '</div>',
            '<div class="trainer-shell-nav__group">',
            '  <span class="trainer-shell-nav__spark" aria-hidden="true"></span>',
            '  <div class="trainer-shell-nav__meta">' + String(titleText)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;') + '</div>',
            '</div>'
        ].join('');

        var firstChild = document.body.firstChild;
        document.body.insertBefore(nav, firstChild);

        nav.addEventListener('click', function (event) {
            var btn = event.target.closest('[data-nav-action]');
            if (!btn) return;
            var action = btn.getAttribute('data-nav-action');
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
            if (action === 'back') {
                if (canUseHistoryBack()) {
                    window.history.back();
                } else {
                    window.location.assign(homeUrl);
                }
            }
        });

        collapseInlineHelpDefaults();
        watchForLateHelpContent();
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
