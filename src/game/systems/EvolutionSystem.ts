import { Entity } from '../entities/Entity';
import { DEFS_BY_LEVEL, ERA_BY_LEVEL } from '../entities/EntityTypes';

export interface MergeResult {
  child: Entity;
  generation: number;
  newEraReached: boolean;
  eraName: string;
}

export interface EvolutionStats {
  generation: number;
  maxEraReached: number;
  eraName: string;
  environmentalPressure: string;
  entropy: number;
  totalMerges: number;
  population: number;
}

export interface MergeRecord {
  aEmoji: string; aName: string; aLevel: number;
  bEmoji: string; bName: string; bLevel: number;
  childEmoji: string; childName: string; childLevel: number;
  index: number;
}

const MAX_HISTORY = 300;

export class EvolutionSystem {
  private _generation = 0;
  private _maxEraReached = 0;
  private _totalMerges = 0;
  private _history: MergeRecord[] = [];

  get generation() { return this._generation; }
  get maxEraReached() { return this._maxEraReached; }
  get totalMerges() { return this._totalMerges; }
  get history(): readonly MergeRecord[] { return this._history; }

  getStats(population: number, environmentalPressure: string, entropy: number): EvolutionStats {
    return {
      generation: this._generation,
      maxEraReached: this._maxEraReached,
      eraName: ERA_BY_LEVEL[this._maxEraReached] ?? '🌋 Sopa Primordial',
      environmentalPressure,
      entropy,
      totalMerges: this._totalMerges,
      population,
    };
  }

  /**
   * Attempt to merge two entities. Returns MergeResult if successful,
   * null if the merge fails (incompatible levels, low fertility, or max level).
   */
  tryMerge(a: Entity, b: Entity, gridX: number, gridY: number, reproductionModifier = 1): MergeResult | null {
    if (!a.isAlive || !b.isAlive) return null;
    if (Math.abs(a.level - b.level) > 1) return null;

    // Moderate merge probability (~35–55% per encounter)
    const fertilityCheck = Math.max(
      0.03,
      Math.min(0.7, ((a.genes.fertility + b.genes.fertility) / 2 + 0.15) * reproductionModifier)
    );
    if (Math.random() > fertilityCheck) return null;

    const child = Entity.combine(a, b, gridX, gridY);
    if (!child) return null;

    const newEraReached = child.level > this._maxEraReached;
    if (newEraReached) {
      this._maxEraReached = child.level;
      this._generation++;
    }

    this._totalMerges++;

    const record: MergeRecord = {
      aEmoji: a.emoji, aName: a.name, aLevel: a.level,
      bEmoji: b.emoji, bName: b.name, bLevel: b.level,
      childEmoji: child.emoji, childName: child.name, childLevel: child.level,
      index: this._totalMerges,
    };
    this._history.unshift(record);
    if (this._history.length > MAX_HISTORY) this._history.pop();

    return {
      child,
      generation: this._generation,
      newEraReached,
      eraName: child.era,
    };
  }

  /** Spawn initial level-0 entities at random positions. */
  spawnInitial(cols: number, rows: number, count: number): Entity[] {
    const level0Defs = DEFS_BY_LEVEL.get(0) ?? [];
    if (level0Defs.length === 0) return [];

    const entities: Entity[] = [];
    for (let i = 0; i < count; i++) {
      const def = level0Defs[Math.floor(Math.random() * level0Defs.length)];
      const x = Math.floor(Math.random() * cols);
      const y = Math.floor(Math.random() * rows);
      entities.push(new Entity(def, x, y));
    }
    return entities;
  }

  /** Spawn a few level-0 replenishments to keep the simulation alive. */
  spawnReplenishment(cols: number, rows: number, amount: number): Entity[] {
    return this.spawnInitial(cols, rows, amount);
  }

  reset() {
    this._generation = 0;
    this._maxEraReached = 0;
    this._totalMerges = 0;
    this._history = [];
  }
}
