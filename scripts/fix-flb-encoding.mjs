/**
 * fix-flb-encoding.mjs
 * Decodes mojibake Hebrew strings in feeling-language-bridge.js
 *
 * Root cause: The file's Hebrew strings are stored as mojibake where:
 *   - U+05F3 (׳) represents the UTF-8 first byte 0xD7
 *   - Following chars represent the second UTF-8 byte via Windows-1252 mapping
 *
 * Running with --dry-run just prints decoded strings without writing.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'js', 'feeling-language-bridge.js');
const DRY_RUN = process.argv.includes('--dry-run');

/* ── Windows-1252 byte 0x80-0x9F → Unicode code point ── */
const W1252 = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E,
  0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6,
  0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152,
  0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C,
  0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A,
  0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178,
};

/* Reverse: Unicode code point → byte */
const cpToByte = new Map();
for (const [b, cp] of Object.entries(W1252)) {
  cpToByte.set(Number(cp), Number(b));
}
for (let i = 0; i <= 0xFF; i++) {
  if (!cpToByte.has(i)) cpToByte.set(i, i);
}
// Windows-1255 specific overrides (differ from Latin-1 / W1252)
cpToByte.set(0x00D7, 0xAA); // × (multiplication sign) → byte 0xAA in W1255
cpToByte.set(0x00F7, 0xBA); // ÷ (division sign)      → byte 0xBA in W1255
cpToByte.set(0x20AA, 0xA4); // ₪ (shekel sign)        → byte 0xA4 in W1255

function tryDecode(str) {
  const bytes = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp === 0x05F3) {          // ׳ → first byte 0xD7
      bytes.push(0xD7);
    } else if (cp === 0x05F4) {   // ״ → first byte 0xD7 (gershayim variant)
      bytes.push(0xD7);
    } else {
      const b = cpToByte.get(cp);
      if (b !== undefined) {
        bytes.push(b);
      } else {
        return null; // unmappable character
      }
    }
  }
  try {
    const decoded = Buffer.from(bytes).toString('utf8');
    // Valid if it contains at least one Hebrew character
    if (/[\u05D0-\u05FF\s\d.,!?'"():\-–—]/.test(decoded) && decoded.length > 0) {
      return decoded;
    }
    return null;
  } catch { return null; }
}

/* ── Global pair replacement: every ׳X pair → Hebrew char ── */
function fixContent(src) {
  let fixedCount = 0;
  // Replace each ׳X pair with the corresponding Hebrew character
  // This works globally (string literals, regex literals, template literals)
  const result = src.replace(/\u05F3(.)/gu, (pair, secondChar) => {
    const cp = secondChar.codePointAt(0);
    const secondByte = cpToByte.get(cp);
    if (secondByte === undefined) return pair; // can't decode, leave as-is
    try {
      const decoded = Buffer.from([0xD7, secondByte]).toString('utf8');
      // Sanity: must decode to a valid Hebrew or combining Unicode char
      const code = decoded.codePointAt(0);
      if (code >= 0x05D0 && code <= 0x05FF) {
        fixedCount++;
        if (DRY_RUN && fixedCount <= 20) {
          console.log(`  ${pair} (U+${cp.toString(16)}) → '${decoded}'`);
        }
        return decoded;
      }
    } catch {}
    return pair;
  });
  return { result, fixedCount };
}

const src = readFileSync(FILE, 'utf8');
console.log(`Reading: ${FILE}`);
console.log(`File size: ${src.length} chars`);

const { result, fixedCount } = fixContent(src);

if (DRY_RUN) {
  console.log(`\nDRY RUN — would fix ${fixedCount} strings. Run without --dry-run to apply.`);
} else {
  if (fixedCount === 0) {
    console.log('No strings needed fixing. File unchanged.');
  } else {
    writeFileSync(FILE, result, 'utf8');
    console.log(`Fixed ${fixedCount} string literals. File updated.`);
  }
}
