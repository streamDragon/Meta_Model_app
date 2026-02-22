import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const INDEX_HTML_PATH = path.join(ROOT, 'index.html');
const INDEX2_HTML_PATH = path.join(ROOT, 'index2.html');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');

const INDEX2_REDIRECT_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=./index.html">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meta Model</title>
    <script>
        (function () {
            var target = new URL('./index.html', window.location.href);
            if (window.location.search) target.search = window.location.search;
            if (window.location.hash) target.hash = window.location.hash;
            window.location.replace(target.toString());
        })();
    </script>
</head>
<body>
    <p>מעביר ל-<a href="./index.html">index.html</a>...</p>
</body>
</html>
`;

function syncHtmlVersion(html, version) {
    const normalizedVersion = String(version || '').trim() || 'dev';
    return html.replace(/<html\b([^>]*)>/i, (fullMatch, attrs) => {
        let nextAttrs = String(attrs || '');
        if (/data-app-version\s*=\s*"[^"]*"/i.test(nextAttrs)) {
            nextAttrs = nextAttrs.replace(/data-app-version\s*=\s*"[^"]*"/i, `data-app-version="${normalizedVersion}"`);
        } else {
            nextAttrs = `${nextAttrs} data-app-version="${normalizedVersion}"`;
        }
        return `<html${nextAttrs}>`;
    });
}

async function run() {
    const pkgRaw = await readFile(PACKAGE_JSON_PATH, 'utf8');
    const pkg = JSON.parse(pkgRaw);
    const version = String(pkg?.version || '').trim();
    if (!version) throw new Error('package.json version is missing');

    const indexHtml = await readFile(INDEX_HTML_PATH, 'utf8');
    const nextIndexHtml = syncHtmlVersion(indexHtml, version);
    if (nextIndexHtml !== indexHtml) {
        await writeFile(INDEX_HTML_PATH, nextIndexHtml, 'utf8');
        console.log(`Synced index.html data-app-version to ${version}`);
    } else {
        console.log(`index.html data-app-version already ${version}`);
    }

    let currentIndex2 = '';
    try {
        currentIndex2 = await readFile(INDEX2_HTML_PATH, 'utf8');
    } catch (error) {
        currentIndex2 = '';
    }

    if (currentIndex2 !== INDEX2_REDIRECT_HTML) {
        await writeFile(INDEX2_HTML_PATH, INDEX2_REDIRECT_HTML, 'utf8');
        console.log('Wrote index2.html compatibility redirect -> index.html');
    } else {
        console.log('index2.html compatibility redirect already up to date');
    }
}

run().catch((error) => {
    console.error('sync-entry failed:', error.message);
    process.exit(1);
});
