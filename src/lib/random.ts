export type Rng = () => number;

// Unbiased Fisher-Yates shuffle (fixes audit bug B6: sort(() => random-0.5)).
// Returns a new array; rng is injectable for deterministic tests.
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
