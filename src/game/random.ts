let state = 0x12345678;

export function setRandomSeed(seed: number): void {
  const normalized = (Math.floor(seed) >>> 0) || 1;
  state = normalized;
}

export function random(): number {
  state = (1664525 * state + 1013904223) >>> 0;
  return state / 0x100000000;
}

export function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  return Math.floor(random() * maxExclusive);
}

export function randomChance(probability: number): boolean {
  return random() < probability;
}

export function randomChoice<T>(items: readonly T[]): T {
  return items[randomInt(items.length)];
}

export function randomSort<T>(items: readonly T[]): T[] {
  return [...items].sort(() => random() - 0.5);
}
