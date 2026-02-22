(function attachSentenceMorpherCore(rootFactory) {
    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : this);
    const api = rootFactory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.sentenceMorpherCore = api;
})(function createSentenceMorpherCore() {
    const INSERT_STRATEGIES = Object.freeze({
        prepend: true,
        append: true,
        beforeToken: true,
        afterToken: true
    });

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function normalizeText(value) {
        return String(value || '').trim();
    }

    function normalizeTokenForMatch(tokenText) {
        return String(tokenText || '')
            .toLowerCase()
            .replace(/^[\[\](){}"':;,.!?־–—]+|[\[\](){}"':;,.!?־–—]+$/g, '')
            .trim();
    }

    function tokenizeSentence(sentence) {
        const source = normalizeText(sentence);
        if (!source) return [];
        return source.split(/\s+/).filter(Boolean).map((text, index) => ({
            id: `base-${index + 1}`,
            text,
            rawText: text,
            kind: 'base',
            highlighted: false
        }));
    }

    function cloneSelectedChips(selectedChips) {
        const source = selectedChips && typeof selectedChips === 'object' ? selectedChips : {};
        const output = {};
        Object.keys(source).forEach((axisId) => {
            output[axisId] = asArray(source[axisId]).map((chipId) => normalizeText(chipId)).filter(Boolean);
        });
        return output;
    }

    function createInitialSelectedState(axes) {
        const state = {};
        asArray(axes).forEach((axis) => {
            const axisId = normalizeText(axis && axis.id);
            if (!axisId) return;
            state[axisId] = [];
        });
        return state;
    }

    function getAxisSelectionMode(axis) {
        const mode = normalizeText(axis && axis.selectionMode).toLowerCase();
        return mode === 'multi' ? 'multi' : 'single';
    }

    function toggleChipSelection(selectedChips, axes, axisId, chipId) {
        const normalizedAxisId = normalizeText(axisId);
        const normalizedChipId = normalizeText(chipId);
        if (!normalizedAxisId || !normalizedChipId) return cloneSelectedChips(selectedChips);

        const axis = asArray(axes).find((item) => normalizeText(item && item.id) === normalizedAxisId);
        if (!axis) return cloneSelectedChips(selectedChips);

        const next = cloneSelectedChips(selectedChips);
        const previous = asArray(next[normalizedAxisId]);
        const mode = getAxisSelectionMode(axis);

        if (mode === 'multi') {
            const exists = previous.includes(normalizedChipId);
            next[normalizedAxisId] = exists
                ? previous.filter((id) => id !== normalizedChipId)
                : [...previous, normalizedChipId];
            return next;
        }

        if (previous.length === 1 && previous[0] === normalizedChipId) {
            next[normalizedAxisId] = [];
        } else {
            next[normalizedAxisId] = [normalizedChipId];
        }
        return next;
    }

    function getSelectedChipEntries(axes, selectedChips) {
        const selected = selectedChips && typeof selectedChips === 'object' ? selectedChips : {};
        const entries = [];

        asArray(axes).forEach((axis, axisOrder) => {
            const axisId = normalizeText(axis && axis.id);
            if (!axisId) return;
            const selectedIds = asArray(selected[axisId]);
            if (!selectedIds.length) return;

            asArray(axis && axis.chips).forEach((chip, chipOrder) => {
                const chipId = normalizeText(chip && chip.id);
                if (!chipId || !selectedIds.includes(chipId)) return;
                entries.push({
                    axisId,
                    axisLabel: normalizeText(axis.label),
                    axisOrder,
                    chipOrder,
                    chip: { ...chip, id: chipId }
                });
            });
        });

        entries.sort((a, b) => {
            if (a.axisOrder !== b.axisOrder) return a.axisOrder - b.axisOrder;
            return a.chipOrder - b.chipOrder;
        });

        return entries;
    }

    function normalizeInsertionDirective(rawDirective, fallback = {}) {
        if (typeof rawDirective === 'string') {
            return normalizeInsertionDirective({ text: rawDirective }, fallback);
        }

        const source = rawDirective && typeof rawDirective === 'object'
            ? { ...rawDirective }
            : {};

        const text = normalizeText(source.text || fallback.text);
        if (!text) return null;

        const strategyRaw = normalizeText(source.insertStrategy || source.strategy || fallback.insertStrategy || fallback.strategy);
        const strategy = INSERT_STRATEGIES[strategyRaw] ? strategyRaw : 'append';
        const anchor = normalizeText(source.anchor || fallback.anchor);
        const allowDuplicate = Boolean(source.allowDuplicate ?? fallback.allowDuplicate ?? false);
        const bracketed = Boolean(source.bracketed ?? fallback.bracketed ?? false);
        const sourceLabel = normalizeText(source.source || fallback.source || '');
        const showHint = Boolean(source.showHint ?? fallback.showHint ?? false);

        return {
            text,
            strategy,
            anchor,
            allowDuplicate,
            bracketed,
            source: sourceLabel,
            showHint
        };
    }

    function findAnchorIndex(tokens, anchor, preferLast = false) {
        const normalizedAnchor = normalizeTokenForMatch(anchor);
        if (!normalizedAnchor) return -1;

        if (preferLast) {
            for (let index = tokens.length - 1; index >= 0; index -= 1) {
                const token = tokens[index];
                if (normalizeTokenForMatch(token && token.rawText).includes(normalizedAnchor)) return index;
            }
            return -1;
        }

        for (let index = 0; index < tokens.length; index += 1) {
            const token = tokens[index];
            if (normalizeTokenForMatch(token && token.rawText).includes(normalizedAnchor)) return index;
        }
        return -1;
    }

    function hasDuplicateToken(tokens, text) {
        const normalizedNeedle = normalizeTokenForMatch(text);
        if (!normalizedNeedle) return false;
        return tokens.some((token) => normalizeTokenForMatch(token && token.rawText) === normalizedNeedle);
    }

    function resolveInsertIndex(tokens, directive, cursorState) {
        const strategy = directive.strategy;
        if (strategy === 'prepend') return Math.max(0, cursorState.prependIndex);
        if (strategy === 'append') return tokens.length;

        const anchorIndex = findAnchorIndex(tokens, directive.anchor, false);

        if (anchorIndex >= 0) {
            return strategy === 'afterToken' ? anchorIndex + 1 : anchorIndex;
        }

        if (strategy === 'beforeToken') return 0;
        return tokens.length;
    }

    function insertDirectiveToken(tokens, directive, cursorState, metadata = {}) {
        if (!directive) return { inserted: false, skippedDuplicate: false };

        if (!directive.allowDuplicate && hasDuplicateToken(tokens, directive.text)) {
            return { inserted: false, skippedDuplicate: true };
        }

        const insertIndex = resolveInsertIndex(tokens, directive, cursorState);
        const displayedText = directive.bracketed ? `[${directive.text}]` : directive.text;
        const token = {
            id: `${metadata.kind || 'insert'}-${Math.random().toString(36).slice(2, 10)}`,
            text: displayedText,
            rawText: directive.text,
            kind: metadata.kind || 'insert',
            axisId: metadata.axisId || '',
            chipId: metadata.chipId || '',
            highlighted: Boolean(directive.bracketed)
        };

        tokens.splice(insertIndex, 0, token);

        if (directive.strategy === 'prepend') {
            cursorState.prependIndex += 1;
        } else if (insertIndex <= cursorState.prependIndex) {
            cursorState.prependIndex += 1;
        }

        return { inserted: true, skippedDuplicate: false, token };
    }

    function normalizeImpliedTokens(rawImpliedTokens, fallback = {}) {
        return asArray(rawImpliedTokens)
            .map((item) => normalizeInsertionDirective(item, fallback))
            .filter(Boolean);
    }

    function normalizeAutoGrammarResult(result) {
        if (!result) return { impliedTokens: [], hint: '' };
        if (Array.isArray(result)) return { impliedTokens: normalizeImpliedTokens(result), hint: '' };
        if (typeof result === 'object') {
            return {
                impliedTokens: normalizeImpliedTokens(result.impliedTokens || result.tokens || []),
                hint: normalizeText(result.hint)
            };
        }
        return { impliedTokens: [], hint: '' };
    }

    function runAutoGrammarRules(autoGrammarRules, context) {
        if (!autoGrammarRules) return { impliedTokens: [], hint: '' };
        if (typeof autoGrammarRules === 'function') {
            return normalizeAutoGrammarResult(autoGrammarRules(context));
        }
        return normalizeAutoGrammarResult(autoGrammarRules);
    }

    function buildImpliedHint(appliedImpliedTokens) {
        if (!appliedImpliedTokens.length) return '';
        const first = appliedImpliedTokens[0];
        return `נשמט כאן '${first.text}' והתווסף אוטומטית.`;
    }

    function composeSentence(params) {
        const source = params && typeof params === 'object' ? params : {};
        const baseSentence = normalizeText(source.baseSentence);
        const axes = asArray(source.axes);
        const selectedChips = cloneSelectedChips(source.selectedChips || createInitialSelectedState(axes));

        const selectedChipEntries = getSelectedChipEntries(axes, selectedChips);
        const tokens = tokenizeSentence(baseSentence);
        const cursorState = { prependIndex: 0 };

        const impliedTokens = [];
        selectedChipEntries.forEach((entry) => {
            const directives = normalizeImpliedTokens(entry.chip.impliedTokens, {
                strategy: entry.chip.insertStrategy || 'append',
                anchor: entry.chip.anchor || '',
                source: `chip:${entry.chip.id}`
            });
            directives.forEach((directive) => impliedTokens.push(directive));
        });

        const autoGrammarResult = runAutoGrammarRules(source.autoGrammarRules, {
            baseSentence,
            axes,
            selectedChips: cloneSelectedChips(selectedChips),
            selectedChipEntries
        });
        autoGrammarResult.impliedTokens.forEach((directive) => impliedTokens.push(directive));

        const appliedImpliedTokens = [];
        impliedTokens.forEach((directive) => {
            const result = insertDirectiveToken(tokens, directive, cursorState, { kind: 'implied' });
            if (result.inserted) appliedImpliedTokens.push(directive);
        });

        const appliedChipTokens = [];
        selectedChipEntries.forEach((entry) => {
            const directive = normalizeInsertionDirective({
                text: entry.chip.text,
                insertStrategy: entry.chip.insertStrategy,
                anchor: entry.chip.anchor,
                bracketed: true,
                allowDuplicate: false,
                source: `chip:${entry.chip.id}`
            });
            const result = insertDirectiveToken(tokens, directive, cursorState, {
                kind: 'chip',
                axisId: entry.axisId,
                chipId: entry.chip.id
            });
            if (result.inserted) {
                appliedChipTokens.push({
                    axisId: entry.axisId,
                    axisLabel: entry.axisLabel,
                    chipId: entry.chip.id,
                    text: entry.chip.text
                });
            }
        });

        const plainSentence = tokens.map((token) => token.text).join(' ').replace(/\s+/g, ' ').trim();
        const hints = [];
        const impliedHint = buildImpliedHint(appliedImpliedTokens);
        if (impliedHint) hints.push(impliedHint);
        if (autoGrammarResult.hint) hints.push(autoGrammarResult.hint);

        return {
            plainSentence,
            tokens,
            hints,
            selectedChips: cloneSelectedChips(selectedChips),
            selectedChipEntries,
            appliedChipTokens,
            appliedImpliedTokens
        };
    }

    return Object.freeze({
        tokenizeSentence,
        createInitialSelectedState,
        cloneSelectedChips,
        toggleChipSelection,
        composeSentence,
        getSelectedChipEntries,
        normalizeInsertionDirective
    });
});
