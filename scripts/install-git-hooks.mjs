import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const HOOK_PATH = '.githooks';
const PRE_COMMIT_HOOK = path.join(ROOT, HOOK_PATH, 'pre-commit');

function runGit(args, options = {}) {
    return spawnSync('git', args, {
        cwd: ROOT,
        encoding: 'utf8',
        ...options
    });
}

function isGitRepo() {
    const result = runGit(['rev-parse', '--is-inside-work-tree']);
    return result.status === 0 && String(result.stdout || '').trim() === 'true';
}

function getCurrentHooksPath() {
    const result = runGit(['config', '--get', 'core.hooksPath']);
    if (result.status !== 0) return '';
    return String(result.stdout || '').trim();
}

function installHooksPath() {
    const result = runGit(['config', '--local', 'core.hooksPath', HOOK_PATH], { stdio: 'inherit' });
    if (result.status !== 0) {
        throw new Error('Failed to configure git core.hooksPath');
    }
}

function run() {
    if (!isGitRepo()) {
        console.log('hooks:install skipped (not inside a git work tree).');
        return;
    }

    if (!existsSync(PRE_COMMIT_HOOK)) {
        throw new Error(`Missing hook file: ${path.relative(ROOT, PRE_COMMIT_HOOK)}`);
    }

    const currentHooksPath = getCurrentHooksPath();
    if (currentHooksPath === HOOK_PATH) {
        console.log(`Git hooks already installed (core.hooksPath=${HOOK_PATH})`);
        return;
    }

    installHooksPath();
    console.log(`Installed repo-managed git hooks (core.hooksPath=${HOOK_PATH})`);
}

try {
    run();
} catch (error) {
    console.error('hooks:install failed:', error.message);
    process.exit(1);
}
