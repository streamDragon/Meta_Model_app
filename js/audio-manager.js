(function initUnzipAudioManager(global) {
  'use strict';

  if (global.UnzipAudioManager) return;

  var SOUND_DEFS = Object.freeze({
    tap: {
      cooldownMs: 250,
      tones: [
        { frequency: 540, duration: 0.05, delay: 0, type: 'sine', volume: 0.022 },
        { frequency: 760, duration: 0.04, delay: 0.03, type: 'triangle', volume: 0.015 }
      ]
    },
    success: {
      cooldownMs: 280,
      tones: [
        { frequency: 620, duration: 0.07, delay: 0, type: 'triangle', volume: 0.03 },
        { frequency: 820, duration: 0.08, delay: 0.05, type: 'triangle', volume: 0.03 },
        { frequency: 1040, duration: 0.09, delay: 0.11, type: 'sine', volume: 0.018 }
      ]
    },
    error: {
      cooldownMs: 300,
      tones: [
        { frequency: 220, duration: 0.11, delay: 0, type: 'sawtooth', volume: 0.028 },
        { frequency: 176, duration: 0.1, delay: 0.06, type: 'square', volume: 0.018 }
      ]
    },
    open: {
      cooldownMs: 250,
      tones: [
        { frequency: 480, duration: 0.06, delay: 0, type: 'triangle', volume: 0.025 },
        { frequency: 650, duration: 0.07, delay: 0.04, type: 'sine', volume: 0.018 }
      ]
    },
    close: {
      cooldownMs: 250,
      tones: [
        { frequency: 430, duration: 0.06, delay: 0, type: 'sine', volume: 0.02 },
        { frequency: 340, duration: 0.06, delay: 0.04, type: 'triangle', volume: 0.016 }
      ]
    }
  });

  var state = {
    audioArmed: false,
    armBound: false,
    context: null,
    lastPlayBySound: Object.create(null),
    activeOscillators: new Set()
  };

  function nowMs() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }

  function ensureContext() {
    if (state.context) return state.context;
    try {
      state.context = new (window.AudioContext || window.webkitAudioContext)();
      return state.context;
    } catch (_error) {
      return null;
    }
  }

  function resumeContext(ctx) {
    if (!ctx || typeof ctx.resume !== 'function' || ctx.state !== 'suspended') return;
    try {
      var maybePromise = ctx.resume();
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(function () {});
      }
    } catch (_error) {
      // Browser blocked; ignored.
    }
  }

  function armAudio() {
    if (state.audioArmed) return;
    state.audioArmed = true;
    var ctx = ensureContext();
    resumeContext(ctx);
  }

  function bindArmListeners() {
    if (state.armBound) return;
    state.armBound = true;

    function onFirstInteraction() {
      document.removeEventListener('pointerdown', onFirstInteraction, true);
      document.removeEventListener('keydown', onFirstInteraction, true);
      document.removeEventListener('touchstart', onFirstInteraction, true);
      armAudio();
    }

    document.addEventListener('pointerdown', onFirstInteraction, { once: true, capture: true });
    document.addEventListener('keydown', onFirstInteraction, { once: true, capture: true });
    document.addEventListener('touchstart', onFirstInteraction, { once: true, capture: true, passive: true });
  }

  function canPlay(soundName, cooldownMs) {
    var now = nowMs();
    var last = Number(state.lastPlayBySound[soundName] || 0);
    if (cooldownMs > 0 && (now - last) < cooldownMs) return false;
    state.lastPlayBySound[soundName] = now;
    return true;
  }

  function playTone(ctx, tone) {
    var now = ctx.currentTime + Number(tone.delay || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = tone.type || 'sine';
    osc.frequency.value = Number(tone.frequency || 440);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, Number(tone.volume || 0.02)), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + Number(tone.duration || 0.08));
    osc.connect(gain);
    gain.connect(ctx.destination);

    try {
      osc.start(now);
      osc.stop(now + Number(tone.duration || 0.08) + 0.02);
      state.activeOscillators.add(osc);
      osc.addEventListener('ended', function () {
        state.activeOscillators.delete(osc);
      });
    } catch (_error) {
      state.activeOscillators.delete(osc);
    }
  }

  function play(soundName) {
    var def = SOUND_DEFS[soundName] || SOUND_DEFS.tap;
    if (!state.audioArmed) return false;
    if (!canPlay(soundName, Number(def.cooldownMs || 0))) return false;

    var ctx = ensureContext();
    if (!ctx) return false;
    resumeContext(ctx);

    (def.tones || []).forEach(function (tone) {
      playTone(ctx, tone);
    });

    return true;
  }

  function stopAll() {
    state.activeOscillators.forEach(function (osc) {
      try {
        osc.stop();
      } catch (_error) {
        // Oscillator already stopped.
      }
    });
    state.activeOscillators.clear();
  }

  function cleanup() {
    stopAll();
  }

  global.UnzipAudioManager = {
    bindArmListeners: bindArmListeners,
    armAudio: armAudio,
    play: play,
    stopAll: stopAll,
    cleanup: cleanup,
    isArmed: function isArmed() {
      return state.audioArmed;
    }
  };
})(window);
