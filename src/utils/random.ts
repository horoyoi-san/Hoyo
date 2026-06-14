/**
 * Random distribution utilities for relic stat rolling.
 * Ported from firefly_srtools_1.0 helper/random.ts.
 */

/**
 * Partition a sum into N random positive integers.
 * Used to distribute sub-stat rolls randomly across relic sub-affixes.
 */
export function randomPartition(sum: number, parts: number): number[] {
  if (!Number.isFinite(sum) || !Number.isInteger(parts) || parts <= 0) {
    return [];
  }
  if (sum < parts) {
    return Array.from({ length: parts }, () => 0);
  }

  const raw = Array.from({ length: parts }, () => Math.random());
  const total = raw.reduce((a, b) => a + b, 0);
  const result = raw.map(
    (r) => Math.floor((r / total) * (sum - parts)) + 1,
  );
  let diff = sum - result.reduce((a, b) => a + b, 0);
  while (diff !== 0) {
    for (let i = 0; i < result.length && diff !== 0; i++) {
      if (diff > 0) {
        result[i]++;
        diff--;
      } else if (result[i] > 1) {
        result[i]--;
        diff++;
      }
    }
  }

  return result;
}

/**
 * Generate a random step value for a sub-affix.
 * Each sub-stat roll adds 0–2 steps randomly.
 */
export function randomStep(x: number): number {
  let total = 0;
  for (let i = 0; i < x; i++) {
    total += Math.floor(Math.random() * 3);
  }
  return total;
}
