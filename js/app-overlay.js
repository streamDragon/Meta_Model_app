(function initMetaOverlayProvider(global) {
    'use strict';

    if (!global) return;
    if (global.MetaOverlayProvider && typeof global.MetaOverlayProvider.openOverlay === 'function') return;

    const ROOT_ID = 'app-overlay-root';
    const TITLE_ID = 'app-overlay-title';

    const state = {
        root: null,
        panel: null,
        body: null,
        active: null,
        lock: null,
        escBound: false
    };

    function lockBodyScroll() {
        if (state.lock) return;
        const body = document.body;
        if (!body) return;
        const currentOverflow = body.style.overflow || '';
        const currentPaddingRight = body.style.paddingRight || '';
        const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
        body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            body.style.paddingRight = `${scrollbarWidth}px`;
        }
        body.classList.add('app-overlay-open');
        state.lock = {
            overflow: currentOverflow,
            paddingRight: currentPaddingRight
        };
    }

    function unlockBodyScroll() {
        if (!state.lock) return;
        const body = document.body;
        if (!body) {
            state.lock = null;
            return;
        }
        body.style.overflow = state.lock.overflow;
        body.style.paddingRight = state.lock.paddingRight;
        body.classList.remove('app-overlay-open');
        state.lock = null;
    }

    function ensureRoot() {
        if (state.root && state.root.isConnected) return state.root;
        let root = document.getElementById(ROOT_ID);

        if (!root) {
            root = document.createElement('div');
            root.id = ROOT_ID;
            root.className = 'overlay-root hidden';
            root.setAttribute('aria-hidden', 'true');
            root.innerHTML = `
                <section class="overlay-panel overlay-panel-size-md" role="dialog" aria-modal="true" aria-labelledby="${TITLE_ID}">
                    <header class="overlay-head">
                        <h3 id="${TITLE_ID}" class="overlay-title">חלון</h3>
                        <button type="button" class="overlay-close" data-overlay-close aria-label="Close overlay">×</button>
                    </header>
                    <div class="overlay-body" data-overlay-body></div>
                </section>
            `;
            document.body.appendChild(root);
        }

        state.root = root;
        state.panel = root.querySelector('.overlay-panel');
        state.body = root.querySelector('[data-overlay-body]');

        if (!root.dataset.overlayBound) {
            root.dataset.overlayBound = '1';

            root.addEventListener('click', (event) => {
                if (!state.active) return;
                if (!state.active.closeOnBackdrop) return;
                if (event.target !== root) return;
                closeOverlay('backdrop');
            });

            root.querySelectorAll('[data-overlay-close]').forEach((btn) => {
                btn.addEventListener('click', () => closeOverlay('button'));
            });
        }

        if (!state.escBound) {
            state.escBound = true;
            document.addEventListener('keydown', (event) => {
                if (event.key !== 'Escape') return;
                if (!state.active) return;
                closeOverlay('esc');
            });
        }

        return root;
    }

    function clearBody() {
        if (!state.body) return;
        while (state.body.firstChild) {
            state.body.removeChild(state.body.firstChild);
        }
    }

    function appendContent(content, context) {
        if (!state.body) return;

        let resolved = content;
        if (typeof content === 'function') {
            resolved = content(context);
        }

        if (resolved == null) return;

        if (resolved instanceof HTMLElement || resolved instanceof DocumentFragment) {
            state.body.appendChild(resolved);
            return;
        }

        if (typeof resolved === 'string') {
            state.body.innerHTML = resolved;
            return;
        }

        const textNode = document.createElement('p');
        textNode.textContent = String(resolved);
        state.body.appendChild(textNode);
    }

    function bindSwipeClose(panel) {
        if (!panel || panel.dataset.overlaySwipeBound === '1') return;
        panel.dataset.overlaySwipeBound = '1';

        let startY = 0;
        let currentY = 0;
        let tracking = false;

        panel.addEventListener('touchstart', (event) => {
            if (!state.active) return;
            if (!event.touches || event.touches.length !== 1) return;
            const topScrollable = panel.scrollTop <= 0;
            if (!topScrollable) {
                tracking = false;
                return;
            }
            tracking = true;
            startY = event.touches[0].clientY;
            currentY = startY;
            panel.style.transition = '';
        }, { passive: true });

        panel.addEventListener('touchmove', (event) => {
            if (!tracking || !state.active) return;
            if (!event.touches || event.touches.length !== 1) return;
            currentY = event.touches[0].clientY;
            const delta = currentY - startY;
            if (delta <= 0) {
                panel.style.transform = '';
                return;
            }
            panel.style.transition = 'none';
            panel.style.transform = `translateY(${Math.min(delta, 160)}px)`;
        }, { passive: true });

        function finishSwipe() {
            if (!tracking) return;
            const delta = currentY - startY;
            tracking = false;
            panel.style.transition = '';
            panel.style.transform = '';
            if (delta > 96 && state.active) {
                closeOverlay('swipe');
            }
        }

        panel.addEventListener('touchend', finishSwipe, { passive: true });
        panel.addEventListener('touchcancel', finishSwipe, { passive: true });
    }

    function closeOverlay(reason) {
        if (!state.active) return;
        const active = state.active;

        state.active = null;

        if (state.root) {
            state.root.classList.add('hidden');
            state.root.setAttribute('aria-hidden', 'true');
            state.root.setAttribute('data-overlay-type', '');
        }

        clearBody();
        unlockBodyScroll();

        if (state.panel) {
            state.panel.className = 'overlay-panel overlay-panel-size-md opened-content';
            window.setTimeout(() => {
                if (state.panel) state.panel.classList.remove('opened-content');
            }, 320);
        }

        try {
            if (typeof active.onClose === 'function') {
                active.onClose(reason || 'close');
            }
        } catch (error) {
            console.warn('Overlay onClose callback failed', error);
        }

        const restoreTarget = active.restoreFocusEl;
        if (restoreTarget && typeof restoreTarget.focus === 'function') {
            try {
                restoreTarget.focus({ preventScroll: true });
            } catch (_error) {
                restoreTarget.focus();
            }
        }
    }

    function openOverlay(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const root = ensureRoot();
        if (!root || !state.panel || !state.body) return null;

        if (state.active) {
            closeOverlay('replace');
        }

        const titleText = String(opts.title || 'חלון').trim() || 'חלון';
        const sizeClass = (() => {
            const size = String(opts.size || 'md').trim().toLowerCase();
            if (size === 'sm' || size === 'md' || size === 'lg' || size === 'xl') {
                return `overlay-panel-size-${size}`;
            }
            return 'overlay-panel-size-md';
        })();

        state.panel.className = `overlay-panel ${sizeClass} opened-content`;
        const titleEl = root.querySelector(`#${TITLE_ID}`);
        if (titleEl) titleEl.textContent = titleText;

        root.setAttribute('data-overlay-type', String(opts.type || 'generic').trim());
        root.classList.remove('hidden');
        root.setAttribute('aria-hidden', 'false');

        clearBody();
        appendContent(opts.content, { closeOverlay });

        state.active = {
            closeOnBackdrop: opts.closeOnBackdrop !== false,
            onClose: opts.onClose,
            restoreFocusEl: opts.restoreFocusEl || document.activeElement
        };

        lockBodyScroll();
        bindSwipeClose(state.panel);

        if (typeof opts.onOpen === 'function') {
            try {
                opts.onOpen();
            } catch (error) {
                console.warn('Overlay onOpen callback failed', error);
            }
        }

        window.requestAnimationFrame(() => {
            if (state.panel) state.panel.classList.remove('opened-content');
        });

        const closeBtn = root.querySelector('[data-overlay-close]');
        if (closeBtn && typeof closeBtn.focus === 'function') {
            try {
                closeBtn.focus({ preventScroll: true });
            } catch (_error) {
                closeBtn.focus();
            }
        }

        return {
            close: () => closeOverlay('api')
        };
    }

    function isOpen() {
        return Boolean(state.active);
    }

    global.MetaOverlayProvider = Object.freeze({
        openOverlay,
        closeOverlay,
        isOpen,
        ensureRoot
    });
})(typeof window !== 'undefined' ? window : globalThis);
