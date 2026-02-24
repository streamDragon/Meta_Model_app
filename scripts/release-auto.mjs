import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');

function runCmd(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: ROOT,
        stdio: 'inherit',
        shell: process.platform === 'win32',
        ...options
    });

    if (result.status !== 0) {
        throw new Error(`Command failed: ${command} ${args.join(' ')}`);
    }
}

function runCmdCapture(command, args) {
    const result = spawnSync(command, args, {
        cwd: ROOT,
        encoding: 'utf8',
        shell: process.platform === 'win32'
    });
    if (result.status !== 0) {
        throw new Error(`Command failed: ${command} ${args.join(' ')}`);
    }
    return String(result.stdout || '');
}

async function getVersion() {
    const pkg = JSON.parse(await readFile(PACKAGE_JSON_PATH, 'utf8'));
    return String(pkg?.version || '').trim();
}

async function run() {
    console.log('1) Bump patch version');
    runCmd('npm', ['version', 'patch', '--no-git-tag-version']);

    console.log('2) Sync entry files + visible app version');
    runCmd('node', ['scripts/sync-entry.mjs']);

    console.log('3) Run tests');
    runCmd('npm', ['run', 'test:all']);

    console.log('4) Build dist');
    runCmd('npm', ['run', 'build']);

    console.log('5) Commit + push');
    runCmd('git', ['add', '-A']);

    const hasStagedChanges = (() => {
        const result = spawnSync('git', ['diff', '--cached', '--quiet'], {
            cwd: ROOT,
            shell: process.platform === 'win32'
        });
        return result.status === 1;
    })();

    if (!hasStagedChanges) {
        console.log('No staged changes to commit.');
        return;
    }

    const version = await getVersion();
    const releaseVersion = version || 'unknown';
    runCmd('git', ['commit', '-m', `release: v${releaseVersion}`], {
        env: { ...process.env, SKIP_AUTO_VERSION_BUMP: '1' }
    });
    runCmd('git', ['push']);

    const currentBranch = runCmdCapture('git', ['branch', '--show-current']).trim();
    console.log(`Release complete: v${releaseVersion}${currentBranch ? ` -> ${currentBranch}` : ''}`);
}

run().catch((error) => {
    console.error('release-auto failed:', error.message);
    process.exit(1);
});
