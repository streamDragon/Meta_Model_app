import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const INDEX_HTML_PATH = path.join(ROOT, 'index.html');
const INDEX2_HTML_PATH = path.join(ROOT, 'index2.html');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');
const VERSION_MANIFEST_PATH = path.join(ROOT, 'version.json');

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

function setHtmlAttr(attrs, attrName, value) {
    const escapedName = String(attrName || '').trim();
    const nextValue = String(value == null ? '' : value);
    const pattern = new RegExp(`${escapedName}\\s*=\\s*"[^"]*"`, 'i');
    if (pattern.test(attrs)) {
        return attrs.replace(pattern, `${escapedName}="${nextValue}"`);
    }
    return `${attrs} ${escapedName}="${nextValue}"`;
}

function getGitCommitShort() {
    try {
        const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
            cwd: ROOT,
            encoding: 'utf8',
            shell: process.platform === 'win32'
        });
        if (result.status !== 0) return 'unknown';
        const hash = String(result.stdout || '').trim();
        return hash || 'unknown';
    } catch (error) {
        return 'unknown';
    }
}

function syncHtmlVersion(html, version, buildTime, buildIso, gitCommit) {
    const normalizedVersion = String(version || '').trim() || 'dev';
    const timestamp = String(buildTime || Date.now());
    const iso = String(buildIso || new Date(Number(buildTime) || Date.now()).toISOString());
    const commit = String(gitCommit || '').trim() || 'unknown';
    return html.replace(/<html\b([^>]*)>/i, (fullMatch, attrs) => {
        let nextAttrs = String(attrs || '');

        nextAttrs = setHtmlAttr(nextAttrs, 'data-app-version', normalizedVersion);
        nextAttrs = setHtmlAttr(nextAttrs, 'data-build-time', timestamp);
        nextAttrs = setHtmlAttr(nextAttrs, 'data-build-iso', iso);
        nextAttrs = setHtmlAttr(nextAttrs, 'data-git-commit', commit);

        return `<html${nextAttrs}>`;
    });
}

function buildVersionManifest(version, buildTime, buildIso, gitCommit) {
    const normalizedVersion = String(version || '').trim() || 'dev';
    const normalizedBuildTime = String(buildTime || Date.now());
    const normalizedBuildIso = String(buildIso || new Date(Number(buildTime) || Date.now()).toISOString());
    const normalizedGitCommit = String(gitCommit || '').trim() || 'unknown';
    return `${JSON.stringify({
        version: normalizedVersion,
        buildTime: normalizedBuildTime,
        buildIso: normalizedBuildIso,
        gitCommit: normalizedGitCommit
    }, null, 2)}\n`;
}

async function run() {
    const pkgRaw = await readFile(PACKAGE_JSON_PATH, 'utf8');
    const pkg = JSON.parse(pkgRaw);
    const version = String(pkg?.version || '').trim();
    if (!version) throw new Error('package.json version is missing');
    const buildTime = Date.now();
    const buildIso = new Date(buildTime).toISOString();
    const gitCommit = getGitCommitShort();

    const indexHtml = await readFile(INDEX_HTML_PATH, 'utf8');
    const nextIndexHtml = syncHtmlVersion(indexHtml, version, buildTime, buildIso, gitCommit);
    if (nextIndexHtml !== indexHtml) {
        await writeFile(INDEX_HTML_PATH, nextIndexHtml, 'utf8');
        console.log(`Synced index.html data-app-version to ${version}`);
    } else {
        console.log(`index.html data-app-version already ${version}`);
    }

    const nextVersionManifest = buildVersionManifest(version, buildTime, buildIso, gitCommit);
    let currentVersionManifest = '';
    try {
        currentVersionManifest = await readFile(VERSION_MANIFEST_PATH, 'utf8');
    } catch (error) {
        currentVersionManifest = '';
    }

    if (currentVersionManifest !== nextVersionManifest) {
        await writeFile(VERSION_MANIFEST_PATH, nextVersionManifest, 'utf8');
        console.log(`Wrote version.json manifest for ${version} (${gitCommit})`);
    } else {
        console.log(`version.json manifest already synced (${version})`);
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
