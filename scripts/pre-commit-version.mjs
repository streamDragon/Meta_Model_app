import { spawnSync } from 'node:child_process';
import process from 'node:process';

const ROOT = process.cwd();
const NPM_CMD = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const NODE_CMD = process.execPath;

function runCmd(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: ROOT,
        stdio: 'inherit',
        ...options
    });
    if (result.status !== 0) {
        throw new Error(`Command failed: ${command} ${args.join(' ')}`);
    }
    return result;
}

function hasStagedChanges() {
    const result = spawnSync('git', ['diff', '--cached', '--quiet'], {
        cwd: ROOT
    });
    return result.status === 1;
}

function isMergeCommitInProgress() {
    const result = spawnSync('git', ['rev-parse', '-q', '--verify', 'MERGE_HEAD'], {
        cwd: ROOT
    });
    return result.status === 0;
}

function run() {
    if (!hasStagedChanges()) {
        console.log('pre-commit: no staged changes, skipping version automation.');
        return;
    }

    if (isMergeCommitInProgress()) {
        console.log('pre-commit: merge commit detected, skipping auto version bump.');
    } else if (String(process.env.SKIP_AUTO_VERSION_BUMP || '') !== '1') {
        console.log('pre-commit: auto-bumping patch version...');
        runCmd(NPM_CMD, ['version', 'patch', '--no-git-tag-version', '--silent']);
    } else {
        console.log('pre-commit: skipping auto version bump (SKIP_AUTO_VERSION_BUMP=1).');
    }

    console.log('pre-commit: syncing version metadata into app entry files...');
    runCmd(NODE_CMD, ['scripts/sync-entry.mjs']);

    runCmd('git', ['add', '-f', 'package.json', 'package-lock.json', 'index.html', 'index2.html', 'version.json']);
}

run();
