import { describe, it, expect } from 'vitest';
import { getGridDimensions } from '../game/config';

describe('getGridDimensions', () => {
  it('returns positive cols/rows/cellSize', () => {
    const d = getGridDimensions(375, 812); // iPhone
    expect(d.cols).toBeGreaterThan(0);
    expect(d.rows).toBeGreaterThan(0);
    expect(d.cellSize).toBeGreaterThan(0);
  });

  it('fits within the given dimensions', () => {
    const w = 390;
    const h = 844;
    const d = getGridDimensions(w, h);
    expect(d.cols * d.cellSize).toBeLessThanOrEqual(w + d.cellSize);
    expect(d.rows * d.cellSize).toBeLessThanOrEqual(h + d.cellSize);
  });

  it('uses larger cells on desktop vs mobile', () => {
    const mobile  = getGridDimensions(375,  812);
    const desktop = getGridDimensions(1920, 1080);
    // Desktop should have more columns
    expect(desktop.cols).toBeGreaterThan(mobile.cols);
  });

  it('cell size is within bounds [36, 56]', () => {
    for (const [w, h] of [[375, 812], [768, 1024], [1920, 1080]]) {
      const d = getGridDimensions(w, h);
      expect(d.cellSize).toBeGreaterThanOrEqual(36);
      expect(d.cellSize).toBeLessThanOrEqual(56 + 1); // +1 tolerance for floor
    }
  });
});
