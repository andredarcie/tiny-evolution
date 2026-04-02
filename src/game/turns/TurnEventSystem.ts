import { random } from '../random';
import { MAMMAL_LIFE_FORM_IDS } from './evolutionData';

export interface TurnEvent {
  id: string;
  name: string;
  description: string;
  emoji: string;
  stageMin: number;
  stageMax: number;
  chance: number;
  apply?: (scene: any) => string; // Efeito imediato ou mensagem de log
}

export const TURN_EVENTS: TurnEvent[] = [
  {
    id: 'electric_storm',
    name: 'Tempestade Elétrica',
    description: 'Raios catalisam moléculas orgânicas no oceano primitivo.',
    emoji: '⚡',
    stageMin: 0,
    stageMax: 1,
    chance: 0.15,
    apply: (scene) => {
      let count = 0;
      for (const colony of scene.colonies.values()) {
        if (scene.terrain[colony.y][colony.x] === 'ocean') {
          colony.adaptationPoints += 1;
          count++;
        }
      }
      return count > 0 ? `Energia elétrica deu +1 adaptação a ${count} colônias marinhas.` : 'Nenhuma colônia no oceano para aproveitar a energia.';
    }
  },
  {
    id: 'nutrient_bloom',
    name: 'Bloom de Nutrientes',
    description: 'Correntes oceânicas trazem minerais das profundezas.',
    emoji: '🌿',
    stageMin: 0,
    stageMax: 2,
    chance: 0.15,
    apply: (scene) => {
      let count = 0;
      for (const colony of scene.colonies.values()) {
        if (colony.lifeFormId.includes('alga') || colony.lifeFormId === 'cianobacteria') {
          colony.biomass += 2;
          count++;
        }
      }
      return count > 0 ? `Fotossíntese em alta! +2 biomassa para ${count} linhagens vegetais.` : 'As algas não aproveitaram o bloom deste turno.';
    }
  },
  {
    id: 'volcanic_activity',
    name: 'Atividade Vulcânica',
    description: 'Cinzas e calor alteram o ecossistema local.',
    emoji: '🌋',
    stageMin: 0,
    stageMax: 4,
    chance: 0.1,
    apply: (scene) => {
      let affected = 0;
      for (const colony of scene.colonies.values()) {
        if (random() < 0.3) {
          colony.population = Math.max(1, colony.population - 1);
          colony.biomass += 2;
          affected++;
        }
      }
      return affected > 0 ? `Vulcões causaram perdas, mas fertilizaram ${affected} tiles (+2 biomassa, -1 pop).` : 'A atividade vulcânica foi distante e não afetou as colônias.';
    }
  },
  {
    id: 'ice_age',
    name: 'Era do Gelo',
    description: 'O clima global esfria drasticamente.',
    emoji: '❄️',
    stageMin: 2,
    stageMax: 4,
    chance: 0.1,
    apply: (scene) => {
      let affected = 0;
      for (const colony of scene.colonies.values()) {
        if (scene.terrain[colony.y][colony.x] !== 'ocean' && !MAMMAL_LIFE_FORM_IDS.has(colony.lifeFormId)) {
          colony.biomass = Math.max(0, colony.biomass - 1);
          affected++;
        }
      }
      return affected > 0 ? `O frio intenso consumiu 1 biomassa de ${affected} colônias terrestres.` : 'O frio não encontrou alvos vulneráveis.';
    }
  },
  {
    id: 'asteroid_impact',
    name: 'Impacto de Asteroide',
    description: 'Um evento de extinção em massa vindo do espaço.',
    emoji: '☄️',
    stageMin: 3,
    stageMax: 4,
    chance: 0.05,
    apply: (scene) => {
      let deaths = 0;
      for (const colony of scene.colonies.values()) {
        if (colony.lifeFormId === 'dinossauro') {
          colony.population = Math.max(0, colony.population - 2);
          deaths++;
        } else {
          colony.adaptationPoints += 1; // Pequenos animais se adaptam no caos
        }
      }
      return deaths > 0 ? `O impacto devastou os dinossauros, mas abriu nichos para outros.` : 'O asteroide caiu no deserto, causando pouco impacto biológico.';
    }
  },
  {
    id: 'ecological_abundance',
    name: 'Abundância Ecológica',
    description: 'Condições climáticas perfeitas para a vida.',
    emoji: '✨',
    stageMin: 0,
    stageMax: 4,
    chance: 0.1,
    apply: (scene) => {
      for (const colony of scene.colonies.values()) {
        colony.biomass += 1;
      }
      return 'Todas as colônias prosperaram com a abundância deste ciclo (+1 biomassa).';
    }
  }
];

export function rollTurnEvent(stage: number): TurnEvent | null {
  const possible = TURN_EVENTS.filter(e => stage >= e.stageMin && stage <= e.stageMax);
  if (possible.length === 0) return null;
  
  // Primeiro decide SE vai ter evento
  if (random() > 0.3) return null; // 30% de chance de ter ALGUM evento

  // Escolhe um evento da lista de possíveis baseado no peso (chance individual)
  const totalWeight = possible.reduce((sum, e) => sum + e.chance, 0);
  let roll = random() * totalWeight;
  
  for (const event of possible) {
    roll -= event.chance;
    if (roll <= 0) return event;
  }
  
  return possible[0];
}
