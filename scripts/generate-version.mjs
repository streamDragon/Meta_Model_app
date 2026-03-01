import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const syncScript = path.join(ROOT, 'scripts', 'sync-entry.mjs');

const result = spawnSync(process.execPath, [syncScript], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: false
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
