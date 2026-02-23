import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const LOCAL_VERSION_PATH = path.join(ROOT, 'version.json');
const DEFAULT_BASE_URL = 'https://streamdragon.github.io/Meta_Model_app/';

function stripTrailingSlash(value) {
    return String(value || '').replace(/\/+$/, '');
}

function parseHtmlBuildAttrs(html) {
    const source = String(html || '');
    const attr = (name) => {
        const match = source.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'));
        return match ? String(match[1] || '').trim() : '';
    };
    return {
        version: attr('data-app-version'),
        buildTime: attr('data-build-time'),
        buildIso: attr('data-build-iso'),
        gitCommit: attr('data-git-commit')
    };
}

function row(label, value) {
    return `${label.padEnd(18)} ${value || '-'}`;
}

function compareField(name, localValue, remoteValue) {
    const localNorm = String(localValue || '').trim();
    const remoteNorm = String(remoteValue || '').trim();
    const ok = localNorm && remoteNorm && localNorm === remoteNorm;
    const status = ok ? 'MATCH' : 'DIFF ';
    return `${status} ${name}: local=${localNorm || '-'} | live=${remoteNorm || '-'}`;
}

async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
}

async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
}

async function run() {
    const baseUrl = stripTrailingSlash(process.argv[2] || DEFAULT_BASE_URL);
    const versionUrl = `${baseUrl}/version.json`;
    const indexUrl = `${baseUrl}/`;

    const localVersion = JSON.parse(await readFile(LOCAL_VERSION_PATH, 'utf8'));
    const [liveVersion, liveIndexHtml] = await Promise.all([
        fetchJson(versionUrl),
        fetchText(indexUrl)
    ]);
    const liveIndexAttrs = parseHtmlBuildAttrs(liveIndexHtml);

    console.log('=== Local ===');
    console.log(row('version', localVersion.version));
    console.log(row('buildTime', localVersion.buildTime));
    console.log(row('buildIso', localVersion.buildIso));
    console.log(row('gitCommit', localVersion.gitCommit));
    console.log('');

    console.log('=== Live version.json ===');
    console.log(row('version', liveVersion.version));
    console.log(row('buildTime', liveVersion.buildTime));
    console.log(row('buildIso', liveVersion.buildIso));
    console.log(row('gitCommit', liveVersion.gitCommit));
    console.log('');

    console.log('=== Live index.html attrs ===');
    console.log(row('version', liveIndexAttrs.version));
    console.log(row('buildTime', liveIndexAttrs.buildTime));
    console.log(row('buildIso', liveIndexAttrs.buildIso));
    console.log(row('gitCommit', liveIndexAttrs.gitCommit));
    console.log('');

    console.log('=== Comparisons (local vs live version.json) ===');
    console.log(compareField('version', localVersion.version, liveVersion.version));
    console.log(compareField('buildTime', localVersion.buildTime, liveVersion.buildTime));
    console.log(compareField('buildIso', localVersion.buildIso, liveVersion.buildIso));
    console.log(compareField('gitCommit', localVersion.gitCommit, liveVersion.gitCommit));
    console.log('');

    const allMatch = ['version', 'buildTime', 'buildIso', 'gitCommit'].every((key) =>
        String(localVersion[key] || '').trim() === String(liveVersion[key] || '').trim()
    );
    if (allMatch) {
        console.log('OK: GitHub Pages is serving the same build metadata as local version.json');
    } else {
        console.log('WARNING: Live GitHub Pages does not match local build metadata yet (push/deploy/cache may still be pending).');
    }
}

run().catch((error) => {
    console.error('check-live-version failed:', error.message);
    process.exit(1);
});
