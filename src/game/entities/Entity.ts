import { type Genes, type EntityDef, DEFS_BY_LEVEL, MAX_LEVEL, MUTATION_RATE, canProduceLineage } from './EntityTypes';
import type { EntityEnvironmentalPressure } from '../systems/EnvironmentSystem';

let _idCounter = 0;

export class Entity {
  readonly id: number;
  level: number;
  emoji: string;
  name: string;
  era: string;
  color: number;
  lineage: string;
  genes: Genes;
  age: number;
  energy: number;
  gridX: number;
  gridY: number;
  isAlive: boolean;
  generation: number;
  isMoving: boolean;

  constructor(def: EntityDef, gridX: number, gridY: number, genes?: Genes, generation = 0) {
    this.id = _idCounter++;
    this.level = def.level;
    this.emoji = def.emoji;
    this.name = def.name;
    this.era = def.era;
    this.color = def.color;
    this.lineage = def.lineage;
    this.genes = genes ? { ...genes } : { ...def.baseGenes };
    this.age = 0;
    this.energy = 100;
    this.gridX = gridX;
    this.gridY = gridY;
    this.isAlive = true;
    this.generation = generation;
    this.isMoving = false;
  }

  /** Advance one simulation tick. Returns true if entity is still alive. */
  tick(environment?: EntityEnvironmentalPressure): boolean {
    this.age++;
    let maxAge = Math.floor(20 + this.genes.lifespan * 20 + this.level * 15);
    if (environment) {
      maxAge = Math.max(1, Math.floor(maxAge * environment.ageMultiplier));
      if (Math.random() < environment.deathRisk) {
        this.isAlive = false;
      }
    }
    if (this.age > maxAge) {
      this.isAlive = false;
    }
    return this.isAlive;
  }

  /** Move speed in ticks between moves: lower = faster */
  get ticksPerMove(): number {
    return Math.round(1 + (1 - this.genes.speed) * 3);
  }

  static combine(a: Entity, b: Entity, gridX: number, gridY: number): Entity | null {
    const nextLevel = Math.max(a.level, b.level) + 1;
    if (nextLevel > MAX_LEVEL) return null;

    const candidates = DEFS_BY_LEVEL.get(nextLevel);
    if (!candidates || candidates.length === 0) return null;

    // Only allow offspring whose lineage is compatible with both parents' lineages
    const compatible = candidates.filter(d => canProduceLineage(a.lineage, b.lineage, d.lineage));
    if (compatible.length === 0) return null;

    const def = compatible[Math.floor(Math.random() * compatible.length)];
    const childGenes = Entity.blendGenes(a.genes, b.genes);
    const childGen = Math.max(a.generation, b.generation) + 1;
    return new Entity(def, gridX, gridY, childGenes, childGen);
  }

  private static blendGenes(g1: Genes, g2: Genes): Genes {
    const mutate = (v: number) => Math.max(0, Math.min(1, v + (Math.random() - 0.5) * 2 * MUTATION_RATE));
    return {
      speed:      mutate((g1.speed      + g2.speed)      / 2),
      lifespan:   mutate((g1.lifespan   + g2.lifespan)   / 2),
      fertility:  mutate((g1.fertility  + g2.fertility)  / 2),
      resilience: mutate((g1.resilience + g2.resilience) / 2),
      size:       mutate((g1.size       + g2.size)       / 2),
    };
  }
}
