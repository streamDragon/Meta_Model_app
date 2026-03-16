(function initMetaTrainerStandalone(global) {
    if (!global || global.MetaTrainerStandalone) return;

    function normalizeToken(value) {
        return String(value == null ? '' : value).trim();
    }

    function getContract(trainerId) {
        const registry = global.MetaTrainerPlatformContracts || {};
        return registry[String(trainerId || '').trim()] || null;
    }

    function buildStyles(accent) {
        const primary = accent?.primary || '#1d4ed8';
        const border = accent?.border || '#bfdbfe';
        const glow = accent?.glow || 'rgba(59,130,246,0.18)';
        const background = accent?.background || 'radial-gradient(circle at 10% 10%, #dbeafe, #f8fafc 45%, #ecfeff)';
        return `
html, body { margin: 0; padding: 0; }
body {
  font-family: "Assistant", "Heebo", "Noto Sans Hebrew", "Segoe UI", sans-serif;
  color: #0f172a;
  background: ${background};
  min-height: 100vh;
  padding: 12px;
}
.mtp-page {
  max-width: 1240px;
  margin: 0 auto;
}
.mtp-nav {
  max-width: 1240px;
  margin: 0 auto 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}
.mtp-nav-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.mtp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid ${border};
  background: #ffffff;
  color: ${primary};
  border-radius: 12px;
  padding: 9px 12px;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.05);
}
.mtp-btn:hover {
  background: rgba(255,255,255,0.92);
  border-color: ${primary};
}
.mtp-meta {
  color: #475569;
  font-size: 0.82rem;
  font-weight: 700;
}
.mtp-shell {
  max-width: 920px;
  margin: 16px auto;
  border: 1px solid ${border};
  background: rgba(255,255,255,0.92);
  border-radius: 18px;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.07), 0 0 0 1px ${glow};
  padding: 18px;
}
.mtp-title {
  font-size: 1.1rem;
  font-weight: 800;
  margin: 0 0 8px;
}
.mtp-text {
  margin: 0;
  color: #475569;
  line-height: 1.45;
}
.mtp-meta-line {
  margin-top: 8px;
  color: ${primary};
  font-weight: 700;
  font-size: 0.86rem;
}
.mtp-error {
  border-color: #fecaca;
  background: #fff1f2;
  color: #991b1b;
}
@media (max-width: 720px) {
  body { padding: 10px; }
  .mtp-nav {
    align-items: stretch;
  }
  .mtp-nav,
  .mtp-nav-group {
    display: grid;
    grid-template-columns: 1fr;
  }
  .mtp-btn {
    width: 100%;
  }
}
`;
    }

    function updateShell(mountId, title, message, meta, isError) {
        const mount = document.getElementById(mountId);
        if (!mount) return;
        mount.innerHTML = [
            '<div class="mtp-shell' + (isError ? ' mtp-error' : '') + '">',
            '<p class="mtp-title">' + title + '</p>',
            '<p class="mtp-text">' + (message || '') + '</p>',
            meta ? '<div class="mtp-meta-line">' + meta + '</div>' : '',
            '</div>'
        ].join('');
    }

    function createVersionedUrl(rawPath, buildMeta) {
        const path = String(rawPath || '');
        const version = normalizeToken(buildMeta?.version);
        const buildTime = normalizeToken(buildMeta?.buildTime);
        try {
            const url = new URL(path, global.location.href);
            if (version) url.searchParams.set('v', version);
            if (buildTime) url.searchParams.set('t', buildTime);
            return url.toString();
        } catch (_error) {
            const sep = path.indexOf('?') === -1 ? '?' : '&';
            const qs = [];
            if (version) qs.push('v=' + encodeURIComponent(version));
            if (buildTime) qs.push('t=' + encodeURIComponent(buildTime));
            return path + (qs.length ? sep + qs.join('&') : '');
        }
    }

    function maybeRefreshEmbeddedFrame(buildMeta) {
        let isEmbedded = false;
        try {
            isEmbedded = global.self !== global.top;
        } catch (_error) {
            isEmbedded = true;
        }
        if (!isEmbedded) return;
        let current;
        try {
            current = new URL(global.location.href);
        } catch (_error) {
            return;
        }
        const currentV = normalizeToken(current.searchParams.get('v'));
        const currentT = normalizeToken(current.searchParams.get('t'));
        const nextV = normalizeToken(buildMeta?.version);
        const nextT = normalizeToken(buildMeta?.buildTime);
        if (!nextV && !nextT) return;
        if (currentV === nextV && currentT === nextT) return;
        const target = createVersionedUrl(global.location.href, buildMeta);
        if (target && target !== global.location.href) global.location.replace(target);
    }

    function ensureSharedFrame(contract) {
        const wrapper = contract?.wrapper || {};
        const mountId = wrapper.mountId || 'trainer-root';
        const accent = wrapper.accent || {};
        const pageTitle = contract?.id === 'scenario-trainer'
            ? 'סימולטור סצנות - אימון שיחה חי'
            : (wrapper.pageTitle || contract?.title || document.title);
        const navLinks = Array.isArray(wrapper.navLinks)
            ? wrapper.navLinks.filter((link) => {
                if (contract?.id !== 'scenario-trainer') return true;
                return String(link?.href || '').trim() === 'index.html';
            })
            : [];
        const secondaryNavLinks = navLinks.filter((link) => String(link?.href || '').trim() !== 'index.html');
        document.title = pageTitle;
        document.body.innerHTML = `
          <div class="mtp-page">
            <div class="mtp-nav" aria-label="ניווט עמוד ${contract?.title || ''}">
              <div class="mtp-nav-group">
                ${secondaryNavLinks.map((link) => `<a class="mtp-btn" data-mtp-link="${link.href}" href="${link.href}">${link.label}</a>`).join('')}
              </div>
              <div id="${mountId}-meta" class="mtp-meta" aria-live="polite"></div>
            </div>
            <div id="${mountId}"></div>
          </div>
        `;
        const style = document.createElement('style');
        style.setAttribute('data-trainer-standalone-style', contract?.id || '');
        style.textContent = buildStyles(accent);
        document.head.appendChild(style);
        updateShell(mountId, wrapper.loadingTitle || 'טוען...', wrapper.loadingText || '', '', false);
        return mountId;
    }

    function loadCss(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => resolve();
            link.onerror = () => reject(new Error('Failed to load CSS: ' + href));
            document.head.appendChild(link);
        });
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load script: ' + src));
            document.head.appendChild(script);
        });
    }

    async function loadAssets(config, buildMeta) {
        const cssList = Array.isArray(config?.css) ? config.css : [];
        const scripts = Array.isArray(config?.scripts) ? config.scripts : [];
        const bundlePath = normalizeToken(config?.bundlePath);

        for (const href of cssList) {
            await loadCss(createVersionedUrl(href, buildMeta));
        }

        if (bundlePath) {
            await loadScript(createVersionedUrl(bundlePath, buildMeta));
        } else {
            for (const src of scripts) {
                await loadScript(createVersionedUrl(src, buildMeta));
            }
        }

        if (!document.querySelector('script[data-trainer-shell-nav="1"]')) {
            const navScript = document.createElement('script');
            navScript.src = createVersionedUrl('js/trainer-shell-nav.js', buildMeta);
            navScript.dataset.trainerShellNav = '1';
            document.body.appendChild(navScript);
        }
    }

    function updateMetaLine(mountId, buildMeta) {
        const metaEl = document.getElementById(mountId + '-meta');
        if (!metaEl) return;
        const bits = [];
        if (buildMeta?.version) bits.push('גרסה ' + buildMeta.version);
        if (buildMeta?.gitCommit) bits.push('source ' + String(buildMeta.gitCommit).slice(0, 7));
        metaEl.textContent = bits.join(' · ');
    }

    async function fetchManifest(manifestKey) {
        const nonce = Date.now() + '-' + Math.random().toString(36).slice(2);
        const response = await fetch('version.json?' + encodeURIComponent(manifestKey || 'trainer') + '=' + encodeURIComponent(nonce), { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
    }

    function boot(options) {
        const config = options && typeof options === 'object' ? options : {};
        const contract = getContract(config.trainerId);
        if (!contract) throw new Error('Unknown trainer contract: ' + config.trainerId);
        const wrapper = contract.wrapper || {};

        async function start() {
            const mountId = ensureSharedFrame(contract);
            try {
                if (global.navigator && global.navigator.webdriver && document && document.documentElement) {
                    document.documentElement.setAttribute('data-automation', '1');
                }
                const manifest = await fetchManifest(config.manifestKey || contract.id);
                const buildMeta = {
                    version: normalizeToken(manifest && manifest.version),
                    buildTime: normalizeToken(manifest && manifest.buildTime),
                    buildIso: normalizeToken(manifest && manifest.buildIso),
                    gitCommit: normalizeToken(manifest && manifest.gitCommit)
                };
                if (config.buildMetaGlobalKey) global[config.buildMetaGlobalKey] = buildMeta;
                if (config.assetVersionGlobalKey) global[config.assetVersionGlobalKey] = [buildMeta.version, buildMeta.buildTime].filter(Boolean).join('-');
                maybeRefreshEmbeddedFrame(buildMeta);
                updateMetaLine(mountId, buildMeta);
                await loadAssets(config, buildMeta);
            } catch (error) {
                updateShell(
                    mountId,
                    wrapper.errorTitle || 'שגיאה בטעינה',
                    error && error.message ? error.message : String(error),
                    'בדוק/י build או push אחרון',
                    true
                );
                console.error('[MetaTrainerStandalone] boot failed:', error);
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start, { once: true });
        } else {
            void start();
        }
    }

    global.MetaTrainerStandalone = Object.freeze({ boot: boot });
})(typeof globalThis !== 'undefined' ? globalThis : window);
