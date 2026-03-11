import { spawnSync } from 'node:child_process';
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

function runGitCapture(args) {
    try {
        const result = spawnSync('git', args, {
            cwd: ROOT,
            encoding: 'utf8',
            shell: false
        });
        if (result.status !== 0) return '';
        return String(result.stdout || '').trim();
    } catch (_error) {
        return '';
    }
}

function isGitAncestor(candidate, head) {
    const from = String(candidate || '').trim();
    const to = String(head || '').trim();
    if (!from || !to) return false;
    try {
        const result = spawnSync('git', ['merge-base', '--is-ancestor', from, to], {
            cwd: ROOT,
            shell: false
        });
        return result.status === 0;
    } catch (_error) {
        return false;
    }
}

function getLocalGitContext() {
    return {
        branch: runGitCapture(['branch', '--show-current']),
        head: runGitCapture(['rev-parse', '--short', 'HEAD']),
        parent: runGitCapture(['rev-parse', '--short', 'HEAD^'])
    };
}

function describeLocalSourceCommit(localGit, manifestCommit) {
    const head = String(localGit?.head || '').trim();
    const parent = String(localGit?.parent || '').trim();
    const commit = String(manifestCommit || '').trim();

    if (!commit) {
        return {
            status: 'missing',
            detail: 'Local version.json is missing gitCommit/source metadata.'
        };
    }
    if (commit === 'unknown') {
        return {
            status: 'unknown',
            detail: 'Local version.json gitCommit is "unknown", so source provenance could not be verified.'
        };
    }
    if (head && commit === head) {
        return {
            status: 'head',
            detail: `Local metadata source commit matches HEAD (${head}).`
        };
    }
    if (parent && commit === parent) {
        return {
            status: 'expected-parent',
            detail: `Local metadata source commit matches HEAD^ (${parent}), which is expected for tracked files generated before commit.`
        };
    }
    if (head && isGitAncestor(commit, head)) {
        return {
            status: 'older-ancestor',
            detail: `Local metadata source commit ${commit} is an older ancestor of HEAD ${head}; sync-entry may be more than one commit behind.`
        };
    }
    return {
        status: 'unrelated',
        detail: `Local metadata source commit ${commit} is not HEAD/HEAD^ and is not an ancestor of HEAD ${head || '-'}.`
    };
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
    const localGit = getLocalGitContext();

    const localVersion = JSON.parse(await readFile(LOCAL_VERSION_PATH, 'utf8'));
    const [liveVersion, liveIndexHtml] = await Promise.all([
        fetchJson(versionUrl),
        fetchText(indexUrl)
    ]);
    const liveIndexAttrs = parseHtmlBuildAttrs(liveIndexHtml);
    const localSourceCommit = describeLocalSourceCommit(localGit, localVersion.gitCommit);
    const fields = ['version', 'buildTime', 'buildIso', 'gitCommit'];

    console.log('=== Local Git Context ===');
    console.log(row('branch', localGit.branch));
    console.log(row('HEAD', localGit.head));
    console.log(row('HEAD^', localGit.parent));
    console.log('');

    console.log('=== Local ===');
    console.log(row('version', localVersion.version));
    console.log(row('buildTime', localVersion.buildTime));
    console.log(row('buildIso', localVersion.buildIso));
    console.log(row('gitCommit', localVersion.gitCommit));
    console.log('');

    console.log('=== Local source commit status ===');
    console.log(localSourceCommit.detail);
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

    console.log('=== Comparisons (live version.json vs live index.html attrs) ===');
    console.log(compareField('version', liveVersion.version, liveIndexAttrs.version));
    console.log(compareField('buildTime', liveVersion.buildTime, liveIndexAttrs.buildTime));
    console.log(compareField('buildIso', liveVersion.buildIso, liveIndexAttrs.buildIso));
    console.log(compareField('gitCommit', liveVersion.gitCommit, liveIndexAttrs.gitCommit));
    console.log('');

    const allMatch = fields.every((key) =>
        String(localVersion[key] || '').trim() === String(liveVersion[key] || '').trim()
    );
    const liveHtmlMatches = fields.every((key) =>
        String(liveVersion[key] || '').trim() === String(liveIndexAttrs[key] || '').trim()
    );
    const sourceCommitHealthy = localSourceCommit.status === 'head' || localSourceCommit.status === 'expected-parent';

    if (allMatch && liveHtmlMatches && sourceCommitHealthy) {
        console.log('OK: GitHub Pages matches local build metadata, and local gitCommit/source metadata is in the expected state.');
    } else if (allMatch && liveHtmlMatches) {
        console.log('WARNING: Live matches local build metadata, but local gitCommit/source metadata looks older than expected for the current HEAD.');
    } else {
        console.log('WARNING: Live GitHub Pages does not match local build metadata yet (push/deploy/cache may still be pending).');
    }
}

run().catch((error) => {
    console.error('check-live-version failed:', error.message);
    process.exit(1);
});
