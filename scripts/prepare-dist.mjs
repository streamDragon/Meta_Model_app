import { cp, copyFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const STATIC_DIRS = ['assets', 'data', 'js', 'css'];
const STATIC_FILES = ['package.json', 'verb_unzip_trainer.html', 'classic_classic_trainer.html', 'prism_research_trainer.html'];

async function copyStaticDir(dirName) {
  const from = path.join(ROOT, dirName);
  const to = path.join(DIST_DIR, dirName);
  await cp(from, to, { recursive: true, force: true });
}

async function copyStaticFile(fileName) {
  const from = path.join(ROOT, fileName);
  const to = path.join(DIST_DIR, fileName);
  await copyFile(from, to);
}

async function run() {
  await Promise.all([
    ...STATIC_DIRS.map(copyStaticDir),
    ...STATIC_FILES.map(copyStaticFile)
  ]);
  console.log(`Copied static folders to dist: ${STATIC_DIRS.join(', ')}`);
  console.log(`Copied static files to dist: ${STATIC_FILES.join(', ')}`);
}

run().catch((error) => {
  console.error('Failed to prepare dist directory:', error);
  process.exit(1);
});
