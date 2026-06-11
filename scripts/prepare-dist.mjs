import { access, cp, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');

const STATIC_DIRS = ['assets', 'data', 'js', 'css', 'auth', 'lab', 'worksheets'];
const STATIC_FILES = [
  'version.json',
  'breen_table_lab.html',
  'classic_classic_trainer.html',
  'classic2_trainer.html',
  'iceberg_templates_trainer.html',
  'living_triples_trainer.html',
  'prism_lab_trainer.html',
  'prism_research_trainer.html',
  'scenario_trainer.html',
  'sentence_morpher_trainer.html',
  'verb_unzip_trainer.html',
  'verb_unzip_trainer_legacy.html',
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyStaticDir(dirName) {
  const from = path.join(ROOT, dirName);
  if (!(await exists(from))) return false;
  await cp(from, path.join(DIST_DIR, dirName), { recursive: true, force: true });
  return true;
}

async function copyStaticFile(fileName) {
  const from = path.join(ROOT, fileName);
  if (!(await exists(from))) return false;
  const to = path.join(DIST_DIR, fileName);
  await mkdir(path.dirname(to), { recursive: true });
  await copyFile(from, to);
  return true;
}

async function run() {
  const copiedDirs = [];
  const copiedFiles = [];

  for (const dirName of STATIC_DIRS) {
    if (await copyStaticDir(dirName)) copiedDirs.push(dirName);
  }

  for (const fileName of STATIC_FILES) {
    if (await copyStaticFile(fileName)) copiedFiles.push(fileName);
  }

  console.log(`Copied legacy static folders to dist: ${copiedDirs.join(', ') || 'none'}`);
  console.log(`Copied legacy static files to dist: ${copiedFiles.join(', ') || 'none'}`);
}

run().catch((error) => {
  console.error('Failed to prepare dist directory:', error);
  process.exit(1);
});
