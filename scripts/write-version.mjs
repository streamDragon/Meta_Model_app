import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

function readGitCommit() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const buildDate = new Date();
const buildIso = buildDate.toISOString();
const version = String(packageJson.version || '0.0.0');
const gitCommit = String(process.env.GITHUB_SHA || readGitCommit()).slice(0, 12);

const manifest = {
  appVersion: version,
  commitSha: gitCommit,
  builtAt: buildIso,
  version,
  buildTime: String(buildDate.getTime()),
  buildIso,
  gitCommit,
};

await writeFile('version.json', `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote version.json for ${version}${gitCommit ? ` (${gitCommit})` : ''}`);
