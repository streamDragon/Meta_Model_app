import { cp } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const STATIC_DIRS = ['assets', 'data', 'js', 'css'];

async function copyStaticDir(dirName) {
  const from = path.join(ROOT, dirName);
  const to = path.join(DIST_DIR, dirName);
  await cp(from, to, { recursive: true, force: true });
}

async function run() {
  await Promise.all(STATIC_DIRS.map(copyStaticDir));
  console.log(`Copied static folders to dist: ${STATIC_DIRS.join(', ')}`);
}

run().catch((error) => {
  console.error('Failed to prepare dist directory:', error);
  process.exit(1);
});
