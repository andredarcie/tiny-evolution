import { type Genes, type EntityDef, DEFS_BY_LEVEL, MAX_LEVEL, canProduceLineage } from './EntityTypes';
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
  population: number;
  resource: number;
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
    this.population = Entity.initialPopulationFor(def.level);
    this.resource = 0.65;
    this.gridX = gridX;
    this.gridY = gridY;
    this.isAlive = true;
    this.generation = generation;
    this.isMoving = false;
  }

  tick(environment?: EntityEnvironmentalPressure): boolean {
    this.age++;
    let maxAge = Math.floor(20 + this.genes.lifespan * 20 + this.level * 15);
    if (environment) {
      maxAge = Math.max(1, Math.floor(maxAge * environment.ageMultiplier));
      const stressDeathAge = Math.max(1, Math.floor(maxAge * (1 - Math.min(0.45, environment.deathRisk * 1.6))));
      if (this.age > stressDeathAge && environment.deathRisk >= 0.16) {
        this.isAlive = false;
      }
    }
    if (this.age > maxAge) {
      this.isAlive = false;
    }
    return this.isAlive;
  }

  get ticksPerMove(): number {
    return Math.round(1 + (1 - this.genes.speed) * 3);
  }

  get ticksPerSpread(): number {
    return Math.max(1, Math.round(2 + (1 - this.genes.speed) * 4));
  }

  get baseCarryingCapacity(): number {
    return Math.round(8 + this.genes.size * 18 + this.genes.resilience * 8 + this.level * 1.4);
  }

  static combine(a: Entity, b: Entity, gridX: number, gridY: number): Entity | null {
    const nextLevel = Math.max(a.level, b.level) + 1;
    if (nextLevel > MAX_LEVEL) return null;

    const candidates = DEFS_BY_LEVEL.get(nextLevel);
    if (!candidates || candidates.length === 0) return null;

    const compatible = candidates.filter(d => canProduceLineage(a.lineage, b.lineage, d.lineage));
    if (compatible.length === 0) return null;

    const def = compatible[0];
    const childGenes = Entity.blendGenes(a.genes, b.genes);
    const childGen = Math.max(a.generation, b.generation) + 1;
    const child = new Entity(def, gridX, gridY, childGenes, childGen);
    child.population = Math.max(2, Math.round((a.population + b.population) * 0.2));
    child.resource = 0.45;
    return child;
  }

  private static blendGenes(g1: Genes, g2: Genes): Genes {
    return {
      speed:      (g1.speed + g2.speed) / 2,
      lifespan:   (g1.lifespan + g2.lifespan) / 2,
      fertility:  (g1.fertility + g2.fertility) / 2,
      resilience: (g1.resilience + g2.resilience) / 2,
      size:       (g1.size + g2.size) / 2,
    };
  }

  private static initialPopulationFor(level: number): number {
    return Math.max(3, 10 - Math.floor(level / 2));
  }
}


