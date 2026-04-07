import type { TurnHUD } from './TurnHUD';
import { random } from '../random';
import {
  EVOLUTION_BY_ID,
  HUMAN_EVOLUTION_ID,
  STAGES,
  GROUP_ENERGY_MULTIPLIER,
  formatBiomass,
  type Biome,
  type EvolutionDefinition,
} from './evolutionData';

type ActionMode = 'idle' | 'expand' | 'seed';

// Cost = 5 turns of post-evolution exploration income: round(T × tileEnergy × M_target)
// tileEnergy is the actual energy shown on the tile (the dots), not a biome average.
const ADAPT_PAYBACK_TURNS = 20;

function getAdaptCost(nextEvolution: EvolutionDefinition, tileEnergy: number): number {
  const M = GROUP_ENERGY_MULTIPLIER[nextEvolution.group];
  return Math.max(1, Math.round(ADAPT_PAYBACK_TURNS * tileEnergy * M));
}

interface LifeMilestone {
  id: string;
  triggerLifeFormId: string;
  title: string;
  when: string;
  lead: string;
  body: string;
}

interface Colony {
  id: number;
  x: number;
  y: number;
  population: number;
  biomass: number;
  lifeFormId: string;
  adaptationPoints: number;
  coastAdapted: boolean;
  landAdapted: boolean;
  fortified: boolean;
  autoExplore: boolean;
  autoConsolidate: boolean;
  busyUntilTurn: number;
  exploringUntilTurn: number | null;
  explorationBiomassPending: boolean;
  gestatingUntilTurn: number | null;
  createdTurn: number;
  parentColonyId: number | null;
}

const GRID_SIZE = 6;
const MIN_OCEAN_TILES = 7;
const MIN_COAST_TILES = 5;
const MIN_LAND_TILES = 7;
const SEED_COST = 4;
const TICK_INTERVAL = 180;
const MIN_PARALLEL_HUMAN_PATHS_FOR_BRANCHING = 2;

const HEX_SQRT3 = Math.sqrt(3);
const WORLD_COLORS = {
  background: '#e9e1d2',
  ocean: '#3a6f96',
  coast: '#8fbfad',
  land: '#8eaa63',
  expandHighlight: 'rgba(243, 211, 107, 0.34)',
  seedHighlight: 'rgba(111, 170, 201, 0.34)',
  hoverStroke: '#f7f1e8',
  selectedStroke: '#6e4c2d',
  gridStroke: 'rgba(107, 90, 70, 0.18)',
  badgeFill: 'rgba(251, 246, 238, 0.94)',
  badgeStroke: 'rgba(110, 76, 45, 0.24)',
  badgeText: '#4d3b2b',
  adaptationReady: '#72b36a',
  adaptationSpent: '#c98b2e',
  fortifyStroke: '#f7f1e8',
  text: '#2e241b',
  extinctionStroke: 'rgba(184, 90, 70, 0.95)',
  biomassGain: '#72b36a',
  biomassLoss: '#f3d36b',
  energyPip: 'rgba(255, 255, 255, 0.45)',
} as const;

interface FloatingDelta {
  colonyId: number;
  text: string;
  color: string;
  framesLeft: number;
}

interface ExtinctionBurst {
  x: number;
  y: number;
  framesLeft: number;
}

interface GameOverQuote {
  text: string;
  author: string;
}

const LIFE_MILESTONES: LifeMilestone[] = [
  {
    id: 'origin-of-life',
    triggerLifeFormId: 'bacteria_primitiva',
    when: 'há cerca de 3,5 a 3,8 bilhões de anos',
    title: 'Você chegou em: Surgimento da Vida',
    lead: 'As primeiras células vivas surgem nos oceanos primitivos da Terra.',
    body: 'Esse é o começo de toda a história biológica do planeta. Organismos simples, sem núcleo, passam a se replicar e a explorar energia química em um mundo ainda sem oxigênio livre.',
  },
  {
    id: 'great-oxidation',
    triggerLifeFormId: 'cianobacteria',
    when: 'há cerca de 2,4 bilhões de anos',
    title: 'Você chegou em: Grande Oxidação',
    lead: 'A fotossíntese começa a transformar a atmosfera do planeta.',
    body: 'Linhagens fotossintetizantes oxigênicas passam a liberar oxigênio em escala suficiente para alterar a química dos oceanos e da atmosfera. Isso desestabiliza muitos ecossistemas anaeróbios e prepara o planeta para formas de vida mais complexas.',
  },
  {
    id: 'eukaryotes',
    triggerLifeFormId: 'protozoario',
    when: 'há cerca de 2,0 bilhões de anos',
    title: 'Você chegou em: Surgimento das Células Eucarióticas',
    lead: 'A vida dá um salto estrutural com células maiores e mais complexas.',
    body: 'Células com núcleo e organelas surgem provavelmente por endossimbiose. Essa inovação abre caminho para especialização interna, maior eficiência energética e, mais tarde, para a multicelularidade.',
  },
  {
    id: 'multicellularity',
    triggerLifeFormId: 'esponja',
    when: 'há cerca de 650 milhões de anos',
    title: 'Você chegou em: Multicelularidade e Primeiros Animais',
    lead: 'A vida passa a organizar corpos com muitas células cooperando entre si.',
    body: 'Com organismos multicelulares, surgem tecidos simples, divisão de funções e novas possibilidades ecológicas. Os primeiros animais aparecem nos mares e inauguram uma nova etapa da evolução.',
  },
  {
    id: 'cambrian-explosion',
    triggerLifeFormId: 'verme_plano',
    when: 'há cerca de 540 milhões de anos',
    title: 'Você chegou em: Explosão Cambriana',
    lead: 'Os grandes planos corporais animais se diversificam rapidamente.',
    body: 'Nesse período, a vida animal ganha enorme variedade anatômica. Surgem linhagens com simetria bilateral, cabeças, direção corporal definida e maior mobilidade, bases da fauna moderna.',
  },
  {
    id: 'vertebrates',
    triggerLifeFormId: 'vertebrado_basal',
    when: 'há cerca de 480 milhões de anos',
    title: 'Você chegou em: Surgimento dos Vertebrados',
    lead: 'A linhagem com crânio e eixo corporal reforçado começa a tomar forma.',
    body: 'Os primeiros vertebrados estabelecem a base anatômica que, muito mais tarde, levará a peixes, anfíbios, répteis, aves, mamíferos e seres humanos.',
  },
  {
    id: 'land-plants',
    triggerLifeFormId: 'embriofita',
    when: 'há cerca de 470 milhões de anos',
    title: 'Você chegou em: Plantas Terrestres Iniciais',
    lead: 'A cobertura viva dos continentes começa a se estabelecer.',
    body: 'As primeiras plantas terrestres ajudam a reter solo, alterar ciclos químicos e criar novos microambientes em terra firme. Antes mesmo dos vertebrados terrestres, elas já estavam transformando os continentes.',
  },
  {
    id: 'jawed-vertebrates',
    triggerLifeFormId: 'gnatostomado',
    when: 'há cerca de 430 milhões de anos',
    title: 'Você chegou em: Vertebrados com Mandíbula',
    lead: 'Uma inovação anatômica muda profundamente a história dos vertebrados.',
    body: 'Mandíbulas ampliam estratégias de alimentação, defesa e predação. A partir desse ponto, a diversificação vertebrada acelera e prepara o terreno para peixes ósseos, tubarões e muitos outros ramos.',
  },
  {
    id: 'lobe-finned-fish',
    triggerLifeFormId: 'sarcopterigio',
    when: 'há cerca de 390 milhões de anos',
    title: 'Você chegou em: Peixes de Nadadeiras Lobadas',
    lead: 'As estruturas dos futuros membros dos tetrápodes começam a aparecer.',
    body: 'Dentro dos sarcopterígios, nadadeiras com ossos internos robustos abrem caminho para a transição à terra. Esse ramo é central para entender a origem anatômica dos vertebrados terrestres.',
  },
  {
    id: 'land-conquest',
    triggerLifeFormId: 'anfibio',
    when: 'há cerca de 375 milhões de anos',
    title: 'Você chegou em: Vertebrados em Terra Firme',
    lead: 'Vertebrados passam a explorar o ambiente fora da água de forma mais estável.',
    body: 'Plantas e artrópodes já ocupavam ambientes terrestres antes desse passo. O que este marco representa é a entrada dos vertebrados em terra firme, alterando locomoção, respiração, alimentação e a estrutura ecológica dos continentes.',
  },
  {
    id: 'amniotic-egg',
    triggerLifeFormId: 'reptil',
    when: 'há cerca de 320 milhões de anos',
    title: 'Você chegou em: Ovo Amniótico',
    lead: 'A reprodução deixa de depender diretamente da água livre.',
    body: 'O ovo amniótico permite uma reprodução muito mais independente da água livre e ajuda a consolidar a expansão dos vertebrados em terra. Evidências recentes sugerem que amniotas podem ser mais antigos do que as estimativas clássicas, mas esse marco continua representando essa transição reprodutiva decisiva.',
  },
  {
    id: 'mammals',
    triggerLifeFormId: 'mamifero',
    when: 'há cerca de 200 milhões de anos',
    title: 'Você chegou em: Surgimento dos Mamíferos',
    lead: 'Uma nova linhagem terrestre ganha sofisticação fisiológica e comportamental.',
    body: 'Os primeiros mamíferos reúnem características como endotermia, lactação e cuidado parental intenso, embora ainda ocupem nichos discretos por muito tempo. Sua grande radiação ecológica virá bem mais tarde, após a extinção dos dinossauros não aviários.',
  },
  {
    id: 'mammalian-radiation',
    triggerLifeFormId: 'placentario_basal',
    when: 'hÃ¡ cerca de 66 milhÃµes de anos',
    title: 'VocÃª chegou em: RadiaÃ§Ã£o dos MamÃ­feros',
    lead: 'Os mamÃ­feros passam a ocupar em massa os nichos liberados no inÃ­cio do Cenozoico.',
    body: 'ApÃ³s a extinÃ§Ã£o do fim do CretÃ¡ceo, os mamÃ­feros placentÃ¡rios se diversificam rapidamente. Desse contexto emergem muitos ramos modernos, como primatas, carnÃ­voros, cetÃ¡ceos, roedores, morcegos e proboscÃ­deos.',
  },
  {
    id: 'primates',
    triggerLifeFormId: 'primata_ancestral',
    when: 'há cerca de 55 a 65 milhões de anos',
    title: 'Você chegou em: Evolução dos Primatas',
    lead: 'Visão, mãos e cognição passam a ganhar novo peso evolutivo.',
    body: 'Primatas desenvolvem visão frontal, maior coordenação manual e cérebros mais flexíveis. Essa combinação prepara o terreno para linhagens com comportamento social e aprendizado sofisticados.',
  },
  {
    id: 'hominins',
    triggerLifeFormId: 'hominino',
    when: 'há cerca de 6 a 7 milhões de anos',
    title: 'Você chegou em: Surgimento dos Hominínios',
    lead: 'Bipedalismo e expansão cerebral passam a se combinar na mesma linhagem.',
    body: 'Os primeiros hominínios representam a separação entre a linhagem humana e a dos chimpanzés. Ao longo desse ramo, bipedalismo, mãos livres e mudanças cognitivas passam a se reforçar até formas mais claramente humanas aparecerem milhões de anos depois.',
  },
  {
    id: 'homo-sapiens',
    triggerLifeFormId: 'homo_sapiens',
    when: 'há cerca de 300 mil anos',
    title: 'Você chegou em: Homo sapiens',
    lead: 'A linhagem humana surge como parte recente de uma história muito mais antiga.',
    body: 'Linguagem simbólica, cultura acumulativa e transformação ambiental em larga escala tornam Homo sapiens uma espécie singular. Esse ponto encerra a jornada principal desta campanha.',
  },
];

const GAME_OVER_QUOTES: GameOverQuote[] = [
  {
    text: 'A extinção das formas menos aperfeiçoadas é uma consequência da seleção natural.',
    author: 'Charles Darwin',
  },
  {
    text: 'Da guerra da natureza, da fome e da morte, surgem também as grandes viradas da vida.',
    author: 'Charles Darwin',
  },
  {
    text: 'Quando uma espécie se extingue, é provável que outras extinções venham em seguida, talvez até uma avalanche.',
    author: 'Stuart L. Pimm',
  },
  {
    text: 'As espécies deveriam desaparecer raramente; o que vemos hoje é uma taxa de extinção centenas de vezes maior.',
    author: 'Stuart L. Pimm',
  },
];

function canReachEvolutionTarget(fromId: string, targetId: string, visited = new Set<string>()): boolean {
  if (fromId === targetId) return true;
  if (visited.has(fromId)) return false;
  visited.add(fromId);

  const form = EVOLUTION_BY_ID.get(fromId);
  if (!form) return false;

  return form.next.some((step) => canReachEvolutionTarget(step.to, targetId, visited));
}

function getEvolutionDistanceToTarget(fromId: string, targetId: string, visited = new Set<string>()): number | null {
  if (fromId === targetId) return 0;
  if (visited.has(fromId)) return null;
  visited.add(fromId);

  const form = EVOLUTION_BY_ID.get(fromId);
  if (!form || form.next.length === 0) return null;

  let bestDistance: number | null = null;
  for (const step of form.next) {
    const distance = getEvolutionDistanceToTarget(step.to, targetId, new Set(visited));
    if (distance === null) continue;
    const totalDistance = distance + 1;
    if (bestDistance === null || totalDistance < bestDistance) {
      bestDistance = totalDistance;
    }
  }

  return bestDistance;
}

function choosePreferredEvolutionStep(
  steps: Array<{ to: string; biome: Biome; minPopulation: number }>,
  existingForms: Set<string>,
): { to: string; biome: Biome; minPopulation: number } | null {
  if (steps.length === 0) return null;
  const ranked = steps
    .map((step, index) => ({
      step,
      index,
      isNovel: !existingForms.has(step.to),
      distanceToHuman: getEvolutionDistanceToTarget(step.to, HUMAN_EVOLUTION_ID) ?? Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => {
      if (a.distanceToHuman !== b.distanceToHuman) return a.distanceToHuman - b.distanceToHuman;
      if (a.isNovel !== b.isNovel) return a.isNovel ? -1 : 1;
      return a.index - b.index;
    });

  return ranked[0]?.step ?? null;
}

function getHexNeighborCoordsForGrid(x: number, y: number): Array<{ x: number; y: number }> {
  const isOddRow = y % 2 === 1;
  const offsets = isOddRow
    ? [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 1, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: 1, dy: 1 },
      ]
    : [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: -1, dy: -1 },
        { dx: 0, dy: -1 },
        { dx: -1, dy: 1 },
        { dx: 0, dy: 1 },
      ];

  return offsets
    .map(({ dx, dy }) => ({ x: x + dx, y: y + dy }))
    .filter((cell) => cell.x >= 0 && cell.y >= 0 && cell.x < GRID_SIZE && cell.y < GRID_SIZE);
}


function generateRandomTerrain(): { terrain: Biome[][]; tileEnergy: number[][] } {
  // Retry until the board has enough connected biome variety for progression.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rawLand = Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => random() < 0.52));
    // ... rest of smoothing logic ...
    for (let pass = 0; pass < 2; pass += 1) {
      const next = rawLand.map((row) => [...row]);
      for (let y = 0; y < GRID_SIZE; y += 1) {
        for (let x = 0; x < GRID_SIZE; x += 1) {
          let landNeighbors = 0;
          let totalNeighbors = 0;
          for (const { x: nx, y: ny } of getHexNeighborCoordsForGrid(x, y)) {
            totalNeighbors += 1;
            if (rawLand[ny][nx]) landNeighbors += 1;
          }
          if (landNeighbors >= Math.ceil(totalNeighbors * 0.55)) next[y][x] = true;
          else if (landNeighbors <= Math.floor(totalNeighbors * 0.3)) next[y][x] = false;
        }
      }
      for (let y = 0; y < GRID_SIZE; y += 1) {
        for (let x = 0; x < GRID_SIZE; x += 1) {
          rawLand[y][x] = next[y][x];
        }
      }
    }

    const terrain: Biome[][] = Array.from({ length: GRID_SIZE }, (_, y) =>
      Array.from({ length: GRID_SIZE }, (_, x) => {
        if (!rawLand[y][x]) return 'ocean';
        const adjacentToOcean =
          (x > 0 && !rawLand[y][x - 1])
          || (x < GRID_SIZE - 1 && !rawLand[y][x + 1])
          || (y > 0 && !rawLand[y - 1][x])
          || (y < GRID_SIZE - 1 && !rawLand[y + 1][x]);
        return adjacentToOcean ? 'coast' : 'land';
      }),
    );

    let oceanCount = 0;
    let coastCount = 0;
    let landCount = 0;
    let oceanCoastAdjacency = false;
    let coastLandAdjacency = false;

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const biome = terrain[y][x];
        if (biome === 'ocean') oceanCount += 1;
        else if (biome === 'coast') coastCount += 1;
        else landCount += 1;

        for (const { x: nx, y: ny } of getHexNeighborCoordsForGrid(x, y)) {
          const neighbor = terrain[ny][nx];
          if (biome === 'ocean' && neighbor === 'coast') oceanCoastAdjacency = true;
          if (biome === 'coast' && neighbor === 'land') coastLandAdjacency = true;
        }
      }
    }

    if (
      oceanCount >= MIN_OCEAN_TILES
      && coastCount >= MIN_COAST_TILES
      && landCount >= MIN_LAND_TILES
      && oceanCoastAdjacency
      && coastLandAdjacency
    ) {
      const tileEnergy = terrain.map((row) =>
        row.map((biome) => {
          const roll = random();
          if (biome === 'ocean') return roll < 0.15 ? 0 : roll < 0.6 ? 1 : roll < 0.92 ? 2 : 3;
          if (biome === 'coast') return roll < 0.25 ? 0 : roll < 0.7 ? 1 : roll < 0.96 ? 2 : 3;
          return roll < 0.5 ? 0 : roll < 0.85 ? 1 : roll < 0.98 ? 2 : 3;
        })
      );
      return { terrain, tileEnergy };
    }
  }
}

export class TurnGameScene {
  private readonly hud: TurnHUD;
  private terrain: Biome[][] = [];
  private tileEnergy: number[][] = [];
  private readonly colonies = new Map<number, Colony>();
  private readonly logLines: string[] = [];
  private readonly actedColonyIds = new Set<number>();
  private turnStartColonyIds = new Set<number>();
  private selectedColonyId: number | null = null;
  private mode: ActionMode = 'idle';
  private hoverCell: { x: number; y: number } | null = null;
  private nextColonyId = 1;
  private turn = 1;
  private actionPoints = 0;
  private stageIndex = 0;
  private gameWon = false;
  private gameOver = false;
  private terminalInfoVisible = false;
  private terminalInfoTitle = '';
  private terminalInfoLead = '';
  private terminalInfoBenefits: string[] = [];
  private terminalInfoBiology = '';
  private readonly terminalInfoShownColonyIds = new Set<number>();
  private milestoneInfoVisible = false;
  private milestoneInfoTitle = '';
  private milestoneInfoWhen = '';
  private milestoneInfoLead = '';
  private milestoneInfoBody = '';
  private readonly shownMilestoneIds = new Set<string>();
  private readonly pendingMilestoneIds: string[] = [];
  private milestoneNotificationTitle = '';
  private milestoneNotificationRead = false;
  private readonly floatingDeltas: FloatingDelta[] = [];
  private biomassDeltaBatch: Map<number, { amount: number; label?: string }> | null = null;
  private readonly extinctionBursts: ExtinctionBurst[] = [];
  private gameOverTitle = '';
  private gameOverQuote = '';
  private gameOverQuoteAuthor = '';
  private gameOverDetail = '';
  private cellSize = 0;
  private hexRadius = 0;
  private hexWidth = 0;
  private hexHeight = 0;
  private hexRowStep = 0;
  private offsetX = 0;
  private offsetY = 0;
  private boardWidth = 0;
  private boardHeight = 0;
  private isDesktop = false;
  private tickTimer = 0;

  constructor(hud: TurnHUD, _options?: { disableEvents?: boolean }) {
    this.hud = hud;
    const { terrain, tileEnergy } = generateRandomTerrain();
    this.terrain = terrain;
    this.tileEnergy = tileEnergy;
    const openingColony = this.seedOpeningColonies();
    this.startTurn();
    this.selectedColonyId = openingColony.id;
    this.queueReachedMilestones();
    this.pushLog('Uma bactéria primitiva surgiu no oceano em um tile com nutrientes. Selecione a colônia e use sua ação.');
    this.updateHUD();
    this.registerKeyboardShortcuts();
  }

  restart(): void {
    this.colonies.clear();
    this.logLines.length = 0;
    this.actedColonyIds.clear();
    this.turnStartColonyIds = new Set<number>();
    this.selectedColonyId = null;
    this.mode = 'idle';
    this.hoverCell = null;
    this.nextColonyId = 1;
    this.turn = 1;
    this.actionPoints = 0;
    this.stageIndex = 0;
    this.gameWon = false;
    this.gameOver = false;
    this.terminalInfoVisible = false;
    this.terminalInfoTitle = '';
    this.terminalInfoLead = '';
    this.terminalInfoBenefits = [];
    this.terminalInfoBiology = '';
    this.terminalInfoShownColonyIds.clear();
    this.milestoneInfoVisible = false;
    this.milestoneInfoTitle = '';
    this.milestoneInfoWhen = '';
    this.milestoneInfoLead = '';
    this.milestoneInfoBody = '';
    this.shownMilestoneIds.clear();
    this.pendingMilestoneIds.length = 0;
    this.milestoneNotificationTitle = '';
    this.milestoneNotificationRead = false;
    this.floatingDeltas.length = 0;
    this.biomassDeltaBatch = null;
    this.extinctionBursts.length = 0;
    this.gameOverTitle = '';
    this.gameOverQuote = '';
    this.gameOverQuoteAuthor = '';
    this.gameOverDetail = '';
    this.tickTimer = 0;
    const { terrain, tileEnergy } = generateRandomTerrain();
    this.terrain = terrain;
    this.tileEnergy = tileEnergy;
    const openingColony = this.seedOpeningColonies();
    this.startTurn();
    this.selectedColonyId = openingColony.id;
    this.queueReachedMilestones();
    this.pushLog('Uma bactéria primitiva surgiu no oceano em um tile com nutrientes. Selecione a colônia e use sua ação.');
    this.updateHUD();
  }

  private registerKeyboardShortcuts(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      if (!this.isDesktop) return;
      // Ignore when typing in an input or when a modal is open
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const overlay = document.getElementById('hud-overlay');
      if (overlay?.querySelector('.tree-modal:not(.hidden), .colony-info-modal:not(.hidden)')) return;

      switch (e.key.toLowerCase()) {
        case 'a':
          if (this.selectedColonyId !== null && this.mode === 'idle') this.performAdapt();
          break;
        case 'e':
          if (this.selectedColonyId !== null && this.mode === 'idle') this.startExpandMode();
          break;
        case 'escape':
          if (this.mode !== 'idle') this.cancelCurrentMode();
          break;
      }
    });
  }

  onResize(width: number, height: number): void {
    const isDesktop = width >= 980;
    this.isDesktop = isDesktop;
    const panelWidth = isDesktop ? 320 : 0;
    const isShortMobileViewport = !isDesktop && height <= 760;
    // Topbar height: compact on mobile, standard on desktop
    const topInset = isDesktop ? 96 : isShortMobileViewport ? 44 : 52;
    // Bottom panel reserve on mobile/tablet
    const bottomInset = isDesktop
      ? 0
      : isShortMobileViewport
        ? Math.min(height * 0.4, 240)
        : Math.min(height * 0.28, 180);
    const sidePadding = isDesktop ? 28 : 8;

    const availableWidth = Math.max(200, width - panelWidth - sidePadding * 2);
    const availableHeight = Math.max(200, height - topInset - bottomInset - 8);
    const maxRadiusByWidth = availableWidth / (HEX_SQRT3 * (GRID_SIZE + 0.5));
    const maxRadiusByHeight = availableHeight / (2 + 1.5 * (GRID_SIZE - 1));
    this.hexRadius = Math.max(12, Math.floor(Math.min(maxRadiusByWidth, maxRadiusByHeight)));
    this.hexWidth = HEX_SQRT3 * this.hexRadius;
    this.hexHeight = this.hexRadius * 2;
    this.hexRowStep = this.hexRadius * 1.5;
    this.cellSize = Math.floor(this.hexWidth);
    this.boardWidth = this.hexWidth * GRID_SIZE + this.hexWidth / 2;
    this.boardHeight = this.hexHeight + this.hexRowStep * (GRID_SIZE - 1);

    this.offsetX = Math.floor((width - this.boardWidth) / 2);
    this.offsetY = Math.floor((height - this.boardHeight) / 2);

    const overlay = document.getElementById('hud-overlay');
    if (overlay) {
      overlay.classList.toggle('layout-side',    isDesktop);
      overlay.classList.toggle('layout-stacked', !isDesktop);
    }
  }

  update(): void {
    if (!this.gameOver && !this.gameWon && this.mode === 'idle') {
      this.tickTimer += 1;
      if (this.tickTimer >= TICK_INTERVAL) {
        this.tickTimer = 0;
        this.endTurn();
      }
    }
    this.updateFloatingDeltas();
    this.updateHUD();
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = WORLD_COLORS.background;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.drawBoard(ctx);
    this.drawColonies(ctx);
  }

  handlePointerDown(clientX: number, clientY: number): void {
    if (this.terminalInfoVisible) return;
    if (this.gameOver) return;

    const cell = this.getCellAtPoint(clientX, clientY);
    if (!cell) {
      this.hoverCell = null;
      this.mode = 'idle';
      this.selectedColonyId = null;
      this.updateHUD();
      return;
    }

    this.hoverCell = cell;
    const colony = this.getColonyAt(cell.x, cell.y);
    if (this.mode === 'seed') {
      this.trySeedAt(cell.x, cell.y);
      return;
    }
    if (this.mode === 'expand') {
      this.tryExpandTo(cell.x, cell.y);
      return;
    }

    if (colony) {
      if (this.selectedColonyId === colony.id) {
        this.selectedColonyId = null;
        this.pushLog(`Colonia em ${this.formatCellLabel(colony.x, colony.y)} foi desmarcada.`);
        this.updateHUD();
        return;
      }

      this.selectedColonyId = colony.id;
      this.pushLog(`Colônia selecionada em ${this.formatCellLabel(colony.x, colony.y)}.`);
      this.updateHUD();
      return;
    }

    this.mode = 'idle';
    this.selectedColonyId = null;
    this.updateHUD();
  }

  performAdapt(): void {
    if (this.gameOver) return;
    const colony = this.getSelectedColony();
    if (!colony || !this.canColonyAct(colony) || colony.adaptationPoints <= 0) return;

    if (!this.canSelectedAdapt()) {
      this.pushLog('Essa colônia ainda não está no bioma correto para evoluir.');
      this.mode = 'idle';
      this.updateHUD();
      return;
    }

    const nextEvolution = this.getNextEvolutionFor(colony);
    if (!nextEvolution) {
      this.pushLog('Essa colônia não tem mais evoluções disponíveis nesta posição.');
      this.mode = 'idle';
      this.updateHUD();
      return;
    }

    const cost = getAdaptCost(nextEvolution, this.tileEnergy[colony.y][colony.x]);
    if (colony.biomass < cost) {
      this.pushLog(`Biomassa insuficiente para adaptar (precisa de ${cost}, tem ${colony.biomass}).`);
      this.mode = 'idle';
      this.updateHUD();
      return;
    }

    colony.biomass -= cost;
    this.recordBiomassDelta(colony.id, -cost);
    colony.lifeFormId = nextEvolution.id;
    this.syncColonyTraversal(colony);
    colony.autoExplore = false;
    colony.autoConsolidate = false;
    colony.adaptationPoints -= 1;
    this.consumeColonyAction(colony.id);
    this.syncWorldStage();

    this.pushLog(`A colônia em ${this.formatCellLabel(colony.x, colony.y)} evoluiu para ${nextEvolution.name}.`);
    this.queueReachedMilestones();

    if (nextEvolution.id === HUMAN_EVOLUTION_ID) {
      this.gameWon = true;
      this.actionPoints = 0;
      this.selectedColonyId = colony.id;
      this.pushLog('Vitória: esta linhagem ancestral chegou ao Homo sapiens.');
    }

    this.mode = 'idle';
    if (!this.gameWon && this.isTerminalColony(colony)) {
      this.showTerminalInfo(colony);
    }
    this.updateHUD();
  }

  performDecompose(): void {
    if (this.gameOver) return;
    const colony = this.getSelectedColony();
    if (!colony || !this.isTerminalColony(colony) || !this.isColonyEstablished(colony)) return;

    const adaptReward = Math.max(1, colony.adaptationPoints);

    // Distribute adaptation points to neighboring colonies
    const neighbors = this.getNeighborColonies(colony);
    if (neighbors.length > 0) {
      const perNeighbor = Math.max(1, Math.floor(adaptReward / neighbors.length));
      for (const neighbor of neighbors) {
        neighbor.adaptationPoints += perNeighbor;
      }
    }

    const name = this.getColonyName(colony);
    const cell = this.formatCellLabel(colony.x, colony.y);
    this.colonies.delete(colony.id);
    this.selectedColonyId = null;
    this.pushLog(`${name} em ${cell} foi decomposta${neighbors.length > 0 ? ': adaptacao redistribuida.' : '.'}`);
    this.mode = 'idle';
    this.updateHUD();
  }

  dismissTerminalInfo(): void {
    this.terminalInfoVisible = false;
    this.updateHUD();
  }

  openMilestoneNotification(): void {
    this.showNextMilestoneInfo();
    this.updateHUD();
  }

  dismissMilestoneInfo(): void {
    this.milestoneInfoVisible = false;
    this.milestoneInfoWhen = '';
    if (this.pendingMilestoneIds.length > 0) {
      // More unread milestones — update notification to next one
      const nextId = this.pendingMilestoneIds[0];
      const next = LIFE_MILESTONES.find((m) => m.id === nextId);
      if (next) {
        this.milestoneNotificationTitle = next.title;
        this.milestoneNotificationRead = false;
      }
    } else {
      // All read — show "lido" state then hide
      this.milestoneNotificationRead = true;
      const titleAtDismiss = this.milestoneNotificationTitle;
      this.updateHUD();
      setTimeout(() => {
        // Only clear if no new milestone arrived during the fade
        if (this.milestoneNotificationTitle === titleAtDismiss) {
          this.milestoneNotificationTitle = '';
          this.milestoneNotificationRead = false;
          this.updateHUD();
        }
      }, 2800);
      return;
    }
    this.updateHUD();
  }

  startExpandMode(): void {
    if (this.gameOver) return;
    const colony = this.getSelectedColony();
    if (!colony || !this.canColonyAct(colony) || colony.biomass <= 0) return;
    this.tickTimer = 0;
    this.mode = 'expand';
    this.pushLog('Modo expandir ativo. Clique em um tile vizinho válido.');
    this.updateHUD();
  }

  startSeedMode(): void {
    if (this.gameOver) return;
    if (this.gameWon || this.getBiomassPool() < SEED_COST) return;
    this.tickTimer = 0;
    this.mode = 'seed';
    this.selectedColonyId = null;
    this.pushLog(`Semear vida (custo: ${SEED_COST} biomassa). Clique em um tile de oceano livre.`);
    this.updateHUD();
  }

  private trySeedAt(x: number, y: number): void {
    if (this.getBiomassPool() < SEED_COST) {
      this.pushLog('Biomassa insuficiente para semear.');
      this.mode = 'idle';
      this.updateHUD();
      return;
    }

    if (this.getColonyAt(x, y)) {
      this.pushLog('Esse tile já está ocupado.');
      this.mode = 'idle';
      this.updateHUD();
      return;
    }

    if (this.terrain[y][x] !== 'ocean') {
      this.pushLog('Vida primitiva só pode surgir no oceano.');
      this.mode = 'idle';
      this.updateHUD();
      return;
    }

    this.spendBiomassPool(SEED_COST);
    const seeded = this.addColony(x, y, {
      population: 2,
      lifeFormId: 'bacteria_primitiva',
      autoExplore: true,
      autoConsolidate: true,
    });
    this.consumeColonyAction(seeded.id);
    this.mode = 'idle';
    this.pushLog(`Nova vida semeada em ${this.formatCellLabel(x, y)}. Uma nova Bactéria Primitiva surgiu no oceano.`);
    this.updateHUD();
  }

  cancelCurrentMode(): void {
    if (this.gameOver) return;
    if (this.mode === 'idle') return;
    const label = this.mode === 'seed' ? 'Semeadura cancelada.' : 'Modo expandir cancelado.';
    this.mode = 'idle';
    this.pushLog(label);
    this.updateHUD();
  }

  endTurn(): void {
    if (this.gameWon || this.gameOver) return;
    this.tickTimer = 0;
    this.mode = 'idle';
    this.beginBiomassDeltaBatch();
    this.resolveImplicitExplorationOrders();
    this.resolveAutoExplorationOrders();
    this.resolveImmediateExplorationRewards();
    this.resolveProduction();
    this.checkProgression();
    if (this.gameWon) {
      this.flushBiomassDeltaBatch();
      this.updateHUD();
      return;
    }
    this.runNaturalSelection();
    if (this.gameOver) {
      this.flushBiomassDeltaBatch();
      this.updateHUD();
      return;
    }
    if (!this.hasHumanReachableLineage()) {
      this.triggerHumanPathLostGameOver();
      this.flushBiomassDeltaBatch();
      this.updateHUD();
      return;
    }
    this.turn += 1;
    this.startTurn();
    this.flushBiomassDeltaBatch();
    this.updateHUD();
  }

  private seedOpeningColonies(): Colony {
    const oceanCells: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        if (this.terrain[y][x] === 'ocean') {
          oceanCells.push({ x, y });
        }
      }
    }

    const energizedOceanCells = oceanCells.filter(({ x, y }) => this.tileEnergy[y][x] > 0);
    if (energizedOceanCells.length > 0) {
      const chosen = energizedOceanCells[Math.floor(random() * energizedOceanCells.length)];
      return this.addColony(chosen.x, chosen.y, { createdTurn: 0 });
    }

    const fallback = oceanCells[Math.floor(random() * oceanCells.length)];
    this.tileEnergy[fallback.y][fallback.x] = 1;
    return this.addColony(fallback.x, fallback.y, { createdTurn: 0 });
  }

  private addColony(x: number, y: number, options?: Partial<Colony>): Colony {
    const colony: Colony = {
      id: this.nextColonyId++,
      x,
      y,
      population: options?.population ?? 2,
      biomass: options?.biomass ?? 2,
      lifeFormId: options?.lifeFormId ?? 'bacteria_primitiva',
      adaptationPoints: options?.adaptationPoints ?? 1,
      coastAdapted: options?.coastAdapted ?? false,
      landAdapted: options?.landAdapted ?? false,
      fortified: options?.fortified ?? false,
      autoExplore: options?.autoExplore ?? options?.autoConsolidate ?? false,
      autoConsolidate: options?.autoConsolidate ?? options?.autoExplore ?? false,
      busyUntilTurn: options?.busyUntilTurn ?? 0,
      exploringUntilTurn: options?.exploringUntilTurn ?? null,
      explorationBiomassPending: options?.explorationBiomassPending ?? false,
      gestatingUntilTurn: options?.gestatingUntilTurn ?? null,
      createdTurn: options?.createdTurn ?? this.turn,
      parentColonyId: options?.parentColonyId ?? null,
    };
    this.syncColonyTraversal(colony);
    this.colonies.set(colony.id, colony);
    return colony;
  }

  private startTurn(): void {
    this.resolveTurnTransitions();
    this.actedColonyIds.clear();
    this.turnStartColonyIds = new Set(
      [...this.colonies.values()]
        .filter((colony) => this.isColonyReadyForTurn(colony) && !this.isTerminalColony(colony))
        .map((colony) => colony.id),
    );
    this.actionPoints = this.turnStartColonyIds.size;
  }

  private resolveTurnTransitions(): void {
    for (const colony of this.colonies.values()) {
      if (colony.gestatingUntilTurn !== null && this.turn >= colony.gestatingUntilTurn) {
        colony.gestatingUntilTurn = null;
        colony.parentColonyId = null;
        this.pushLog(`A nova colônia em ${this.formatCellLabel(colony.x, colony.y)} terminou a expansão e agora está estável.`);
      }
    }
  }

  private applyExplorationReward(colony: Colony): void {
    colony.explorationBiomassPending = false;
    colony.exploringUntilTurn = null;
    const energy = this.tileEnergy[colony.y][colony.x];
    const def = EVOLUTION_BY_ID.get(colony.lifeFormId);
    const multiplier = def ? GROUP_ENERGY_MULTIPLIER[def.group] : 1;
    const gained = energy * multiplier;
    colony.biomass += gained;
    const label = multiplier > 1 ? `${multiplier}x +${energy}` : `+${energy}`;
    this.recordBiomassDelta(colony.id, gained, label);
    colony.population += 1;
    colony.fortified = true;
    this.pushLog(`Exploração em ${this.formatCellLabel(colony.x, colony.y)}: +${formatBiomass(gained)} nutrientes e +1 população.`);
  }

  private resolveImmediateExplorationRewards(): void {
    for (const colony of this.colonies.values()) {
      if (!colony.explorationBiomassPending) continue;
      this.applyExplorationReward(colony);
    }
  }

  private showTerminalInfo(colony: Colony): void {
    if (this.terminalInfoShownColonyIds.has(colony.id)) return;

    const name = this.getColonyName(colony);
    this.terminalInfoShownColonyIds.add(colony.id);
    this.terminalInfoVisible = true;
    this.terminalInfoTitle = `${name} encontrou seu nicho`;
    this.terminalInfoLead = `${name} chegou ao fim da própria linha evolutiva nesta campanha. A partir daqui, essa colônia não serve mais para avançar rumo ao Homo sapiens, mas passa a atuar como um polo estável de sustentação ecológica.`;
    this.terminalInfoBenefits = [
      'ela deixa de perder biomassa passiva na Selecao Natural',
      'cada colônia em tile hexagonal vizinho recebe +1 biomassa',
      'esse suporte aparece visualmente como +1 durante a fase automática',
      'se você preferir, ainda pode decompor essa colônia para liberar o tile',
    ];
    this.terminalInfoBiology = 'Na biologia real, evolução não é uma escada com destino obrigatório. Muitos ramos deixam de gerar formas “mais avançadas” e, ainda assim, seguem extremamente bem adaptados ao próprio nicho por milhões de anos. Corais, tubarões e outros grupos antigos persistem porque encontraram estratégias estáveis, não porque fracassaram em evoluir.';
  }

  private queueReachedMilestones(): void {
    const reachedForms = new Set([...this.colonies.values()].map((colony) => colony.lifeFormId));
    for (const milestone of LIFE_MILESTONES) {
      if (!reachedForms.has(milestone.triggerLifeFormId)) continue;
      if (this.shownMilestoneIds.has(milestone.id)) continue;
      if (this.pendingMilestoneIds.includes(milestone.id)) continue;
      this.pendingMilestoneIds.push(milestone.id);
    }
    // Always show the most recently arrived milestone in the notification
    if (this.pendingMilestoneIds.length > 0) {
      const latestId = this.pendingMilestoneIds[this.pendingMilestoneIds.length - 1];
      const latest = LIFE_MILESTONES.find((m) => m.id === latestId);
      if (latest) {
        this.milestoneNotificationTitle = latest.title;
        this.milestoneNotificationRead = false;
      }
    }
  }

  private showNextMilestoneInfo(): void {
    if (this.milestoneInfoVisible || this.terminalInfoVisible) return;

    const nextMilestoneId = this.pendingMilestoneIds.shift();
    if (!nextMilestoneId) return;

    const milestone = LIFE_MILESTONES.find((item) => item.id === nextMilestoneId);
    if (!milestone) return;

    this.shownMilestoneIds.add(milestone.id);
    this.milestoneInfoVisible = true;
    this.milestoneInfoTitle = milestone.title;
    this.milestoneInfoWhen = milestone.when;
    this.milestoneInfoLead = milestone.lead;
    this.milestoneInfoBody = milestone.body;
  }

  private resolveAutoExplorationOrders(): void {
    for (const colony of this.colonies.values()) {
      if (!colony.autoExplore) continue;
      if (!this.canColonyAct(colony)) continue;
      colony.explorationBiomassPending = true;
      this.consumeColonyAction(colony.id);
      this.pushLog(`A colonia em ${this.formatCellLabel(colony.x, colony.y)} explorou automaticamente neste turno.`);
    }
  }

  private resolveImplicitExplorationOrders(): void {
    for (const colony of this.colonies.values()) {
      if (!this.canColonyAct(colony)) continue;
      if (colony.autoExplore) continue;
      colony.autoExplore = true;
      colony.autoConsolidate = true;
      this.pushLog(`A colonia em ${this.formatCellLabel(colony.x, colony.y)} ficou sem ordem e entrou em exploração automática.`);
    }
  }

  private isColonyEstablished(colony: Colony): boolean {
    return colony.gestatingUntilTurn === null || this.turn >= colony.gestatingUntilTurn;
  }

  private isColonyBusy(colony: Colony): boolean {
    return this.turn < colony.busyUntilTurn;
  }

  private isColonyReadyForTurn(colony: Colony): boolean {
    return this.isColonyEstablished(colony) && !this.isColonyBusy(colony);
  }

  private drawBoard(ctx: CanvasRenderingContext2D): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const { x: centerX, y: centerY } = this.getCellCenter(x, y);
        ctx.fillStyle = this.getBiomeColor(this.terrain[y][x]);
        this.drawHexCell(ctx, centerX, centerY);

        const energy = this.tileEnergy[y][x];
        if (energy > 0) {
          ctx.fillStyle = WORLD_COLORS.energyPip;
          const pipRadius = this.cellSize * 0.05;
          const spacing = this.cellSize * 0.12;
          const pipY = centerY - this.hexRadius * 0.55;
          if (energy === 1) {
            ctx.beginPath();
            ctx.arc(centerX, pipY, pipRadius, 0, Math.PI * 2);
            ctx.fill();
          } else if (energy === 2) {
            ctx.beginPath();
            ctx.arc(centerX - spacing / 2, pipY, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX + spacing / 2, pipY, pipRadius, 0, Math.PI * 2);
            ctx.fill();
          } else if (energy === 3) {
            ctx.beginPath();
            ctx.arc(centerX - spacing, pipY, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX, pipY, pipRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX + spacing, pipY, pipRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        if (this.isExpandTarget(x, y)) {
          ctx.fillStyle = WORLD_COLORS.expandHighlight;
          this.drawHexCell(ctx, centerX, centerY);
        }

        if (this.isSeedTarget(x, y)) {
          ctx.fillStyle = WORLD_COLORS.seedHighlight;
          this.drawHexCell(ctx, centerX, centerY);
        }

        if (this.hoverCell?.x === x && this.hoverCell.y === y) {
          ctx.strokeStyle = WORLD_COLORS.hoverStroke;
          ctx.lineWidth = 3;
          this.strokeHexCell(ctx, centerX, centerY, Math.max(0, this.hexRadius - 2));
        }

        const colony = this.getColonyAt(x, y);
        if (colony?.id === this.selectedColonyId) {
          ctx.strokeStyle = WORLD_COLORS.selectedStroke;
          ctx.lineWidth = 4;
          this.strokeHexCell(ctx, centerX, centerY, Math.max(0, this.hexRadius - 3));
        }

        ctx.strokeStyle = WORLD_COLORS.gridStroke;
        ctx.lineWidth = 1;
        this.strokeHexCell(ctx, centerX, centerY, this.hexRadius);
      }
    }
  }

  private drawColonies(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.floor(this.cellSize * 0.54)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;

    for (const colony of this.colonies.values()) {
      const { x: centerX, y: centerY } = this.getCellCenter(colony.x, colony.y);
      const isGestating = !this.isColonyEstablished(colony);

      ctx.save();
      ctx.globalAlpha = isGestating ? 0.38 : 1;
      const emojiFilter = EVOLUTION_BY_ID.get(colony.lifeFormId)?.emojiFilter;
      if (emojiFilter) ctx.filter = emojiFilter;
      ctx.fillText(this.getColonyEmoji(colony), centerX, centerY);
      ctx.filter = 'none';

      const badgeY = centerY + this.cellSize * 0.28;
      const badgeWidth = this.cellSize * 0.34;
      const badgeHeight = this.cellSize * 0.2;
      const badgeRadius = badgeHeight / 2;
      ctx.fillStyle = WORLD_COLORS.badgeFill;
      ctx.strokeStyle = WORLD_COLORS.badgeStroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(centerX - badgeWidth / 2, badgeY - badgeHeight / 2, badgeWidth, badgeHeight, badgeRadius);
      ctx.fill();
      ctx.stroke();

      ctx.font = `600 ${Math.floor(this.cellSize * 0.18)}px system-ui, sans-serif`;
      ctx.fillStyle = WORLD_COLORS.badgeText;
      ctx.fillText(formatBiomass(colony.biomass), centerX, badgeY + 0.5);

      if (colony.coastAdapted || colony.landAdapted) {
        ctx.beginPath();
        ctx.fillStyle = colony.landAdapted ? WORLD_COLORS.adaptationReady : WORLD_COLORS.adaptationSpent;
        ctx.arc(centerX + this.cellSize * 0.24, centerY - this.cellSize * 0.24, this.cellSize * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }

      if (colony.fortified) {
        ctx.beginPath();
        ctx.strokeStyle = WORLD_COLORS.fortifyStroke;
        ctx.lineWidth = 2;
        ctx.arc(centerX, centerY, this.cellSize * 0.31, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.font = `${Math.floor(this.cellSize * 0.54)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.fillStyle = WORLD_COLORS.text;
      ctx.restore();

      if (colony.autoExplore) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(243, 211, 107, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.arc(centerX, centerY, this.cellSize * 0.38, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

    }

    this.drawFloatingDeltas(ctx);
  }

  private updateFloatingDeltas(): void {
    for (let index = this.floatingDeltas.length - 1; index >= 0; index -= 1) {
      this.floatingDeltas[index].framesLeft -= 1;
      if (this.floatingDeltas[index].framesLeft <= 0) {
        this.floatingDeltas.splice(index, 1);
      }
    }

    for (let index = this.extinctionBursts.length - 1; index >= 0; index -= 1) {
      this.extinctionBursts[index].framesLeft -= 1;
      if (this.extinctionBursts[index].framesLeft <= 0) {
        this.extinctionBursts.splice(index, 1);
      }
    }
  }

  private spawnFloatingDelta(colonyId: number, text: string, color: string): void {
    this.floatingDeltas.push({
      colonyId,
      text,
      color,
      framesLeft: 75,
    });
  }

  private beginBiomassDeltaBatch(): void {
    this.biomassDeltaBatch = new Map();
  }

  private recordBiomassDelta(colonyId: number, amount: number, label?: string): void {
    if (amount === 0) return;
    if (!this.biomassDeltaBatch) {
      const text = label ?? `${amount > 0 ? '+' : ''}${formatBiomass(amount)}`;
      this.spawnFloatingDelta(colonyId, text, amount > 0 ? WORLD_COLORS.biomassGain : WORLD_COLORS.biomassLoss);
      return;
    }

    const prev = this.biomassDeltaBatch.get(colonyId);
    this.biomassDeltaBatch.set(colonyId, {
      amount: (prev?.amount ?? 0) + amount,
      label: label ?? prev?.label,
    });
  }

  private flushBiomassDeltaBatch(): void {
    const batch = this.biomassDeltaBatch;
    this.biomassDeltaBatch = null;
    if (!batch) return;

    for (const [colonyId, entry] of batch) {
      if (entry.amount === 0 || !this.colonies.has(colonyId)) continue;
      const text = entry.label ?? `${entry.amount > 0 ? '+' : ''}${formatBiomass(entry.amount)}`;
      this.spawnFloatingDelta(colonyId, text, entry.amount > 0 ? WORLD_COLORS.biomassGain : WORLD_COLORS.biomassLoss);
    }
  }

  private drawFloatingDeltas(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    if (this.floatingDeltas.length > 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Fonte maior e em negrito
      ctx.font = `bold ${Math.floor(this.cellSize * 0.34)}px system-ui, sans-serif`;

      for (const delta of this.floatingDeltas) {
        const colony = this.colonies.get(delta.colonyId);
        if (!colony) continue;

        const { x: centerX, y: centerYBase } = this.getCellCenter(colony.x, colony.y);
        const progress = 1 - delta.framesLeft / 75;
        const centerY = centerYBase + this.cellSize * (0.05 - progress * 0.5);

        ctx.globalAlpha = Math.max(0, Math.min(1, delta.framesLeft / 25));

        // Split "Nx +E" into multiplier and value parts
        const multMatch = delta.text.match(/^(\d+x)\s+(\+\d+)$/);
        if (multMatch) {
          const multPart  = multMatch[1] + ' '; // e.g. "3x "
          const valuePart = multMatch[2];        // e.g. "+2"
          const multW  = ctx.measureText(multPart).width;
          const valueW = ctx.measureText(valuePart).width;
          const totalW = multW + valueW;
          const startX = centerX - totalW / 2;

          ctx.textAlign = 'left';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.strokeText(multPart + valuePart, startX, centerY);

          ctx.fillStyle = 'rgba(220, 170, 60, 0.95)'; // amber for multiplier
          ctx.fillText(multPart, startX, centerY);

          ctx.fillStyle = delta.color;
          ctx.fillText(valuePart, startX + multW, centerY);

          ctx.textAlign = 'center';
        } else {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.strokeText(delta.text, centerX, centerY);
          ctx.fillStyle = delta.color;
          ctx.fillText(delta.text, centerX, centerY);
        }
      }
    }

    for (const burst of this.extinctionBursts) {
      const { x: centerX, y: centerY } = this.getCellCenter(burst.x, burst.y);
      const progress = 1 - burst.framesLeft / 42;
      const radius = this.cellSize * (0.22 + progress * 0.35);
      ctx.globalAlpha = Math.max(0, 0.9 - progress);
      ctx.strokeStyle = WORLD_COLORS.extinctionStroke;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX - radius * 0.45, centerY - radius * 0.45);
      ctx.lineTo(centerX + radius * 0.45, centerY + radius * 0.45);
      ctx.moveTo(centerX + radius * 0.45, centerY - radius * 0.45);
      ctx.lineTo(centerX - radius * 0.45, centerY + radius * 0.45);
      ctx.stroke();
    }

    ctx.restore();
  }

  private triggerExtinctionAnimation(colony: Colony): void {
    this.extinctionBursts.push({
      x: colony.x,
      y: colony.y,
      framesLeft: 42,
    });
  }

  private triggerGameOver(): void {
    const quote = GAME_OVER_QUOTES[Math.floor(random() * GAME_OVER_QUOTES.length)] ?? GAME_OVER_QUOTES[0];
    this.gameOver = true;
    this.mode = 'idle';
    this.actionPoints = 0;
    this.turnStartColonyIds.clear();
    this.actedColonyIds.clear();
    this.gameOverTitle = 'Fim da vida na Terra';
    this.gameOverQuote = quote.text;
    this.gameOverQuoteAuthor = quote.author;
    this.gameOverDetail = 'Sem linhagens remanescentes, a biosfera colapsou. Na história real da Terra, extinções em massa eliminaram a maior parte das espécies, mas a vida persistiu porque alguns ramos sobreviveram. Nesta partida, nenhuma colônia resistiu para reconstruir o ecossistema.';
    this.pushLog('Game over: a ultima linhagem desapareceu e a vida na Terra entrou em colapso.');
  }

  private triggerHumanPathLostGameOver(): void {
    const quote = GAME_OVER_QUOTES[Math.floor(random() * GAME_OVER_QUOTES.length)] ?? GAME_OVER_QUOTES[0];
    this.gameOver = true;
    this.mode = 'idle';
    this.actionPoints = 0;
    this.turnStartColonyIds.clear();
    this.actedColonyIds.clear();
    this.gameOverTitle = 'Fim da linhagem humana';
    this.gameOverQuote = quote.text;
    this.gameOverQuoteAuthor = quote.author;
    this.gameOverDetail = 'Ainda existem colonias vivas, mas nenhuma delas pertence mais a um ramo capaz de chegar ao Homo sapiens. A historia continua sem voce, mas o objetivo desta campanha foi perdido.';
    this.pushLog('Game over: o ultimo ramo capaz de chegar ao Homo sapiens foi perdido.');
  }

  private extinctColony(colony: Colony, detail: string, summaryReason: string): void {
    const name = this.getColonyName(colony);
    const cell = this.formatCellLabel(colony.x, colony.y);
    this.triggerExtinctionAnimation(colony);
    this.colonies.delete(colony.id);
    if (this.selectedColonyId === colony.id) this.selectedColonyId = null;
    this.pushLog(`${name} extinta em ${cell}: ${detail} (${summaryReason})`);

    const dependents = [...this.colonies.values()].filter(
      (candidate) =>
        candidate.parentColonyId === colony.id
        && candidate.gestatingUntilTurn !== null
        && !this.isColonyEstablished(candidate),
    );
    for (const dependent of dependents) {
      this.extinctColony(
        dependent,
        `A expansão dependia de ${name}, que foi perdida.`,
        'expansao abortada',
      );
    }

    if (this.colonies.size === 0) {
      this.triggerGameOver();
    }
  }

  private resolveProduction(): void {
    for (const colony of this.colonies.values()) {
      if (!this.isColonyEstablished(colony)) continue;

      colony.fortified = false;
      colony.adaptationPoints += 1;

      if (!this.isTerminalColony(colony)) {
        const energy = this.tileEnergy[colony.y][colony.x];
        const gained = Math.max(1, energy);
        colony.biomass += gained;
        this.recordBiomassDelta(colony.id, gained);
      }

      if (this.isTerminalColony(colony)) {
        const neighbors = this.getNeighborColonies(colony);
        for (const neighbor of neighbors) {
          if (!this.isTerminalColony(neighbor)) {
            neighbor.adaptationPoints += 1;
          }
        }
      }
    }
    this.pushLog('Fim do turno: nutrientes gerados pelo ecossistema.');
  }

  private checkProgression(): void {
    this.syncWorldStage();
  }

  private runNaturalSelection(): void {
    const ownsBiomassDeltaBatch = this.biomassDeltaBatch === null;
    if (ownsBiomassDeltaBatch) this.beginBiomassDeltaBatch();

    const snapshot = [...this.colonies.values()];
    for (const colony of snapshot) {
      if (!this.colonies.has(colony.id)) continue;
      if (!this.isColonyEstablished(colony)) continue;

      // Suporte de colônias terminais vizinhas
      const terminalNeighbors = this.getNeighborColonies(colony)
        .filter((n) => this.isColonyEstablished(n) && this.isTerminalColony(n));
      if (terminalNeighbors.length > 0) {
        colony.biomass += terminalNeighbors.length;
        this.recordBiomassDelta(colony.id, terminalNeighbors.length);
        this.pushLog(`${this.getColonyName(colony)} em ${this.formatCellLabel(colony.x, colony.y)} recebeu +${terminalNeighbors.length} de suporte terminal.`);
      }

      if (this.isTerminalColony(colony)) continue;

      // Atrito de manutenção
      if (colony.createdTurn < this.turn) {
        const previousBiomass = colony.biomass;
        colony.biomass = Math.max(0, colony.biomass - 1);
        this.recordBiomassDelta(colony.id, colony.biomass - previousBiomass);
        if (colony.biomass <= 0) {
          this.extinctColony(colony, 'Ficou sem biomassa.', 'biomassa zerada');
          continue;
        }
      }

      if (!this.colonies.has(colony.id)) continue;

      // Exposição: isolada em bioma hostil
      const biome = this.terrain[colony.y][colony.x];
      if (biome !== 'ocean' && this.getNeighborColonies(colony).length === 0 && !colony.fortified) {
        colony.population -= 1;
        if (colony.population <= 0) {
          this.extinctColony(colony, `Isolada em ${this.getBiomeLabel(biome)} sem suporte.`, 'exposição');
          continue;
        }
        this.pushLog(`${this.getColonyName(colony)} em ${this.formatCellLabel(colony.x, colony.y)} perdeu população por exposição.`);
        continue;
      }

      // Estagnação: bioma errado para evoluir
      const current = EVOLUTION_BY_ID.get(colony.lifeFormId);
      if (!current || current.next.length === 0) continue;
      if (current.next.some((step) => step.biome === biome)) continue;

      if (colony.adaptationPoints > 0) {
        colony.adaptationPoints -= 1;
        this.pushLog(`${this.getColonyName(colony)} em ${this.formatCellLabel(colony.x, colony.y)} perdeu adaptação por estagnação.`);
      } else {
        colony.population -= 1;
        if (colony.population <= 0) {
          this.extinctColony(colony, 'Sem adaptação, extinta por estagnação.', 'estagnação');
        } else {
          this.pushLog(`${this.getColonyName(colony)} em ${this.formatCellLabel(colony.x, colony.y)} perdeu população por estagnação.`);
        }
      }
    }

    if (ownsBiomassDeltaBatch) this.flushBiomassDeltaBatch();
  }

  private tryExpandTo(x: number, y: number): void {
    const colony = this.getSelectedColony();
    if (!colony) return;

    if (!this.isExpandTarget(x, y)) {
      this.pushLog('Esse tile não é um destino válido para expansão.');
      this.mode = 'idle';
      this.updateHUD();
      return;
    }

    if (colony.biomass <= 0) {
      this.pushLog('A colonia de origem esta sem biomassa local para sustentar a expansao.');
      this.mode = 'idle';
      this.updateHUD();
      return;
    }

    colony.biomass -= 1;
    colony.autoExplore = false;
    colony.autoConsolidate = false;
    this.recordBiomassDelta(colony.id, -1);
    const newColony = this.addColony(x, y, {
      population: 1,
      biomass: 1,
      lifeFormId: colony.lifeFormId,
      coastAdapted: colony.coastAdapted,
      landAdapted: colony.landAdapted,
      autoExplore: true,
      autoConsolidate: true,
      createdTurn: this.turn,
    });
    this.recordBiomassDelta(newColony.id, 1);
    this.consumeColonyAction(colony.id);
    this.mode = 'idle';
    this.pushLog(`A expansão para ${this.formatCellLabel(x, y)} aconteceu imediatamente. A nova colônia já está estável.`);
    this.updateHUD();
  }

  private isExpandTarget(x: number, y: number): boolean {
    const colony = this.getSelectedColony();
    if (!colony || this.mode !== 'expand') return false;
    if (this.getColonyAt(x, y)) return false;
    if (!this.getNeighborCoords(colony.x, colony.y).some((cell) => cell.x === x && cell.y === y)) return false;
    return this.canOccupy(colony, this.terrain[y][x]);
  }

  private isSeedTarget(x: number, y: number): boolean {
    if (this.mode !== 'seed') return false;
    if (this.getColonyAt(x, y)) return false;
    return this.terrain[y][x] === 'ocean';
  }

  private canOccupy(colony: Colony, biome: Biome): boolean {
    const form = EVOLUTION_BY_ID.get(colony.lifeFormId)!;
    return form.allowedBiomes.includes(biome);
  }

  private hasExpandTarget(colony: Colony | null): boolean {
    if (!colony || colony.biomass <= 0 || !this.canColonyAct(colony)) return false;

    const candidates = this.getNeighborCoords(colony.x, colony.y);

    return candidates.some(({ x, y }) => {
      if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return false;
      if (this.getColonyAt(x, y)) return false;
      return this.canOccupy(colony, this.terrain[y][x]);
    });
  }

  private getTotalPopulation(): number {
    let total = 0;
    for (const colony of this.colonies.values()) {
      if (!this.isColonyEstablished(colony)) continue;
      total += colony.population;
    }
    return total;
  }

  private getTotalAdaptationPoints(): number {
    let total = 0;
    for (const colony of this.colonies.values()) {
      if (!this.isColonyEstablished(colony)) continue;
      total += colony.adaptationPoints;
    }
    return total;
  }

  private getBiomassPool(): number {
    let total = 0;
    for (const colony of this.colonies.values()) {
      total += colony.biomass;
    }
    return total;
  }

  private spendBiomassPool(amount: number): boolean {
    if (amount <= 0) return true;
    if (this.getBiomassPool() < amount) return false;

    let remaining = amount;
    const donors = [...this.colonies.values()].sort((a, b) => {
      if (b.biomass !== a.biomass) return b.biomass - a.biomass;
      return a.id - b.id;
    });

    for (const colony of donors) {
      if (remaining <= 0) break;
      const spent = Math.min(colony.biomass, remaining);
      colony.biomass -= spent;
      this.recordBiomassDelta(colony.id, -spent);
      remaining -= spent;
    }

    return remaining === 0;
  }

  private getSelectedColony(): Colony | null {
    return this.selectedColonyId === null ? null : this.colonies.get(this.selectedColonyId) ?? null;
  }

  private canColonyAct(colony: Colony): boolean {
    return this.turnStartColonyIds.has(colony.id)
      && !this.actedColonyIds.has(colony.id)
      && this.isColonyReadyForTurn(colony);
  }

  private consumeColonyAction(colonyId: number): void {
    this.actedColonyIds.add(colonyId);
    this.actionPoints = Math.max(0, this.turnStartColonyIds.size - this.actedColonyIds.size);
  }

  private syncColonyTraversal(colony: Colony): void {
    const form = EVOLUTION_BY_ID.get(colony.lifeFormId)!;
    colony.coastAdapted = form.allowedBiomes.includes('coast');
    colony.landAdapted = form.allowedBiomes.includes('land');
  }

  private syncWorldStage(): void {
    const highestEvolution = this.getHighestWorldStage();

    if (highestEvolution >= 4) {
      this.stageIndex = 4;
      return;
    }
    if (highestEvolution >= 3) {
      this.stageIndex = 3;
      return;
    }
    if (highestEvolution >= 2) {
      this.stageIndex = 2;
      return;
    }
    if (highestEvolution >= 1) {
      this.stageIndex = 1;
      return;
    }
    this.stageIndex = 0;
  }

  private getHighestWorldStage(): number {
    let highest = 0;
    for (const colony of this.colonies.values()) {
      if (!this.isColonyEstablished(colony)) continue;
      highest = Math.max(highest, EVOLUTION_BY_ID.get(colony.lifeFormId)?.worldStage ?? 0);
    }
    return highest;
  }


  private getColonyAt(x: number, y: number): Colony | null {
    for (const colony of this.colonies.values()) {
      if (colony.x === x && colony.y === y) return colony;
    }
    return null;
  }

  private getCellAtPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const center = this.getCellCenter(x, y);
        if (this.isPointInHex(clientX, clientY, center.x, center.y, this.hexRadius)) {
          return { x, y };
        }
      }
    }
    return null;
  }

  private getBiomeColor(biome: Biome): string {
    if (biome === 'ocean') return WORLD_COLORS.ocean;
    if (biome === 'coast') return WORLD_COLORS.coast;
    return WORLD_COLORS.land;
  }

  private getCellCenter(x: number, y: number): { x: number; y: number } {
    return {
      x: this.offsetX + this.hexWidth / 2 + x * this.hexWidth + (y % 2) * (this.hexWidth / 2),
      y: this.offsetY + this.hexRadius + y * this.hexRowStep,
    };
  }

  private traceHexPath(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number): void {
    const halfWidth = radius * HEX_SQRT3 / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX + halfWidth, centerY - radius / 2);
    ctx.lineTo(centerX + halfWidth, centerY + radius / 2);
    ctx.lineTo(centerX, centerY + radius);
    ctx.lineTo(centerX - halfWidth, centerY + radius / 2);
    ctx.lineTo(centerX - halfWidth, centerY - radius / 2);
    ctx.closePath();
  }

  private drawHexCell(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
    this.traceHexPath(ctx, centerX, centerY, this.hexRadius);
    ctx.fill();
  }

  private strokeHexCell(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number): void {
    this.traceHexPath(ctx, centerX, centerY, radius);
    ctx.stroke();
  }

  private isPointInHex(pointX: number, pointY: number, centerX: number, centerY: number, radius: number): boolean {
    const dx = Math.abs(pointX - centerX);
    const dy = Math.abs(pointY - centerY);
    const halfWidth = radius * HEX_SQRT3 / 2;

    if (dx > halfWidth || dy > radius) return false;
    if (dy <= radius / 2) return true;
    return dx <= (radius - dy) * HEX_SQRT3;
  }

  private getNeighborCoords(x: number, y: number): Array<{ x: number; y: number }> {
    return getHexNeighborCoordsForGrid(x, y);
  }

  private formatCellLabel(x: number, y: number): string {
    return `${String.fromCharCode(65 + x)}${y + 1}`;
  }

  private updateHUD(): void {
    const selected = this.getSelectedColony();
    const leadEvolution = selected ? EVOLUTION_BY_ID.get(selected.lifeFormId)! : STAGES[this.stageIndex];
    const nextEvolution = this.getNextEvolutionFor(selected);
    const selectedSummary = selected
      ? `${this.getColonyName(selected)} — ${this.formatCellLabel(selected.x, selected.y)} — ${this.getBiomeLabel(this.terrain[selected.y][selected.x])} — Pop ${selected.population}${this.getColonyStatusText(selected)}`
      : (this.hoverCell 
        ? `${this.getBiomeLabel(this.terrain[this.hoverCell.y][this.hoverCell.x]).toUpperCase()} — ${this.formatCellLabel(this.hoverCell.x, this.hoverCell.y)} — Potencial: ${this.tileEnergy[this.hoverCell.y][this.hoverCell.x]} Nutrientes`
        : 'Nenhuma colônia selecionada.');
    const hint = this.buildHint();
    const objective = nextEvolution ? `Evolua para ${nextEvolution.name}` : 'Vitória';
    const objectiveDetail = this.buildObjectiveDetail(selected);
    const isPlayerPhase = !this.gameOver;
    const adaptCost = (selected && nextEvolution) ? getAdaptCost(nextEvolution, this.tileEnergy[selected.y][selected.x]) : 0;
    const canAdapt = isPlayerPhase && !this.gameWon && selected !== null && this.canColonyAct(selected) && selected.adaptationPoints > 0 && this.canSelectedAdapt() && selected.biomass >= adaptCost;
    const adaptBlockedReason = canAdapt ? '' : this.getAdaptBlockedReason(selected);
    const canExpand = isPlayerPhase && !this.gameWon && this.hasExpandTarget(selected);
    const canDecompose = isPlayerPhase && !this.gameWon && selected !== null && this.isColonyEstablished(selected) && this.isTerminalColony(selected);
    const floatingAnchor = selected ? this.getFloatingMenuAnchor(selected) : null;

    this.hud.update({
      actionPoints: this.actionPoints,
      biomass: this.getBiomassPool(),
      adaptation: selected?.adaptationPoints ?? this.getTotalAdaptationPoints(),
      stageLabel: `${leadEvolution.emoji} ${'name' in leadEvolution ? leadEvolution.name : leadEvolution.label.replace(/^.\s*/, '')}`,
      objective,
      objectiveDetail,
      selectedSummary,
      hint,
      modeLabel: this.mode === 'expand' ? 'Modo: expandir' : this.mode === 'seed' ? 'Modo: semear' : 'Modo: seleção',
      progress: (this.stageIndex / (STAGES.length - 1)) * 100,
      logLines: this.logLines,
      canAdapt,
      adaptCost,
      adaptBlockedReason,
      canExpand,
      canDecompose,
      canSeed: isPlayerPhase && !this.gameWon && this.getBiomassPool() >= SEED_COST && this.mode === 'idle',
      showCancel: isPlayerPhase && (this.mode === 'expand' || this.mode === 'seed'),
      floatingMenuVisible: isPlayerPhase && !this.gameWon && selected !== null && this.mode === 'idle',
      floatingMenuX: floatingAnchor?.x ?? 0,
      floatingMenuY: floatingAnchor?.y ?? 0,
      floatingMenuSide: floatingAnchor?.side ?? 'right',
      floatingCancelVisible: isPlayerPhase && !this.gameWon && (this.mode === 'expand' || this.mode === 'seed'),
      selectedColonyName: selected ? this.getColonyName(selected) : '',
      selectedColonyGroup: (() => {
        if (!selected) return '';
        const def = EVOLUTION_BY_ID.get(selected.lifeFormId);
        if (!def) return '';
        const m = GROUP_ENERGY_MULTIPLIER[def.group];
        return `${def.group} ×${m}`;
      })(),
      selectedColonyDef: selected ? (EVOLUTION_BY_ID.get(selected.lifeFormId) ?? null) : null,
      phaseBannerTitle: '',
      phaseBannerDetail: '',
      terminalInfoVisible: this.terminalInfoVisible,
      terminalInfoTitle: this.terminalInfoTitle,
      terminalInfoLead: this.terminalInfoLead,
      terminalInfoBenefits: this.terminalInfoBenefits,
      terminalInfoBiology: this.terminalInfoBiology,
      milestoneNotificationTitle: this.milestoneNotificationTitle,
      milestoneNotificationRead: this.milestoneNotificationRead,
      milestoneInfoVisible: this.milestoneInfoVisible,
      milestoneInfoTitle: this.milestoneInfoTitle,
      milestoneInfoWhen: this.milestoneInfoWhen,
      milestoneInfoLead: this.milestoneInfoLead,
      milestoneInfoBody: this.milestoneInfoBody,
      gameOverVisible: this.gameOver,
      gameOverTitle: this.gameOverTitle,
      gameOverQuote: this.gameOverQuote,
      gameOverQuoteAuthor: this.gameOverQuoteAuthor,
      gameOverDetail: this.gameOverDetail,
    });
  }
  private canSelectedAdapt(): boolean {
    const colony = this.getSelectedColony();
    if (!colony) return false;
    return this.getNextEvolutionFor(colony) !== null;
  }

  private getAdaptBlockedReason(colony: Colony | null): string {
    if (this.gameWon) return '';
    if (!colony) return '';
    if (!this.isColonyEstablished(colony)) return `Esta colônia ainda está se formando até o turno ${colony.gestatingUntilTurn}.`;
    if (this.isColonyBusy(colony)) return `Esta colônia está ocupada até o turno ${colony.busyUntilTurn}.`;
    if (!this.canColonyAct(colony)) return 'Esta colônia já agiu neste turno.';
    if (colony.adaptationPoints <= 0) return 'Esta colônia está sem adaptação disponível.';

    const current = EVOLUTION_BY_ID.get(colony.lifeFormId);
    if (!current) return 'Forma de vida inválida.';

    if (current.next.length === 0) return 'Este ramo terminou.';

    const biome = this.terrain[colony.y][colony.x];
    const biomeMatches = current.next.filter((step) => step.biome === biome);
    if (biomeMatches.length === 0) {
      const targetBiomes = [...new Set(current.next.map((step) => this.getBiomeLabel(step.biome)))];
      return `Precisa estar em ${targetBiomes.join(' ou ')}.`;
    }

    const minPopulation = Math.min(...biomeMatches.map((step) => step.minPopulation));
    if (colony.population < minPopulation) {
      return `Precisa de população ${minPopulation}.`;
    }

    const nextEvo = this.getNextEvolutionFor(colony);
    if (nextEvo) {
      const cost = getAdaptCost(nextEvo, this.tileEnergy[colony.y][colony.x]);
      if (colony.biomass < cost) {
        return `Biomassa insuficiente: precisa de ${cost}, tem ${colony.biomass}.`;
      }
    }

    return 'Não é possível adaptar agora.';
  }

  private buildHint(): string {
    if (this.gameWon) {
      return 'A partida termina aqui: o objetivo do jogo era conduzir uma linhagem ancestral até o Homo sapiens.';
    }
    if (this.mode === 'expand') {
      return 'Clique em um tile vizinho destacado para criar uma nova colônia.';
    }
    const selected = this.getSelectedColony();
    if (selected && !this.isColonyEstablished(selected)) {
      return `A colônia em ${this.formatCellLabel(selected.x, selected.y)} ainda está se formando e ficará pronta no turno ${selected.gestatingUntilTurn}.`;
    }
    if (selected && this.isTerminalColony(selected)) {
      const neighbors = this.getNeighborColonies(selected).filter((n) => this.isColonyEstablished(n));
      const support = neighbors.length > 0
        ? `Sustenta ${neighbors.length} colônia${neighbors.length > 1 ? 's' : ''} vizinha${neighbors.length > 1 ? 's' : ''} com nutrientes extras.`
        : 'Posicione colônias ativas ao redor para receber nutrientes extras.';
      return `Ecossistema autônomo: ${support} Pode ser decomposta para liberar o tile.`;
    }
    const nextEvolution = this.getNextEvolutionFor(selected);
    if (!selected || !nextEvolution) {
      return 'Selecione uma colônia e siga a linha evolutiva principal até o Homo sapiens.';
    }

    if (selected.autoExplore) {
      return `Exploracao automatica ativa em ${this.formatCellLabel(selected.x, selected.y)}. A colonia explorara de novo se nao adaptar nem expandir.`;
    }
    const requiredBiome = this.getBiomeLabel(nextEvolution.requiredBiome);
    return `Adapte em ${requiredBiome} para avançar de ${this.getColonyName(selected)} para ${nextEvolution.name}.`;
  }

  private buildObjectiveDetail(selected: Colony | null): string {
    if (this.gameWon) {
      return 'A jornada desta linhagem foi concluída no Homo sapiens.';
    }

    if (!selected) {
      const hoverEnergy = this.hoverCell ? ` — Produção deste tile: +${this.tileEnergy[this.hoverCell.y][this.hoverCell.x]}` : '';
      return `Nutrientes Totais: ${this.getBiomassPool()} — Adaptação total: ${this.getTotalAdaptationPoints()} — População total: ${this.getTotalPopulation()}${hoverEnergy}`;
    }

    if (!this.isColonyEstablished(selected)) {
      return `Expansão em andamento. Essa nova colônia só poderá agir a partir do turno ${selected.gestatingUntilTurn}.`;
    }

    const nextEvolution = this.getNextEvolutionFor(selected);
    const energy = this.tileEnergy[selected.y][selected.x];
    const def = EVOLUTION_BY_ID.get(selected.lifeFormId);
    const multiplier = def ? GROUP_ENERGY_MULTIPLIER[def.group] : 1;
    const prodDetail = ` — Produção local: +${formatBiomass(energy * multiplier)} Nutrientes/turno (${multiplier}× tile)`;
    if (!nextEvolution) {
      return `Esta linhagem já chegou ao limite desta campanha.${prodDetail}`;
    }

    return `Próxima forma: ${nextEvolution.name} — Bioma: ${this.getBiomeLabel(nextEvolution.requiredBiome)} — População mínima: ${nextEvolution.minPopulation}${prodDetail}`;
  }
  private getBiomeLabel(biome: Biome): string {
    if (biome === 'ocean') return 'oceano';
    if (biome === 'coast') return 'costa';
    return 'terra';
  }

  private getColonyStatusText(colony: Colony): string {
    if (!this.isColonyEstablished(colony)) {
      return ` — expandindo até T${colony.gestatingUntilTurn}`;
    }
    if (this.isColonyBusy(colony)) {
      return ` — ocupada até T${colony.busyUntilTurn}`;
    }
    if (colony.autoExplore) {
      return ' - exploracao automatica';
    }
    if (!this.canColonyAct(colony)) {
      return ' — já agiu';
    }
    return '';
  }
  private isTerminalColony(colony: Colony): boolean {
    const form = EVOLUTION_BY_ID.get(colony.lifeFormId);
    return !form || form.next.length === 0;
  }

  private getNeighborColonies(colony: Colony): Colony[] {
    const neighbors: Colony[] = [];
    for (const { x, y } of this.getNeighborCoords(colony.x, colony.y)) {
      const neighbor = this.getColonyAt(x, y);
      if (neighbor) neighbors.push(neighbor);
    }
    return neighbors;
  }

  private getColonyEmoji(colony: Colony): string {
    return EVOLUTION_BY_ID.get(colony.lifeFormId)?.emoji ?? '🦠';
  }

  private getColonyName(colony: Colony): string {
    return EVOLUTION_BY_ID.get(colony.lifeFormId)?.name ?? 'Bactéria Primitiva';
  }

  private getNextEvolutionFor(colony: Colony | null): (EvolutionDefinition & { requiredBiome: Biome; minPopulation: number }) | null {
    if (!colony) return null;
    const current = EVOLUTION_BY_ID.get(colony.lifeFormId);
    if (!current) return null;

    const biome = this.terrain[colony.y][colony.x];
    const existingForms = new Set(
      [...this.colonies.values()].map((c) => c.lifeFormId),
    );
    const available = current.next
      .filter((step) => step.biome === biome && colony.population >= step.minPopulation);
    const protectedAvailable = available.filter((step) => this.isEvolutionStepSafe(colony, step));

    const humanPathAvailable = protectedAvailable.filter((step) => canReachEvolutionTarget(step.to, HUMAN_EVOLUTION_ID));
    const missingHumanPathStep = humanPathAvailable.find((step) => !existingForms.has(step.to));

    if (missingHumanPathStep) {
      const next = EVOLUTION_BY_ID.get(missingHumanPathStep.to);
      if (!next) return null;

      return {
        ...next,
        requiredBiome: missingHumanPathStep.biome,
        minPopulation: missingHumanPathStep.minPopulation,
      };
    }

    const alternateAvailable = protectedAvailable.filter((step) => !canReachEvolutionTarget(step.to, HUMAN_EVOLUTION_ID));
    const currentDistance = getEvolutionDistanceToTarget(colony.lifeFormId, HUMAN_EVOLUTION_ID) ?? Number.POSITIVE_INFINITY;
    const canBranchAwayFromHumanPath =
      this.getHumanReachableColonyCount(colony.id, currentDistance) >= MIN_PARALLEL_HUMAN_PATHS_FOR_BRANCHING;
    // Always show the human-path evolution in the HUD — random branching only happens on actual adapt
    let chosen =
      canBranchAwayFromHumanPath && humanPathAvailable.length > 0 && alternateAvailable.length > 0
        ? choosePreferredEvolutionStep(humanPathAvailable, existingForms)
        : null;

    if (!chosen) {
      chosen =
        choosePreferredEvolutionStep(humanPathAvailable, existingForms)
        ?? (canBranchAwayFromHumanPath ? choosePreferredEvolutionStep(alternateAvailable, existingForms) : null)
        ?? choosePreferredEvolutionStep(protectedAvailable, existingForms);
    }

    if (!canBranchAwayFromHumanPath && chosen && !canReachEvolutionTarget(chosen.to, HUMAN_EVOLUTION_ID)) {
      return null;
    }

    if (!chosen) return null;

    const next = EVOLUTION_BY_ID.get(chosen.to);
    if (!next) return null;

    return {
      ...next,
      requiredBiome: chosen.biome,
      minPopulation: chosen.minPopulation,
    };
  }

  private isEvolutionStepSafe(
    colony: Colony,
    step: { to: string; biome: Biome; minPopulation: number },
  ): boolean {
    if (canReachEvolutionTarget(step.to, HUMAN_EVOLUTION_ID)) return true;
    if (!canReachEvolutionTarget(colony.lifeFormId, HUMAN_EVOLUTION_ID)) return true;

    const currentDistance = getEvolutionDistanceToTarget(colony.lifeFormId, HUMAN_EVOLUTION_ID);
    if (currentDistance === null) return true;

    return this.getHumanReachableColonyCount(colony.id, currentDistance) > 0;
  }

  private getHumanReachableColonyCount(excludeColonyId: number | null = null, maxDistanceToHuman = Number.POSITIVE_INFINITY): number {
    let count = 0;

    for (const colony of this.colonies.values()) {
      if (excludeColonyId !== null && colony.id === excludeColonyId) continue;
      if (!this.isColonyEstablished(colony)) continue;
      const distance = getEvolutionDistanceToTarget(colony.lifeFormId, HUMAN_EVOLUTION_ID);
      if (distance === null || distance > maxDistanceToHuman) continue;
      if (canReachEvolutionTarget(colony.lifeFormId, HUMAN_EVOLUTION_ID)) {
        count += 1;
      }
    }

    return count;
  }

  private hasHumanReachableLineage(): boolean {
    for (const colony of this.colonies.values()) {
      if (canReachEvolutionTarget(colony.lifeFormId, HUMAN_EVOLUTION_ID)) {
        return true;
      }
    }

    return false;
  }

  private getFloatingMenuAnchor(colony: Colony): { x: number; y: number; side: 'left' | 'right' } {
    const { x: centerX, y: centerY } = this.getCellCenter(colony.x, colony.y);
    const side: 'left' | 'right' = colony.x >= GRID_SIZE / 2 ? 'left' : 'right';
    const horizontalOffset = this.cellSize * 0.72;

    const x = side === 'right' ? centerX + horizontalOffset : centerX - horizontalOffset;
    // Clamp Y so the menu stays within the board area
    const menuHalfHeight = 80;
    const minY = this.offsetY + menuHalfHeight;
    const maxY = this.offsetY + this.boardHeight - menuHalfHeight;
    const clampedY = Math.max(minY, Math.min(maxY, centerY));

    return { x, y: clampedY, side };
  }

  private pushLog(message: string): void {
    this.logLines.unshift(message);
    if (this.logLines.length > 40) this.logLines.pop();
  }

  getDebugState(): Record<string, unknown> {
    return {
      turn: this.turn,
      gameOver: this.gameOver,
      actionPoints: this.actionPoints,
      biomass: this.getBiomassPool(),
      selectedColonyId: this.selectedColonyId,
      logLines: [...this.logLines],
      colonies: [...this.colonies.values()].map((colony) => ({
        id: colony.id,
        x: colony.x,
        y: colony.y,
        biome: this.terrain[colony.y][colony.x],
        lifeFormId: colony.lifeFormId,
        population: colony.population,
        biomass: colony.biomass,
        adaptationPoints: colony.adaptationPoints,
      })),
    };
  }
}
