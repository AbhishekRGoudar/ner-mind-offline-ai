/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * Deterministic, fast, 32-bit state generator for reproducible on-device task generation.
 */
export class PRNG {
  private state: number;

  constructor(seed: number = Date.now()) {
    // Ensure 32-bit non-zero state
    this.state = seed >>> 0;
    if (this.state === 0) this.state = 0x6d2b79f5;
  }

  /**
   * Generates a floating point number in [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates an integer in [min, max] inclusive
   */
  randInt(min: number, max: number): number {
    const fMin = Math.ceil(min);
    const fMax = Math.floor(max);
    return Math.floor(this.next() * (fMax - fMin + 1)) + fMin;
  }

  /**
   * Selects a single random element from an array
   */
  choice<T>(array: readonly T[]): T {
    if (array.length === 0) {
      throw new Error("Cannot choose from an empty array");
    }
    const idx = Math.floor(this.next() * array.length);
    return array[idx] as T;
  }

  /**
   * Shuffles an array immutably using Fisher-Yates algorithm
   */
  shuffle<T>(array: readonly T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const temp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = temp;
    }
    return copy;
  }

  /**
   * Samples k distinct elements without replacement
   */
  sample<T>(array: readonly T[], count: number): T[] {
    const safeCount = Math.min(count, array.length);
    return this.shuffle(array).slice(0, safeCount);
  }
}
