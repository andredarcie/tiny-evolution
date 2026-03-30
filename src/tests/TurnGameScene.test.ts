import { describe, expect, it } from 'vitest';
import { TurnGameScene } from '../game/turns/TurnGameScene';
import { setRandomSeed } from '../game/random';

function createScene(): TurnGameScene {
  const hud = {
    update: () => {},
  };

  return new TurnGameScene(hud as never);
}

function getSelectedColony(scene: TurnGameScene) {
  return (scene as any).getSelectedColony();
}

function addColony(scene: TurnGameScene, x: number, y: number, options: Record<string, unknown>) {
  return (scene as any).addColony(x, y, options);
}

function getNextEvolutionId(scene: TurnGameScene, colony: unknown): string | null {
  return (scene as any).getNextEvolutionFor(colony)?.id ?? null;
}

function syncColonyTraversal(scene: TurnGameScene, colony: unknown) {
  (scene as any).syncColonyTraversal(colony);
}

function setSelectedColony(scene: TurnGameScene, colony: { id: number }) {
  (scene as any).selectedColonyId = colony.id;
}

function getColonyAt(scene: TurnGameScene, x: number, y: number) {
  return (scene as any).getColonyAt(x, y);
}

function advanceTurns(scene: TurnGameScene, count: number) {
  for (let i = 0; i < count; i += 1) {
    scene.endTurn();
  }
}

function setTurnReady(scene: TurnGameScene, colony: { id: number; adaptationPoints: number; busyUntilTurn: number; gestatingUntilTurn: number | null }) {
  (scene as any).turnStartColonyIds = new Set([colony.id]);
  (scene as any).actedColonyIds = new Set();
  (scene as any).actionPoints = 1;
  colony.adaptationPoints = 1;
  colony.busyUntilTurn = 0;
  colony.gestatingUntilTurn = null;
}

describe('TurnGameScene evolution priority', () => {
  it('prioritizes the human path for protozoario before alternate ocean branches', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.lifeFormId = 'protozoario';
    colony.population = 1;

    expect(getNextEvolutionId(scene, colony)).toBe('esponja');
  });

  it('prioritizes the human path for esponja before alternate ocean branches', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.lifeFormId = 'esponja';
    colony.population = 1;

    expect(getNextEvolutionId(scene, colony)).toBe('verme_plano');
  });

  it('does not choose an alternate branch while fewer than two human-path lineages remain viable', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.lifeFormId = 'protozoario';
    colony.population = 1;
    addColony(scene, 0, 0, {
      lifeFormId: 'esponja',
      population: 1,
    });

    setRandomSeed(1456);

    expect(getNextEvolutionId(scene, colony)).toBe('esponja');
  });

  it('can choose an alternate branch after at least two human-path lineages remain viable', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.lifeFormId = 'protozoario';
    colony.population = 1;
    addColony(scene, 0, 0, {
      lifeFormId: 'esponja',
      population: 1,
    });
    addColony(scene, 0, 1, {
      lifeFormId: 'protozoario',
      population: 1,
    });

    setRandomSeed(1456);

    expect(getNextEvolutionId(scene, colony)).toBe('ameba');
  });

  it('still heavily favors the human path after alternate branches are unlocked', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.lifeFormId = 'protozoario';
    colony.population = 1;
    addColony(scene, 0, 0, {
      lifeFormId: 'esponja',
      population: 1,
    });
    addColony(scene, 0, 1, {
      lifeFormId: 'protozoario',
      population: 1,
    });

    setRandomSeed(42);

    let humanPathChoices = 0;
    let alternateChoices = 0;

    for (let i = 0; i < 200; i += 1) {
      const nextId = getNextEvolutionId(scene, colony);
      if (nextId === 'esponja') humanPathChoices += 1;
      if (nextId === 'ameba') alternateChoices += 1;
    }

    expect(humanPathChoices).toBeGreaterThan(alternateChoices);
    expect(alternateChoices).toBeGreaterThan(0);
  });

  it('blocks a dead-end adaptation when it would remove the last path to humano', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.lifeFormId = 'peixe';
    colony.population = 1;

    expect(getNextEvolutionId(scene, colony)).toBeNull();
  });

  it('allows a dead-end branch only when two other colonies still preserve the path to humano', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.lifeFormId = 'peixe';
    colony.population = 1;
    addColony(scene, 4, 2, {
      lifeFormId: 'anfibio',
      population: 1,
    });
    addColony(scene, 5, 2, {
      lifeFormId: 'reptil',
      population: 1,
    });

    expect(getNextEvolutionId(scene, colony)).toBe('tubarao');
  });

  it('never falls back to an alternate branch when branching is still locked', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.lifeFormId = 'peixe';
    colony.population = 1;
    addColony(scene, 4, 2, {
      lifeFormId: 'reptil',
      population: 1,
    });

    expect(getNextEvolutionId(scene, colony)).toBeNull();
  });

  it('preserves at least one full path from the first life form to Homo sapiens', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.x = 0;
    colony.y = 0;
    colony.population = 3;

    const path: Array<{ biome: 'ocean' | 'coast' | 'land'; expected: string }> = [
      { biome: 'ocean', expected: 'cianobacteria' },
      { biome: 'ocean', expected: 'protozoario' },
      { biome: 'ocean', expected: 'esponja' },
      { biome: 'ocean', expected: 'verme_plano' },
      { biome: 'ocean', expected: 'cordado_ancestral' },
      { biome: 'ocean', expected: 'vertebrado_basal' },
      { biome: 'ocean', expected: 'peixe' },
      { biome: 'coast', expected: 'anfibio' },
      { biome: 'land', expected: 'reptil' },
      { biome: 'land', expected: 'sinapsideo' },
      { biome: 'land', expected: 'mamifero' },
      { biome: 'land', expected: 'primata_ancestral' },
      { biome: 'land', expected: 'simio_ancestral' },
      { biome: 'land', expected: 'hominino' },
      { biome: 'land', expected: 'homo_sapiens' },
    ];

    const biomePositions = {
      ocean: { x: 0, y: 0 },
      coast: { x: 4, y: 0 },
      land: { x: 5, y: 0 },
    };

    for (const step of path) {
      colony.x = biomePositions[step.biome].x;
      colony.y = biomePositions[step.biome].y;
      colony.population = 3;

      const nextId = getNextEvolutionId(scene, colony);
      expect(nextId).toBe(step.expected);

      colony.lifeFormId = step.expected;
      syncColonyTraversal(scene, colony);
    }

    expect(colony.lifeFormId).toBe('homo_sapiens');
  });

  it('reaches Homo sapiens through repeated performAdapt calls in a real gameplay flow', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.x = 0;
    colony.y = 0;
    colony.population = 3;

    const path: Array<{ biome: 'ocean' | 'coast' | 'land'; expected: string }> = [
      { biome: 'ocean', expected: 'cianobacteria' },
      { biome: 'ocean', expected: 'protozoario' },
      { biome: 'ocean', expected: 'esponja' },
      { biome: 'ocean', expected: 'verme_plano' },
      { biome: 'ocean', expected: 'cordado_ancestral' },
      { biome: 'ocean', expected: 'vertebrado_basal' },
      { biome: 'ocean', expected: 'peixe' },
      { biome: 'coast', expected: 'anfibio' },
      { biome: 'land', expected: 'reptil' },
      { biome: 'land', expected: 'sinapsideo' },
      { biome: 'land', expected: 'mamifero' },
      { biome: 'land', expected: 'primata_ancestral' },
      { biome: 'land', expected: 'simio_ancestral' },
      { biome: 'land', expected: 'hominino' },
      { biome: 'land', expected: 'homo_sapiens' },
    ];

    const biomePositions = {
      ocean: { x: 0, y: 0 },
      coast: { x: 4, y: 0 },
      land: { x: 5, y: 0 },
    };

    for (const step of path) {
      colony.x = biomePositions[step.biome].x;
      colony.y = biomePositions[step.biome].y;
      colony.population = 3;
      setSelectedColony(scene, colony);
      setTurnReady(scene, colony);

      scene.performAdapt();

      expect(colony.lifeFormId).toBe(step.expected);
    }

    expect(colony.lifeFormId).toBe('homo_sapiens');
  });

  it('keeps a full playable route to Homo sapiens across expansion and end-turn cycles', () => {
    const scene = createScene();
    const oceanColony = getSelectedColony(scene);

    oceanColony.population = 3;

    const oceanPath = [
      'cianobacteria',
      'protozoario',
      'esponja',
      'verme_plano',
      'cordado_ancestral',
      'vertebrado_basal',
      'peixe',
    ];

    for (const expected of oceanPath) {
      setSelectedColony(scene, oceanColony);
      scene.performAdapt();
      expect(oceanColony.lifeFormId).toBe(expected);
      if (expected !== 'peixe') {
        scene.endTurn();
      }
    }

    scene.endTurn();
    setSelectedColony(scene, oceanColony);
    scene.startExpandMode();
    (scene as any).tryExpandTo(3, 2);
    advanceTurns(scene, 3);

    const coastBridge = getColonyAt(scene, 3, 2);
    expect(coastBridge).toBeTruthy();
    expect(coastBridge.lifeFormId).toBe('peixe');

    setSelectedColony(scene, coastBridge);
    scene.startExpandMode();
    (scene as any).tryExpandTo(4, 2);
    advanceTurns(scene, 3);

    const coastFrontier = getColonyAt(scene, 4, 2);
    expect(coastFrontier).toBeTruthy();
    expect(coastFrontier.lifeFormId).toBe('peixe');

    setSelectedColony(scene, coastFrontier);
    scene.performAdapt();
    expect(coastFrontier.lifeFormId).toBe('anfibio');

    scene.endTurn();
    setSelectedColony(scene, coastFrontier);
    scene.startExpandMode();
    (scene as any).tryExpandTo(5, 2);
    advanceTurns(scene, 3);

    const landLineage = getColonyAt(scene, 5, 2);
    expect(landLineage).toBeTruthy();
    expect(landLineage.lifeFormId).toBe('anfibio');

    const landPath = [
      'reptil',
      'sinapsideo',
      'mamifero',
      'primata_ancestral',
      'simio_ancestral',
      'hominino',
      'homo_sapiens',
    ];

    for (const expected of landPath) {
      setSelectedColony(scene, landLineage);
      scene.performAdapt();
      expect(landLineage.lifeFormId).toBe(expected);
      if (expected !== 'homo_sapiens') {
        scene.endTurn();
      }
    }

    expect(landLineage.lifeFormId).toBe('homo_sapiens');
  });
});
