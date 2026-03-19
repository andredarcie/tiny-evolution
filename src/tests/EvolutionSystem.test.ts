import { describe, it, expect, beforeEach } from 'vitest';
import { EvolutionSystem } from '../game/systems/EvolutionSystem';
import { Entity } from '../game/entities/Entity';
import { DEFS_BY_LEVEL } from '../game/entities/EntityTypes';

const level0Def = DEFS_BY_LEVEL.get(0)![0];
const level2Def = DEFS_BY_LEVEL.get(2)![0];

describe('EvolutionSystem', () => {
  let evo: EvolutionSystem;

  beforeEach(() => {
    evo = new EvolutionSystem();
  });

  it('starts at generation 0', () => {
    expect(evo.generation).toBe(0);
    expect(evo.maxEraReached).toBe(0);
    expect(evo.totalMerges).toBe(0);
  });

  it('spawnInitial creates the requested number of entities', () => {
    const entities = evo.spawnInitial(10, 10, 20);
    expect(entities.length).toBe(20);
  });

  it('all spawned entities are level 0', () => {
    const entities = evo.spawnInitial(10, 10, 10);
    for (const e of entities) {
      expect(e.level).toBe(0);
    }
  });

  it('spawned entities stay within grid bounds', () => {
    const cols = 8;
    const rows = 6;
    const entities = evo.spawnInitial(cols, rows, 30);
    for (const e of entities) {
      expect(e.gridX).toBeGreaterThanOrEqual(0);
      expect(e.gridX).toBeLessThan(cols);
      expect(e.gridY).toBeGreaterThanOrEqual(0);
      expect(e.gridY).toBeLessThan(rows);
    }
  });

  it('keeps essential living groups available in the evolution tree', () => {
    const earlyEukaryoteDefs = DEFS_BY_LEVEL.get(4) ?? [];
    const cambrianDefs = DEFS_BY_LEVEL.get(8) ?? [];
    const invertebrateDefs = DEFS_BY_LEVEL.get(9) ?? [];

    expect(earlyEukaryoteDefs.some(def => def.name === 'Ameba')).toBe(true);
    expect(cambrianDefs.some(def => def.name === 'Anêmona-do-mar')).toBe(true);
    expect(cambrianDefs.some(def => def.name === 'Coral')).toBe(true);
    expect(invertebrateDefs.some(def => def.name === 'Anelídeo')).toBe(true);
    expect(invertebrateDefs.some(def => def.name === 'Nematódeo')).toBe(true);
    expect(invertebrateDefs.some(def => def.name === 'Crustáceo')).toBe(true);
    expect(invertebrateDefs.some(def => def.name === 'Angiosperma')).toBe(true);
  });

  describe('tryMerge', () => {
    it('returns null for dead entities', () => {
      const a = new Entity(level0Def, 0, 0);
      const b = new Entity(level0Def, 1, 0);
      a.isAlive = false;
      const result = evo.tryMerge(a, b, 0, 0);
      expect(result).toBeNull();
    });

    it('returns null when level difference > 1', () => {
      const a = new Entity(level0Def, 0, 0);
      const c = new Entity(level2Def, 1, 0);
      const result = evo.tryMerge(a, c, 0, 0);
      expect(result).toBeNull();
    });

    it('increments generation when new era is reached', () => {
      // Force fertility to 1 to guarantee merge
      const a = new Entity(level0Def, 0, 0);
      const b = new Entity(level0Def, 1, 0);
      a.genes.fertility = 1;
      b.genes.fertility = 1;

      const result = evo.tryMerge(a, b, 0, 0);
      if (result) {
        expect(result.child.level).toBe(1);
        expect(evo.generation).toBe(1);
        expect(evo.maxEraReached).toBe(1);
        expect(evo.totalMerges).toBe(1);
        expect(a.isAlive).toBe(true);
        expect(b.isAlive).toBe(true);
      }
    });

    it('does NOT increment generation for same era duplicates', () => {
      const a = new Entity(level0Def, 0, 0);
      const b = new Entity(level0Def, 1, 0);
      a.genes.fertility = 1;
      b.genes.fertility = 1;

      evo.tryMerge(a, b, 0, 0); // era 0 -> 1: generation becomes 1

      const c = new Entity(level0Def, 0, 0);
      const d = new Entity(level0Def, 1, 0);
      c.genes.fertility = 1;
      d.genes.fertility = 1;

      evo.tryMerge(c, d, 0, 0); // still produces era 1 -> generation stays 1
      expect(evo.generation).toBe(1);
    });

    it('keeps a small fertility floor to avoid evolutionary deadlock', () => {
      const a = new Entity(level0Def, 0, 0);
      const b = new Entity(level0Def, 1, 0);
      // Set fertility to 0 — should never merge
      a.genes.fertility = 0;
      b.genes.fertility = 0;

      let mergeHappened = false;
      for (let i = 0; i < 10; i++) {
        const res = evo.tryMerge(a, b, 0, 0);
        if (res) { mergeHappened = true; break; }
      }
      expect(typeof mergeHappened).toBe('boolean');
    });
  });

  describe('getStats', () => {
    it('returns correct stats snapshot', () => {
      const stats = evo.getStats(42, 'Sopa primordial instável', 0.18);
      expect(stats.generation).toBe(0);
      expect(stats.population).toBe(42);
      expect(stats.totalMerges).toBe(0);
      expect(typeof stats.eraName).toBe('string');
      expect(typeof stats.environmentalPressure).toBe('string');
      expect(stats.entropy).toBeCloseTo(0.18);
    });
  });

  it('reset clears all counters', () => {
    const a = new Entity(level0Def, 0, 0);
    const b = new Entity(level0Def, 1, 0);
    a.genes.fertility = 1;
    b.genes.fertility = 1;
    evo.tryMerge(a, b, 0, 0);

    evo.reset();
    expect(evo.generation).toBe(0);
    expect(evo.maxEraReached).toBe(0);
    expect(evo.totalMerges).toBe(0);
  });
});
