import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const NPM_CANDIDATES = process.platform === 'win32' ? ['npm.cmd', 'npm'] : ['npm'];
const NODE_CMD = process.execPath;
const NPM_CLI_PATH = path.join(path.dirname(NODE_CMD), 'node_modules', 'npm', 'bin', 'npm-cli.js');

function runCmd(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: ROOT,
        stdio: 'inherit',
        ...options
    });
    if (result.status !== 0) {
        const cause = result.error ? ` (${result.error.message})` : '';
        throw new Error(`Command failed: ${command} ${args.join(' ')}${cause}`);
    }
    return result;
}

function runCmdWithFallback(commands, args, options = {}) {
    let lastError = null;
    for (const command of commands) {
        try {
            return runCmd(command, args, options);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError ?? new Error(`All command candidates failed: ${commands.join(', ')}`);
}

function runNpmVersionPatch() {
    try {
        return runCmdWithFallback(NPM_CANDIDATES, ['version', 'patch', '--no-git-tag-version', '--silent']);
    } catch (err) {
        if (existsSync(NPM_CLI_PATH)) {
            console.log(`pre-commit: PATH npm not found, retrying via npm-cli at ${NPM_CLI_PATH}`);
            return runCmd(NODE_CMD, [NPM_CLI_PATH, 'version', 'patch', '--no-git-tag-version', '--silent']);
        }
        throw err;
    }
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
        runNpmVersionPatch();
    } else {
        console.log('pre-commit: skipping auto version bump (SKIP_AUTO_VERSION_BUMP=1).');
    }

    console.log('pre-commit: syncing version metadata into app entry files...');
    runCmd(NODE_CMD, ['scripts/sync-entry.mjs']);

    runCmd('git', ['add', '-f', 'package.json', 'package-lock.json', 'index.html', 'index2.html', 'version.json', 'js/runtime-env.js']);
}

run();
