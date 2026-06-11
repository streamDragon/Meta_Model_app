(function attachPrismLab() {
  'use strict';
  const root = document.getElementById('prism-lab-app');
  if (!root) return;

  const DRAFT_KEY = 'prism_lab_draft_v2';
  const SAVED_KEY = 'prism_lab_saved_v2';

  const DEMO_SENTENCE = "I'm sure my manager thinks I'm not good enough. I always freeze in meetings. This means I have nothing to offer.";

  const PRISMS = [
    { id: 'unspecified_verb',    icon: '⚙️',  name: 'Unspecified Verb',       desc: 'Turns a vague action into a concrete sequence of steps.',        q: 'What exactly do you do when X?',                             type: 'process'   },
    { id: 'unspecified_noun',    icon: '🧩',  name: 'Unspecified Noun',        desc: 'Clarifies who or what exactly stands behind the word.',          q: 'Who or what exactly is X?',                                  type: 'referent'  },
    { id: 'nominalization',      icon: '🎬',  name: 'Nominalization',          desc: 'Returns an abstract concept to real movement.',                  q: 'What does it look like in practice when there is X?',        type: 'process'   },
    { id: 'universal_quantifier',icon: '♾️',  name: 'Universal Quantifier',   desc: 'Tests "always/never" — looks for exceptions.',                  q: 'Always? When yes, when no?',                                 type: 'scope'     },
    { id: 'necessity_modal',     icon: '📌',  name: 'Necessity Modal',         desc: 'Exposes the hidden cost behind "must/have to".',                 q: 'What will happen if you don\'t X?',                          type: 'fear'      },
    { id: 'possibility_modal',   icon: '🧱',  name: 'Possibility Modal',       desc: 'Breaks "can\'t" into a specific, treatable barrier.',            q: 'What prevents you from X?',                                  type: 'barrier'   },
    { id: 'cause_effect',        icon: '🔗',  name: 'Cause & Effect',          desc: 'Builds a mechanism instead of a vague causal link.',             q: 'How exactly does X cause Y?',                                type: 'mechanism' },
    { id: 'complex_equivalence', icon: '🪢',  name: 'Complex Equivalence',     desc: 'Unpacks the interpretive glue of "that means…"',                q: 'How does X mean Y?',                                         type: 'meaning'   },
    { id: 'mind_reading',        icon: '🧠',  name: 'Mind Reading',            desc: 'Separates data from interpretation.',                            q: 'How do you know X?',                                         type: 'evidence'  },
    { id: 'comparison',          icon: '📏',  name: 'Comparative Deletion',    desc: 'Finds who or what you\'re measuring against.',                   q: 'More or less compared to what or whom?',                     type: 'criterion' },
    { id: 'lost_performative',   icon: '🏛️', name: 'Lost Performative',       desc: 'Reveals who said it and by which rule.',                        q: 'According to whom or which rule is X true?',                 type: 'authority' },
    { id: 'presupposition',      icon: '🪟',  name: 'Presupposition',          desc: 'Exposes what must be true in the background.',                   q: 'What must be true for this sentence to be correct?',         type: 'assumption'},
    { id: 'unspecified_time',    icon: '⏱️',  name: 'Unspecified Time',        desc: 'Finds a precise time window.',                                   q: 'When exactly is X?',                                         type: 'time'      },
    { id: 'context_place',       icon: '📍',  name: 'Context & Place',         desc: 'Maps environmental triggers and context.',                       q: 'Where or in what context is X?',                             type: 'context'   },
    { id: 'logical_levels',      icon: '🗼',  name: 'Logical Levels',          desc: 'Identifies the level of speaking and possible level-jumps.',     q: 'What level are you speaking from right now?',                type: 'levels'    }
  ];

  const PRISM_BY_ID = Object.fromEntries(PRISMS.map(p => [p.id, p]));

  // Keyword-based prism suggestions
  const SUGGEST_RULES = [
    { kw: ['always', 'never', 'every time', 'nobody', 'everyone', 'all the time'],    ids: ['universal_quantifier', 'unspecified_verb', 'lost_performative', 'presupposition'] },
    { kw: ["can't", 'cannot', 'impossible', 'unable', "can not"],                     ids: ['possibility_modal', 'necessity_modal', 'presupposition', 'unspecified_verb'] },
    { kw: ['must', 'have to', 'should', 'need to', 'supposed to', 'ought'],           ids: ['necessity_modal', 'lost_performative', 'presupposition', 'comparison'] },
    { kw: ['thinks', 'knows', 'believes', 'sure that', 'certain that', 'he thinks'],  ids: ['mind_reading', 'presupposition', 'complex_equivalence', 'lost_performative'] },
    { kw: ['means', 'that means', 'shows that', 'proves', 'indicates'],               ids: ['complex_equivalence', 'presupposition', 'cause_effect', 'mind_reading'] },
    { kw: ['because', 'causes', 'leads to', 'makes me', 'results in'],               ids: ['cause_effect', 'complex_equivalence', 'presupposition', 'unspecified_verb'] },
    { kw: ['bad', 'not good enough', 'worse', 'better', 'best', 'worst', 'enough'],   ids: ['comparison', 'lost_performative', 'presupposition', 'mind_reading'] },
    { kw: ['freeze', 'stuck', 'block', 'stop', 'shut down'],                          ids: ['unspecified_verb', 'possibility_modal', 'cause_effect', 'context_place'] },
  ];
  const DEFAULT_SUGGESTIONS = ['unspecified_verb', 'universal_quantifier', 'possibility_modal', 'mind_reading'];

  function suggestPrisms(focus, sentence) {
    const text = (focus + ' ' + sentence).toLowerCase();
    for (const rule of SUGGEST_RULES) {
      if (rule.kw.some(kw => text.includes(kw))) return rule.ids;
    }
    return DEFAULT_SUGGESTIONS;
  }

  // Summary copy
  const SUMMARY_LEAD = {
    process:   'The excavation moved from a general feeling to a sequence you can see and describe.',
    referent:  'The excavation turned a general word into a specific person or thing with clear attributes.',
    scope:     'The excavation began to break a broad generalization and expose conditions and exceptions.',
    fear:      'The excavation exposed the chain of costs that holds the "must" in place.',
    barrier:   'The excavation unpacked "can\'t" into a barrier you can actually work with.',
    mechanism: 'The excavation built a mechanism — not just a general cause-and-effect.',
    meaning:   'The excavation exposed the interpretation rule connecting event to meaning.',
    evidence:  'The excavation distinguished between data, interpretation, and sense of knowing.',
    criterion: 'The excavation uncovered the hidden criterion driving the comparison.',
    authority: 'The excavation revealed the source or rule standing behind the judgment.',
    assumption:'The excavation opened the assumption layer holding the sentence together.',
    time:      'The excavation narrowed the story to a precise time window.',
    context:   'The excavation created a map of contexts and environmental triggers.',
    levels:    'The excavation helped distinguish the level of speaking from possible level-jumps.'
  };
  const SUMMARY_NEXT = {
    process:   'Which single action in this sequence could you change next time?',
    referent:  'What additional detail would further clarify the referent or criterion?',
    scope:     'Where does a counter-example already exist that could become a success condition?',
    fear:      'What is likely to actually happen, and what small step protects you without getting stuck?',
    barrier:   'What small resource or skill would make this 10% more possible?',
    mechanism: 'At which point in this chain is it easiest to intervene right now?',
    meaning:   'What alternative translation could you test for the same X?',
    evidence:  'What is the next piece of data that could test this interpretation?',
    criterion: 'Does this criterion fit this context?',
    authority: 'Is this rule still serving you here, and where does it have limits?',
    assumption:'Which single assumption is most important to examine first?',
    time:      'What can you do exactly when this moment is identified?',
    context:   'In which other context would it be easier to practice?',
    levels:    'Which level should you move up or down to now to restore options?'
  };

  // Dialogue coaching messages per state
  const DIALOGUE = {
    input:        { what: 'Write a sentence from real life.',              why: 'Something someone said, or a thought you\'ve had.',                       tip: 'Sentences with "always", "can\'t", "must", or "that means" work especially well.' },
    detect:       { what: 'Notice what stands out.',                       why: 'Look for words that assume, generalize, or hide the specifics.',           tip: 'These are your entry points for deeper questioning.' },
    choose_prism: { what: 'Each prism asks one type of question.',         why: 'Pick the one that feels most useful right now.',                           tip: 'You can try a different prism on the same sentence later.' },
    layer1:       { what: 'Layer 1 of 3.',                                 why: 'Break the abstract into something concrete and describable.',              tip: 'Your answer becomes the new X in the next layer.' },
    layer2:       { what: 'Layer 2 of 3.',                                 why: 'Same question — but X now comes from your previous answer.',               tip: 'Notice how each layer gets more specific.' },
    layer3:       { what: 'Layer 3 of 3 — the final layer.',               why: 'Push one more level.',                                                    tip: 'What emerges when you dig again?' },
    output:       { what: 'Investigation complete.',                       why: 'You moved from an abstraction to something actionable.',                   tip: null },
  };

  // ─── State ────────────────────────────────────────────────────────────────
  const state = {
    screen: 'welcome', // welcome | input | detect | choose_prism | layer1 | layer2 | layer3 | output | review
    sentence: '',
    focus: '',
    prismId: null,
    layers:  ['', '', ''],
    anchors: ['', '', ''],
    anchorY: '',
    saved: [],
    hasDraft: false,
    toastMsg: null,
  };

  // ─── Utilities ────────────────────────────────────────────────────────────
  function esc(v) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function norm(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
  function shrink(text, max) {
    max = max || 72;
    const t = norm(text).replace(/^["']+|["']+$/g, '');
    if (!t) return '';
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    const idx = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf(','));
    return (idx > 12 ? cut.slice(0, idx) : cut).trim() + '…';
  }
  function stripEnd(text) { return String(text || '').replace(/[.!?…,:;]+$/g, '').trim(); }
  function splitSentences(text) { return norm(text).split(/(?<=[.!?])\s+|\n+/).map(s => norm(s)).filter(Boolean); }
  function pickAfter(text, re) { const m = re.exec(String(text || '')); return m ? stripEnd(shrink(m[1] || m[0], 70)) : ''; }

  // ─── Anchor logic ─────────────────────────────────────────────────────────
  function deriveSeedX(prism, sentence) {
    if (state.focus) return stripEnd(shrink(state.focus, 70));
    const text = norm(sentence);
    let x = '';
    if (prism.id === 'mind_reading')       x = pickAfter(text, /(?:thinks?|sure that|believes?)\s+(?:that\s+)?(?:I\s*(?:am|'m)\s*)([^.?!]+)/i);
    if (prism.id === 'necessity_modal')    x = pickAfter(text, /(?:must|have to|should|need to)\s+([^.?!]+)/i);
    if (prism.id === 'possibility_modal')  x = pickAfter(text, /(?:can't|cannot|impossible|unable to)\s+([^.?!]+)/i);
    if (prism.id === 'comparison')         x = pickAfter(text, /(?:more|less|worse|better|enough)\s+([^.?!]+)/i);
    if (prism.id === 'cause_effect' || prism.id === 'complex_equivalence')
                                            x = x || pickAfter(text, /(?:means|that means|causes|leads to)\s+([^.?!]+)/i);
    if (!x) x = shrink((splitSentences(text)[0] || text), 70);
    return stripEnd(x) || 'the main statement';
  }
  function deriveSeedY(prism, sentence) {
    if (prism.id !== 'cause_effect' && prism.id !== 'complex_equivalence') return '';
    const text = norm(sentence);
    return pickAfter(text, /(?:means that|that means|results in|leads to)\s+([^.?!]+)/i)
      || shrink(splitSentences(text)[1] || '', 56)
      || (prism.id === 'cause_effect' ? 'outcome' : 'meaning');
  }
  function renderQ(prism, x, y) {
    let q = prism.q;
    if (q.includes('X')) q = q.replaceAll('X', x || 'this');
    if (q.includes('Y')) q = q.replaceAll('Y', y || 'outcome');
    return q;
  }
  function nextAnchor(answer, fallback) {
    const t = norm(answer);
    if (!t) return fallback || 'the new statement';
    const p = t.split(/[.!?]/)[0] || t;
    const c = p.split(/(?:,| and | but | because )/)[0] || p;
    return stripEnd(shrink(c, 72)) || fallback || 'the new statement';
  }
  function getLayerQ(idx) {
    const prism = PRISM_BY_ID[state.prismId];
    if (!prism) return '';
    const x = state.anchors[idx] || deriveSeedX(prism, state.sentence);
    const y = state.anchorY || deriveSeedY(prism, state.sentence);
    return renderQ(prism, x, y);
  }
  function getX(idx) {
    const prism = PRISM_BY_ID[state.prismId];
    if (!prism) return '';
    return state.anchors[idx] || deriveSeedX(prism, state.sentence);
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  function summaryInsight() {
    const p = PRISM_BY_ID[state.prismId];
    return p ? (SUMMARY_LEAD[p.type] || 'The excavation created more precision and more choice points.') : '';
  }
  function summaryNextQ() {
    const p = PRISM_BY_ID[state.prismId];
    return p ? (SUMMARY_NEXT[p.type] || 'What question continues the same lens and increases precision?') : '';
  }

  // ─── Persistence ──────────────────────────────────────────────────────────
  function persistDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ sentence: state.sentence, focus: state.focus, prismId: state.prismId, layers: state.layers, anchors: state.anchors, anchorY: state.anchorY, screen: state.screen })); } catch(e) {}
  }
  function persistSaved() {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(state.saved)); } catch(e) {}
  }
  function fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try { return new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' }).format(d); } catch(e) { return d.toLocaleString(); }
  }
  function restoreAll() {
    try { const s = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); if (Array.isArray(s)) state.saved = s; } catch(e) {}
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (d && d.sentence) {
        state.sentence = d.sentence || '';
        state.focus    = d.focus || '';
        state.prismId  = d.prismId || null;
        state.layers   = Array.isArray(d.layers)  ? d.layers  : ['', '', ''];
        state.anchors  = Array.isArray(d.anchors) ? d.anchors : ['', '', ''];
        state.anchorY  = d.anchorY || '';
        state.hasDraft = true;
      }
    } catch(e) {}
  }

  // ─── Toast ────────────────────────────────────────────────────────────────
  let toastTimer = null;
  function showToast(msg) {
    state.toastMsg = msg;
    render();
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { state.toastMsg = null; render(); }, 3000);
  }

  // ─── Overlay state ────────────────────────────────────────────────────────
  let overlay = null; // null | 'all-prisms' | 'saved'

  // ─── Render helpers ───────────────────────────────────────────────────────
  const SCREEN_ORDER = ['input', 'detect', 'choose_prism', 'layer1', 'layer2', 'layer3', 'output'];

  function renderDialogue() {
    const d = DIALOGUE[state.screen];
    if (!d) return '';
    return `<div class="pl2-dialogue" role="status">
      <span class="pl2-d-what">${esc(d.what)}</span>
      <span class="pl2-d-sep">·</span>
      <span class="pl2-d-why">${esc(d.why)}</span>
      ${d.tip ? `<span class="pl2-d-tip">${esc(d.tip)}</span>` : ''}
    </div>`;
  }

  function renderCollapsedSteps() {
    const curIdx = SCREEN_ORDER.indexOf(state.screen);
    if (curIdx <= 0) return '';
    const items = [];

    if (curIdx > 0 && state.sentence) items.push({ label: 'Sentence', val: state.sentence,               back: 'input'        });
    if (curIdx > 1 && state.focus)    items.push({ label: 'Focus',    val: state.focus,                  back: 'detect'       });
    if (curIdx > 2 && state.prismId)  { const p = PRISM_BY_ID[state.prismId]; items.push({ label: 'Prism', val: p ? p.icon + ' ' + p.name : state.prismId, back: 'choose_prism' }); }
    if (curIdx > 3 && state.layers[0]) items.push({ label: 'Layer 1', val: state.layers[0],              back: 'layer1'       });
    if (curIdx > 4 && state.layers[1]) items.push({ label: 'Layer 2', val: state.layers[1],              back: 'layer2'       });
    if (curIdx > 5 && state.layers[2]) items.push({ label: 'Layer 3', val: state.layers[2],              back: 'layer3'       });

    if (!items.length) return '';
    return `<div class="pl2-collapsed-steps">${items.map(it => `
      <div class="pl2-collapsed-item">
        <span class="pl2-ci-check">✓</span>
        <span class="pl2-ci-label">${esc(it.label)}</span>
        <span class="pl2-ci-val">${esc(shrink(it.val, 56))}</span>
        <button type="button" class="pl2-ci-edit" data-action="edit-step" data-screen="${esc(it.back)}">edit</button>
      </div>`).join('')}</div>`;
  }

  function renderProgress() {
    const cur = SCREEN_ORDER.indexOf(state.screen);
    return `<div class="pl2-progress" aria-label="Step ${Math.max(cur+1,1)} of ${SCREEN_ORDER.length}">${
      SCREEN_ORDER.map((_, i) => `<span class="pl2-dot ${i < cur ? 'done' : i === cur ? 'active' : 'pending'}"></span>`).join('')
    }</div>`;
  }

  function renderHeader() {
    const isWelcome = state.screen === 'welcome';
    const showProgress = !isWelcome && state.screen !== 'output' && state.screen !== 'review';
    return `<header class="pl2-header">
      <button type="button" class="pl2-hdr-btn" data-action="go-back" aria-label="Back">←</button>
      <span class="pl2-hdr-title">Prism Lab</span>
      ${showProgress ? renderProgress() : '<span></span>'}
      <button type="button" class="pl2-hdr-btn" data-action="open-help" aria-label="Help">?</button>
    </header>`;
  }

  function renderToast() {
    if (!state.toastMsg) return '';
    return `<div class="pl2-toast" role="alert">${esc(state.toastMsg)}</div>`;
  }

  // ─── Screens ──────────────────────────────────────────────────────────────
  function renderWelcome() {
    return `<div class="pl2-shell pl2-welcome">
      <header class="pl2-header pl2-header-welcome">
        <span></span>
        <span class="pl2-hdr-title">Prism Lab</span>
        <button type="button" class="pl2-hdr-btn" data-action="open-help" aria-label="Help">?</button>
      </header>
      <main class="pl2-welcome-main">
        <div class="pl2-welcome-hero">
          <p class="pl2-eyebrow">Prism Lab</p>
          <h1 class="pl2-welcome-h1">One sentence.<br>One lens.<br>Three layers of clarity.</h1>
          <p class="pl2-welcome-sub">Choose a questioning prism and ask the same question three times. Each time, X updates from your previous answer — each layer goes deeper.</p>
        </div>

        <div class="pl2-benefits">
          <div class="pl2-benefit">
            <span class="pl2-benefit-icon">🔍</span>
            <strong>See what stands out</strong>
            <p>Find the vague word, hidden assumption, or loaded phrase.</p>
          </div>
          <div class="pl2-benefit">
            <span class="pl2-benefit-icon">🎯</span>
            <strong>Choose a lens</strong>
            <p>One prism. One type of question. Applied three times.</p>
          </div>
          <div class="pl2-benefit">
            <span class="pl2-benefit-icon">💡</span>
            <strong>Discover what was hidden</strong>
            <p>Move from abstraction to something concrete and actionable.</p>
          </div>
        </div>

        <section class="pl2-how-it-works">
          <h2>How it works</h2>
          <ol class="pl2-how-list">
            <li><strong>Write a sentence</strong> — something someone said, or a thought you've had.</li>
            <li><strong>Pick one prism</strong> — a specific questioning lens from 15 options.</li>
            <li><strong>Answer the same question 3 times.</strong> X updates from your previous answer each time.</li>
          </ol>
        </section>

        <section class="pl2-example">
          <h2>Worked example</h2>
          <div class="pl2-ex-sentence">"I can't change."</div>
          <div class="pl2-ex-prism">Prism: 🧱 Possibility Modal — <em>"What prevents you from X?"</em></div>
          <div class="pl2-ex-trace">
            <div class="pl2-ex-row"><span class="pl2-ex-layer">Layer 1</span><span class="pl2-ex-x">X = "changing"</span><span class="pl2-ex-arr">→</span><span class="pl2-ex-a">"I don't know what to do differently"</span></div>
            <div class="pl2-ex-row"><span class="pl2-ex-layer">Layer 2</span><span class="pl2-ex-x">X = "knowing what to do"</span><span class="pl2-ex-arr">→</span><span class="pl2-ex-a">"Nobody showed me options"</span></div>
            <div class="pl2-ex-row"><span class="pl2-ex-layer">Layer 3</span><span class="pl2-ex-x">X = "seeing options"</span><span class="pl2-ex-arr">→</span><span class="pl2-ex-a">"I haven't asked anyone"</span></div>
          </div>
          <div class="pl2-ex-result">
            <span class="pl2-ex-from">"I can't change"</span>
            <span class="pl2-ex-arrfull">→</span>
            <span class="pl2-ex-to">"I haven't asked anyone to show me options"</span>
          </div>
        </section>

        <div class="pl2-welcome-cta">
          ${state.hasDraft && state.sentence ? `<button type="button" class="pl2-btn-primary" data-action="resume-draft">Continue where you left off →</button>` : ''}
          <button type="button" class="pl2-btn-${state.hasDraft && state.sentence ? 'secondary' : 'primary'}" data-action="start-practice">Start Practice →</button>
          <div class="pl2-welcome-links">
            <button type="button" class="pl2-link-btn" data-action="open-help">See all 15 prisms</button>
            ${state.saved.length ? `<button type="button" class="pl2-link-btn" data-action="open-saved">Saved investigations (${state.saved.length})</button>` : ''}
          </div>
        </div>

        <p class="pl2-not-this">Not therapy. Not a quiz. Not graded. A thinking tool for linguistic clarity.</p>
      </main>
    </div>`;
  }

  function renderInput() {
    return `<div class="pl2-shell pl2-work">
      ${renderHeader()}
      <main class="pl2-work-main">
        ${renderCollapsedSteps()}
        <div class="pl2-card">
          <p class="pl2-prompt">Write a sentence from real life.</p>
          <p class="pl2-sub">Something someone said, or a thought you've had.</p>
          <textarea class="pl2-textarea" id="pl2-sentence-ta" data-action="input-sentence" placeholder="Type or paste a sentence…" spellcheck="false">${esc(state.sentence)}</textarea>
          <div class="pl2-card-links">
            <button type="button" class="pl2-link-btn" data-action="load-demo">Load example sentence</button>
          </div>
          <div class="pl2-card-footer">
            <button type="button" class="pl2-btn-primary" data-action="submit-sentence" ${norm(state.sentence) ? '' : 'disabled'}>Continue →</button>
          </div>
        </div>
        ${renderDialogue()}
      </main>
      ${renderToast()}
    </div>`;
  }

  function renderDetect() {
    // Generate phrase chips from sentence using pattern matching
    const chips = [];
    const patterns = [
      /\b(always|never|every time|nobody|everyone)\s+\w+(?:\s+\w+)?/i,
      /\b(can't|cannot|unable to|impossible to)\s+\w+(?:\s+\w+)?/i,
      /\b(must|have to|should|need to)\s+\w+(?:\s+\w+)?/i,
      /\b(?:thinks?|sure|believes?)\s+(?:that\s+)?(?:I\s+(?:am|'m)\s+)?\w+(?:\s+\w+)?/i,
      /\b(?:means?|that means?|this means?)\s+\w+(?:\s+\w+)?/i,
    ];
    for (const pat of patterns) {
      const m = pat.exec(state.sentence);
      if (m) {
        const chip = shrink(m[0], 40);
        if (chip && !chips.includes(chip)) chips.push(chip);
      }
      if (chips.length >= 4) break;
    }
    const displaySentence = shrink(state.sentence, 140);
    return `<div class="pl2-shell pl2-work">
      ${renderHeader()}
      <main class="pl2-work-main">
        ${renderCollapsedSteps()}
        <div class="pl2-card">
          <p class="pl2-prompt">What stands out in this sentence?</p>
          <div class="pl2-sentence-display">"${esc(displaySentence)}"</div>
          <p class="pl2-sub">Which word or phrase feels loaded, vague, or worth questioning?</p>
          <input type="text" class="pl2-input" id="pl2-focus-in" data-action="input-focus" placeholder="Type the word or phrase…" value="${esc(state.focus)}" spellcheck="false" autocomplete="off" />
          ${chips.length ? `<div class="pl2-chips">${chips.map(c => `<button type="button" class="pl2-chip${state.focus === c ? ' active' : ''}" data-action="select-focus" data-val="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
          <div class="pl2-card-footer">
            <button type="button" class="pl2-btn-primary" data-action="submit-focus" ${norm(state.focus) ? '' : 'disabled'}>Continue →</button>
          </div>
        </div>
        ${renderDialogue()}
      </main>
      ${renderToast()}
    </div>`;
  }

  function renderChoosePrism() {
    const ids = suggestPrisms(state.focus, state.sentence);
    const suggested = ids.map(id => PRISM_BY_ID[id]).filter(Boolean);
    return `<div class="pl2-shell pl2-work">
      ${renderHeader()}
      <main class="pl2-work-main">
        ${renderCollapsedSteps()}
        <div class="pl2-card">
          <p class="pl2-prompt">Which lens do you want to use?</p>
          <p class="pl2-sub">Suggested for <strong>"${esc(shrink(state.focus, 40))}"</strong>:</p>
          <div class="pl2-prism-options">
            ${suggested.map(p => `
              <button type="button" class="pl2-prism-opt${state.prismId === p.id ? ' active' : ''}" data-action="select-prism" data-id="${esc(p.id)}">
                <span class="pl2-po-icon">${esc(p.icon)}</span>
                <div class="pl2-po-body">
                  <strong class="pl2-po-name">${esc(p.name)}</strong>
                  <p class="pl2-po-desc">${esc(p.desc)}</p>
                  <span class="pl2-po-q">${esc(p.q)}</span>
                </div>
              </button>`).join('')}
          </div>
          <div class="pl2-card-links">
            <button type="button" class="pl2-link-btn" data-action="open-help">Show all 15 prisms</button>
          </div>
        </div>
        ${renderDialogue()}
      </main>
      ${renderToast()}
    </div>`;
  }

  function renderLayer(idx) {
    const question = getLayerQ(idx);
    const x = getX(idx);
    const isLast = idx === 2;
    return `<div class="pl2-shell pl2-work">
      ${renderHeader()}
      <main class="pl2-work-main">
        ${renderCollapsedSteps()}
        <div class="pl2-card">
          <span class="pl2-layer-badge">Layer ${idx + 1} of 3</span>
          <div class="pl2-question-box">${esc(question)}</div>
          <div class="pl2-x-context">X = "<span class="pl2-x-val">${esc(shrink(x, 60))}</span>"</div>
          <textarea class="pl2-textarea" data-action="input-layer" data-layer="${idx}" placeholder="Your answer…" spellcheck="false">${esc(state.layers[idx])}</textarea>
          <div class="pl2-card-footer">
            <button type="button" class="pl2-btn-primary" data-action="submit-layer" data-layer="${idx}" ${norm(state.layers[idx]) ? '' : 'disabled'}>${isLast ? 'Finish →' : 'Continue →'}</button>
          </div>
        </div>
        ${renderDialogue()}
      </main>
      ${renderToast()}
    </div>`;
  }

  function renderOutput() {
    const prism = PRISM_BY_ID[state.prismId];
    const x0 = getX(0);
    const traceItems = [
      { x: x0,                a: state.layers[0] },
      { x: state.anchors[1],  a: state.layers[1] },
      { x: state.anchors[2],  a: state.layers[2] },
    ].filter(r => r.a);

    return `<div class="pl2-shell pl2-output-shell">
      ${renderHeader()}
      <main class="pl2-work-main">
        <div class="pl2-card pl2-output-card">
          <h2 class="pl2-output-h2">What became clear</h2>
          <div class="pl2-output-meta">
            <span class="pl2-om-sentence">"${esc(shrink(state.sentence, 90))}"</span>
            ${prism ? `<span class="pl2-om-prism">${esc(prism.icon + ' ' + prism.name)}</span>` : ''}
          </div>
          <div class="pl2-trace">
            <div class="pl2-trace-seed">"${esc(shrink(x0, 60))}"</div>
            ${traceItems.map(r => `
              <div class="pl2-trace-step">
                <div class="pl2-trace-down">↓</div>
                <div class="pl2-trace-answer">"${esc(shrink(r.a, 80))}"</div>
              </div>`).join('')}
          </div>
          <div class="pl2-output-insight"><p>${esc(summaryInsight())}</p></div>
          <div class="pl2-output-next"><strong>Next question:</strong> ${esc(summaryNextQ())}</div>
        </div>

        <div class="pl2-output-actions">
          <button type="button" class="pl2-btn-primary" data-action="start-practice">Try another sentence →</button>
          <button type="button" class="pl2-btn-secondary" data-action="try-another-prism">Try a different prism on this sentence</button>
          <button type="button" class="pl2-btn-secondary" data-action="save-investigation">Save this investigation</button>
          <button type="button" class="pl2-link-btn" data-action="open-review">Review all steps</button>
        </div>

        ${renderDialogue()}
      </main>
      ${renderToast()}
    </div>`;
  }

  function renderReview() {
    const prism = PRISM_BY_ID[state.prismId];
    return `<div class="pl2-shell pl2-work">
      ${renderHeader()}
      <main class="pl2-work-main">
        <h2 class="pl2-review-h2">Full Investigation Trace</h2>
        <div class="pl2-review-meta">
          <div><strong>Sentence:</strong> "${esc(state.sentence)}"</div>
          <div><strong>Focus:</strong> "${esc(state.focus)}"</div>
          ${prism ? `<div><strong>Prism:</strong> ${esc(prism.icon + ' ' + prism.name)}</div>` : ''}
        </div>
        <div class="pl2-review-layers">
          ${[0, 1, 2].map(i => !state.layers[i] ? '' : `
            <div class="pl2-review-layer">
              <span class="pl2-rl-label">Layer ${i + 1}</span>
              <div class="pl2-rl-q"><strong>Q:</strong> ${esc(getLayerQ(i))}</div>
              <div class="pl2-rl-a"><strong>A:</strong> "${esc(state.layers[i])}"</div>
            </div>`).join('')}
        </div>
        <div class="pl2-review-insight"><p>${esc(summaryInsight())}</p></div>
        <div class="pl2-review-actions">
          <button type="button" class="pl2-btn-primary" data-action="back-to-output">Back to result</button>
          <button type="button" class="pl2-link-btn" data-action="open-help">Learn the underlying model</button>
          <button type="button" class="pl2-link-btn" data-action="try-another-prism">Try different prism</button>
          <button type="button" class="pl2-link-btn" data-action="start-practice">Start new sentence</button>
        </div>
      </main>
      ${renderToast()}
    </div>`;
  }

  // ─── Overlays ─────────────────────────────────────────────────────────────
  function renderAllPrismsOverlay() {
    return `<div class="pl2-overlay" data-action="close-overlay" role="dialog" aria-modal="true" aria-label="All 15 Prisms">
      <div class="pl2-overlay-panel" role="document">
        <div class="pl2-overlay-hdr">
          <h3>All 15 Prisms</h3>
          <button type="button" class="pl2-overlay-close" data-action="close-overlay" aria-label="Close">×</button>
        </div>
        <p class="pl2-overlay-sub">Tap a prism to select it and start excavating.</p>
        <div class="pl2-all-prisms">
          ${PRISMS.map(p => `
            <button type="button" class="pl2-ap-btn${state.prismId === p.id ? ' active' : ''}" data-action="select-prism-overlay" data-id="${esc(p.id)}">
              <span class="pl2-ap-icon">${esc(p.icon)}</span>
              <span class="pl2-ap-name">${esc(p.name)}</span>
              <span class="pl2-ap-desc">${esc(p.desc)}</span>
            </button>`).join('')}
        </div>
      </div>
    </div>`;
  }

  function renderSavedOverlay() {
    if (!state.saved.length) return '';
    return `<div class="pl2-overlay" data-action="close-overlay" role="dialog" aria-modal="true" aria-label="Saved Investigations">
      <div class="pl2-overlay-panel" role="document">
        <div class="pl2-overlay-hdr">
          <h3>Saved Investigations</h3>
          <button type="button" class="pl2-overlay-close" data-action="close-overlay" aria-label="Close">×</button>
        </div>
        <div class="pl2-saved-list">
          ${state.saved.map(item => {
            const p = PRISM_BY_ID[item.prismId];
            return `<div class="pl2-saved-item">
              <div class="pl2-si-head">
                <strong>${esc(p ? p.icon + ' ' + p.name : item.prismId)}</strong>
                <span class="pl2-si-date">${esc(fmtDate(item.savedAt))}</span>
              </div>
              <p class="pl2-si-sentence">"${esc(shrink(item.sentence || '', 70))}"</p>
              ${item.layers && item.layers[2] ? `<p class="pl2-si-result">${esc(shrink(item.layers[2] || item.layers[0] || '', 70))}</p>` : ''}
              <div class="pl2-si-actions">
                <button type="button" class="pl2-btn-small" data-action="load-saved" data-id="${esc(item.id)}">Load</button>
                <button type="button" class="pl2-btn-small pl2-btn-ghost" data-action="delete-saved" data-id="${esc(item.id)}">Delete</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  function render() {
    let html = '';
    switch (state.screen) {
      case 'welcome':      html = renderWelcome(); break;
      case 'input':        html = renderInput(); break;
      case 'detect':       html = renderDetect(); break;
      case 'choose_prism': html = renderChoosePrism(); break;
      case 'layer1':       html = renderLayer(0); break;
      case 'layer2':       html = renderLayer(1); break;
      case 'layer3':       html = renderLayer(2); break;
      case 'output':       html = renderOutput(); break;
      case 'review':       html = renderReview(); break;
      default:             html = renderWelcome();
    }
    if (overlay === 'all-prisms') html += renderAllPrismsOverlay();
    if (overlay === 'saved')      html += renderSavedOverlay();
    root.innerHTML = html;
  }

  // ─── Navigation ───────────────────────────────────────────────────────────
  function goto(screen) {
    state.screen = screen;
    persistDraft();
    render();
    root.scrollIntoView && root.scrollIntoView({ behavior: 'instant', block: 'start' });
  }

  function editStep(screen) {
    // Clear downstream state when going back to edit
    if (screen === 'input')        { state.focus = ''; state.prismId = null; state.layers = ['','','']; state.anchors = ['','','']; state.anchorY = ''; }
    else if (screen === 'detect')  { state.prismId = null; state.layers = ['','','']; state.anchors = ['','','']; state.anchorY = ''; }
    else if (screen === 'choose_prism') { state.layers = ['','','']; state.anchors = ['','','']; state.anchorY = ''; }
    else if (screen === 'layer1')  { state.layers = ['','','']; state.anchors[1] = ''; state.anchors[2] = ''; }
    else if (screen === 'layer2')  { state.layers[1] = ''; state.layers[2] = ''; state.anchors[2] = ''; }
    else if (screen === 'layer3')  { state.layers[2] = ''; }
    goto(screen);
  }

  function initPrism(id) {
    if (!PRISM_BY_ID[id]) return;
    state.prismId = id;
    const prism = PRISM_BY_ID[id];
    state.anchors[0] = deriveSeedX(prism, state.sentence);
    state.anchorY    = deriveSeedY(prism, state.sentence);
    state.layers     = ['', '', ''];
    state.anchors[1] = '';
    state.anchors[2] = '';
  }

  // ─── Event handlers ───────────────────────────────────────────────────────
  function onClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    // Overlay close
    if (action === 'close-overlay') { overlay = null; render(); return; }

    // Overlay open
    if (action === 'open-help')   { overlay = 'all-prisms'; render(); return; }
    if (action === 'open-saved')  { overlay = 'saved'; render(); return; }
    if (action === 'show-all-prisms') { overlay = 'all-prisms'; render(); return; }

    // Welcome actions
    if (action === 'start-practice') {
      state.sentence = ''; state.focus = ''; state.prismId = null;
      state.layers = ['','','']; state.anchors = ['','','']; state.anchorY = '';
      state.hasDraft = false;
      goto('input'); return;
    }
    if (action === 'resume-draft') { goto('input'); return; }

    // Navigation
    if (action === 'go-back') {
      if (state.screen === 'review') { goto('output'); return; }
      const i = SCREEN_ORDER.indexOf(state.screen);
      if (i > 0) goto(SCREEN_ORDER[i - 1]);
      else goto('welcome');
      return;
    }
    if (action === 'edit-step') { editStep(btn.getAttribute('data-screen')); return; }

    // Input screen
    if (action === 'load-demo') { state.sentence = DEMO_SENTENCE; render(); return; }
    if (action === 'submit-sentence') { if (!norm(state.sentence)) return; goto('detect'); return; }

    // Detect screen
    if (action === 'select-focus') {
      state.focus = btn.getAttribute('data-val') || '';
      render(); return;
    }
    if (action === 'submit-focus') { if (!norm(state.focus)) return; goto('choose_prism'); return; }

    // Prism selection
    if (action === 'select-prism') {
      initPrism(btn.getAttribute('data-id'));
      goto('layer1'); return;
    }
    if (action === 'select-prism-overlay') {
      initPrism(btn.getAttribute('data-id'));
      overlay = null;
      if (!state.sentence) { goto('input'); return; }
      if (!state.focus)    { goto('detect'); return; }
      goto('layer1'); return;
    }

    // Layer screens
    if (action === 'submit-layer') {
      const idx = Number(btn.getAttribute('data-layer'));
      const ans = norm(state.layers[idx]);
      if (!ans) return;
      if (idx < 2) {
        state.anchors[idx + 1] = nextAnchor(ans, state.anchors[idx]);
        goto(['layer1','layer2','layer3'][idx + 1]);
      } else {
        goto('output');
      }
      return;
    }

    // Output/review
    if (action === 'try-another-prism') {
      state.prismId = null; state.layers = ['','','']; state.anchors = ['','','']; state.anchorY = '';
      goto('choose_prism'); return;
    }
    if (action === 'save-investigation') {
      const prism = PRISM_BY_ID[state.prismId];
      state.saved.unshift({
        id: 'pl-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
        savedAt: new Date().toISOString(),
        sentence: state.sentence, focus: state.focus,
        prismId: state.prismId, prismName: prism ? prism.name : '',
        layers: [...state.layers], anchors: [...state.anchors]
      });
      state.saved = state.saved.slice(0, 30);
      persistSaved();
      showToast('Investigation saved.');
      return;
    }
    if (action === 'open-review')    { goto('review'); return; }
    if (action === 'back-to-output') { goto('output'); return; }

    // Saved overlay actions
    if (action === 'load-saved') {
      const item = state.saved.find(x => x.id === btn.getAttribute('data-id'));
      if (!item) return;
      state.sentence = item.sentence || '';
      state.focus    = item.focus || '';
      state.prismId  = item.prismId || null;
      state.layers   = Array.isArray(item.layers)  ? [...item.layers]  : ['','',''];
      state.anchors  = Array.isArray(item.anchors) ? [...item.anchors] : ['','',''];
      overlay = null;
      goto('output'); return;
    }
    if (action === 'delete-saved') {
      state.saved = state.saved.filter(x => x.id !== btn.getAttribute('data-id'));
      persistSaved(); render(); return;
    }
  }

  function onInput(e) {
    const t = e.target;
    if (!t) return;
    const action = t.getAttribute('data-action');

    if (action === 'input-sentence') {
      state.sentence = t.value || '';
      const btn = root.querySelector('[data-action="submit-sentence"]');
      if (btn) btn.disabled = !norm(state.sentence);
      return;
    }
    if (action === 'input-focus') {
      state.focus = t.value || '';
      const btn = root.querySelector('[data-action="submit-focus"]');
      if (btn) btn.disabled = !norm(state.focus);
      return;
    }
    if (action === 'input-layer') {
      const idx = Number(t.getAttribute('data-layer'));
      if (Number.isInteger(idx)) {
        state.layers[idx] = t.value || '';
        const btn = root.querySelector(`[data-action="submit-layer"][data-layer="${idx}"]`);
        if (btn) btn.disabled = !norm(state.layers[idx]);
      }
      return;
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && overlay) { overlay = null; render(); }
  }

  // Close overlay when clicking outside the panel
  function onOverlayBackdrop(e) {
    if (!overlay) return;
    const panel = root.querySelector('.pl2-overlay-panel');
    if (panel && !panel.contains(e.target) && e.target.closest('.pl2-overlay')) {
      overlay = null; render();
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  restoreAll();
  root.addEventListener('input', onInput);
  root.addEventListener('click', onClick);
  root.addEventListener('click', onOverlayBackdrop);
  document.addEventListener('keydown', onKeydown);
  render();
})();
