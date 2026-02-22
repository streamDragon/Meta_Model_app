(function attachTriplesRadarModule(rootFactory) {
    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : this);
    const api = rootFactory(root);
    root.setupTriplesRadarModule = api.setupTriplesRadarModule;
})(function createTriplesRadarModule(root) {
    const STORAGE_KEY = 'triples_radar_progress_v1';

    const ROW_META = Object.freeze({
        row1: Object.freeze({ colorClass: 'row-sky', heLabel: 'שלשה 1 — שכבת מקור' }),
        row2: Object.freeze({ colorClass: 'row-teal', heLabel: 'שלשה 2 — שכבת חוקים' }),
        row3: Object.freeze({ colorClass: 'row-amber', heLabel: 'שלשה 3 — שכבת משמעות' }),
        row4: Object.freeze({ colorClass: 'row-violet', heLabel: 'שלשה 4 — שכבת הקשר' }),
        row5: Object.freeze({ colorClass: 'row-rose', heLabel: 'שלשה 5 — שכבת קרקע' })
    });

    const state = {
        data: null,
        scenarios: [],
        index: 0,
        score: 0,
        solvedCount: 0,
        attemptsInScenario: 0,
        rowHintUsed: false,
        categoryHintUsed: false,
        solved: false,
        selectedCategory: '',
        elements: null,
        uiMode: 'desktop',
        phone: null
    };

    function escapeHtml(value) {
        if (typeof root.escapeHtml === 'function') return root.escapeHtml(value);
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getDefaultProgress() {
        return {
            score: 0,
            solvedCount: 0
        };
    }

    function loadProgress() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return getDefaultProgress();
            const parsed = JSON.parse(raw);
            return {
                ...getDefaultProgress(),
                ...(parsed || {})
            };
        } catch (error) {
            return getDefaultProgress();
        }
    }

    function saveProgress() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                score: state.score,
                solvedCount: state.solvedCount
            }));
        } catch (error) {
            // Ignore storage errors (private mode / quota).
        }
    }

    function getCurrentScenario() {
        return state.scenarios[state.index] || null;
    }

    function getCategoryLabelHe(categoryId) {
        const normalized = root.triplesRadarCore.normalizeCategoryId(categoryId);
        const found = (state.data?.categories || []).find((category) => {
            return root.triplesRadarCore.normalizeCategoryId(category.id) === normalized;
        });
        return found?.labelHe || found?.label || normalized;
    }

    function getCategoryLabelEn(categoryId) {
        const normalized = root.triplesRadarCore.normalizeCategoryId(categoryId);
        const found = (state.data?.categories || []).find((category) => {
            return root.triplesRadarCore.normalizeCategoryId(category.id) === normalized;
        });
        return found?.label || normalized;
    }

    function shouldUsePhoneFlow() {
        if (typeof document === 'undefined' || !document.body) return false;
        if (document.body.classList.contains('force-mobile-view')) return true;
        if (document.body.classList.contains('view-mobile')) return true;
        return false;
    }

    function normalizeSpaces(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function scoreAnchorCandidate(text) {
        const value = normalizeSpaces(text);
        if (!value) return -Infinity;
        const words = value.split(/\s+/).filter(Boolean);
        let score = 0;
        score += Math.min(words.length, 8) * 2;
        if (words.length < 2) score -= 4;
        if (words.length > 10) score -= (words.length - 10);
        if (/[!?]/.test(value)) score += 1;
        if (/\b(no|not|never|always|every|all|none|won't|can't|done)\b/i.test(value)) score += 2;
        return score;
    }

    function uniqueStrings(list) {
        const out = [];
        const seen = new Set();
        (Array.isArray(list) ? list : []).forEach((item) => {
            const value = normalizeSpaces(item);
            if (!value) return;
            const key = value.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            out.push(value);
        });
        return out;
    }

    function chunkWords(words, targetChunks) {
        const chunks = [];
        if (!Array.isArray(words) || !words.length) return chunks;
        const total = words.length;
        const count = Math.max(1, Math.min(targetChunks || 1, total));
        let cursor = 0;
        for (let i = 0; i < count; i += 1) {
            const remainingWords = total - cursor;
            const remainingChunks = count - i;
            const size = Math.ceil(remainingWords / remainingChunks);
            const slice = words.slice(cursor, cursor + size).join(' ').trim();
            if (slice) chunks.push(slice);
            cursor += size;
        }
        return chunks;
    }

    function buildAnchorCandidates(clientText) {
        const source = normalizeSpaces(clientText);
        if (!source) return [];

        const rawPieces = source
            .split(/[.!?;,\n\r]+/)
            .map((part) => normalizeSpaces(part))
            .filter(Boolean);

        let candidates = [...rawPieces];
        const words = source.split(/\s+/).filter(Boolean);

        if (candidates.length < 5 && words.length >= 4) {
            const chunked = chunkWords(words, Math.min(5, Math.max(3, Math.ceil(words.length / 3))));
            candidates.push(...chunked);
        }

        if (candidates.length < 3 && words.length >= 3) {
            for (let i = 0; i < words.length - 1; i += 1) {
                const phrase = words.slice(i, Math.min(words.length, i + 3)).join(' ');
                candidates.push(phrase);
            }
        }

        candidates = uniqueStrings(candidates)
            .filter((value) => value.length >= 4)
            .slice(0, 8);

        if (!candidates.length) candidates = [source];

        const scored = candidates.map((text, index) => ({
            id: `a${index + 1}`,
            text,
            score: scoreAnchorCandidate(text),
            order: index
        }));

        const topIds = new Set(
            [...scored]
                .sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return a.order - b.order;
                })
                .slice(0, Math.min(3, scored.length))
                .map((item) => item.id)
        );

        return scored.map((item) => ({
            id: item.id,
            text: item.text,
            isTop: topIds.has(item.id)
        }));
    }

    function ensurePhoneState() {
        if (!state.phone || typeof state.phone !== 'object') {
            state.phone = {};
        }
        return state.phone;
    }

    function getPhoneCurrentScenarioKey() {
        const current = getCurrentScenario();
        return current ? String(current.id || `idx_${state.index}`) : '';
    }

    function resetPhoneScenarioFlow() {
        const current = getCurrentScenario();
        const phone = ensurePhoneState();
        const anchors = buildAnchorCandidates(current?.clientText || '');
        phone.scenarioKey = getPhoneCurrentScenarioKey();
        phone.phase = 'anchors';
        phone.anchors = anchors;
        phone.selectedAnchorId = '';
        phone.lockedRowId = current ? root.triplesRadarCore.getRowIdByCategory(current.correctCategory) : '';
        phone.usedCategoryIds = [];
        phone.qaFeed = [];
        phone.completedScenario = false;
        phone.reply = null;
        phone.transcriptOpen = false;
        phone.toast = '';
        phone.toastTone = 'info';
        phone.toastNonce = 0;
        if (phone.toastTimer) {
            clearTimeout(phone.toastTimer);
            phone.toastTimer = null;
        }
    }

    function ensurePhoneScenarioFlow() {
        const phone = ensurePhoneState();
        const currentKey = getPhoneCurrentScenarioKey();
        if (phone.scenarioKey !== currentKey) {
            resetPhoneScenarioFlow();
        }
        return phone;
    }

    function getPhoneSelectedAnchor() {
        const phone = ensurePhoneScenarioFlow();
        return (phone.anchors || []).find((anchor) => anchor.id === phone.selectedAnchorId) || null;
    }

    function getPhoneLockedRow() {
        const current = getCurrentScenario();
        if (!current || !root.triplesRadarCore) return null;
        const rowId = root.triplesRadarCore.getRowIdByCategory(current.correctCategory);
        return root.triplesRadarCore.ROWS.find((row) => row.id === rowId) || null;
    }

    function getPhoneCardLetter(index) {
        return ['A', 'B', 'C'][index] || String(index + 1);
    }

    function getShortCategoryChip(categoryId) {
        const label = getCategoryLabelEn(categoryId);
        const map = {
            lost_performative: 'Source',
            assumptions: 'Assume',
            mind_reading: 'Mind',
            universal_quantifier: 'Pattern',
            modal_operator: 'Limit',
            cause_effect: 'Link',
            nominalisations: 'Noun',
            identity_predicates: 'Identity',
            complex_equivalence: 'Meaning',
            comparative_deletion: 'Compare',
            time_space_predicates: 'Time/Place',
            lack_referential_index: 'Who',
            non_referring_nouns: 'What',
            sensory_predicates: 'Sense',
            unspecified_verbs: 'Action'
        };
        const normalized = root.triplesRadarCore.normalizeCategoryId(categoryId);
        return map[normalized] || label.split(/\s+/)[0] || label;
    }

    function clipText(text, maxLen) {
        const value = normalizeSpaces(text);
        if (!value) return '';
        if (value.length <= maxLen) return value;
        return `${value.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
    }

    function buildPhoneQuestion(categoryId) {
        const current = getCurrentScenario();
        const normalized = root.triplesRadarCore.normalizeCategoryId(categoryId);
        const isCorrect = current && root.triplesRadarCore.normalizeCategoryId(current.correctCategory) === normalized;
        if (isCorrect && normalizeSpaces(current?.focusHint)) {
            return normalizeSpaces(current.focusHint);
        }

        const promptMap = {
            lost_performative: 'By what standard is this judged?',
            assumptions: 'What are you assuming must be true here?',
            mind_reading: 'How do you know what the other person thinks?',
            universal_quantifier: 'Always? Any exceptions at all?',
            modal_operator: 'What stops you, exactly?',
            cause_effect: 'How does X create Y, step by step?',
            nominalisations: 'What happens in action, not as a noun?',
            identity_predicates: 'In which area is this true, and where not?',
            complex_equivalence: 'How does this event mean that conclusion?',
            comparative_deletion: 'Compared to what, specifically?',
            time_space_predicates: 'When/where exactly?',
            lack_referential_index: 'Who exactly is “they” here?',
            non_referring_nouns: 'What does that “thing” mean exactly?',
            sensory_predicates: 'What do you see/hear/feel specifically?',
            unspecified_verbs: 'What happens, step by step?'
        };

        return promptMap[normalized] || `What would make "${getCategoryLabelEn(normalized)}" clearer here?`;
    }

    function buildPhoneAnswer(categoryId) {
        const current = getCurrentScenario();
        const anchor = getPhoneSelectedAnchor();
        const anchorText = clipText(anchor?.text || current?.clientText || '', 72);
        const chip = getShortCategoryChip(categoryId).toLowerCase();
        const variants = [
            `Usually when "${anchorText}" happens, I read it as the same ${chip} pattern again.`,
            `In that moment, "${anchorText}" feels like proof, so I react before I check details.`,
            `When I focus on "${anchorText}", I narrow everything to one meaning and lose context.`
        ];
        const index = ensurePhoneScenarioFlow().qaFeed.length % variants.length;
        return variants[index];
    }

    function buildPhoneReplyDraft() {
        const current = getCurrentScenario();
        const phone = ensurePhoneScenarioFlow();
        const anchor = getPhoneSelectedAnchor();
        const qaFeed = Array.isArray(phone.qaFeed) ? phone.qaFeed : [];
        const bullets = qaFeed.map((item) => {
            const short = clipText(item.answer || '', 64);
            return `${item.letter}: ${short}`;
        });

        const anchorText = clipText(anchor?.text || current?.clientText || '', 80);
        const mirror = `Mirror: "When '${anchorText}' hits, it can feel final and heavy."`;
        const gap = 'Gap: "Let us slow it down and test one piece instead of the whole story."';
        const next = 'Next: "Choose one message, one topic, one clear ask."';
        return {
            bullets,
            mirror,
            gap,
            next,
            actions: ['A: Reality plan', 'B: Regulate']
        };
    }

    function showPhoneToast(message, tone) {
        const phone = ensurePhoneScenarioFlow();
        phone.toast = String(message || '');
        phone.toastTone = tone || 'warn';
        phone.toastNonce = (phone.toastNonce || 0) + 1;
        const currentNonce = phone.toastNonce;
        if (phone.toastTimer) {
            clearTimeout(phone.toastTimer);
        }
        phone.toastTimer = setTimeout(() => {
            const activePhone = ensurePhoneState();
            if (activePhone.toastNonce !== currentNonce) return;
            activePhone.toast = '';
            activePhone.toastTone = 'info';
            activePhone.toastTimer = null;
            if (state.uiMode === 'phone') renderBoard();
        }, 1600);
    }

    function phoneSelectAnchor(anchorId) {
        const phone = ensurePhoneScenarioFlow();
        const anchor = (phone.anchors || []).find((item) => item.id === anchorId);
        if (!anchor) return;
        if (!anchor.isTop) {
            showPhoneToast('Not a top anchor. Try another.', 'warn');
            return;
        }
        phone.selectedAnchorId = anchor.id;
        phone.phase = 'focus';
        phone.reply = null;
        phone.transcriptOpen = false;
        phone.toast = '';
        renderBoard();
    }

    function phoneOpenMeta() {
        const phone = ensurePhoneScenarioFlow();
        if (!phone.selectedAnchorId) return;
        phone.phase = 'qa';
        phone.toast = '';
        renderBoard();
    }

    function phoneUseCategory(categoryId) {
        const phone = ensurePhoneScenarioFlow();
        if (!phone.selectedAnchorId) return;
        if (phone.phase !== 'qa' && phone.phase !== 'done') return;
        const normalized = root.triplesRadarCore.normalizeCategoryId(categoryId);
        if (!normalized) return;
        if ((phone.usedCategoryIds || []).includes(normalized)) return;

        const row = getPhoneLockedRow();
        const rowCategories = Array.isArray(row?.categories) ? row.categories.map((id) => root.triplesRadarCore.normalizeCategoryId(id)) : [];
        if (!rowCategories.includes(normalized)) return;

        const letter = getPhoneCardLetter(rowCategories.indexOf(normalized));
        const entry = {
            letter,
            categoryId: normalized,
            categoryLabel: getCategoryLabelEn(normalized),
            question: buildPhoneQuestion(normalized),
            answer: buildPhoneAnswer(normalized)
        };

        phone.usedCategoryIds = [...(phone.usedCategoryIds || []), normalized];
        phone.qaFeed = [...(phone.qaFeed || []), entry];
        phone.transcriptOpen = false;
        phone.toast = '';

        state.score += 1;
        if (phone.usedCategoryIds.length >= rowCategories.length && !phone.completedScenario) {
            phone.completedScenario = true;
            phone.phase = 'done';
            state.solvedCount += 1;
        } else {
            phone.phase = 'qa';
        }
        saveProgress();
        renderBoard();
    }

    function phoneGenerateReply() {
        const phone = ensurePhoneScenarioFlow();
        if ((phone.qaFeed || []).length < 3) return;
        phone.reply = buildPhoneReplyDraft();
        phone.phase = 'done';
        renderBoard();
    }

    function phoneToggleTranscript() {
        const phone = ensurePhoneScenarioFlow();
        phone.transcriptOpen = !phone.transcriptOpen;
        renderBoard();
    }

    function renderPhoneBoard() {
        const current = getCurrentScenario();
        const rootEl = state.elements?.root;
        if (!current || !rootEl) return;

        const phone = ensurePhoneScenarioFlow();
        const selectedAnchor = getPhoneSelectedAnchor();
        const row = getPhoneLockedRow();
        const rowMeta = row ? (ROW_META[row.id] || ROW_META.row1) : ROW_META.row1;
        const rowCategories = Array.isArray(row?.categories) ? row.categories : [];
        const topAnchors = (phone.anchors || []).filter((item) => item.isTop);
        const qaFeed = Array.isArray(phone.qaFeed) ? phone.qaFeed : [];
        const canGenerate = qaFeed.length >= Math.min(3, rowCategories.length || 3);

        const stepSubtitleMap = {
            anchors: 'Tap 1 highlight (Top 3 only)',
            focus: 'Good pick. Continue.',
            qa: `Tap 3 cards (each once) ${qaFeed.length}/3`,
            done: phone.reply ? 'Reply draft ready' : '3/3 done'
        };
        const headerTitleMap = {
            anchors: 'Triples Radar',
            focus: 'Anchor selected',
            qa: 'Meta on this anchor',
            done: phone.reply ? 'Therapist reply' : '3/3 done'
        };

        const highlightButtons = (phone.anchors || []).map((anchor) => {
            const isSelected = selectedAnchor && selectedAnchor.id === anchor.id;
            const disabled = !!selectedAnchor && !isSelected;
            const classes = [
                'tr-phone-highlight',
                anchor.isTop ? 'is-top' : 'is-weak',
                isSelected ? 'is-selected' : '',
                disabled ? 'is-faded' : ''
            ].filter(Boolean).join(' ');
            return `
                <button
                    type="button"
                    class="${classes}"
                    data-tr-phone-anchor-id="${escapeHtml(anchor.id)}"
                    ${disabled ? 'tabindex="-1" disabled' : ''}>
                    ${escapeHtml(anchor.text)}
                    ${anchor.isTop ? '<span class="tr-phone-badge">Top</span>' : ''}
                </button>
            `;
        }).join('');

        const tripleCards = rowCategories.map((categoryId, idx) => {
            const normalized = root.triplesRadarCore.normalizeCategoryId(categoryId);
            const used = (phone.usedCategoryIds || []).includes(normalized);
            const classes = [
                'tr-phone-card-btn',
                `row-tone-${escapeHtml(rowMeta.colorClass || 'row-sky')}`,
                used ? 'is-used' : ''
            ].join(' ');
            return `
                <button
                    type="button"
                    class="${classes}"
                    data-tr-phone-cat-id="${escapeHtml(normalized)}"
                    ${phone.phase === 'focus' ? 'disabled' : ''}
                    ${used ? 'disabled' : ''}>
                    <span class="tr-phone-card-letter">${escapeHtml(getPhoneCardLetter(idx))}</span>
                    <span class="tr-phone-card-chip">${escapeHtml(getShortCategoryChip(normalized))}</span>
                    <small class="tr-phone-card-label">${escapeHtml(getCategoryLabelEn(normalized))}</small>
                    ${used ? '<span class="tr-phone-card-used">Used ✓</span>' : ''}
                </button>
            `;
        }).join('');

        const qaFeedHtml = qaFeed.length
            ? qaFeed.map((item) => `
                <article class="tr-phone-qa-item">
                    <div class="tr-phone-qa-kicker">Q/A ${escapeHtml(item.letter)} · ${escapeHtml(item.categoryLabel)}</div>
                    <p class="tr-phone-q-line"><strong>Q:</strong> ${escapeHtml(item.question)}</p>
                    <p class="tr-phone-a-line"><strong>A:</strong> ${escapeHtml(item.answer)}</p>
                </article>
            `).join('')
            : '<p class="tr-phone-muted">Tap one card to create a question + client answer.</p>';

        const collectedHtml = qaFeed.length
            ? qaFeed.map((item) => `<li><strong>${escapeHtml(item.letter)}</strong> · ${escapeHtml(getShortCategoryChip(item.categoryId))}: ${escapeHtml(clipText(item.answer, 56))}</li>`).join('')
            : '';

        const replyHtml = phone.reply
            ? `
                <section class="tr-phone-panel">
                    <div class="tr-phone-panel-title">THERAPIST REPLY (draft)</div>
                    <p>${escapeHtml(phone.reply.mirror)}</p>
                    <p>${escapeHtml(phone.reply.gap)}</p>
                    <p>${escapeHtml(phone.reply.next)}</p>
                    <div class="tr-phone-inline-actions">
                        ${(phone.reply.actions || []).map((label) => `<button type="button" class="tr-phone-mini-btn" disabled>${escapeHtml(label)}</button>`).join('')}
                    </div>
                </section>
            `
            : '';

        const transcriptHtml = phone.transcriptOpen
            ? `
                <section class="tr-phone-panel tr-phone-transcript">
                    <div class="tr-phone-panel-title">Transcript</div>
                    <div class="tr-phone-transcript-block"><strong>Client</strong><p>${escapeHtml(current.clientText || '')}</p></div>
                    <div class="tr-phone-transcript-block"><strong>Anchor</strong><p>${escapeHtml(selectedAnchor?.text || '')}</p></div>
                    ${qaFeed.map((item) => `
                        <div class="tr-phone-transcript-block">
                            <strong>Q/A ${escapeHtml(item.letter)}</strong>
                            <p><em>Q:</em> ${escapeHtml(item.question)}</p>
                            <p><em>A:</em> ${escapeHtml(item.answer)}</p>
                        </div>
                    `).join('')}
                    ${phone.reply ? `
                        <div class="tr-phone-transcript-block">
                            <strong>Reply</strong>
                            <p>${escapeHtml(phone.reply.mirror)}</p>
                            <p>${escapeHtml(phone.reply.gap)}</p>
                            <p>${escapeHtml(phone.reply.next)}</p>
                        </div>
                    ` : ''}
                </section>
            `
            : '';

        const focusPanelHtml = selectedAnchor
            ? `
                <section class="tr-phone-panel tr-phone-anchor-panel">
                    <div class="tr-phone-panel-title">SELECTED ANCHOR</div>
                    <p class="tr-phone-anchor-text">${escapeHtml(selectedAnchor.text)}</p>
                    ${phone.phase === 'focus' ? `
                        <button type="button" class="tr-phone-meta-btn" data-tr-phone-action="meta">Meta Model</button>
                    ` : ''}
                </section>
            `
            : '';

        const qaPanelHtml = selectedAnchor && (phone.phase === 'qa' || phone.phase === 'done' || phone.reply)
            ? `
                <section class="tr-phone-panel tr-phone-locked-panel">
                    <div class="tr-phone-panel-title">TRIPLE (LOCKED)</div>
                    <div class="tr-phone-row-note">${escapeHtml(rowMeta.heLabel || '')}</div>
                    <div class="tr-phone-cards">${tripleCards}</div>
                    <div class="tr-phone-panel-title">Q/A FEED</div>
                    <div class="tr-phone-qa-feed">${qaFeedHtml}</div>
                </section>
            `
            : '';

        const donePanelHtml = selectedAnchor && phone.phase === 'done'
            ? `
                <section class="tr-phone-panel tr-phone-done-panel">
                    <div class="tr-phone-header-row">
                        <div class="tr-phone-panel-title">3/3 done</div>
                        <div class="tr-phone-done-micro">Scene ${state.index + 1}/${state.scenarios.length}</div>
                    </div>
                    <div class="tr-phone-inline-actions">
                        <button type="button" class="tr-phone-primary-btn" data-tr-phone-action="generate" ${canGenerate ? '' : 'disabled'}>Generate Reply</button>
                        <button type="button" class="tr-phone-secondary-btn" data-tr-phone-action="transcript">${phone.transcriptOpen ? 'Hide Transcript' : 'Transcript'}</button>
                    </div>
                    <div class="tr-phone-panel-title">COLLECTED</div>
                    <ul class="tr-phone-collected-list">${collectedHtml}</ul>
                </section>
            `
            : '';

        rootEl.innerHTML = `
            <div class="triples-radar-phone-shell">
                <div class="triples-radar-phone-header">
                    <div>
                        <h4>${escapeHtml(headerTitleMap[phone.phase] || 'Triples Radar')}</h4>
                        <p>${escapeHtml(stepSubtitleMap[phone.phase] || '')}</p>
                    </div>
                    <div class="triples-radar-phone-stats">
                        <span>Scene ${state.index + 1}/${state.scenarios.length}</span>
                        <span>Score ${state.score}</span>
                    </div>
                </div>

                <section class="tr-phone-panel tr-phone-client-panel">
                    <div class="tr-phone-panel-title">CLIENT BLOCK</div>
                    <p class="tr-phone-client-text">${escapeHtml(current.clientText || '')}</p>
                    <div class="tr-phone-highlights">${highlightButtons}</div>
                    <div class="tr-phone-top3-line">
                        <strong>TOP 3:</strong>
                        <span>${escapeHtml(topAnchors.map((item) => item.text).join(' | '))}</span>
                    </div>
                </section>

                ${focusPanelHtml}
                ${qaPanelHtml}
                ${donePanelHtml}
                ${replyHtml}
                ${transcriptHtml}

                <div class="tr-phone-footer-actions">
                    <button type="button" class="tr-phone-secondary-btn" data-tr-phone-action="restart">Restart run</button>
                    <button type="button" class="tr-phone-primary-btn" data-tr-phone-action="next">Next scene</button>
                </div>

                ${phone.toast ? `<div class="tr-phone-toast" data-tone="${escapeHtml(phone.toastTone || 'info')}">${escapeHtml(phone.toast)}</div>` : ''}
            </div>
        `;
    }

    function setFeedback(message, tone) {
        if (!state.elements?.feedback) return;
        state.elements.feedback.textContent = message || '';
        state.elements.feedback.dataset.tone = tone || 'info';
    }

    function setStepStatus(message) {
        if (!state.elements?.step) return;
        state.elements.step.textContent = message || '';
    }

    function renderBoard() {
        const current = getCurrentScenario();
        if (!current || !state.elements) return;
        if (state.uiMode === 'phone') {
            renderPhoneBoard();
            return;
        }

        const rows = root.triplesRadarCore.ROWS;
        const currentEvaluation = state.selectedCategory
            ? root.triplesRadarCore.evaluateSelection(current.correctCategory, state.selectedCategory)
            : null;
        const correctCategoryNormalized = root.triplesRadarCore.normalizeCategoryId(current.correctCategory);
        const correctRowId = root.triplesRadarCore.getRowIdByCategory(current.correctCategory);

        state.elements.statement.textContent = current.clientText || '';
        state.elements.focusHint.textContent = current.focusHint ? `רמז מיקוד: ${current.focusHint}` : '';
        state.elements.counter.textContent = `${state.index + 1}/${state.scenarios.length}`;
        state.elements.score.textContent = `${state.score}`;
        state.elements.solvedCount.textContent = `${state.solvedCount}`;

        state.elements.rows.innerHTML = rows.map((row) => {
            const rowMeta = ROW_META[row.id] || ROW_META.row1;
            const isCorrectRow = correctRowId === row.id;
            const isHintRow = !state.solved && state.rowHintUsed && isCorrectRow;
            const isSolvedRow = state.solved && isCorrectRow;
            const rowClass = [
                'triples-radar-row',
                rowMeta.colorClass,
                isHintRow ? 'is-hint' : '',
                isSolvedRow ? 'is-solved' : ''
            ].filter(Boolean).join(' ');

            // Display order is reversed for RTL training scan (e.g., Mind Reading on the right in Row 1).
            const displayCategories = [...row.categories].reverse();
            const cards = displayCategories.map((categoryId) => {
                const normalizedCategory = root.triplesRadarCore.normalizeCategoryId(categoryId);
                const isSelected = root.triplesRadarCore.normalizeCategoryId(state.selectedCategory) === normalizedCategory;
                const isCorrectCategory = correctCategoryNormalized === normalizedCategory;
                const shouldRevealCorrectCategory = !state.solved && state.categoryHintUsed && isCorrectCategory;

                const categoryClass = [
                    'triples-radar-cat-btn',
                    isSelected ? 'is-selected' : '',
                    state.solved && isCorrectCategory ? 'is-correct' : '',
                    shouldRevealCorrectCategory ? 'is-reveal' : '',
                    (!state.solved && isSelected && currentEvaluation?.status === 'same_row') ? 'is-close' : '',
                    (!state.solved && isSelected && currentEvaluation?.status === 'wrong_row') ? 'is-wrong' : ''
                ].filter(Boolean).join(' ');

                return `
                    <button
                        type="button"
                        class="${categoryClass}"
                        data-category-id="${escapeHtml(normalizedCategory)}"
                        ${state.solved ? 'disabled' : ''}>
                        <span class="cat-label">${escapeHtml(getCategoryLabelHe(normalizedCategory))}</span>
                    </button>
                `;
            }).join('');

            return `
                <article class="${rowClass}" data-row-id="${row.id}">
                    <div class="triples-radar-row-head">
                        <strong>${escapeHtml(rowMeta.heLabel)}</strong>
                    </div>
                    <div class="triples-radar-row-cats">
                        ${cards}
                    </div>
                </article>
            `;
        }).join('');
    }

    function updateHintControls() {
        if (state.uiMode === 'phone') return;
        if (!state.elements?.rowHintBtn) return;
        if (!state.elements?.catHintBtn) return;
        state.elements.rowHintBtn.disabled = state.solved || state.rowHintUsed;
        state.elements.catHintBtn.disabled = state.solved || state.categoryHintUsed;
    }

    function handleAutoHints(result) {
        if (state.solved) return;
        if (state.attemptsInScenario >= 2 && !state.rowHintUsed) {
            state.rowHintUsed = true;
            setFeedback('❌ עדיין לא מדויק. הדלקתי לך את השורה הנכונה כדי לחדד מיקוד.', 'warn');
        }
        if (state.attemptsInScenario >= 3 && result.status !== 'exact' && !state.categoryHintUsed) {
            state.categoryHintUsed = true;
            setFeedback('❌ ניסיון שלישי: הדלקתי גם את הקטגוריה המדויקת. עכשיו סמן אותה.', 'warn');
        }
    }

    function evaluatePick(categoryId) {
        if (state.solved) return;
        const current = getCurrentScenario();
        if (!current) return;

        state.selectedCategory = categoryId;
        state.attemptsInScenario += 1;

        const result = root.triplesRadarCore.evaluateSelection(current.correctCategory, categoryId);
        if (result.status === 'exact') {
            state.solved = true;
            state.solvedCount += 1;
            state.score += Math.max(1, 4 - Math.max(1, state.attemptsInScenario));
            saveProgress();
            setFeedback('✅ מדויק. פגעת בקטגוריה הנכונה בתוך השלשה.', 'success');
            setStepStatus('סגור/י סצנה: לחץ/י "הבא" כדי לעבור למשפט הבא.');
            if (typeof root.playUISound === 'function') root.playUISound('success');
        } else if (result.status === 'same_row') {
            setFeedback('🟨 קרוב מאוד. זו השלשה הנכונה, אבל לא האחות המדויקת.', 'warn');
            setStepStatus('עדיין בתוך אותה סצנה: בחר/י קטגוריה אחרת באותה שלשה.');
            if (typeof root.playUISound === 'function') root.playUISound('warning');
            handleAutoHints(result);
        } else if (result.status === 'wrong_row') {
            setFeedback('❌ לא בשורה הנכונה. נסה/י שלשה אחרת.', 'danger');
            setStepStatus('נסה/י שוב: חפש/י קודם שורה נכונה, אחר כך קטגוריה.');
            if (typeof root.playUISound === 'function') root.playUISound('error');
            handleAutoHints(result);
        } else {
            setFeedback('⚠️ לא הצלחתי לזהות את הבחירה. נסה/י שוב.', 'warn');
            setStepStatus('בחר/י קטגוריה מתוך אחת מהשלשות.');
        }

        updateHintControls();
        renderBoard();
    }

    function nextScenario() {
        if (!state.scenarios.length) return;
        state.index = (state.index + 1) % state.scenarios.length;
        state.attemptsInScenario = 0;
        state.rowHintUsed = false;
        state.categoryHintUsed = false;
        state.solved = false;
        state.selectedCategory = '';
        if (state.uiMode === 'phone') resetPhoneScenarioFlow();
        setFeedback('בחר/י קטגוריה אחת מתוך הטבלה.', 'info');
        setStepStatus('שלב 1: קרא/י את המשפט. שלב 2: בחר/י קטגוריה.');
        updateHintControls();
        renderBoard();
    }

    function restartRun() {
        state.index = 0;
        state.attemptsInScenario = 0;
        state.rowHintUsed = false;
        state.categoryHintUsed = false;
        state.solved = false;
        state.selectedCategory = '';
        if (state.uiMode === 'phone') resetPhoneScenarioFlow();
        setFeedback('איפוס ריצה: חזרנו לסצנה הראשונה.', 'info');
        setStepStatus('שלב 1: קרא/י את המשפט. שלב 2: בחר/י קטגוריה.');
        updateHintControls();
        renderBoard();
    }

    function revealRowHint() {
        if (state.solved || state.rowHintUsed) return;
        state.rowHintUsed = true;
        setFeedback('רמז: סימנתי לך את השלשה הנכונה.', 'info');
        updateHintControls();
        renderBoard();
    }

    function revealCategoryHint() {
        if (state.solved || state.categoryHintUsed) return;
        state.categoryHintUsed = true;
        setFeedback('רמז מדויק: סימנתי את הקטגוריה הנכונה.', 'info');
        updateHintControls();
        renderBoard();
    }

    function bindEvents() {
        const rootEl = state.elements?.root;
        if (!rootEl || rootEl.dataset.boundTriplesRadar === 'true') return;
        rootEl.dataset.boundTriplesRadar = 'true';

        rootEl.addEventListener('click', (event) => {
            const phoneAnchorBtn = event.target.closest('[data-tr-phone-anchor-id]');
            if (phoneAnchorBtn) {
                const anchorId = phoneAnchorBtn.getAttribute('data-tr-phone-anchor-id') || '';
                phoneSelectAnchor(anchorId);
                return;
            }

            const phoneCatBtn = event.target.closest('[data-tr-phone-cat-id]');
            if (phoneCatBtn) {
                const categoryId = phoneCatBtn.getAttribute('data-tr-phone-cat-id') || '';
                phoneUseCategory(categoryId);
                return;
            }

            const phoneActionBtn = event.target.closest('[data-tr-phone-action]');
            if (phoneActionBtn) {
                const action = phoneActionBtn.getAttribute('data-tr-phone-action') || '';
                if (action === 'meta') phoneOpenMeta();
                if (action === 'generate') phoneGenerateReply();
                if (action === 'transcript') phoneToggleTranscript();
                if (action === 'next') nextScenario();
                if (action === 'restart') restartRun();
                return;
            }

            const categoryBtn = event.target.closest('[data-category-id]');
            if (categoryBtn) {
                const categoryId = categoryBtn.getAttribute('data-category-id') || '';
                evaluatePick(categoryId);
                return;
            }

            const actionBtn = event.target.closest('[data-tr-action]');
            if (!actionBtn) return;
            const action = actionBtn.getAttribute('data-tr-action');
            if (action === 'next') nextScenario();
            if (action === 'restart') restartRun();
            if (action === 'hint-row') revealRowHint();
            if (action === 'hint-category') revealCategoryHint();
        });
    }

    async function loadData() {
        const response = await fetch('data/triples-radar-scenarios.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const raw = await response.json();
        const scenarios = Array.isArray(raw.scenarios) ? raw.scenarios : [];
        const categories = Array.isArray(raw.categories) ? raw.categories : [];
        return { scenarios, categories };
    }

    function setupElements() {
        state.elements = {
            root: document.getElementById('triples-radar-root'),
            statement: document.getElementById('triples-radar-statement'),
            focusHint: document.getElementById('triples-radar-focus-hint'),
            rows: document.getElementById('triples-radar-rows'),
            feedback: document.getElementById('triples-radar-feedback'),
            counter: document.getElementById('triples-radar-counter'),
            score: document.getElementById('triples-radar-score'),
            solvedCount: document.getElementById('triples-radar-solved-count'),
            step: document.getElementById('triples-radar-step'),
            rowHintBtn: document.querySelector('[data-tr-action="hint-row"]'),
            catHintBtn: document.querySelector('[data-tr-action="hint-category"]')
        };
    }

    async function setupTriplesRadarModule() {
        state.uiMode = shouldUsePhoneFlow() ? 'phone' : 'desktop';
        if (state.uiMode === 'phone') {
            state.elements = { root: document.getElementById('triples-radar-root') };
        } else {
            setupElements();
        }
        if (!state.elements?.root) return;
        if (!root.triplesRadarCore) {
            state.elements.root.innerHTML = '<p class="triples-radar-error">שגיאה: מנוע Triples Radar לא נטען.</p>';
            return;
        }

        if (!state.data) {
            try {
                state.data = await loadData();
                state.scenarios = [...state.data.scenarios];
            } catch (error) {
                state.elements.root.innerHTML = `<p class="triples-radar-error">שגיאה בטעינת הסצנות: ${escapeHtml(error.message || 'לא ידוע')}</p>`;
                return;
            }
        }

        const saved = loadProgress();
        state.score = Number(saved.score) || 0;
        state.solvedCount = Number(saved.solvedCount) || 0;
        state.index = 0;
        state.attemptsInScenario = 0;
        state.rowHintUsed = false;
        state.categoryHintUsed = false;
        state.solved = false;
        state.selectedCategory = '';
        if (state.uiMode === 'phone') resetPhoneScenarioFlow();

        bindEvents();
        setFeedback('בחר/י קטגוריה אחת מתוך הטבלה.', 'info');
        setStepStatus('שלב 1: קרא/י את המשפט. שלב 2: בחר/י קטגוריה.');
        updateHintControls();
        renderBoard();
    }

    return Object.freeze({
        setupTriplesRadarModule
    });
});
