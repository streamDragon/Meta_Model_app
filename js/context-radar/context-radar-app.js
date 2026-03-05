const STEP_ORDER = Object.freeze([
  'intro',
  'dialogue',
  'contexts',
  'completion',
  'repair',
  'summary'
]);

const STEP_LABELS = Object.freeze({
  intro: 'פתיחה',
  dialogue: 'דיאלוג',
  contexts: 'שני עולמות',
  completion: 'מה לא נאמר',
  repair: 'תיקון',
  summary: 'סיכום'
});

const SLOT_DEFS = Object.freeze([
  { key: 'intent', label: 'Goal / Intent', multiple: false },
  { key: 'rules', label: 'Assumed Rules', multiple: true },
  { key: 'threat', label: 'Threat / Risk', multiple: false },
  { key: 'expected', label: 'Expected Response', multiple: false }
]);

const DEFAULT_TIMER_SECONDS = 16;
const ROOT_ID = 'cr-app-root';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeText(value) {
  return String(value == null ? '' : value).trim();
}

function createSelectionState() {
  return {
    A: { intent: '', rules: [], threat: '', expected: '' },
    B: { intent: '', rules: [], threat: '', expected: '' }
  };
}

function detectHotCount(scenario) {
  return (scenario?.dialogue || []).filter((line) => line?.tag === 'hot').length;
}

class PressureAudio {
  constructor() {
    this.ctx = null;
    this.armed = false;
    this.lastTickAt = 0;
    this.lastPulseAt = 0;
    this.lastBuzzerAt = 0;
  }

  ensureContext(forceResume = false) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContextCtor();
      } catch (_error) {
        this.ctx = null;
      }
    }
    if (forceResume && this.ctx && this.ctx.state === 'suspended') {
      try {
        const maybePromise = this.ctx.resume();
        if (maybePromise && typeof maybePromise.catch === 'function') {
          maybePromise.catch(() => {});
        }
      } catch (_error2) {}
    }
    return this.ctx;
  }

  arm() {
    this.armed = true;
    this.ensureContext(true);
  }

  playTone({
    type = 'sine',
    from = 440,
    to = null,
    duration = 0.08,
    amp = 0.02,
    delay = 0
  }) {
    if (!this.armed) return;
    const ctx = this.ensureContext(true);
    if (!ctx || ctx.state !== 'running') return;
    const start = ctx.currentTime + Math.max(0, Number(delay));
    const dur = Math.max(0.04, Number(duration) || 0.08);
    const peak = Math.max(0.0002, Number(amp) || 0.02);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(80, Number(from) || 440), start);
    if (Number.isFinite(to) && Number(to) > 0 && Number(to) !== Number(from)) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(80, Number(to)), start + dur);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);

    try {
      osc.start(start);
      osc.stop(start + dur + 0.02);
    } catch (_error3) {}
  }

  tick(isUrgent) {
    if (!this.armed) return;
    const now = Date.now();
    const cooldown = isUrgent ? 210 : 460;
    if (now - this.lastTickAt < cooldown) return;
    this.lastTickAt = now;
    this.playTone({
      type: isUrgent ? 'square' : 'triangle',
      from: isUrgent ? 980 : 740,
      to: isUrgent ? 860 : 680,
      duration: isUrgent ? 0.04 : 0.06,
      amp: isUrgent ? 0.03 : 0.018
    });
  }

  pulse() {
    if (!this.armed) return;
    const now = Date.now();
    if (now - this.lastPulseAt < 700) return;
    this.lastPulseAt = now;
    this.playTone({ type: 'sawtooth', from: 410, to: 320, duration: 0.08, amp: 0.022 });
  }

  buzzer() {
    if (!this.armed) return;
    const now = Date.now();
    if (now - this.lastBuzzerAt < 1400) return;
    this.lastBuzzerAt = now;
    this.playTone({ type: 'sawtooth', from: 220, to: 165, duration: 0.2, amp: 0.04 });
    this.playTone({ type: 'square', from: 170, to: 132, duration: 0.2, amp: 0.03, delay: 0.08 });
  }
}

const state = {
  scenarios: [],
  scenarioIndex: 0,
  step: 'intro',
  pressureEnabled: false,
  triggerMode: 'meaning',
  muted: false,
  selections: createSelectionState(),
  exposedAssumptions: new Set(),
  selectedRepairIndex: null,
  selectedRepairQuality: '',
  selectedRepairNote: '',
  summary: null,
  stress: 20,
  pressure: {
    durationSec: DEFAULT_TIMER_SECONDS,
    totalMs: DEFAULT_TIMER_SECONDS * 1000,
    remainingMs: DEFAULT_TIMER_SECONDS * 1000,
    deadlineMs: 0,
    timerId: 0,
    nextTickMs: 0,
    nextPenaltyMs: 0
  },
  audio: new PressureAudio()
};

const rootEl = document.getElementById(ROOT_ID);

function currentScenario() {
  return state.scenarios[state.scenarioIndex] || null;
}

function currentRepairOptions() {
  const scenario = currentScenario();
  if (!scenario) return [];
  const key = state.triggerMode === 'trigger' ? 'trigger_mode' : 'meaning_mode';
  return Array.isArray(scenario?.repair?.[key]) ? scenario.repair[key] : [];
}

function getScenarioStressBase() {
  const scenario = currentScenario();
  if (!scenario) return 20;
  return clamp(16 + (detectHotCount(scenario) * 6), 10, 65);
}

function setStress(nextValue) {
  state.stress = clamp(nextValue, 0, 100);
  const meter = document.getElementById('cr-stress-fill');
  const label = document.getElementById('cr-stress-label');
  if (meter) meter.style.width = `${state.stress}%`;
  if (label) label.textContent = `${state.stress}%`;
}

function stopPressureTimer() {
  if (state.pressure.timerId) {
    clearInterval(state.pressure.timerId);
    state.pressure.timerId = 0;
  }
  state.pressure.deadlineMs = 0;
  state.pressure.remainingMs = state.pressure.totalMs;
}

function animatePressurePulse() {
  const card = document.getElementById('cr-pressure-card');
  if (!card) return;
  card.classList.add('cr-pulse');
  setTimeout(() => card.classList.remove('cr-pulse'), 280);
}

function applyPressureFrame() {
  const bar = document.getElementById('cr-timer-fill');
  const timeLabel = document.getElementById('cr-time-left');
  const total = Math.max(1200, state.pressure.totalMs);
  const remaining = clamp(state.pressure.remainingMs, 0, total);
  const pct = clamp((remaining / total) * 100, 0, 100);
  if (bar) bar.style.width = `${pct}%`;
  if (timeLabel) timeLabel.textContent = `${Math.ceil(remaining / 1000)}s`;
}

function onPressureTimeout() {
  stopPressureTimer();
  if (!state.muted) state.audio.buzzer();
  state.selectedRepairIndex = null;
  state.selectedRepairQuality = 'bad';
  state.selectedRepairNote = 'נגמר הזמן. תחת לחץ גבוה, אי-בחירה מגדילה סיכוי לקריאה שגויה.';
  setStress(state.stress + 10);
  state.summary = buildSummary({ timedOut: true });
  state.step = 'summary';
  render();
}

function tickPressureTimer() {
  if (state.step !== 'repair' || !state.pressureEnabled) {
    stopPressureTimer();
    return;
  }
  const now = Date.now();
  state.pressure.remainingMs = Math.max(0, state.pressure.deadlineMs - now);

  if (state.pressure.remainingMs <= 0) {
    onPressureTimeout();
    return;
  }

  if (now >= state.pressure.nextTickMs) {
    if (!state.muted) state.audio.tick(state.pressure.remainingMs <= 5000);
    state.pressure.nextTickMs = now + (state.pressure.remainingMs <= 5000 ? 500 : 1000);
  }

  if (state.selectedRepairIndex == null && now >= state.pressure.nextPenaltyMs) {
    state.pressure.nextPenaltyMs = now + 3000;
    setStress(state.stress + 7);
    animatePressurePulse();
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(28); } catch (_error) {}
    }
    if (!state.muted) state.audio.pulse();
  }

  applyPressureFrame();
}

function startPressureTimer() {
  stopPressureTimer();
  if (!state.pressureEnabled || state.step !== 'repair') return;
  const scenario = currentScenario();
  const sec = clamp(Number(scenario?.timer_seconds || DEFAULT_TIMER_SECONDS), 12, 20);
  state.pressure.durationSec = sec;
  state.pressure.totalMs = sec * 1000;
  state.pressure.remainingMs = state.pressure.totalMs;
  state.pressure.deadlineMs = Date.now() + state.pressure.totalMs;
  state.pressure.nextTickMs = Date.now() + 1000;
  state.pressure.nextPenaltyMs = Date.now() + 3000;
  state.pressure.timerId = window.setInterval(tickPressureTimer, 120);
  applyPressureFrame();
}

function resetRound(nextStep = 'intro') {
  stopPressureTimer();
  state.step = nextStep;
  state.triggerMode = 'meaning';
  state.selections = createSelectionState();
  state.exposedAssumptions = new Set();
  state.selectedRepairIndex = null;
  state.selectedRepairQuality = '';
  state.selectedRepairNote = '';
  state.summary = null;
  state.stress = getScenarioStressBase();
}

function goToScenario(nextIndex) {
  const max = state.scenarios.length - 1;
  state.scenarioIndex = clamp(nextIndex, 0, Math.max(0, max));
  resetRound('intro');
  render();
}

function calculateContextMatch() {
  const scenario = currentScenario();
  if (!scenario) return 0;
  let score = 0;
  let total = 0;

  ['A', 'B'].forEach((side) => {
    const selected = state.selections[side];
    const rec = scenario.worlds?.[side]?.recommended || {};

    ['intent', 'threat', 'expected'].forEach((slot) => {
      total += 1;
      if (normalizeText(selected[slot]) && normalizeText(selected[slot]) === normalizeText(rec[slot])) {
        score += 1;
      }
    });

    total += 1;
    const selectedRules = Array.isArray(selected.rules) ? selected.rules : [];
    const requiredRules = Array.isArray(rec.rules) ? rec.rules.filter(Boolean) : [];
    if (!requiredRules.length) {
      score += 1;
    } else {
      const hitCount = requiredRules.filter((rule) => selectedRules.includes(rule)).length;
      score += (hitCount / requiredRules.length);
    }
  });

  return Math.round((score / Math.max(1, total)) * 100);
}

function calculateAssumptionsExposed() {
  const scenario = currentScenario();
  const total = scenario?.completion?.key_assumptions_he?.length || 0;
  const exposed = Math.min(total, state.exposedAssumptions.size);
  return { total, exposed };
}

function calculateRiskOfMisread({ contextMatch, assumptions, quality, timedOut }) {
  const scenario = currentScenario();
  const hotCount = detectHotCount(scenario);
  const hidden = Math.max(0, assumptions.total - assumptions.exposed);
  let risk = 22 + (hidden * 18) + (hotCount * 8);
  if (quality === 'bad') risk += 20;
  if (quality === 'good') risk -= 14;
  if (timedOut) risk += 14;
  risk -= Math.round(contextMatch / 10);
  risk = clamp(risk, 0, 100);
  let level = 'low';
  if (risk >= 68) level = 'high';
  else if (risk >= 38) level = 'mid';
  return { risk, level };
}

function buildSummary({ timedOut = false } = {}) {
  const contextMatch = calculateContextMatch();
  const assumptions = calculateAssumptionsExposed();
  const quality = timedOut ? 'bad' : (state.selectedRepairQuality || 'bad');
  const commonGroundRestored = !timedOut && quality === 'good' && contextMatch >= 55 && assumptions.exposed >= 1;
  const risk = calculateRiskOfMisread({ contextMatch, assumptions, quality, timedOut });
  const coaching = commonGroundRestored
    ? 'יפה. החזרת קרקע משותפת והורדת סיכון לקריאה שגויה.'
    : 'עדיין יש פער קונטקסט. נסה/י לחשוף עוד הנחות או לנסח תיקון מווסת יותר.';
  return {
    timedOut,
    contextMatch,
    assumptionsExposed: assumptions.exposed,
    assumptionsTotal: assumptions.total,
    commonGroundRestored,
    risk,
    quality,
    coaching
  };
}

function renderStepper() {
  return `
    <div class="cr-stepper">
      ${STEP_ORDER.map((step) => {
        const isActive = state.step === step;
        return `<span class="cr-step-pill${isActive ? ' is-active' : ''}">${escapeHtml(STEP_LABELS[step])}</span>`;
      }).join('')}
    </div>
  `;
}

function renderScenarioHead() {
  const scenario = currentScenario();
  const scenarioLabel = `${state.scenarioIndex + 1}/${state.scenarios.length}`;
  return `
    <div class="cr-card">
      <div class="cr-top">
        <div class="cr-title-wrap">
          <h3>${escapeHtml(scenario?.title_he || 'Scenario')}</h3>
          <p class="cr-subtitle">${escapeHtml(scenario?.context_intro_he || '')}</p>
        </div>
        <div class="cr-top-actions">
          <button class="cr-btn" data-action="prev-scenario" ${state.scenarioIndex <= 0 ? 'disabled' : ''}>סצנה קודמת</button>
          <button class="cr-btn" data-action="next-scenario" ${state.scenarioIndex >= state.scenarios.length - 1 ? 'disabled' : ''}>סצנה הבאה</button>
          <span class="cr-chip">${escapeHtml(`סצנה ${scenarioLabel}`)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderIntroStep() {
  return `
    <div class="cr-card">
      <h4>מה נבנה כאן?</h4>
      <p>בכל סצנה יש שני עולמות: מה הדובר חושב שקורה, ומה המאזין שומע בפועל. המטרה היא לחשוף הנחות לא מדוברות ולהחזיר Common Ground.</p>
      <div class="cr-chip-row">
        <button class="cr-chip" data-action="toggle-pressure">
          ${state.pressureEnabled ? 'מצב לחץ: פעיל' : 'מצב לחץ: כבוי'} (טיימר + מוזיקה)
        </button>
      </div>
      <div class="cr-chip-row">
        <button class="cr-btn cr-btn-primary" data-action="start-dialogue">מה הקונטקסט של כל אחד?</button>
      </div>
    </div>
  `;
}

function renderDialogueStep() {
  const scenario = currentScenario();
  const dialogue = Array.isArray(scenario?.dialogue) ? scenario.dialogue : [];
  return `
    <div class="cr-card">
      <h4>דיאלוג תקוע</h4>
      <div class="cr-dialog">
        ${dialogue.map((line) => {
          const speakerName = line.speaker === 'A' ? 'צד A' : 'צד B';
          const hotMark = line.tag === 'hot' ? '<span aria-hidden="true">⚡</span>' : '';
          return `
            <article class="cr-bubble${line.tag === 'hot' ? ' is-hot' : ''}" data-speaker="${escapeHtml(line.speaker || 'A')}">
              <div class="cr-bubble-meta">${hotMark}<span>${escapeHtml(speakerName)}</span></div>
              <p>${escapeHtml(line.text_he || '')}</p>
            </article>
          `;
        }).join('')}
      </div>
      <div class="cr-chip-row">
        <button class="cr-chip" data-action="toggle-pressure">
          ${state.pressureEnabled ? 'מצב לחץ: פעיל' : 'מצב לחץ: כבוי'} (טיימר + מוזיקה)
        </button>
      </div>
      <div class="cr-chip-row">
        <button class="cr-btn" data-action="back-intro">חזרה</button>
        <button class="cr-btn cr-btn-primary" data-action="to-contexts">מה הקונטקסט של כל אחד?</button>
      </div>
    </div>
  `;
}

function renderSlot(sideKey, slotKey, def, options, selectedValue) {
  const selectedRules = Array.isArray(selectedValue) ? selectedValue : [];
  return `
    <section class="cr-slot">
      <h5>${escapeHtml(def.label)}</h5>
      <div class="cr-chip-row">
        ${options.map((option) => {
          const value = normalizeText(option);
          if (!value) return '';
          const isActive = def.multiple
            ? selectedRules.includes(value)
            : normalizeText(selectedValue) === value;
          return `
            <button
              type="button"
              class="cr-chip${isActive ? ' is-active' : ''}"
              data-action="select-slot-option"
              data-side="${escapeHtml(sideKey)}"
              data-slot="${escapeHtml(slotKey)}"
              data-value="${escapeHtml(value)}"
            >
              ${escapeHtml(value)}
            </button>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function renderWorldCard(sideKey, title) {
  const scenario = currentScenario();
  const world = scenario?.worlds?.[sideKey];
  if (!world) return '';
  const selected = state.selections[sideKey];
  return `
    <article class="cr-card">
      <h4>${escapeHtml(title)}</h4>
      ${SLOT_DEFS.map((def) => {
        const options = Array.isArray(world?.[`${def.key}_options_he`]) ? world[`${def.key}_options_he`] : [];
        return renderSlot(sideKey, def.key, def, options, selected[def.key]);
      }).join('')}
    </article>
  `;
}

function renderContextsStep() {
  return `
    <div class="cr-worlds">
      ${renderWorldCard('A', 'World A — מה הדובר חושב שקורה')}
      ${renderWorldCard('B', 'World B — מה המאזין חושב שקורה')}
    </div>
    <div class="cr-card">
      <div class="cr-chip-row">
        <button class="cr-btn" data-action="back-dialogue">חזרה לדיאלוג</button>
        <button class="cr-btn cr-btn-primary" data-action="to-completion">הראה לי את המשפטים שלא נאמרו</button>
      </div>
    </div>
  `;
}

function renderCompletionStep() {
  const scenario = currentScenario();
  const completion = scenario?.completion || {};
  const assumptions = Array.isArray(completion?.key_assumptions_he) ? completion.key_assumptions_he : [];
  return `
    <div class="cr-completion">
      <div class="cr-completion-core">
        <h4>רגע ה-Click</h4>
        <p><strong>מה נאמר (Surface):</strong> ${escapeHtml(completion.surface_he || '')}</p>
      </div>
      <div class="cr-completion-grid">
        <section class="cr-card">
          <h4>איך זה נשמע בעולם B</h4>
          <p>${escapeHtml(completion.heard_as_B_he || '')}</p>
        </section>
        <section class="cr-card">
          <h4>מה התכוון בעולם A</h4>
          <p>${escapeHtml(completion.meant_as_A_he || '')}</p>
        </section>
      </div>
      <section class="cr-card">
        <h4>אילו הנחות חסרות נחשפו?</h4>
        <div class="cr-assumptions">
          ${assumptions.map((item, idx) => {
            const checked = state.exposedAssumptions.has(String(idx));
            return `
              <label class="cr-assumption">
                <input type="checkbox" data-action="toggle-assumption" data-assumption-id="${idx}" ${checked ? 'checked' : ''}>
                <span>${escapeHtml(item)}</span>
              </label>
            `;
          }).join('')}
        </div>
      </section>
      <div class="cr-card">
        <div class="cr-chip-row">
          <button class="cr-btn" data-action="back-contexts">חזרה לעולמות</button>
          <button class="cr-btn cr-btn-primary" data-action="to-repair">בחר תגובת תיקון שמחזירה Common Ground</button>
        </div>
      </div>
    </div>
  `;
}

function renderPressureBar() {
  if (!state.pressureEnabled) return '';
  return `
    <section class="cr-pressure-bar" id="cr-pressure-card">
      <div class="cr-pressure-head">
        <strong>Pressure Mode · Time left: <span id="cr-time-left">${Math.ceil(state.pressure.remainingMs / 1000)}s</span></strong>
        <div class="cr-chip-row">
          <button type="button" class="cr-chip" data-action="toggle-mute">${state.muted ? '🔇 מושתק' : '🔊 סאונד פעיל'}</button>
        </div>
      </div>
      <div class="cr-timer"><span id="cr-timer-fill" style="width: 100%"></span></div>
      <div class="cr-pressure-head">
        <span>Stress meter</span>
        <strong id="cr-stress-label">${state.stress}%</strong>
      </div>
      <div class="cr-pressure-meter"><span id="cr-stress-fill" style="width: ${state.stress}%"></span></div>
    </section>
  `;
}

function renderRepairStep() {
  const options = currentRepairOptions();
  const selected = state.selectedRepairIndex;
  return `
    <div class="cr-pressure-wrap">
      ${renderPressureBar()}
      <section class="cr-card">
        <h4>Repair תחת לחץ</h4>
        <div class="cr-chip-row">
          <button type="button" class="cr-chip${state.triggerMode === 'meaning' ? ' is-active' : ''}" data-action="set-mode" data-mode="meaning">🧠 משמעות</button>
          <button type="button" class="cr-chip${state.triggerMode === 'trigger' ? ' is-active' : ''}" data-action="set-mode" data-mode="trigger">🚨 טריגר</button>
        </div>
        <div class="cr-repair-grid">
          ${options.map((item, idx) => {
            const isSelected = selected === idx;
            const qualityClass = item?.quality === 'good' ? ' is-good' : ' is-bad';
            return `
              <article class="cr-repair-item">
                <button
                  type="button"
                  class="cr-chip${qualityClass}${isSelected ? ' is-active' : ''}"
                  data-action="pick-repair"
                  data-repair-index="${idx}"
                >
                  ${escapeHtml(item?.text_he || '')}
                </button>
                <small>${escapeHtml(item?.quality === 'good' ? 'בחירה מייצבת' : 'בחירה מסלימה')}</small>
              </article>
            `;
          }).join('')}
        </div>
        ${state.selectedRepairNote ? `
          <div class="cr-repair-note ${state.selectedRepairQuality === 'good' ? 'is-good' : 'is-bad'}">${escapeHtml(state.selectedRepairNote)}</div>
        ` : ''}
        <div class="cr-chip-row">
          <button class="cr-btn" data-action="back-completion">חזרה</button>
          <button class="cr-btn cr-btn-primary" data-action="to-summary" ${state.selectedRepairIndex == null ? 'disabled' : ''}>סיכום סבב</button>
        </div>
      </section>
    </div>
  `;
}

function renderSummaryStep() {
  const summary = state.summary || buildSummary({ timedOut: false });
  const restoredLabel = summary.commonGroundRestored ? 'כן' : 'לא';
  const riskClass = summary.risk.level === 'high' ? 'cr-risk-high' : (summary.risk.level === 'mid' ? 'cr-risk-mid' : 'cr-risk-low');
  const riskLabel = summary.risk.level === 'high' ? 'גבוה' : (summary.risk.level === 'mid' ? 'בינוני' : 'נמוך');
  const qualityLabel = summary.quality === 'good' ? 'תגובה מייצבת' : 'תגובה מסלימה/לא מספקת';
  return `
    <section class="cr-card">
      <h4>סיכום סבב</h4>
      <div class="cr-summary-grid">
        <article class="cr-kpi">
          <span>Context Match</span>
          <strong>${summary.contextMatch}%</strong>
        </article>
        <article class="cr-kpi">
          <span>Assumptions Exposed</span>
          <strong>${summary.assumptionsExposed}/${summary.assumptionsTotal}</strong>
        </article>
        <article class="cr-kpi">
          <span>Common Ground Restored</span>
          <strong>${restoredLabel}</strong>
        </article>
        <article class="cr-kpi">
          <span>Risk of Misread</span>
          <strong class="${riskClass}">${riskLabel} (${summary.risk.risk}%)</strong>
        </article>
      </div>
      <p><strong>איכות תגובת התיקון:</strong> ${escapeHtml(qualityLabel)}</p>
      <p>${escapeHtml(summary.coaching)}</p>
      <div class="cr-chip-row">
        <button class="cr-btn" data-action="retry-scenario">נסה/י שוב את אותה סצנה</button>
        <button class="cr-btn cr-btn-primary" data-action="next-scenario-after-summary">לסצנה הבאה</button>
      </div>
    </section>
  `;
}

function renderStepContent() {
  if (state.step === 'intro') return renderIntroStep();
  if (state.step === 'dialogue') return renderDialogueStep();
  if (state.step === 'contexts') return renderContextsStep();
  if (state.step === 'completion') return renderCompletionStep();
  if (state.step === 'repair') return renderRepairStep();
  return renderSummaryStep();
}

function render() {
  const scenario = currentScenario();
  if (!rootEl) return;
  if (!scenario) {
    rootEl.innerHTML = `
      <section class="cr-card">
        <h3>שגיאה בטעינת Context Radar</h3>
        <p>לא נמצאו סצנות. נסה/י לרענן את העמוד.</p>
      </section>
    `;
    return;
  }

  rootEl.innerHTML = `
    ${renderStepper()}
    ${renderScenarioHead()}
    ${renderStepContent()}
  `;

  if (state.step === 'repair' && state.pressureEnabled) {
    applyPressureFrame();
    setStress(state.stress);
  }
}

function changeStep(nextStep) {
  if (!STEP_ORDER.includes(nextStep)) return;
  state.step = nextStep;
  if (nextStep === 'repair') {
    startPressureTimer();
  } else {
    stopPressureTimer();
  }
  render();
}

function handleSelectSlotOption(button) {
  const side = button.getAttribute('data-side');
  const slot = button.getAttribute('data-slot');
  const value = button.getAttribute('data-value');
  if (!['A', 'B'].includes(side) || !['intent', 'rules', 'threat', 'expected'].includes(slot)) return;
  if (!value) return;

  if (slot === 'rules') {
    const list = state.selections[side].rules;
    const exists = list.includes(value);
    state.selections[side].rules = exists ? list.filter((item) => item !== value) : [...list, value];
  } else {
    state.selections[side][slot] = value;
  }
  render();
}

function handlePickRepair(button) {
  const idx = Number(button.getAttribute('data-repair-index'));
  const options = currentRepairOptions();
  if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) return;
  const picked = options[idx];
  state.selectedRepairIndex = idx;
  state.selectedRepairQuality = normalizeText(picked?.quality || 'bad');
  state.selectedRepairNote = normalizeText(picked?.note_he || '');

  if (state.selectedRepairQuality === 'good') setStress(state.stress - 15);
  else setStress(state.stress + 14);
  render();
}

function handleAction(action, sourceEl) {
  if (!action) return;
  state.audio.arm();

  if (action === 'toggle-pressure') {
    state.pressureEnabled = !state.pressureEnabled;
    if (!state.pressureEnabled) stopPressureTimer();
    render();
    return;
  }

  if (action === 'toggle-mute') {
    state.muted = !state.muted;
    render();
    return;
  }

  if (action === 'start-dialogue') { changeStep('dialogue'); return; }
  if (action === 'back-intro') { changeStep('intro'); return; }
  if (action === 'to-contexts') { changeStep('contexts'); return; }
  if (action === 'back-dialogue') { changeStep('dialogue'); return; }
  if (action === 'to-completion') { changeStep('completion'); return; }
  if (action === 'back-contexts') { changeStep('contexts'); return; }
  if (action === 'to-repair') { changeStep('repair'); return; }
  if (action === 'back-completion') { changeStep('completion'); return; }

  if (action === 'to-summary') {
    stopPressureTimer();
    state.summary = buildSummary({ timedOut: false });
    state.step = 'summary';
    render();
    return;
  }

  if (action === 'retry-scenario') {
    resetRound('intro');
    render();
    return;
  }

  if (action === 'prev-scenario') { goToScenario(state.scenarioIndex - 1); return; }
  if (action === 'next-scenario') { goToScenario(state.scenarioIndex + 1); return; }
  if (action === 'next-scenario-after-summary') {
    const next = (state.scenarioIndex + 1) % state.scenarios.length;
    goToScenario(next);
    return;
  }

  if (action === 'set-mode') {
    const mode = sourceEl?.getAttribute('data-mode');
    if (!['meaning', 'trigger'].includes(mode)) return;
    state.triggerMode = mode;
    state.selectedRepairIndex = null;
    state.selectedRepairQuality = '';
    state.selectedRepairNote = '';
    render();
    return;
  }

  if (action === 'select-slot-option') {
    handleSelectSlotOption(sourceEl);
    return;
  }

  if (action === 'pick-repair') {
    handlePickRepair(sourceEl);
  }
}

function handleChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.getAttribute('data-action');
  if (action !== 'toggle-assumption') return;
  const id = String(target.getAttribute('data-assumption-id') || '');
  if (!id) return;
  const input = target;
  if (input.checked) state.exposedAssumptions.add(id);
  else state.exposedAssumptions.delete(id);
}

function bindEvents() {
  if (!rootEl) return;
  rootEl.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const actionEl = target.closest('[data-action]');
    if (!(actionEl instanceof HTMLElement)) return;
    handleAction(actionEl.getAttribute('data-action'), actionEl);
  });
  rootEl.addEventListener('change', handleChange);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopPressureTimer();
    } else if (state.step === 'repair' && state.pressureEnabled && state.selectedRepairIndex == null) {
      startPressureTimer();
    }
  });
}

async function loadScenarios() {
  const response = await fetch('../../data/scenarios.contextRadar.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  const scenarios = Array.isArray(payload?.scenarios) ? payload.scenarios : [];
  return scenarios;
}

async function boot() {
  bindEvents();
  try {
    const scenarios = await loadScenarios();
    state.scenarios = scenarios;
    state.scenarioIndex = 0;
    resetRound('intro');
    render();
  } catch (error) {
    if (rootEl) {
      rootEl.innerHTML = `
        <section class="cr-card">
          <h3>טעינת Context Radar נכשלה</h3>
          <p>${escapeHtml(String(error?.message || 'שגיאה לא ידועה'))}</p>
          <button class="cr-btn cr-btn-primary" data-action="reload-page">רענון עמוד</button>
        </section>
      `;
      const btn = rootEl.querySelector('[data-action="reload-page"]');
      if (btn) {
        btn.addEventListener('click', () => window.location.reload());
      }
    }
  }
}

boot();
