import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import childProcess from 'node:child_process';

const TEXT_EXTENSIONS = new Set([
    '.js',
    '.mjs',
    '.cjs',
    '.ts',
    '.tsx',
    '.html',
    '.json',
    '.css',
    '.md',
    '.txt'
]);

const IGNORE_PREFIXES = [
    'node_modules/',
    'dist/',
    'reports/',
    'test-results/'
];

function looksLikeMojibakeText(value) {
    const text = String(value || '');
    if (!text) return false;
    const marks = (text.match(/\u05F3/g) || []).length;
    if (marks >= 3) return true;
    if (/(?:\u05F3[^\u0590-\u05FF\s]){2,}/u.test(text)) return true;
    return /\u05F3[A-Za-z0-9]|\uFFFD|\u00D7[A-Za-z\u00C0-\u00FF]|[\u00D7\u00D7][\u0080-\u00FF]/u.test(text);
}

let win1255ReverseByteMap = null;

function getWin1255ReverseByteMap() {
    if (win1255ReverseByteMap) return win1255ReverseByteMap;
    let decoder = null;
    try {
        decoder = new TextDecoder('windows-1255');
    } catch (_error) {
        return null;
    }

    const map = new Map();
    for (let byte = 0; byte <= 255; byte += 1) {
        const decoded = decoder.decode(new Uint8Array([byte]));
        if (!decoded || decoded === '\uFFFD') continue;
        if (!map.has(decoded)) map.set(decoded, byte);
    }
    win1255ReverseByteMap = map;
    return map;
}

function decodeWin1255MojibakeToUtf8SinglePass(value) {
    const raw = String(value || '');
    if (!raw || !looksLikeMojibakeText(raw)) return raw;

    const reverseMap = getWin1255ReverseByteMap();
    if (!reverseMap) return raw;

    const bytes = [];
    for (const ch of raw) {
        if (reverseMap.has(ch)) {
            bytes.push(reverseMap.get(ch));
            continue;
        }
        const code = ch.codePointAt(0);
        if (Number.isFinite(code) && code <= 0x7f) {
            bytes.push(code);
            continue;
        }
        return raw;
    }

    let decoded = raw;
    try {
        decoded = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
    } catch (_error) {
        return raw;
    }
    if (!decoded || decoded === raw) return raw;

    const decodedLooksBetter = !looksLikeMojibakeText(decoded)
        && (/[\u0590-\u05FF]/u.test(decoded) || /[“”’‘–—…]/u.test(decoded));
    return decodedLooksBetter ? decoded : raw;
}

function decodeWin1255MojibakeToUtf8(value) {
    let current = String(value || '');
    if (!current) return current;
    for (let i = 0; i < 3; i += 1) {
        const decoded = decodeWin1255MojibakeToUtf8SinglePass(current);
        if (!decoded || decoded === current) break;
        current = decoded;
        if (!looksLikeMojibakeText(current)) break;
    }
    return current;
}

function decodeSuspiciousRuns(input) {
    let changed = 0;
    const output = String(input || '').replace(/[\u0080-\u05FF][\u0009\u0020-\u05FF]*/g, (segment) => {
        if (!looksLikeMojibakeText(segment)) return segment;
        const decoded = decodeWin1255MojibakeToUtf8(segment);
        if (decoded !== segment) changed += 1;
        return decoded;
    });
    return { output, changed };
}

function decodeStringLiteralsInJs(input) {
    const src = String(input || '');
    let i = 0;
    let out = '';
    let state = 'normal';
    let buf = '';
    let changed = 0;

    const flushString = (quoteChar) => {
        const decoded = decodeSuspiciousRuns(buf);
        changed += decoded.changed;
        out += decoded.output + quoteChar;
        buf = '';
    };

    while (i < src.length) {
        const ch = src[i];
        const next = src[i + 1] || '';

        if (state === 'normal') {
            if (ch === '/' && next === '/') {
                out += ch + next;
                i += 2;
                state = 'lineComment';
                continue;
            }
            if (ch === '/' && next === '*') {
                out += ch + next;
                i += 2;
                state = 'blockComment';
                continue;
            }
            if (ch === '\'') {
                out += ch;
                state = 'single';
                i += 1;
                continue;
            }
            if (ch === '"') {
                out += ch;
                state = 'double';
                i += 1;
                continue;
            }
            if (ch === '`') {
                out += ch;
                state = 'template';
                buf = '';
                i += 1;
                continue;
            }
            out += ch;
            i += 1;
            continue;
        }

        if (state === 'lineComment') {
            out += ch;
            i += 1;
            if (ch === '\n') state = 'normal';
            continue;
        }

        if (state === 'blockComment') {
            out += ch;
            i += 1;
            if (ch === '*' && next === '/') {
                out += '/';
                i += 1;
                state = 'normal';
            }
            continue;
        }

        if (state === 'template') {
            if (ch === '\\') {
                buf += ch;
                i += 1;
                if (i < src.length) {
                    buf += src[i];
                    i += 1;
                }
                continue;
            }
            if (ch === '`') {
                const decoded = decodeSuspiciousRuns(buf);
                changed += decoded.changed;
                out += decoded.output + '`';
                buf = '';
                state = 'normal';
                i += 1;
                continue;
            }
            buf += ch;
            i += 1;
            continue;
        }

        if (state === 'single' || state === 'double') {
            const expectedQuote = state === 'single' ? '\'' : '"';
            if (ch === '\\') {
                buf += ch;
                i += 1;
                if (i < src.length) {
                    buf += src[i];
                    i += 1;
                }
                continue;
            }
            if (ch === expectedQuote) {
                flushString(expectedQuote);
                state = 'normal';
                i += 1;
                continue;
            }
            buf += ch;
            i += 1;
            continue;
        }
    }

    if (state === 'single' || state === 'double') out += buf;
    if (state === 'template') out += buf;

    return { output: out, changed };
}

function deepNormalizeJson(value) {
    if (typeof value === 'string') {
        return decodeWin1255MojibakeToUtf8(value);
    }
    if (Array.isArray(value)) {
        return value.map((item) => deepNormalizeJson(item));
    }
    if (value && typeof value === 'object') {
        const out = {};
        Object.keys(value).forEach((key) => {
            out[key] = deepNormalizeJson(value[key]);
        });
        return out;
    }
    return value;
}

function shouldProcessFile(filePath) {
    const normalized = String(filePath || '').replace(/\\/g, '/');
    if (!normalized) return false;
    if (IGNORE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;
    return TEXT_EXTENSIONS.has(path.extname(normalized).toLowerCase());
}

function processFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const original = fs.readFileSync(filePath, 'utf8');
    let next = original;
    let changes = 0;

    if (ext === '.json') {
        try {
            const parsed = JSON.parse(original);
            const normalized = deepNormalizeJson(parsed);
            next = `${JSON.stringify(normalized, null, 2)}\n`;
            changes = next === original ? 0 : 1;
        } catch (_error) {
            const decoded = decodeSuspiciousRuns(original);
            next = decoded.output;
            changes = decoded.changed;
        }
    } else if (ext === '.js' || ext === '.mjs' || ext === '.cjs' || ext === '.ts' || ext === '.tsx') {
        const decoded = decodeStringLiteralsInJs(original);
        next = decoded.output;
        changes = decoded.changed;
    } else {
        const decoded = decodeSuspiciousRuns(original);
        next = decoded.output;
        changes = decoded.changed;
    }

    if (next !== original) {
        fs.writeFileSync(filePath, next, 'utf8');
        return { filePath, changes, wrote: true };
    }
    return { filePath, changes, wrote: false };
}

function getTrackedFiles() {
    const stdout = childProcess.execSync('git ls-files', { encoding: 'utf8' });
    return stdout.split(/\r?\n/).filter(Boolean);
}

function run() {
    const files = getTrackedFiles().filter(shouldProcessFile);
    let wrote = 0;
    let touched = 0;

    files.forEach((filePath) => {
        const result = processFile(filePath);
        if (result.changes > 0) touched += 1;
        if (result.wrote) {
            wrote += 1;
            console.log(`UPDATED ${filePath}`);
        }
    });

    console.log(`Done. scanned=${files.length} touched=${touched} updated=${wrote}`);
}

run();
