(function attachAlchemyGlobal() {
    if (window.__alchemyGlobalBooted) return;
    window.__alchemyGlobalBooted = true;

    var STORAGE_CONSENT = 'alchemy_audio_consent_v1';
    var STORAGE_MUTED = 'alchemy_audio_muted_v1';
    var STORAGE_COMPANION_MINIMIZED = 'alchemy_companion_minimized_v1';
    var MOBILE_BREAKPOINT = 780;
    var prefersReducedMotion = false;
    try {
        prefersReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {}

    var state = {
        root: null,
        canvas: null,
        ctx2d: null,
        burstLayer: null,
        companion: null,
        companionLabel: null,
        companionDismiss: null,
        companionToggle: null,
        muteBtn: null,
        consentEl: null,
        particles: [],
        particleRaf: 0,
        resizeTimer: 0,
        feedbackObserver: null,
        feedbackScanTimer: 0,
        teardownDone: false,
        eventCleanups: [],
        lastHoverAt: 0,
        lastFeedbackSignature: '',
        lastFeedbackAt: 0,
        audio: {
            consent: readStoredConsent(),
            muted: readStoredMuted(),
            ctx: null,
            masterGain: null,
            ambientGain: null,
            ambientStarted: false,
            ambientNodes: [],
            ambientStopTimer: 0,
            transientNodes: new Set(),
            cleanupTimers: new Set(),
            lastFxAtByType: {},
            fxLockUntil: 0
        },
        ui: {
            isMobileViewport: false,
            companionMinimized: readStoredCompanionMinimized(),
            automationSafe: detectAutomationMode()
        }
    };

    var FX_COOLDOWN_MS = {
        hover: 240,
        click: 130,
        success: 260,
        mastery: 360,
        almost: 220,
        whoosh: 200
    };
    var FX_GLOBAL_LOCK_MS = 32;
    var FEEDBACK_SCAN_DEBOUNCE_MS = 140;
    var MAX_TRANSIENT_AUDIO_NODES = 36;
    var AMBIENT_AUTO_STOP_MS = 22000;

    function safeStorageGet(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function safeStorageSet(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (e) {}
    }

    function readStoredConsent() {
        var raw = safeStorageGet(STORAGE_CONSENT);
        if (raw === 'yes') return 'yes';
        if (raw === 'no') return 'no';
        return '';
    }

    function readStoredMuted() {
        var raw = safeStorageGet(STORAGE_MUTED);
        return raw === '1';
    }

    function readStoredCompanionMinimized() {
        var raw = safeStorageGet(STORAGE_COMPANION_MINIMIZED);
        return raw === '1';
    }

    function createEl(tag, className) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        return el;
    }

    function detectAutomationMode() {
        try {
            if (window.__ALCHEMY_AUTOMATION_SAFE__) return true;
            if (navigator && navigator.webdriver) return true;
            if (document && document.documentElement && document.documentElement.hasAttribute('data-automation')) return true;
            var url = new URL(window.location.href);
            return url.searchParams.get('automation') === '1';
        } catch (e) {
            return false;
        }
    }

    function isInteractiveTarget(target) {
        if (!target || !target.closest) return false;
        var el = target.closest('button, [role="button"], a, .cc-breen-cell, .cc-option-btn, .cc-panel, .cc-stage-card, .cc-summary-block');
        if (!el) return false;
        if (el.classList && el.classList.contains('alchemy-mute')) return false;
        if (el.classList && el.classList.contains('alchemy-companion-toggle')) return false;
        if (el.classList && el.classList.contains('alchemy-companion__dismiss')) return false;
        if (el.classList && el.classList.contains('alchemy-consent__btn')) return false;
        return el;
    }

    function getRectCenter(el) {
        var rect = el.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + Math.min(rect.height / 2, 40),
            rect: rect
        };
    }

    function randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    function randomInt(min, max) {
        return Math.floor(randomRange(min, max + 1));
    }

    function rememberCleanupTimer(timerId) {
        if (!timerId) return;
        state.audio.cleanupTimers.add(timerId);
    }

    function clearCleanupTimer(timerId) {
        if (!timerId) return;
        clearTimeout(timerId);
        state.audio.cleanupTimers.delete(timerId);
    }

    function clearAllCleanupTimers() {
        state.audio.cleanupTimers.forEach(function (timerId) {
            clearTimeout(timerId);
        });
        state.audio.cleanupTimers.clear();
    }

    function registerTransientNode(node) {
        if (!node) return;
        state.audio.transientNodes.add(node);
    }

    function unregisterTransientNode(node) {
        if (!node) return;
        state.audio.transientNodes.delete(node);
    }

    function stopTransientAudio() {
        clearAllCleanupTimers();
        state.audio.transientNodes.forEach(function (node) {
            if (!node) return;
            if (typeof node.stop === 'function') {
                try { node.stop(); } catch (e) {}
            }
            if (typeof node.disconnect === 'function') {
                try { node.disconnect(); } catch (e2) {}
            }
        });
        state.audio.transientNodes.clear();
    }

    function shouldPlayFx(type) {
        var now = Date.now();
        if (now < Number(state.audio.fxLockUntil || 0)) return false;
        var lastByType = Number(state.audio.lastFxAtByType[type] || 0);
        var cooldown = Number(FX_COOLDOWN_MS[type] || 120);
        if (now - lastByType < cooldown) return false;
        state.audio.lastFxAtByType[type] = now;
        state.audio.fxLockUntil = now + FX_GLOBAL_LOCK_MS;
        return true;
    }

    function boot() {
        if (!document.body) return;
        document.body.classList.add('alchemy-active');
        document.body.classList.toggle('alchemy-automation-safe', !!state.ui.automationSafe);
        buildUi();
        bindEvents();
        syncCompanionLayout();
        setupParticles();
        updateMuteButton();
        applyAutomationUiState();
        observeFeedback();
        exposeApi();
    }

    function buildUi() {
        if (state.root) return;

        var root = createEl('div', 'alchemy-root');
        root.setAttribute('aria-hidden', 'true');

        var canvas = createEl('canvas', 'alchemy-particles');
        canvas.width = Math.max(1, window.innerWidth || 1);
        canvas.height = Math.max(1, window.innerHeight || 1);

        var burst = createEl('div', 'alchemy-burst-layer');

        var companion = createEl('button', 'alchemy-companion');
        companion.type = 'button';
        companion.setAttribute('aria-label', 'עוזר צליל');
        companion.innerHTML = [
            '<span class="alchemy-companion__dismiss" title="Hide companion">\u00d7</span>',
            '<div class="alchemy-companion__label">Alchemy companion</div>',
            '<div class="alchemy-companion__face">',
            '  <div class="alchemy-companion__eyes"><span></span><span></span></div>',
            '  <div class="alchemy-companion__mouth"></div>',
            '</div>',
            '<div class="alchemy-companion__hands"></div>'
        ].join('');
        companion.style.pointerEvents = 'auto';

        var muteBtn = createEl('button', 'alchemy-mute');
        muteBtn.type = 'button';
        muteBtn.setAttribute('aria-label', 'הפעלת או השתקת צלילים');
        muteBtn.style.pointerEvents = 'auto';

        var companionToggle = createEl('button', 'alchemy-companion-toggle');
        companionToggle.type = 'button';
        companionToggle.setAttribute('aria-label', 'הצגת עוזר הצליל');
        companionToggle.innerHTML = '<span aria-hidden="true">\u2728</span>';
        companionToggle.hidden = true;
        companionToggle.style.pointerEvents = 'auto';

        var consent = createEl('div', 'alchemy-consent');
        consent.hidden = true;
        consent.innerHTML = [
            '<div class="alchemy-consent__card" role="dialog" aria-modal="true" aria-label="הפעלת צלילים">',
            '  <div class="alchemy-consent__title"><span class="alchemy-consent__title-dot" aria-hidden="true"></span><span>להפעיל צלילים עדינים לאימון?</span></div>',
            '  <div class="alchemy-consent__text">שכבת רקע שקטה ועוד צלילים קטנים ללחיצות, הצלחה וכמעט. אפשר להשתיק בכל רגע.</div>',
            '  <div class="alchemy-consent__actions">',
            '    <button type="button" class="alchemy-consent__btn" data-alchemy-consent="no">לא עכשיו</button>',
            '    <button type="button" class="alchemy-consent__btn alchemy-consent__btn--primary" data-alchemy-consent="yes">הפעל צלילים</button>',
            '  </div>',
            '</div>'
        ].join('');

        root.appendChild(canvas);
        root.appendChild(burst);
        root.appendChild(consent);
        document.body.appendChild(root);
        document.body.appendChild(muteBtn);
        document.body.appendChild(companion);
        document.body.appendChild(companionToggle);

        state.root = root;
        state.canvas = canvas;
        state.ctx2d = canvas.getContext('2d');
        state.burstLayer = burst;
        state.companion = companion;
        state.companionLabel = companion.querySelector('.alchemy-companion__label');
        state.companionDismiss = companion.querySelector('.alchemy-companion__dismiss');
        state.companionToggle = companionToggle;
        state.muteBtn = muteBtn;
        state.consentEl = consent;

        setCompanionMood('idle');
        announceCompanion('מצב הצליל מוכן');
    }

    function bindEvents() {
        function bind(target, eventName, handler, options) {
            if (!target || !handler) return;
            target.addEventListener(eventName, handler, options);
            state.eventCleanups.push(function () {
                try { target.removeEventListener(eventName, handler, options); } catch (e) {}
            });
        }

        bind(window, 'resize', onResize, { passive: true });

        bind(document, 'pointerover', function (event) {
            if (state.ui.automationSafe) return;
            var el = isInteractiveTarget(event.target);
            if (!el) return;
            var now = Date.now();
            if (now - state.lastHoverAt < 180) return;
            state.lastHoverAt = now;
            var center = getRectCenter(el);
            if (!prefersReducedMotion) spawnSparks(center.x, center.y, 4, 14);
            playFx('hover');
        }, true);

        bind(document, 'click', function (event) {
            if (state.ui.automationSafe) return;
            if (event.target && event.target.closest && event.target.closest('.alchemy-consent, .alchemy-mute, .alchemy-companion, .alchemy-companion-toggle')) {
                return;
            }
            var x = Number.isFinite(event.clientX) ? event.clientX : (window.innerWidth / 2);
            var y = Number.isFinite(event.clientY) ? event.clientY : (window.innerHeight / 2);
            rippleAt(x, y);
            if (!prefersReducedMotion) spawnSparks(x, y, 8, 24);
            playFx('click');
        }, true);

        bind(document, 'alchemy:fx', function (event) {
            var detail = (event && event.detail) || {};
            handleAlchemyEvent(detail.type || 'success', detail);
        });

        if (state.companion) {
            bind(state.companion, 'click', function () {
                if (state.audio.consent !== 'yes') {
                    showConsent(true);
                    setCompanionMood('wow', 1200);
                    announceCompanion('להפעיל צלילים?');
                    return;
                }
                if (state.audio.muted) {
                    toggleMute(false);
                    announceCompanion('הצליל פעיל');
                    return;
                }
                maybeStartAmbient({ durationMs: 14000 });
                playFx('success');
                celebrateAt(window.innerWidth - 72, window.innerHeight - 96, 'success');
                setCompanionMood('dance', 1800);
                announceCompanion('יופי');
            });
        }

        if (state.companionDismiss) {
            bind(state.companionDismiss, 'click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (!state.ui.isMobileViewport) return;
                setCompanionMinimized(true, true);
                announceCompanion('העוזר הוסתר');
            });
        }

        if (state.companionToggle) {
            bind(state.companionToggle, 'click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                setCompanionMinimized(false, true);
                setCompanionMood('happy', 1000);
                announceCompanion('העוזר חזר');
                playFx('whoosh');
            });
        }

        if (state.muteBtn) {
            bind(state.muteBtn, 'click', function () {
                if (state.audio.consent !== 'yes') {
                    showConsent(true);
                    return;
                }
                toggleMute(!state.audio.muted);
                playFx('click');
            });
        }

        if (state.consentEl) {
            bind(state.consentEl, 'click', function (event) {
                var btn = event.target && event.target.closest ? event.target.closest('[data-alchemy-consent]') : null;
                if (!btn) return;
                var answer = btn.getAttribute('data-alchemy-consent') === 'yes' ? 'yes' : 'no';
                state.audio.consent = answer;
                safeStorageSet(STORAGE_CONSENT, answer);
                if (answer === 'yes') {
                    state.audio.muted = false;
                    safeStorageSet(STORAGE_MUTED, '0');
                    ensureAudioReady(true);
                    playFx('success');
                    announceCompanion('הצליל הופעל');
                    setCompanionMood('happy', 1400);
                } else {
                    state.audio.muted = true;
                    safeStorageSet(STORAGE_MUTED, '1');
                    stopAmbient(true);
                    stopTransientAudio();
                    announceCompanion('מצב שקט');
                    setCompanionMood('idle', 800);
                }
                updateMuteButton();
                showConsent(false);
            });
        }

        bind(document, 'visibilitychange', function () {
            if (document.hidden) {
                stopTransientAudio();
                stopAmbient(false);
                return;
            }
            if (!state.audio.muted && state.audio.consent === 'yes' && state.audio.ambientStarted) {
                fadeAmbient(0.08, 0.35);
            }
        });

        bind(window, 'blur', function () {
            stopTransientAudio();
        });

        bind(window, 'pagehide', teardown);
        bind(window, 'beforeunload', teardown);
    }

    function onResize() {
        syncCompanionLayout();
        if (state.resizeTimer) clearTimeout(state.resizeTimer);
        state.resizeTimer = setTimeout(function () {
            if (!state.canvas) return;
            state.canvas.width = Math.max(1, window.innerWidth || 1);
            state.canvas.height = Math.max(1, window.innerHeight || 1);
            seedParticles(true);
        }, 100);
    }

    function isMobileViewport() {
        var width = Math.max(
            Number(window.innerWidth || 0),
            Number((document.documentElement && document.documentElement.clientWidth) || 0)
        );
        return width > 0 && width <= MOBILE_BREAKPOINT;
    }

    function syncCompanionLayout() {
        if (!document.body) return;
        state.ui.isMobileViewport = isMobileViewport();
        document.body.classList.toggle('alchemy-mobile-ui', state.ui.isMobileViewport);
        setCompanionMinimized(state.ui.companionMinimized, false);
        updateMuteButton();
        applyAutomationUiState();
    }

    function applyAutomationUiState() {
        if (!document.body) return;
        var active = !!state.ui.automationSafe;
        document.body.classList.toggle('alchemy-automation-safe', active);
        if (!active) return;
        if (state.consentEl) {
            state.consentEl.hidden = true;
            state.consentEl.setAttribute('aria-hidden', 'true');
        }
        if (state.root) {
            state.root.setAttribute('aria-hidden', 'true');
        }
        if (state.companion) {
            state.companion.hidden = true;
            state.companion.setAttribute('aria-hidden', 'true');
        }
        if (state.companionToggle) {
            state.companionToggle.hidden = true;
            state.companionToggle.setAttribute('aria-hidden', 'true');
        }
        if (state.muteBtn) {
            state.muteBtn.hidden = true;
            state.muteBtn.setAttribute('aria-hidden', 'true');
        }
    }

    function setCompanionMinimized(nextMinimized, persist) {
        state.ui.companionMinimized = !!nextMinimized;
        if (persist) {
            safeStorageSet(STORAGE_COMPANION_MINIMIZED, state.ui.companionMinimized ? '1' : '0');
        }
        var activeMinimized = !!state.ui.companionMinimized && !!state.ui.isMobileViewport;
        if (document.body) {
            document.body.classList.toggle('alchemy-companion-minimized', activeMinimized);
        }
        if (state.companionToggle) {
            state.companionToggle.hidden = !activeMinimized;
            state.companionToggle.setAttribute('aria-hidden', activeMinimized ? 'false' : 'true');
        }
        if (state.companion) {
            if (activeMinimized) {
                state.companion.setAttribute('aria-hidden', 'true');
                try { state.companion.blur(); } catch (e) {}
            } else {
                state.companion.removeAttribute('aria-hidden');
            }
        }
        if (state.muteBtn) {
            if (activeMinimized) {
                state.muteBtn.setAttribute('aria-hidden', 'true');
            } else {
                state.muteBtn.removeAttribute('aria-hidden');
            }
        }
    }

    function showConsent(show) {
        if (!state.consentEl) return;
        if (state.ui.automationSafe) {
            state.consentEl.hidden = true;
            return;
        }
        state.consentEl.hidden = !show;
        if (show) announceCompanion('להפעיל צלילים?');
    }

    function updateMuteButton() {
        if (!state.muteBtn) return;
        var muted = !!state.audio.muted || state.audio.consent !== 'yes';
        var compactMobileLabel = !!state.ui.isMobileViewport;
        state.muteBtn.setAttribute('data-muted', muted ? 'true' : 'false');
        if (state.audio.consent !== 'yes') {
            state.muteBtn.textContent = compactMobileLabel ? '\ud83d\udd09?' : 'צליל: שאל';
        } else {
            state.muteBtn.textContent = compactMobileLabel ? (muted ? '\ud83d\udd07' : '\ud83d\udd0a') : (muted ? 'צליל: כבוי' : 'צליל: פעיל');
        }
        state.muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
        state.muteBtn.setAttribute('aria-label', muted ? 'צליל כבוי' : 'צליל פעיל');
    }

    function toggleMute(nextMuted) {
        state.audio.muted = !!nextMuted;
        safeStorageSet(STORAGE_MUTED, state.audio.muted ? '1' : '0');
        ensureAudioReady(false);
        if (state.audio.masterGain && state.audio.ctx) {
            var now = state.audio.ctx.currentTime;
            var target = state.audio.muted ? 0.00001 : 0.22;
            state.audio.masterGain.gain.cancelScheduledValues(now);
            state.audio.masterGain.gain.setValueAtTime(state.audio.masterGain.gain.value || 0.00001, now);
            state.audio.masterGain.gain.exponentialRampToValueAtTime(target, now + 0.08);
        }
        if (state.audio.muted) {
            stopAmbient(true);
            stopTransientAudio();
        } else if (state.audio.ambientStarted) {
            fadeAmbient(0.08, 0.22);
            scheduleAmbientStop(AMBIENT_AUTO_STOP_MS);
        }
        updateMuteButton();
        announceCompanion(state.audio.muted ? 'הצליל כבוי' : 'הצליל פעיל');
        setCompanionMood(state.audio.muted ? 'idle' : 'happy', 900);
    }

    function ensureAudioReady(forceResume) {
        if (state.audio.consent !== 'yes') return false;
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return false;
        if (!state.audio.ctx) {
            try {
                state.audio.ctx = new AudioCtx();
                state.audio.masterGain = state.audio.ctx.createGain();
                state.audio.masterGain.gain.value = state.audio.muted ? 0.00001 : 0.22;
                state.audio.masterGain.connect(state.audio.ctx.destination);
                state.audio.ambientGain = state.audio.ctx.createGain();
                state.audio.ambientGain.gain.value = 0.00001;
                state.audio.ambientGain.connect(state.audio.masterGain);
            } catch (e) {
                return false;
            }
        }
        if (forceResume && state.audio.ctx.state === 'suspended') {
            try { state.audio.ctx.resume(); } catch (e) {}
        }
        return true;
    }

    function clearAmbientStopTimer() {
        if (!state.audio.ambientStopTimer) return;
        clearTimeout(state.audio.ambientStopTimer);
        state.audio.ambientStopTimer = 0;
    }

    function scheduleAmbientStop(durationMs) {
        clearAmbientStopTimer();
        var delay = Math.max(2500, Number(durationMs) || AMBIENT_AUTO_STOP_MS);
        state.audio.ambientStopTimer = setTimeout(function () {
            state.audio.ambientStopTimer = 0;
            stopAmbient(false);
        }, delay);
    }

    function shutdownAmbientNodes() {
        if (!state.audio.ambientNodes || !state.audio.ambientNodes.length) {
            state.audio.ambientStarted = false;
            state.audio.ambientNodes = [];
            return;
        }
        state.audio.ambientNodes.forEach(function (node) {
            if (!node) return;
            if (typeof node.stop === 'function') {
                try { node.stop(); } catch (e) {}
            }
            if (typeof node.disconnect === 'function') {
                try { node.disconnect(); } catch (e2) {}
            }
        });
        state.audio.ambientNodes = [];
        state.audio.ambientStarted = false;
    }

    function stopAmbient(hardStop) {
        clearAmbientStopTimer();
        if (!state.audio.ambientStarted) return;
        if (hardStop) {
            shutdownAmbientNodes();
            return;
        }
        fadeAmbient(0.00001, 0.16);
        var stopTimer = setTimeout(function () {
            state.audio.cleanupTimers.delete(stopTimer);
            shutdownAmbientNodes();
        }, 240);
        rememberCleanupTimer(stopTimer);
    }

    function maybeStartAmbient(options) {
        var opts = options || {};
        if (prefersReducedMotion) return;
        if (state.audio.consent !== 'yes') return;
        if (state.audio.muted) return;
        if (!ensureAudioReady(true)) return;
        if (state.audio.ambientStarted) {
            fadeAmbient(0.08, 0.24);
            scheduleAmbientStop(opts.durationMs);
            return;
        }
        var ctx = state.audio.ctx;
        var ambientGain = state.audio.ambientGain;
        if (!ctx || !ambientGain) return;

        var pad1 = ctx.createOscillator();
        pad1.type = 'sine';
        pad1.frequency.value = 174.61;
        var g1 = ctx.createGain();
        g1.gain.value = 0.03;
        pad1.connect(g1).connect(ambientGain);

        var pad2 = ctx.createOscillator();
        pad2.type = 'triangle';
        pad2.frequency.value = 261.63;
        var g2 = ctx.createGain();
        g2.gain.value = 0.018;
        pad2.connect(g2).connect(ambientGain);

        var shimmer = ctx.createOscillator();
        shimmer.type = 'sine';
        shimmer.frequency.value = 523.25;
        var g3 = ctx.createGain();
        g3.gain.value = 0.004;
        shimmer.connect(g3).connect(ambientGain);

        var lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.07;
        var lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.012;
        lfo.connect(lfoGain);
        lfoGain.connect(g1.gain);

        var lfo2 = ctx.createOscillator();
        lfo2.type = 'sine';
        lfo2.frequency.value = 0.11;
        var lfo2Gain = ctx.createGain();
        lfo2Gain.gain.value = 0.003;
        lfo2.connect(lfo2Gain);
        lfo2Gain.connect(g3.gain);

        var now = ctx.currentTime;
        pad1.start(now);
        pad2.start(now);
        shimmer.start(now);
        lfo.start(now);
        lfo2.start(now);
        fadeAmbient(0.08, 0.55);

        state.audio.ambientStarted = true;
        state.audio.ambientNodes = [pad1, g1, pad2, g2, shimmer, g3, lfo, lfoGain, lfo2, lfo2Gain];
        scheduleAmbientStop(opts.durationMs);
    }

    function fadeAmbient(target, seconds) {
        if (!state.audio.ctx || !state.audio.ambientGain) return;
        var now = state.audio.ctx.currentTime;
        var gain = state.audio.ambientGain.gain;
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(gain.value || 0.00001, now);
        gain.exponentialRampToValueAtTime(Math.max(0.00001, target), now + Math.max(0.05, seconds || 0.1));
    }

    function playFx(type) {
        if (state.audio.consent !== 'yes') return;
        if (state.audio.muted) return;
        if (!shouldPlayFx(type)) return;
        if (!ensureAudioReady(true)) return;
        var ctx = state.audio.ctx;
        if (!ctx || !state.audio.masterGain) return;
        if (ctx.state === 'suspended') {
            try { ctx.resume(); } catch (e) {}
        }
        if (state.audio.transientNodes.size > MAX_TRANSIENT_AUDIO_NODES) {
            stopTransientAudio();
        }
        if (type === 'hover') return playHoverChime(ctx);
        if (type === 'click') return playClickChime(ctx);
        if (type === 'success') return playSuccessFx(ctx);
        if (type === 'mastery') return playMasteryFx(ctx);
        if (type === 'almost') return playAlmostFx(ctx);
        if (type === 'whoosh') return playWhooshFx(ctx);
    }

    function tone(ctx, opts) {
        var now = ctx.currentTime;
        var start = now + (opts.delay || 0);
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        var biquad = null;
        osc.type = opts.type || 'sine';
        osc.frequency.setValueAtTime(opts.from || 440, start);
        if (opts.to && opts.to !== opts.from) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), start + (opts.dur || 0.2));
        }
        if (opts.filter) {
            biquad = ctx.createBiquadFilter();
            biquad.type = opts.filter.type || 'lowpass';
            biquad.frequency.value = opts.filter.freq || 1200;
            osc.connect(biquad);
            biquad.connect(gain);
        } else {
            osc.connect(gain);
        }
        gain.connect(state.audio.masterGain);
        var peak = opts.amp || 0.12;
        var dur = opts.dur || 0.18;
        gain.gain.setValueAtTime(0.00001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.00002, peak), start + Math.min(0.03, dur * 0.25));
        gain.gain.exponentialRampToValueAtTime(0.00001, start + dur);
        registerTransientNode(osc);
        registerTransientNode(gain);
        if (biquad) registerTransientNode(biquad);

        var cleaned = false;
        var cleanupTimer = 0;
        var cleanup = function () {
            if (cleaned) return;
            cleaned = true;
            clearCleanupTimer(cleanupTimer);
            try { osc.disconnect(); } catch (e) {}
            try { gain.disconnect(); } catch (e) {}
            if (biquad) {
                try { biquad.disconnect(); } catch (e2) {}
            }
            unregisterTransientNode(osc);
            unregisterTransientNode(gain);
            if (biquad) unregisterTransientNode(biquad);
        };

        cleanupTimer = setTimeout(cleanup, Math.max(220, Math.round(((opts.delay || 0) + dur + 0.32) * 1000)));
        rememberCleanupTimer(cleanupTimer);
        osc.onended = cleanup;

        try {
            osc.start(start);
            osc.stop(start + dur + 0.02);
        } catch (e3) {
            cleanup();
        }
    }

    function noise(ctx, opts) {
        var duration = opts.dur || 0.2;
        var sampleRate = ctx.sampleRate;
        var buffer = ctx.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
        var data = buffer.getChannelData(0);
        var i;
        for (i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.18;
        var src = ctx.createBufferSource();
        var filter = ctx.createBiquadFilter();
        filter.type = opts.filterType || 'bandpass';
        filter.frequency.value = opts.freq || 900;
        filter.Q.value = opts.q || 1.2;
        var gain = ctx.createGain();
        var now = ctx.currentTime + (opts.delay || 0);
        gain.gain.setValueAtTime(0.00001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.00002, opts.amp || 0.04), now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.00001, now + duration);
        src.buffer = buffer;
        src.connect(filter).connect(gain).connect(state.audio.masterGain);
        registerTransientNode(src);
        registerTransientNode(filter);
        registerTransientNode(gain);

        var cleaned = false;
        var cleanupTimer = 0;
        var cleanup = function () {
            if (cleaned) return;
            cleaned = true;
            clearCleanupTimer(cleanupTimer);
            try { src.disconnect(); } catch (e) {}
            try { filter.disconnect(); } catch (e2) {}
            try { gain.disconnect(); } catch (e3) {}
            unregisterTransientNode(src);
            unregisterTransientNode(filter);
            unregisterTransientNode(gain);
        };
        cleanupTimer = setTimeout(cleanup, Math.max(240, Math.round(((opts.delay || 0) + duration + 0.34) * 1000)));
        rememberCleanupTimer(cleanupTimer);
        src.onended = cleanup;

        try {
            src.start(now);
            src.stop(now + duration + 0.01);
        } catch (e4) {
            cleanup();
        }
    }

    function playHoverChime(ctx) {
        tone(ctx, { type: 'sine', from: 880, to: 988, dur: 0.07, amp: 0.018 });
    }

    function playClickChime(ctx) {
        tone(ctx, { type: 'triangle', from: 520, to: 720, dur: 0.09, amp: 0.03 });
        tone(ctx, { type: 'sine', from: 740, to: 660, dur: 0.12, amp: 0.024, delay: 0.012 });
    }

    function playSuccessFx(ctx) {
        tone(ctx, { type: 'sine', from: 660, to: 880, dur: 0.14, amp: 0.045 });
        tone(ctx, { type: 'triangle', from: 990, to: 1320, dur: 0.18, amp: 0.035, delay: 0.05 });
        tone(ctx, { type: 'sine', from: 1320, to: 1760, dur: 0.2, amp: 0.028, delay: 0.11 });
    }

    function playMasteryFx(ctx) {
        tone(ctx, { type: 'sine', from: 196, to: 160, dur: 0.36, amp: 0.065 });
        tone(ctx, { type: 'triangle', from: 392, to: 784, dur: 0.42, amp: 0.05, delay: 0.1 });
        tone(ctx, { type: 'sine', from: 784, to: 1568, dur: 0.35, amp: 0.036, delay: 0.24 });
        noise(ctx, { dur: 0.24, amp: 0.018, freq: 1200, filterType: 'highpass', delay: 0.02 });
    }

    function playAlmostFx(ctx) {
        tone(ctx, { type: 'triangle', from: 540, to: 420, dur: 0.16, amp: 0.03 });
        noise(ctx, { dur: 0.18, amp: 0.02, freq: 760, filterType: 'bandpass', q: 0.9 });
    }

    function playWhooshFx(ctx) {
        noise(ctx, { dur: 0.2, amp: 0.03, freq: 900, filterType: 'bandpass', q: 0.7 });
    }

    function setupParticles() {
        if (!state.canvas || !state.ctx2d) return;
        seedParticles(true);
        if (prefersReducedMotion) {
            drawParticlesFrame();
            return;
        }
        if (state.particleRaf) cancelAnimationFrame(state.particleRaf);
        var frame = function () {
            drawParticlesFrame();
            state.particleRaf = requestAnimationFrame(frame);
        };
        frame();
    }

    function seedParticles(resetPositions) {
        if (!state.canvas) return;
        var width = Math.max(1, state.canvas.width || window.innerWidth || 1);
        var height = Math.max(1, state.canvas.height || window.innerHeight || 1);
        var targetCount = Math.max(22, Math.min(58, Math.round((width * height) / 38000)));
        if (resetPositions || !state.particles.length) state.particles = [];
        while (state.particles.length < targetCount) {
            state.particles.push({
                x: randomRange(0, width),
                y: randomRange(0, height),
                vx: randomRange(-0.22, 0.22),
                vy: randomRange(-0.18, 0.18),
                r: randomRange(1.1, 2.6),
                hue: ['purple', 'cyan', 'gold'][randomInt(0, 2)],
                tw: randomRange(0, Math.PI * 2)
            });
        }
        if (state.particles.length > targetCount) state.particles.length = targetCount;
        if (resetPositions) {
            var i;
            for (i = 0; i < state.particles.length; i++) {
                state.particles[i].x = randomRange(0, width);
                state.particles[i].y = randomRange(0, height);
            }
        }
    }

    function particleColor(hue, alpha) {
        if (hue === 'cyan') return 'rgba(34, 211, 238, ' + alpha + ')';
        if (hue === 'gold') return 'rgba(251, 191, 36, ' + alpha + ')';
        return 'rgba(129, 140, 248, ' + alpha + ')';
    }

    function drawParticlesFrame() {
        var ctx = state.ctx2d;
        var canvas = state.canvas;
        if (!ctx || !canvas) return;
        var width = canvas.width;
        var height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';

        seedParticles(false);

        var i;
        for (i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];
            if (!prefersReducedMotion) {
                p.x += p.vx;
                p.y += p.vy;
                p.tw += 0.02;
                if (p.x < -10) p.x = width + 10;
                if (p.x > width + 10) p.x = -10;
                if (p.y < -10) p.y = height + 10;
                if (p.y > height + 10) p.y = -10;
            }
        }

        for (i = 0; i < state.particles.length; i++) {
            var a = state.particles[i];
            var j;
            for (j = i + 1; j < state.particles.length; j++) {
                var b = state.particles[j];
                var dx = a.x - b.x;
                var dy = a.y - b.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 132) continue;
                var alpha = (1 - dist / 132) * 0.14;
                ctx.strokeStyle = dist < 74 ? 'rgba(99,102,241,' + alpha + ')' : 'rgba(34,211,238,' + (alpha * 0.85) + ')';
                ctx.lineWidth = dist < 74 ? 1 : 0.6;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
        }

        for (i = 0; i < state.particles.length; i++) {
            var p2 = state.particles[i];
            var glow = 0.5 + (Math.sin(p2.tw) + 1) * 0.25;
            ctx.fillStyle = particleColor(p2.hue, Math.max(0.18, glow * 0.5));
            ctx.beginPath();
            ctx.arc(p2.x, p2.y, p2.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function rippleAt(x, y) {
        if (prefersReducedMotion) return;
        var el = createEl('div', 'alchemy-ripple');
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        document.body.appendChild(el);
        setTimeout(function () {
            if (el && el.parentNode) el.parentNode.removeChild(el);
        }, 760);
    }

    function clearTransientBursts() {
        try {
            var nodes = document.querySelectorAll('.alchemy-spark, .alchemy-confetti');
            nodes.forEach(function (node) {
                if (node && node.parentNode) node.parentNode.removeChild(node);
            });
        } catch (_error) {}
    }

    function spawnSparks(x, y, count, radius) {
        if (prefersReducedMotion) return;
        var i;
        for (i = 0; i < count; i++) {
            var s = createEl('div', 'alchemy-spark');
            var angle = randomRange(0, Math.PI * 2);
            var dist = randomRange(radius * 0.35, radius);
            s.style.left = x + 'px';
            s.style.top = y + 'px';
            s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
            s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
            document.body.appendChild(s);
            (function (node) {
                setTimeout(function () {
                    if (node && node.parentNode) node.parentNode.removeChild(node);
                }, 620);
            })(s);
        }
    }

    function celebrateAt(x, y, tier) {
        if (prefersReducedMotion) return;
        clearTransientBursts();
        var count = tier === 'mastery' ? 40 : 24;
        var colors = ['#fbbf24', '#06b6d4', '#818cf8', '#ffffff', '#f59e0b'];
        var i;
        for (i = 0; i < count; i++) {
            var c = createEl('div', 'alchemy-confetti');
            if (Math.random() > 0.78) c.classList.add('is-star');
            c.style.background = colors[randomInt(0, colors.length - 1)];
            c.style.left = x + 'px';
            c.style.top = y + 'px';
            c.style.setProperty('--tx', randomRange(-120, 120) + 'px');
            c.style.setProperty('--ty', randomRange(70, tier === 'mastery' ? 220 : 170) + 'px');
            c.style.setProperty('--rot', randomRange(120, 780).toFixed(0) + 'deg');
            c.style.setProperty('--dur', (tier === 'mastery' ? randomRange(900, 1700) : randomRange(700, 1300)).toFixed(0) + 'ms');
            document.body.appendChild(c);
            (function (node) {
                setTimeout(function () {
                    if (node && node.parentNode) node.parentNode.removeChild(node);
                }, 1350);
            })(c);
        }
        spawnSparks(x, y, tier === 'mastery' ? 20 : 12, tier === 'mastery' ? 52 : 34);
    }

    function setCompanionMood(mood, durationMs) {
        if (!state.companion) return;
        state.companion.classList.remove('is-happy', 'is-wow', 'is-dance', 'is-almost');
        if (mood && mood !== 'idle') state.companion.classList.add('is-' + mood);
        if (state._companionMoodTimer) clearTimeout(state._companionMoodTimer);
        if (durationMs) {
            state._companionMoodTimer = setTimeout(function () {
                if (!state.companion) return;
                state.companion.classList.remove('is-happy', 'is-wow', 'is-dance', 'is-almost');
            }, durationMs);
        }
    }

    function announceCompanion(text) {
        if (!state.companionLabel) return;
        state.companionLabel.textContent = text || 'Alchemy companion';
    }

    function handleAlchemyEvent(type, detail) {
        var x = detail && Number.isFinite(detail.x) ? detail.x : (window.innerWidth * 0.5);
        var y = detail && Number.isFinite(detail.y) ? detail.y : (window.innerHeight * 0.34);

        if (type === 'success') {
            celebrateAt(x, y, 'success');
            setCompanionMood('dance', 1900);
            announceCompanion((detail && detail.text) || 'Great!');
            playFx('success');
            return;
        }

        if (type === 'mastery') {
            celebrateAt(x, y, 'mastery');
            setCompanionMood('dance', 2600);
            announceCompanion((detail && detail.text) || 'Mastery!');
            playFx('mastery');
            return;
        }

        if (type === 'almost') {
            spawnSparks(x, y, 10, 26);
            setCompanionMood('almost', 1100);
            announceCompanion((detail && detail.text) || 'Almost');
            playFx('almost');
            return;
        }

        if (type === 'whoosh') {
            spawnSparks(x, y, 8, 18);
            setCompanionMood('wow', 900);
            announceCompanion((detail && detail.text) || 'Try this');
            playFx('whoosh');
            return;
        }

        if (type === 'hover') {
            playFx('hover');
            return;
        }

        if (type === 'click') {
            rippleAt(x, y);
            playFx('click');
        }
    }

    function scheduleFeedbackScan() {
        if (state.feedbackScanTimer || state.teardownDone) return;
        state.feedbackScanTimer = setTimeout(function () {
            state.feedbackScanTimer = 0;
            detectFeedbackSignals();
        }, FEEDBACK_SCAN_DEBOUNCE_MS);
    }

    function observeFeedback() {
        if (!window.MutationObserver || !document.body) return;
        if (state.feedbackObserver) {
            try { state.feedbackObserver.disconnect(); } catch (e) {}
        }
        state.feedbackObserver = new MutationObserver(function () {
            scheduleFeedbackScan();
        });
        state.feedbackObserver.observe(document.body, { childList: true, subtree: true });
        scheduleFeedbackScan();
    }

    function detectFeedbackSignals() {
        if (state.teardownDone || document.hidden) return;
        var now = Date.now();
        var candidates = document.querySelectorAll('.cc-feedback, .cc-report, [data-tone], .cc-top-chip[data-tone], .cc-stat-chip[data-tone]');
        var limit = Math.min(60, candidates.length);
        var i;
        for (i = 0; i < limit; i++) {
            var el = candidates[i];
            if (!el || !el.textContent) continue;
            if (el.closest && el.closest('[data-alchemy-skip="1"]')) continue;
            var text = String(el.textContent || '').trim();
            if (!text) continue;
            var sig = (el.className || '') + '|' + text.slice(0, 120);
            if (sig === state.lastFeedbackSignature && now - state.lastFeedbackAt < 900) continue;

            var lower = text.toLowerCase();
            var tone = el.getAttribute && String(el.getAttribute('data-tone') || '').toLowerCase();
            var handled = false;
            if ((el.className || '').indexOf('cc-report') !== -1 || /mastery|דו.?ח סשן|סיכום/.test(text)) {
                emitFx('mastery', { text: 'Mastery moment' });
                handled = true;
            } else if (tone === 'success' || /מעולה|נכון|הושלם|הצלחה|great|success/.test(lower)) {
                emitFx('success', { text: 'Nice!' });
                handled = true;
            } else if (tone === 'warn' || tone === 'danger' || /כמעט|לא נכון|לא מדויק|try again|almost/.test(lower)) {
                emitFx('almost', { text: 'Almost' });
                handled = true;
            }

            if (handled) {
                state.lastFeedbackSignature = sig;
                state.lastFeedbackAt = now;
                return;
            }
        }
    }

    function emitFx(type, detail) {
        handleAlchemyEvent(type, detail || {});
    }

    function teardown() {
        if (state.teardownDone) return;
        state.teardownDone = true;

        if (state.particleRaf) {
            cancelAnimationFrame(state.particleRaf);
            state.particleRaf = 0;
        }
        if (state.resizeTimer) {
            clearTimeout(state.resizeTimer);
            state.resizeTimer = 0;
        }
        if (state.feedbackScanTimer) {
            clearTimeout(state.feedbackScanTimer);
            state.feedbackScanTimer = 0;
        }
        if (state._companionMoodTimer) {
            clearTimeout(state._companionMoodTimer);
            state._companionMoodTimer = 0;
        }

        clearAmbientStopTimer();
        stopTransientAudio();
        stopAmbient(true);

        if (state.feedbackObserver) {
            try { state.feedbackObserver.disconnect(); } catch (e) {}
            state.feedbackObserver = null;
        }

        while (state.eventCleanups.length) {
            var off = state.eventCleanups.pop();
            try { off(); } catch (e2) {}
        }

        if (state.audio.ctx && typeof state.audio.ctx.suspend === 'function') {
            try { state.audio.ctx.suspend(); } catch (e3) {}
        }
    }

    function exposeApi() {
        window.alchemyFx = {
            emit: function (type, detail) {
                emitFx(type, detail || {});
            },
            success: function (detail) { emitFx('success', detail || {}); },
            mastery: function (detail) { emitFx('mastery', detail || {}); },
            almost: function (detail) { emitFx('almost', detail || {}); },
            whoosh: function (detail) { emitFx('whoosh', detail || {}); },
            click: function (detail) { emitFx('click', detail || {}); },
            hover: function (detail) { emitFx('hover', detail || {}); },
            showConsent: function () { showConsent(true); },
            minimizeCompanion: function () { setCompanionMinimized(true, true); },
            restoreCompanion: function () { setCompanionMinimized(false, true); }
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
