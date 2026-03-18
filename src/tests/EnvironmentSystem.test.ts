import { describe, expect, it } from 'vitest';
import { EnvironmentSystem } from '../game/systems/EnvironmentSystem';
import { Entity } from '../game/entities/Entity';
import { DEFS_BY_LEVEL } from '../game/entities/EntityTypes';

describe('EnvironmentSystem', () => {
  const environment = new EnvironmentSystem();
  const baseDef = DEFS_BY_LEVEL.get(0)![0];

  it('uses harsher profiles in later eras', () => {
    const early = environment.getProfile(0);
    const late = environment.getProfile(15);

    expect(late.hostility).toBeGreaterThan(early.hostility);
    expect(late.reproductionBias).toBeLessThan(early.reproductionBias);
  });

  it('rewards genes that fit the active environment', () => {
    const adapted = new Entity(baseDef, 0, 0, {
      speed: 0.55,
      lifespan: 0.82,
      fertility: 0.4,
      resilience: 0.82,
      size: 0.8,
    });
    adapted.level = 13;

    const maladapted = new Entity(baseDef, 0, 0, {
      speed: 0.05,
      lifespan: 0.2,
      fertility: 0.95,
      resilience: 0.2,
      size: 0.25,
    });
    maladapted.level = 13;

    const adaptedPressure = environment.evaluateEntity(adapted, 13);
    const maladaptedPressure = environment.evaluateEntity(maladapted, 13);

    expect(adaptedPressure.fitness).toBeGreaterThan(maladaptedPressure.fitness);
    expect(adaptedPressure.deathRisk).toBeLessThan(maladaptedPressure.deathRisk);
    expect(adaptedPressure.reproductionModifier).toBeGreaterThan(maladaptedPressure.reproductionModifier);
  });
});
