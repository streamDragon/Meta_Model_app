(function attachHebrewSanitize(rootFactory) {
    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : this);
    const api = rootFactory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.hebrewSanitize = api;
})(function createHebrewSanitizeApi() {
    const HEBREW_RANGE_REGEX = /[\u0590-\u05FF]/;
    const SPACE_REGEX = /[ \t]+/g;
    const COMMON_TYPO_REPLACEMENTS = Object.freeze([
        Object.freeze({ wrong: 'נורת הההתובנות', right: 'נורת ההתובנות' }),
        Object.freeze({ wrong: 'הההתובנות', right: 'ההתובנות' }),
        Object.freeze({ wrong: 'מפששט', right: 'משפט' }),
        Object.freeze({ wrong: 'מפששטים', right: 'משפטים' }),
        Object.freeze({ wrong: 'התתרגיל', right: 'התרגיל' }),
        Object.freeze({ wrong: 'הגגיון', right: 'ההיגיון' }),
        Object.freeze({ wrong: 'לעששות', right: 'לעשות' }),
        Object.freeze({ wrong: 'זה לא שקר', right: 'זה לא בהכרח שקר' })
    ]);

    function isHebrewBoundaryChar(char) {
        return !char || !HEBREW_RANGE_REGEX.test(char);
    }

    function replaceWholeHebrewToken(text, wrong, right) {
        const source = String(text || '');
        if (!wrong || source.indexOf(wrong) < 0) return source;
        let result = '';
        let cursor = 0;
        while (cursor < source.length) {
            const matchIndex = source.indexOf(wrong, cursor);
            if (matchIndex < 0) {
                result += source.slice(cursor);
                break;
            }
            const prevChar = matchIndex > 0 ? source.charAt(matchIndex - 1) : '';
            const nextChar = source.charAt(matchIndex + wrong.length);
            const isBoundaryMatch = isHebrewBoundaryChar(prevChar) && isHebrewBoundaryChar(nextChar);
            result += source.slice(cursor, matchIndex);
            result += isBoundaryMatch ? right : wrong;
            cursor = matchIndex + wrong.length;
        }
        return result;
    }

    function fixCommonHebrewTypos(text) {
        let output = String(text || '');
        COMMON_TYPO_REPLACEMENTS.forEach((pair) => {
            output = replaceWholeHebrewToken(output, pair.wrong, pair.right);
        });
        return output;
    }

    function collapseRepeatedHebrewLetters(text) {
        return String(text || '').replace(/([\u0590-\u05FF])\1{2,}/g, '$1$1');
    }

    function normalizeHebrewPunctuation(text) {
        const raw = String(text || '');
        if (!raw) return raw;

        let collapsed = raw.replace(SPACE_REGEX, ' ').replace(/\s+([.,:;!?])/g, '$1').trim();
        if (!collapsed) return collapsed;

        const punctuationSet = new Set(['.', ',', ':', ';', '!', '?']);
        const closingSet = new Set(['.', ',', ':', ';', '!', '?', ')', ']', '}', '"', "'", '״', '׳']);

        let result = '';
        for (let i = 0; i < collapsed.length; i += 1) {
            const ch = collapsed.charAt(i);
            if (!punctuationSet.has(ch)) {
                result += ch;
                continue;
            }

            result = result.replace(/[ \t]+$/, '');
            result += ch;

            let j = i + 1;
            while (j < collapsed.length && /\s/.test(collapsed.charAt(j))) {
                j += 1;
            }
            const nextChar = collapsed.charAt(j);
            const prevChar = result.length > 1 ? result.charAt(result.length - 2) : '';
            const isDecimalDot = ch === '.' && /\d/.test(prevChar) && /\d/.test(nextChar);
            const shouldAddSpace = Boolean(
                nextChar
                && !/\s/.test(nextChar)
                && !closingSet.has(nextChar)
                && !isDecimalDot
            );

            if (shouldAddSpace) {
                result += ' ';
            }
            i = j - 1;
        }
        return result.replace(SPACE_REGEX, ' ').trim();
    }

    function sanitizeHebrewText(text) {
        const source = String(text || '');
        const afterTypos = fixCommonHebrewTypos(source);
        const afterRepeats = collapseRepeatedHebrewLetters(afterTypos);
        return normalizeHebrewPunctuation(afterRepeats);
    }

    function hasObviousHebrewTypos(text) {
        const source = String(text || '');
        const issues = [];
        if (/([\u0590-\u05FF])\1{2,}/.test(source)) {
            issues.push('repeated_hebrew_letter_3plus');
        }
        COMMON_TYPO_REPLACEMENTS.forEach((pair) => {
            if (source.includes(pair.wrong)) {
                issues.push(`known_typo:${pair.wrong}`);
            }
        });
        return {
            ok: issues.length === 0,
            issues
        };
    }

    function sanitizeHebrewJsonStrings(value) {
        if (typeof value === 'string') {
            return sanitizeHebrewText(value);
        }
        if (Array.isArray(value)) {
            return value.map((item) => sanitizeHebrewJsonStrings(item));
        }
        if (value && typeof value === 'object') {
            const output = {};
            Object.keys(value).forEach((key) => {
                output[key] = sanitizeHebrewJsonStrings(value[key]);
            });
            return output;
        }
        return value;
    }

    return Object.freeze({
        fixCommonHebrewTypos,
        normalizeHebrewPunctuation,
        collapseRepeatedHebrewLetters,
        sanitizeHebrewText,
        sanitizeHebrewJsonStrings,
        hasObviousHebrewTypos
    });
});
