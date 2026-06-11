import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const sourcePath = path.resolve('src/data/michaelHallDailyCards.ts');
const source = readFileSync(sourcePath, 'utf8');
const tempDir = mkdtempSync(path.join(tmpdir(), 'mh-daily-cards-'));
const modulePath = path.join(tempDir, 'cards.mjs');

const result = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
  },
});

writeFileSync(modulePath, result.outputText, 'utf8');

const fail = (message) => {
  console.error(`Michael Hall card validation failed: ${message}`);
  process.exitCode = 1;
};

try {
  const { michaelHallDailyCards } = await import(pathToFileURL(modulePath).href);

  if (!Array.isArray(michaelHallDailyCards)) {
    fail('michaelHallDailyCards must be an array');
  } else {
    const ids = new Set();
    michaelHallDailyCards.forEach((card, index) => {
      const label = card?.id ?? `card at index ${index}`;

      for (const field of [
        'id',
        'dayIndex',
        'titleHe',
        'distilledTeachingHe',
        'dailyQuestionHe',
      ]) {
        if (!card?.[field]) fail(`${label} is missing ${field}`);
      }

      if (ids.has(card.id)) fail(`duplicate id ${card.id}`);
      ids.add(card.id);

      if (card.dayIndex !== index + 1) {
        fail(`${label} dayIndex must be ${index + 1}`);
      }

      if (!Array.isArray(card.exercisesHe) || card.exercisesHe.length < 2) {
        fail(`${label} must have at least 2 exercises`);
      }

      for (const [field, limit] of Object.entries({
        distilledTeachingHe: 420,
        keyDistinctionHe: 320,
        dailyQuestionHe: 220,
        applyTodayHe: 260,
      })) {
        if (typeof card[field] === 'string' && card[field].length > limit) {
          fail(`${label} ${field} is longer than ${limit} characters`);
        }
      }

      if (Array.isArray(card.exercisesHe)) {
        card.exercisesHe.forEach((exercise, exerciseIndex) => {
          if (typeof exercise !== 'string' || exercise.length > 220) {
            fail(`${label} exercise ${exerciseIndex + 1} is too long or invalid`);
          }
        });
      }
    });
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('Michael Hall daily cards validation passed.');
