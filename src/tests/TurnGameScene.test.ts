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

function flushNaturalSelection(scene: TurnGameScene) {
  let safety = 0;
  while ((scene as any).phase === 'natural-selection' && safety < 500) {
    scene.update();
    safety += 1;
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

  it('applies natural selection to isolated colonies in harsh biomes', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.lifeFormId = 'mamifero';
    colony.x = 5;
    colony.y = 2;
    colony.population = 2;
    colony.adaptationPoints = 1;
    syncColonyTraversal(scene, colony);

    const queue = (scene as any).buildNaturalSelectionQueue();
    const event = queue.find((item: any) => item.colonyId === colony.id && item.kind === 'exposure');

    expect(event).toBeTruthy();

    (scene as any).applyNaturalSelectionEvent(event);

    expect(colony.population).toBe(1);
    expect((scene as any).logLines.some((line: string) => line.includes('Selecao Natural'))).toBe(true);
  });

  it('applies natural selection to colonies parked in the wrong biome', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.lifeFormId = 'vertebrado_basal';
    colony.x = 3;
    colony.y = 2;
    colony.population = 2;
    colony.adaptationPoints = 2;
    syncColonyTraversal(scene, colony);

    addColony(scene, 4, 2, {
      lifeFormId: 'fungo',
      population: 2,
      adaptationPoints: 1,
    });

    const queue = (scene as any).buildNaturalSelectionQueue();
    const event = queue.find((item: any) => item.colonyId === colony.id && item.kind === 'stagnation');

    expect(event).toBeTruthy();

    (scene as any).applyNaturalSelectionEvent(event);

    expect(colony.adaptationPoints).toBe(1);
    const neighbor = getColonyAt(scene, 4, 2);
    expect(neighbor.adaptationPoints).toBe(1);
    expect(event.detail.includes('bioma errado')).toBe(true);
  });

  it('only increases local biomass when consolidation completes', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.biomass = 3;
    setSelectedColony(scene, colony);
    scene.performConsolidate();

    scene.endTurn();
    flushNaturalSelection(scene);
    scene.endTurn();
    flushNaturalSelection(scene);

    expect(colony.biomass).toBe(2);
  });

  it('spends parent biomass and gives the new colony 1 local biomass on expansion', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.biomass = 3;
    setSelectedColony(scene, colony);
    scene.startExpandMode();
    (scene as any).tryExpandTo(2, 1);

    const expanded = getColonyAt(scene, 2, 1);
    expect(colony.biomass).toBe(2);
    expect(expanded).toBeTruthy();
    expect(expanded.biomass).toBe(1);
  });

  it('natural selection removes 1 local biomass from older colonies but skips colonies created this turn', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.biomass = 4;
    setSelectedColony(scene, colony);
    scene.startExpandMode();
    (scene as any).tryExpandTo(2, 1);

    const expanded = getColonyAt(scene, 2, 1);
    expect(expanded.biomass).toBe(1);

    scene.endTurn();
    flushNaturalSelection(scene);

    expect(colony.biomass).toBe(2);
    expect(expanded.biomass).toBe(1);
    expect((scene as any).naturalSelectionSummaryLines.some((line: string) => line.includes('-1 biomassa local'))).toBe(true);
    expect((scene as any).naturalSelectionSummaryVisible).toBe(true);
  });

  it('extinguishes a colony when local biomass reaches zero and reports it in the summary', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);
    const startX = colony.x;
    const startY = colony.y;

    colony.biomass = 1;
    const event = (scene as any).buildNaturalSelectionQueue().find((item: any) => item.colonyId === colony.id && item.kind === 'attrition');
    (scene as any).applyNaturalSelectionEvent(event);

    expect(getColonyAt(scene, startX, startY)).toBeNull();
    expect((scene as any).naturalSelectionSummaryLines.some((line: string) => line.includes('extinta'))).toBe(true);
    expect((scene as any).extinctionBursts.length).toBeGreaterThan(0);
  });

  it('extinguishes a gestating expansion with its parent and triggers game over when nothing survives', () => {
    const scene = createScene();
    (scene as any).colonies.clear();

    const parent = addColony(scene, 0, 0, {
      biomass: 1,
      createdTurn: 0,
    });
    const child = addColony(scene, 1, 0, {
      biomass: 1,
      createdTurn: 1,
      parentColonyId: parent.id,
      gestatingUntilTurn: 99,
      busyUntilTurn: 99,
    });

    const event = (scene as any).buildNaturalSelectionQueue().find((item: any) => item.colonyId === parent.id && item.kind === 'attrition');
    (scene as any).applyNaturalSelectionEvent(event);
    (scene as any).finishNaturalSelection();

    expect(getColonyAt(scene, parent.x, parent.y)).toBeNull();
    expect(getColonyAt(scene, child.x, child.y)).toBeNull();
    expect((scene as any).gameOver).toBe(true);
    expect((scene as any).gameOverTitle).toContain('Fim da vida');
    expect((scene as any).naturalSelectionSummaryLines.some((line: string) => line.includes('expansao abortada'))).toBe(true);
  });
});
