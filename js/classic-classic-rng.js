(function attachClassicClassicRng(rootFactory) {
    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : this);
    const api = rootFactory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.classicClassicRng = api;
})(function createClassicClassicRng() {
    function hashSeed(input) {
        const value = String(input ?? 'classic-classic-seed');
        let h = 2166136261 >>> 0;
        for (let i = 0; i < value.length; i += 1) {
            h ^= value.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function mulberry32(seed) {
        let t = seed >>> 0;
        return function next() {
            t += 0x6D2B79F5;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    }

    function createSeededRng(seed) {
        const initial = typeof seed === 'number' && Number.isFinite(seed)
            ? (seed >>> 0)
            : hashSeed(seed);
        const nextFloat = mulberry32(initial);

        return Object.freeze({
            seed: initial,
            nextFloat,
            nextInt(minInclusive, maxExclusive) {
                const min = Number(minInclusive) || 0;
                const max = Number(maxExclusive);
                if (!Number.isFinite(max) || max <= min) {
                    throw new Error('Invalid nextInt range');
                }
                return Math.floor(nextFloat() * (max - min)) + min;
            }
        });
    }

    function shuffle(array, rng) {
        const out = Array.isArray(array) ? [...array] : [];
        const random = rng && typeof rng.nextInt === 'function'
            ? rng
            : createSeededRng('classic-classic-default');

        for (let i = out.length - 1; i > 0; i -= 1) {
            const j = random.nextInt(0, i + 1);
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    }

    function sampleUnique(array, count, rng) {
        if (!Array.isArray(array)) return [];
        if (count <= 0) return [];
        if (count >= array.length) return shuffle(array, rng);
        return shuffle(array, rng).slice(0, count);
    }

    return Object.freeze({
        hashSeed,
        createSeededRng,
        shuffle,
        sampleUnique
    });
});
