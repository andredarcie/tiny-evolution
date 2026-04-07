import { describe, expect, it } from 'vitest';
import { TurnGameScene } from '../game/turns/TurnGameScene';
import { setRandomSeed } from '../game/random';

function createScene(): TurnGameScene {
  setRandomSeed(1234);
  const hud = {
    update: () => {},
  };

  return new TurnGameScene(hud as never, { disableEvents: true });
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

function setBiome(scene: TurnGameScene, x: number, y: number, biome: 'ocean' | 'coast' | 'land') {
  (scene as any).terrain[y][x] = biome;
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

    setRandomSeed(1462);

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

    colony.lifeFormId = 'gnatostomado';
    colony.population = 1;
    addColony(scene, 4, 2, {
      lifeFormId: 'peixe',
      population: 1,
    });
    addColony(scene, 5, 2, {
      lifeFormId: 'anfibio',
      population: 1,
    });

    setRandomSeed(1456);

    expect(getNextEvolutionId(scene, colony)).toBe('tubarao');
  });

  it('opens a modal when a colony reaches a terminal branch', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.lifeFormId = 'gnatostomado';
    colony.population = 1;
    addColony(scene, 4, 2, {
      lifeFormId: 'peixe',
      population: 1,
    });
    addColony(scene, 5, 2, {
      lifeFormId: 'anfibio',
      population: 1,
    });

    setRandomSeed(1462);

    setSelectedColony(scene, colony);
    setTurnReady(scene, colony);
    scene.performAdapt();

    expect(colony.lifeFormId).toBe('tubarao');
    expect((scene as any).terminalInfoVisible).toBe(true);
    expect((scene as any).terminalInfoTitle).toContain('nicho');
    expect((scene as any).terminalInfoBenefits.some((item: string) => item.includes('+1 biomassa'))).toBe(true);
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

    setBiome(scene, 0, 0, 'ocean');
    setBiome(scene, 4, 0, 'coast');
    setBiome(scene, 5, 0, 'land');

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
      { biome: 'ocean', expected: 'gnatostomado' },
      { biome: 'ocean', expected: 'peixe' },
      { biome: 'coast', expected: 'sarcopterigio' },
      { biome: 'coast', expected: 'anfibio' },
      { biome: 'land', expected: 'reptil' },
      { biome: 'land', expected: 'sinapsideo' },
      { biome: 'land', expected: 'mamifero' },
      { biome: 'land', expected: 'placentario_basal' },
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

    setBiome(scene, 0, 0, 'ocean');
    setBiome(scene, 4, 0, 'coast');
    setBiome(scene, 5, 0, 'land');

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
      { biome: 'ocean', expected: 'gnatostomado' },
      { biome: 'ocean', expected: 'peixe' },
      { biome: 'coast', expected: 'sarcopterigio' },
      { biome: 'coast', expected: 'anfibio' },
      { biome: 'land', expected: 'reptil' },
      { biome: 'land', expected: 'sinapsideo' },
      { biome: 'land', expected: 'mamifero' },
      { biome: 'land', expected: 'placentario_basal' },
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
    (scene as any).colonies.clear();

    setBiome(scene, 5, 2, 'land');
    const colony = addColony(scene, 5, 2, {
      lifeFormId: 'mamifero',
      population: 2,
      adaptationPoints: 1,
      createdTurn: 0,
    });
    syncColonyTraversal(scene, colony);

    (scene as any).runNaturalSelection();

    expect(colony.population).toBe(1);
    expect((scene as any).logLines.some((line: string) => line.includes('exposição'))).toBe(true);
  });

  it('applies natural selection to colonies parked in the wrong biome', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.lifeFormId = 'vertebrado_basal';
    setBiome(scene, 3, 2, 'land');
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

    (scene as any).runNaturalSelection();

    expect(colony.adaptationPoints).toBe(1);
    const neighbor = getColonyAt(scene, 4, 2);
    expect(neighbor.adaptationPoints).toBe(1);
  });

  it('does not apply biomass attrition to terminal colonies', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);

    colony.lifeFormId = 'tubarao';
    colony.biomass = 3;
    colony.createdTurn = 0;
    syncColonyTraversal(scene, colony);

    (scene as any).runNaturalSelection();

    expect(colony.biomass).toBe(3);
    expect((scene as any).floatingDeltas.some((delta: any) => delta.colonyId === colony.id && delta.text === '+1')).toBe(false);
  });

  it('grants biomass to colonies adjacent to a terminal colony during natural selection', () => {
    const scene = createScene();
    (scene as any).colonies.clear();

    const terminal = addColony(scene, 0, 0, {
      lifeFormId: 'tubarao',
      biomass: 2,
      createdTurn: 0,
    });
    const supported = addColony(scene, 1, 0, {
      lifeFormId: 'mamifero',
      biomass: 2,
      createdTurn: 1,
    });

    syncColonyTraversal(scene, terminal);
    syncColonyTraversal(scene, supported);

    (scene as any).runNaturalSelection();

    expect(supported.biomass).toBe(3);
    expect((scene as any).floatingDeltas.some((delta: any) => delta.colonyId === supported.id && delta.text === '+1')).toBe(true);
  });

  it('gives tile energy as biomass to a colony in exploration mode at end of turn', () => {
    const scene = createScene();
    (scene as any).colonies.clear();

    setBiome(scene, 3, 3, 'ocean');
    (scene as any).tileEnergy[3][3] = 2;
    const colony = addColony(scene, 3, 3, { biomass: 1, createdTurn: 0 });
    setTurnReady(scene, colony);

    scene.endTurn();
    flushNaturalSelection(scene);

    // gains 2 from tile energy (exploration), loses 1 from attrition
    expect(colony.biomass).toBe(2);
    expect((scene as any).floatingDeltas.some((delta: any) => delta.colonyId === colony.id && delta.text === '+1')).toBe(true);
  });

  it('gives no biomass to a colony that used its action for something other than exploring', () => {
    const scene = createScene();
    (scene as any).colonies.clear();

    setBiome(scene, 3, 3, 'ocean');
    (scene as any).tileEnergy[3][3] = 3;
    const colony = addColony(scene, 3, 3, { biomass: 5, createdTurn: 0 });
    setTurnReady(scene, colony);

    // simulate action consumed without exploration
    (scene as any).actedColonyIds.add(colony.id);
    colony.autoExplore = false;
    colony.explorationBiomassPending = false;

    scene.endTurn();
    flushNaturalSelection(scene);

    // no exploration biomass, only attrition -1
    expect(colony.biomass).toBe(4);
  });

  it('gives no biomass on a tile with 0 energy even in exploration mode', () => {
    const scene = createScene();
    (scene as any).colonies.clear();

    setBiome(scene, 3, 3, 'ocean');
    (scene as any).tileEnergy[3][3] = 0;
    const colony = addColony(scene, 3, 3, { biomass: 3, createdTurn: 0 });
    setTurnReady(scene, colony);

    scene.endTurn();
    flushNaturalSelection(scene);

    // 0 energy + attrition -1
    expect(colony.biomass).toBe(2);
  });

  it('auto-explores a colony left without orders and keeps it selectable next turn', () => {
    const scene = createScene();
    (scene as any).colonies.clear();

    setBiome(scene, 3, 3, 'ocean');
    (scene as any).tileEnergy[3][3] = 1;
    const colony = addColony(scene, 3, 3, { biomass: 3, createdTurn: 0 });
    setTurnReady(scene, colony);

    scene.endTurn();
    flushNaturalSelection(scene);

    expect((scene as any).turn).toBe(2);
    expect((scene as any).turnStartColonyIds.has(colony.id)).toBe(true);
    expect((scene as any).canColonyAct(colony)).toBe(true);
    // gains 1 from tile energy, loses 1 from attrition — net zero
    expect(colony.biomass).toBe(3);
    expect((scene as any).floatingDeltas.some((delta: any) => delta.colonyId === colony.id && delta.text === '+1')).toBe(false);
  });

  it('keeps the selected colony selected after the tick advances when it survives', () => {
    const scene = createScene();
    (scene as any).colonies.clear();

    setBiome(scene, 3, 3, 'ocean');
    (scene as any).tileEnergy[3][3] = 1;
    const colony = addColony(scene, 3, 3, { biomass: 3, createdTurn: 0 });
    setSelectedColony(scene, colony);
    setTurnReady(scene, colony);

    scene.endTurn();
    flushNaturalSelection(scene);

    expect(getSelectedColony(scene)).toBe(colony);
  });

  it('spends parent biomass and gives the new colony 1 local biomass on expansion', () => {
    const scene = createScene();
    (scene as any).colonies.clear();

    setBiome(scene, 1, 1, 'ocean');
    setBiome(scene, 2, 1, 'ocean');
    const colony = addColony(scene, 1, 1, { biomass: 3, createdTurn: 0 });

    setSelectedColony(scene, colony);
    setTurnReady(scene, colony);
    scene.startExpandMode();
    (scene as any).tryExpandTo(2, 1);

    const expanded = getColonyAt(scene, 2, 1);
    expect(colony.biomass).toBe(2);
    expect(expanded).toBeTruthy();
    expect(expanded.biomass).toBe(1);
    expect(expanded.autoConsolidate).toBe(true);
    expect(expanded.gestatingUntilTurn).toBeNull();
    expect(expanded.busyUntilTurn).toBe(0);
  });

  it('does not cancel expansion mode when the automatic tick was about to advance', () => {
    const scene = createScene();
    (scene as any).colonies.clear();

    setBiome(scene, 1, 1, 'ocean');
    setBiome(scene, 2, 1, 'ocean');
    const colony = addColony(scene, 1, 1, { biomass: 3, createdTurn: 0 });

    setSelectedColony(scene, colony);
    setTurnReady(scene, colony);
    (scene as any).tickTimer = 179;
    scene.startExpandMode();
    scene.update();

    expect((scene as any).mode).toBe('expand');
    expect(getSelectedColony(scene)).toBe(colony);
    expect((scene as any).turn).toBe(1);
  });

  it('makes an expanded colony ready on the next turn without extra waiting', () => {
    const scene = createScene();
    (scene as any).colonies.clear();

    setBiome(scene, 1, 1, 'ocean');
    setBiome(scene, 2, 1, 'ocean');
    const colony = addColony(scene, 1, 1, { createdTurn: 0 });

    setSelectedColony(scene, colony);
    setTurnReady(scene, colony);
    scene.startExpandMode();
    (scene as any).tryExpandTo(2, 1);

    const expanded = getColonyAt(scene, 2, 1);
    scene.endTurn();
    flushNaturalSelection(scene);

    expect((scene as any).turn).toBe(2);
    expect((scene as any).isColonyEstablished(expanded)).toBe(true);
    expect((scene as any).isColonyBusy(expanded)).toBe(false);
    expect((scene as any).turnStartColonyIds.has(expanded.id)).toBe(true);
    expect((scene as any).canColonyAct(expanded)).toBe(true);
  });

  it('uses only the sum of local biomass when seeding a new colony', () => {
    const scene = createScene();
    (scene as any).colonies.clear();
    setBiome(scene, 0, 0, 'ocean');

    const first = addColony(scene, 3, 3, { biomass: 2, createdTurn: 0 });
    const second = addColony(scene, 4, 3, { biomass: 1, createdTurn: 0 });
    const third = addColony(scene, 5, 3, { biomass: 1, createdTurn: 0 });

    first.biomass = 2;
    second.biomass = 1;
    third.biomass = 1;

    scene.startSeedMode();
    (scene as any).trySeedAt(0, 0);

    expect((scene as any).getDebugState().biomass).toBe(2);
    expect(getColonyAt(scene, 0, 0)?.biomass).toBe(2);
    expect(getColonyAt(scene, 0, 0)?.autoConsolidate).toBe(true);
  });

  it('natural selection removes 1 local biomass from older colonies but skips colonies created this turn', () => {
    const scene = createScene();
    (scene as any).colonies.clear();

    setBiome(scene, 1, 1, 'ocean');
    setBiome(scene, 2, 1, 'ocean');
    const colony = addColony(scene, 1, 1, { biomass: 4, createdTurn: 0 });

    setSelectedColony(scene, colony);
    setTurnReady(scene, colony);
    scene.startExpandMode();
    (scene as any).tryExpandTo(2, 1);

    const expanded = getColonyAt(scene, 2, 1);
    expect(expanded.biomass).toBe(1);

    scene.endTurn();
    flushNaturalSelection(scene);

    expect(colony.biomass).toBe(2);
    expect(expanded.biomass).toBe(1);
  });

  it('extinguishes a colony when local biomass reaches zero', () => {
    const scene = createScene();
    const colony = getSelectedColony(scene);
    const startX = colony.x;
    const startY = colony.y;

    colony.biomass = 1;
    colony.createdTurn = 0;
    (scene as any).runNaturalSelection();

    expect(getColonyAt(scene, startX, startY)).toBeNull();
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

    (scene as any).runNaturalSelection();

    expect(getColonyAt(scene, parent.x, parent.y)).toBeNull();
    expect(getColonyAt(scene, child.x, child.y)).toBeNull();
    expect((scene as any).gameOver).toBe(true);
    expect((scene as any).gameOverTitle).toContain('Fim da vida');
    expect((scene as any).gameOverQuote.length).toBeGreaterThan(0);
  });

  it('triggers game over when the last branch that can reach Homo sapiens is lost at end of turn', () => {
    const scene = createScene();
    (scene as any).colonies.clear();

    addColony(scene, 0, 0, {
      lifeFormId: 'mamifero',
      biomass: 1,
      createdTurn: 0,
    });
    addColony(scene, 10, 10, {
      lifeFormId: 'tubarao',
      biomass: 2,
      createdTurn: 0,
    });

    scene.endTurn();

    expect((scene as any).gameOver).toBe(true);
    expect((scene as any).gameOverTitle).toContain('linhagem humana');
    expect((scene as any).gameOverDetail).toContain('Homo sapiens');
  });
});
