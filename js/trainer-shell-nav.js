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
            '@media (max-width: 720px) {',
            '  .trainer-shell-nav { width: calc(100% - 10px); margin: 6px auto 8px; padding: 8px; }',
            '  .trainer-shell-nav__meta { font-size: 0.75rem; max-width: 44vw; }',
            '  .trainer-shell-nav__btn { padding: 8px 10px; }',
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

    function ensureExternalScript(id, path) {
        if (document.getElementById(id)) return;
        var script = document.createElement('script');
        script.id = id;
        script.src = withBuildQuery(path);
        script.defer = true;
        document.head.appendChild(script);
    }

    function ensureAlchemyLayer() {
        if (!isStandaloneTrainerPage()) return;
        ensureExternalCss('alchemy-global-style', 'css/alchemy-global.css');
        ensureExternalScript('alchemy-global-script', 'js/alchemy-global.js');
    }

    function buildNav() {
        if (!isStandaloneTrainerPage()) return;
        if (!document.body || document.querySelector('.trainer-shell-nav')) return;

        ensureAlchemyLayer();
        injectStyles();

        var nav = document.createElement('div');
        nav.className = 'trainer-shell-nav';
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', 'ניווט עמוד standalone');

        var titleText = (document.title || 'Trainer').replace(/\s*-\s*Meta Model Trainer\s*$/i, '').trim();
        var homeUrl = withBuildQuery('index.html');

        nav.innerHTML = [
            '<div class="trainer-shell-nav__group">',
            '  <button type="button" class="trainer-shell-nav__btn" data-nav-action="back" title="חזרה לעמוד הקודם">← חזרה</button>',
            '  <button type="button" class="trainer-shell-nav__btn" data-nav-action="home" title="חזרה לדף הראשי">דף ראשי</button>',
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
            if (action === 'back') {
                if (canUseHistoryBack()) {
                    window.history.back();
                } else {
                    window.location.assign(homeUrl);
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildNav, { once: true });
    } else {
        buildNav();
    }
})();
