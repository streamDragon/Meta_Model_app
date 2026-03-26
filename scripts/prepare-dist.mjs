import { cp, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const STATIC_DIRS = ['assets', 'data', 'js', 'css', 'auth'];
const STATIC_FILES = [
  'package.json',
  'version.json',
  'src/data/connectedBubblesCases.he.json',
  'index2.html',
  'verb_unzip_trainer.html',
  'breen_table_lab.html',
  'classic_classic_trainer.html',
  'classic2_trainer.html',
  'scenario_trainer.html',
  'iceberg_templates_trainer.html',
  'prism_research_trainer.html',
  'prism_lab_trainer.html',
  'sentence_morpher_trainer.html',
  'living_triples_trainer.html'
];

async function copyStaticDir(dirName) {
  const from = path.join(ROOT, dirName);
  const to = path.join(DIST_DIR, dirName);
  await cp(from, to, { recursive: true, force: true });
}

async function copyStaticFile(fileName) {
  const from = path.join(ROOT, fileName);
  const to = path.join(DIST_DIR, fileName);
  await mkdir(path.dirname(to), { recursive: true });
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
