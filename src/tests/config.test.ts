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
    expect(d.cols * d.cellSize).toBeLessThanOrEqual(w);
    expect(d.rows * d.cellSize).toBeLessThanOrEqual(h);
  });

  it('keeps the grid fixed at 19 by 19 across viewport sizes', () => {
    const mobile  = getGridDimensions(375,  812);
    const desktop = getGridDimensions(1920, 1080);
    expect(mobile.cols).toBe(19);
    expect(mobile.rows).toBe(19);
    expect(desktop.cols).toBe(19);
    expect(desktop.rows).toBe(19);
  });

  it('uses larger cells on desktop than on mobile', () => {
    const mobile = getGridDimensions(375, 812);
    const desktop = getGridDimensions(1920, 1080);
    expect(desktop.cellSize).toBeGreaterThan(mobile.cellSize);
  });

  it('shrinks the grid when top and bottom HUD offsets are reserved', () => {
    for (const [w, h] of [[375, 812], [768, 1024], [1920, 1080]]) {
      const d = getGridDimensions(w, h);
      const withOffsets = getGridDimensions(w, h, 72, 140);
      expect(withOffsets.cellSize).toBeLessThanOrEqual(d.cellSize);
      expect(withOffsets.rows).toBe(19);
      expect(withOffsets.cols).toBe(19);
    }
  });
});
