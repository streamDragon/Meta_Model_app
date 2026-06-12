// Mirrors the assertions in src/data/content.test.ts for environments
// where vitest cannot run. Exits non-zero on any violation.
import { readFileSync } from 'node:fs';

const core = JSON.parse(readFileSync(new URL('../packs/meta-model-core.json', import.meta.url), 'utf8'));
const errors = [];

const subs = core.categories.flatMap((c) => c.subcategories);

const ids = core.practice_statements.map((s) => s.id);
if (new Set(ids).size !== ids.length) errors.push('duplicate statement ids');

for (const sub of subs) {
  const count = core.practice_statements.filter((s) => s.subcategory === sub.id).length;
  if (count < 3) errors.push(`subcategory ${sub.id} has only ${count} statements`);
}

const validFamily = new Map(subs.map((s) => [s.id, s.category]));
for (const s of core.practice_statements) {
  if (validFamily.get(s.subcategory) !== s.category) errors.push(`statement ${s.id}: category ${s.category} mismatches subcategory ${s.subcategory}`);
  if (!s.statement || !s.suggested_question || !s.explanation) errors.push(`statement ${s.id}: empty field`);
  if (!['easy', 'medium', 'hard'].includes(s.difficulty)) errors.push(`statement ${s.id}: bad difficulty ${s.difficulty}`);
}

const texts = core.practice_statements.map((s) => s.statement.trim());
const dupTexts = texts.filter((t, i) => texts.indexOf(t) !== i);
if (dupTexts.length) errors.push(`duplicate statement texts: ${dupTexts.join(' | ')}`);

if (errors.length) {
  console.error('FAIL:\n' + errors.join('\n'));
  process.exit(1);
}
console.log(`OK: ${core.practice_statements.length} statements, ${subs.length} subcategories all covered with >=3, ids and texts unique.`);
