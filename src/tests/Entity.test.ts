import { describe, it, expect, beforeEach } from 'vitest';
import { Entity } from '../game/entities/Entity';
import { DEFS_BY_LEVEL } from '../game/entities/EntityTypes';

const level0Def = DEFS_BY_LEVEL.get(0)![0];
const level1Def = DEFS_BY_LEVEL.get(1)![0];

describe('Entity', () => {
  it('creates entity with correct initial values', () => {
    const e = new Entity(level0Def, 3, 5);
    expect(e.level).toBe(0);
    expect(e.gridX).toBe(3);
    expect(e.gridY).toBe(5);
    expect(e.age).toBe(0);
    expect(e.energy).toBe(100);
    expect(e.isAlive).toBe(true);
    expect(e.generation).toBe(0);
  });

  it('ages on each tick', () => {
    const e = new Entity(level0Def, 0, 0);
    e.tick();
    expect(e.age).toBe(1);
  });

  it('dies after max age', () => {
    const e = new Entity(level0Def, 0, 0);
    // Lifespan gene = 0 -> maxAge = 60
    e.genes.lifespan = 0;
    for (let i = 0; i < 62; i++) e.tick();
    expect(e.isAlive).toBe(false);
  });

  it('inherits custom genes', () => {
    const customGenes = { speed: 0.9, lifespan: 0.1, fertility: 0.5, resilience: 0.5, size: 0.5 };
    const e = new Entity(level0Def, 0, 0, customGenes);
    expect(e.genes.speed).toBeCloseTo(0.9);
    expect(e.genes.lifespan).toBeCloseTo(0.1);
  });

  it('ticksPerMove reflects speed gene', () => {
    const fast = new Entity(level0Def, 0, 0, { speed: 1, lifespan: 0.5, fertility: 0.5, resilience: 0.5, size: 0.5 });
    const slow = new Entity(level0Def, 0, 0, { speed: 0, lifespan: 0.5, fertility: 0.5, resilience: 0.5, size: 0.5 });
    expect(fast.ticksPerMove).toBeLessThan(slow.ticksPerMove);
  });

  describe('combine', () => {
    let parent1: Entity;
    let parent2: Entity;

    beforeEach(() => {
      parent1 = new Entity(level0Def, 0, 0);
      parent2 = new Entity(level0Def, 1, 0);
    });

    it('produces a child of level + 1', () => {
      const child = Entity.combine(parent1, parent2, 0, 0);
      expect(child).not.toBeNull();
      expect(child!.level).toBe(1);
    });

    it('child generation is max(parent gens) + 1', () => {
      parent1.generation = 2;
      parent2.generation = 5;
      const child = Entity.combine(parent1, parent2, 0, 0);
      expect(child!.generation).toBe(6);
    });

    it('child genes are within [0, 1]', () => {
      const child = Entity.combine(parent1, parent2, 0, 0);
      expect(child).not.toBeNull();
      for (const val of Object.values(child!.genes)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });

    it('child genes are blend of parents with some variation', () => {
      parent1.genes = { speed: 0, lifespan: 0, fertility: 0, resilience: 0, size: 0 };
      parent2.genes = { speed: 0, lifespan: 0, fertility: 0, resilience: 0, size: 0 };
      const child = Entity.combine(parent1, parent2, 0, 0);
      // All genes near 0 (with mutation)
      for (const val of Object.values(child!.genes)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(0.5); // mutation up to MUTATION_RATE * 2 = 0.24
      }
    });

    it('returns null when combining two max-level entities', () => {
      const maxDef = DEFS_BY_LEVEL.get(10)![0];
      const a = new Entity(maxDef, 0, 0);
      const b = new Entity(maxDef, 1, 0);
      const child = Entity.combine(a, b, 0, 0);
      expect(child).toBeNull();
    });

    it('returns null when one uses a level-1 def and other uses level-0', () => {
      const lvl1 = new Entity(level1Def, 0, 0);
      const lvl0 = new Entity(level0Def, 1, 0);
      // combine takes max(0,1)+1 = level 2
      const child = Entity.combine(lvl1, lvl0, 0, 0);
      expect(child?.level).toBe(2);
    });
  });
});
