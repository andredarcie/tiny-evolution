import type { Entity } from '../entities/Entity';
import type { Genes } from '../entities/EntityTypes';

export interface EnvironmentGuideItem {
  emoji: string;
  label: string;
  detail: string;
}

export interface EnvironmentProfile {
  minLevel: number;
  name: string;
  hostility: number;
  reproductionBias: number;
  favoredGenes: Partial<Genes>;
  badgeEmoji: string;
  ambientEmojis: string[];
  guide: EnvironmentGuideItem[];
}

export interface EntityEnvironmentalPressure {
  ageMultiplier: number;
  deathRisk: number;
  reproductionModifier: number;
  fitness: number;
  environmentName: string;
}

export const ENVIRONMENT_PROFILES: EnvironmentProfile[] = [
  {
    minLevel: 0,
    name: 'Sopa primordial instável',
    hostility: 0.10,
    reproductionBias: 1.05,
    favoredGenes: { resilience: 0.9, fertility: 0.75, lifespan: 0.75 },
    badgeEmoji: '🌋',
    ambientEmojis: ['🌋', '⚡', '💨', '🫧'],
    guide: [
      { emoji: '🌋', label: 'Calor extremo', detail: 'Favorece perfis resistentes e duradouros.' },
      { emoji: '⚡', label: 'Energia reativa', detail: 'Estimula encontros e mutacoes iniciais.' },
    ],
  },
  {
    minLevel: 3,
    name: 'Atmosfera oxidante',
    hostility: 0.18,
    reproductionBias: 0.95,
    favoredGenes: { resilience: 0.85, speed: 0.35, lifespan: 0.7 },
    badgeEmoji: '☀️',
    ambientEmojis: ['☀️', '🪨', '💨', '🧪'],
    guide: [
      { emoji: '☀️', label: 'Oxigenacao', detail: 'Aumenta a pressao sobre organismos frageis.' },
      { emoji: '🧪', label: 'Quimica ativa', detail: 'Favorece adaptacoes mais estaveis.' },
    ],
  },
  {
    minLevel: 5,
    name: 'Oceanos competitivos',
    hostility: 0.22,
    reproductionBias: 0.92,
    favoredGenes: { speed: 0.45, fertility: 0.6, resilience: 0.75 },
    badgeEmoji: '🌊',
    ambientEmojis: ['🌊', '🪸', '🪼', '🫧'],
    guide: [
      { emoji: '🌊', label: 'Correntes fortes', detail: 'Premiam mobilidade e adaptacao aquatica.' },
      { emoji: '🪸', label: 'Nicho marinho', detail: 'Mais disputa por espaco e recursos.' },
    ],
  },
  {
    minLevel: 8,
    name: 'Explosão cambriana',
    hostility: 0.28,
    reproductionBias: 1.0,
    favoredGenes: { speed: 0.6, size: 0.75, resilience: 0.65 },
    badgeEmoji: '🪼',
    ambientEmojis: ['🪼', '🪸', '🐚', '🌊'],
    guide: [
      { emoji: '🪼', label: 'Diversificacao', detail: 'Mais formas de vida competem ao mesmo tempo.' },
      { emoji: '🐚', label: 'Estruturas duras', detail: 'Tamanho e defesa corporal ganham valor.' },
    ],
  },
  {
    minLevel: 11,
    name: 'Conquista da terra',
    hostility: 0.33,
    reproductionBias: 0.88,
    favoredGenes: { resilience: 0.8, lifespan: 0.7, size: 0.8 },
    badgeEmoji: '🌿',
    ambientEmojis: ['🌿', '⛰️', '🍄', '🌧️'],
    guide: [
      { emoji: '⛰️', label: 'Terreno seco', detail: 'Sobrevive melhor quem aguenta mais estresse.' },
      { emoji: '🌿', label: 'Colonizacao', detail: 'Favorece corpos robustos e duradouros.' },
    ],
  },
  {
    minLevel: 13,
    name: 'Ecossistemas complexos',
    hostility: 0.36,
    reproductionBias: 0.84,
    favoredGenes: { speed: 0.55, resilience: 0.82, lifespan: 0.82 },
    badgeEmoji: '🌲',
    ambientEmojis: ['🌲', '🍃', '🪺', '🌧️'],
    guide: [
      { emoji: '🌲', label: 'Nicho denso', detail: 'Pequenas vantagens geneticas fazem diferenca.' },
      { emoji: '🪺', label: 'Especializacao', detail: 'Cada linhagem disputa um espaco mais estreito.' },
    ],
  },
  {
    minLevel: 15,
    name: 'Pressão antrópica moderna',
    hostility: 0.42,
    reproductionBias: 0.78,
    favoredGenes: { resilience: 0.9, lifespan: 0.9, fertility: 0.35 },
    badgeEmoji: '🏙️',
    ambientEmojis: ['🏙️', '🏭', '🚧', '🌫️'],
    guide: [
      { emoji: '🏭', label: 'Impacto humano', detail: 'O ambiente fica mais duro e menos fertil.' },
      { emoji: '🌫️', label: 'Estresse cronico', detail: 'So perfis muito resistentes mantem vantagem.' },
    ],
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class EnvironmentSystem {
  getProfile(maxEraReached: number): EnvironmentProfile {
    let current = ENVIRONMENT_PROFILES[0];
    for (const profile of ENVIRONMENT_PROFILES) {
      if (maxEraReached >= profile.minLevel) current = profile;
    }
    return current;
  }

  evaluateEntity(entity: Entity, maxEraReached: number): EntityEnvironmentalPressure {
    const profile = this.getProfile(maxEraReached);
    const fitness = this.computeFitness(entity.genes, entity.level, maxEraReached, profile);
    const stress = clamp(
      profile.hostility * (1.12 - fitness) + Math.max(0, maxEraReached - entity.level) * 0.006,
      0,
      0.55
    );

    return {
      ageMultiplier: clamp(0.72 + fitness * 0.72 - stress * 0.55, 0.5, 1.55),
      deathRisk: clamp(stress * 0.018, 0, 0.02),
      reproductionModifier: clamp(profile.reproductionBias * (0.6 + fitness * 0.8), 0.35, 1.2),
      fitness,
      environmentName: profile.name,
    };
  }

  evaluatePair(a: Entity, b: Entity, maxEraReached: number): EntityEnvironmentalPressure {
    const pa = this.evaluateEntity(a, maxEraReached);
    const pb = this.evaluateEntity(b, maxEraReached);

    return {
      ageMultiplier: (pa.ageMultiplier + pb.ageMultiplier) / 2,
      deathRisk: (pa.deathRisk + pb.deathRisk) / 2,
      reproductionModifier: clamp((pa.reproductionModifier + pb.reproductionModifier) / 2, 0.35, 1.2),
      fitness: (pa.fitness + pb.fitness) / 2,
      environmentName: pa.environmentName,
    };
  }

  private computeFitness(
    genes: Genes,
    entityLevel: number,
    maxEraReached: number,
    profile: EnvironmentProfile
  ): number {
    const weightedTraits = Object.entries(profile.favoredGenes) as [keyof Genes, number][];
    const traitScore = weightedTraits.reduce((sum, [trait, target]) => {
      return sum + (1 - Math.abs(genes[trait] - target));
    }, 0) / weightedTraits.length;

    const resilienceBuffer = genes.resilience * 0.5 + genes.lifespan * 0.2 + genes.speed * 0.1;
    const levelScore = clamp(1 - Math.max(0, maxEraReached - entityLevel) * 0.035, 0.35, 1);

    return clamp(traitScore * 0.55 + resilienceBuffer * 0.2 + levelScore * 0.25, 0, 1);
  }
}
