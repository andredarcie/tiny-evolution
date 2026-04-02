import { describe, expect, it } from 'vitest';
import {
  formatBiomass,
  GROUP_ENERGY_MULTIPLIER,
  LifeGroup,
} from '../game/turns/evolutionData';
import { TurnGameScene } from '../game/turns/TurnGameScene';
import { setRandomSeed } from '../game/random';

// ── formatBiomass ──────────────────────────────────────────────────────────

describe('formatBiomass', () => {
  it('returns the number as string when below 1000', () => {
    expect(formatBiomass(0)).toBe('0');
    expect(formatBiomass(1)).toBe('1');
    expect(formatBiomass(999)).toBe('999');
  });

  it('abbreviates thousands with k suffix', () => {
    expect(formatBiomass(1000)).toBe('1k');
    expect(formatBiomass(1200)).toBe('1.2k');
    expect(formatBiomass(1500)).toBe('1.5k');
    expect(formatBiomass(10000)).toBe('10k');
    expect(formatBiomass(999999)).toBe('1000k');
  });

  it('abbreviates millions with M suffix', () => {
    expect(formatBiomass(1_000_000)).toBe('1M');
    expect(formatBiomass(2_500_000)).toBe('2.5M');
    expect(formatBiomass(10_000_000)).toBe('10M');
  });

  it('removes trailing .0 in abbreviations', () => {
    expect(formatBiomass(2000)).toBe('2k');
    expect(formatBiomass(3_000_000)).toBe('3M');
  });
});

// ── GROUP_ENERGY_MULTIPLIER ────────────────────────────────────────────────

describe('GROUP_ENERGY_MULTIPLIER', () => {
  it('covers all LifeGroup values', () => {
    for (const group of Object.values(LifeGroup)) {
      expect(GROUP_ENERGY_MULTIPLIER[group]).toBeGreaterThan(0);
    }
  });

  it('has the correct multiplier per group', () => {
    expect(GROUP_ENERGY_MULTIPLIER[LifeGroup.Procariontes]).toBe(1);
    expect(GROUP_ENERGY_MULTIPLIER[LifeGroup.Protistas]).toBe(2);
    expect(GROUP_ENERGY_MULTIPLIER[LifeGroup.Algas]).toBe(3);
    expect(GROUP_ENERGY_MULTIPLIER[LifeGroup.Fungos]).toBe(4);
    expect(GROUP_ENERGY_MULTIPLIER[LifeGroup.Plantas]).toBe(5);
    expect(GROUP_ENERGY_MULTIPLIER[LifeGroup.Invertebrados]).toBe(6);
    expect(GROUP_ENERGY_MULTIPLIER[LifeGroup.Peixes]).toBe(7);
    expect(GROUP_ENERGY_MULTIPLIER[LifeGroup.Anfibios]).toBe(8);
    expect(GROUP_ENERGY_MULTIPLIER[LifeGroup.Sauropsida]).toBe(9);
    expect(GROUP_ENERGY_MULTIPLIER[LifeGroup.Mamiferos]).toBe(10);
  });

  it('multipliers are strictly increasing from Procariontes to Mamiferos', () => {
    const order = [
      LifeGroup.Procariontes,
      LifeGroup.Protistas,
      LifeGroup.Algas,
      LifeGroup.Fungos,
      LifeGroup.Plantas,
      LifeGroup.Invertebrados,
      LifeGroup.Peixes,
      LifeGroup.Anfibios,
      LifeGroup.Sauropsida,
      LifeGroup.Mamiferos,
    ];
    for (let i = 1; i < order.length; i++) {
      expect(GROUP_ENERGY_MULTIPLIER[order[i]]).toBeGreaterThan(
        GROUP_ENERGY_MULTIPLIER[order[i - 1]],
      );
    }
  });
});

// ── Biomass generation with multiplier ────────────────────────────────────

function createScene(): TurnGameScene {
  setRandomSeed(1234);
  return new TurnGameScene({ update: () => {} } as never, { disableEvents: true });
}

function addColony(scene: TurnGameScene, x: number, y: number, options: Record<string, unknown>) {
  return (scene as any).addColony(x, y, options);
}

function setTileEnergy(scene: TurnGameScene, x: number, y: number, energy: number) {
  (scene as any).tileEnergy[y][x] = energy;
}

function setBiome(scene: TurnGameScene, x: number, y: number, biome: string) {
  (scene as any).terrain[y][x] = biome;
}

function triggerExploration(scene: TurnGameScene, colony: { explorationBiomassPending: boolean }) {
  colony.explorationBiomassPending = true;
  (scene as any).resolveImmediateExplorationRewards();
}

describe('biomass generation with group multiplier', () => {
  it('bacteria (Procariontes, 1×) gains energy × 1', () => {
    const scene = createScene();
    setBiome(scene, 0, 0, 'ocean');
    setTileEnergy(scene, 0, 0, 3);
    const colony = addColony(scene, 0, 0, { lifeFormId: 'bacteria_primitiva', biomass: 0 });
    triggerExploration(scene, colony);
    expect(colony.biomass).toBe(3);
  });

  it('mamifero (Mamíferos, 10×) gains energy × 10', () => {
    const scene = createScene();
    setBiome(scene, 0, 0, 'land');
    setTileEnergy(scene, 0, 0, 3);
    const colony = addColony(scene, 0, 0, { lifeFormId: 'mamifero', biomass: 0 });
    triggerExploration(scene, colony);
    expect(colony.biomass).toBe(30);
  });

  it('peixe (Peixes, 7×) gains energy × 7', () => {
    const scene = createScene();
    setBiome(scene, 0, 0, 'ocean');
    setTileEnergy(scene, 0, 0, 2);
    const colony = addColony(scene, 0, 0, { lifeFormId: 'peixe', biomass: 0 });
    triggerExploration(scene, colony);
    expect(colony.biomass).toBe(14);
  });

  it('tile with 0 energy generates 0 biomass regardless of group', () => {
    const scene = createScene();
    setBiome(scene, 0, 0, 'ocean');
    setTileEnergy(scene, 0, 0, 0);
    const colony = addColony(scene, 0, 0, { lifeFormId: 'homo_sapiens', biomass: 0 });
    triggerExploration(scene, colony);
    expect(colony.biomass).toBe(0);
  });
});
