// Named SVG characters (assets/svg/characters) — used as the "speakers" of
// practice statements to make the trainer feel like real conversations.
const modules = import.meta.glob('../../assets/svg/characters/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

export interface Character {
  name: string;
  url: string;
}

export const CHARACTERS: Character[] = Object.entries(modules)
  .map(([path, url]) => ({
    name: decodeURIComponent(path.split('/').pop() ?? '').replace('.svg', '').replace('-ל', ''),
    url: url as string,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'he'));

export function characterFor(seed: number): Character | undefined {
  if (CHARACTERS.length === 0) return undefined;
  return CHARACTERS[Math.abs(seed) % CHARACTERS.length];
}
