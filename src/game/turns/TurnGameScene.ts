import type { TurnHUD } from './TurnHUD';

type Biome = 'ocean' | 'coast' | 'land';
type ActionMode = 'idle' | 'expand' | 'seed';

interface Colony {
  id: number;
  x: number;
  y: number;
  population: number;
  lifeFormId: string;
  adaptationPoints: number;
  coastAdapted: boolean;
  landAdapted: boolean;
  fortified: boolean;
  busyUntilTurn: number;
  consolidatingUntilTurn: number | null;
  gestatingUntilTurn: number | null;
}

interface StageDefinition {
  label: string;
  emoji: string;
  objective: string;
}

interface EvolutionDefinition {
  id: string;
  name: string;
  emoji: string;
  allowedBiomes: Biome[];
  worldStage: number;
  next: Array<{
    to: string;
    biome: Biome;
    minPopulation: number;
  }>;
}

const GRID_SIZE = 8;
const SEED_COST = 4;
const STAGES: StageDefinition[] = [
  {
    label: '🦠 Bactérias Primitivas',
    emoji: '🦠',
    objective: 'Controle 4 tiles de oceano',
  },
  {
    label: '🫧 Vida Simples',
    emoji: '🫧',
    objective: 'Leve a vida até a costa',
  },
  {
    label: '🧽 Vida Complexa',
    emoji: '🧽',
    objective: 'Prepare uma colônia costeira para terra',
  },
  {
    label: '🦎 Vida Terrestre',
    emoji: '🦎',
    objective: 'Estabeleça vida estável em terra',
  },
  {
    label: '🧑 Humano',
    emoji: '🧑',
    objective: 'Vitória',
  },
];

const EVOLUTION_PATH: EvolutionDefinition[] = [
  { id: 'bacteria_primitiva', name: 'Bactéria Primitiva', emoji: '🦠', allowedBiomes: ['ocean'], worldStage: 0, next: [
    { to: 'cianobacteria', biome: 'ocean', minPopulation: 1 },
    { to: 'archaea', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'archaea', name: 'Archaea', emoji: '🧫', allowedBiomes: ['ocean'], worldStage: 0, next: [
    { to: 'protozoario', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'cianobacteria', name: 'Cianobactéria', emoji: '🌿', allowedBiomes: ['ocean'], worldStage: 0, next: [
    { to: 'protozoario', biome: 'ocean', minPopulation: 1 },
    { to: 'alga_verde', biome: 'coast', minPopulation: 1 },
    { to: 'alga_vermelha', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'protozoario', name: 'Protozoário', emoji: '🫧', allowedBiomes: ['ocean', 'coast'], worldStage: 0, next: [
    { to: 'ameba', biome: 'ocean', minPopulation: 1 },
    { to: 'esponja', biome: 'ocean', minPopulation: 1 },
    { to: 'fungo', biome: 'coast', minPopulation: 1 },
  ] },
  { id: 'ameba', name: 'Ameba', emoji: '🦠', allowedBiomes: ['ocean'], worldStage: 0, next: [] },
  { id: 'alga_verde', name: 'Alga Verde', emoji: '🌱', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [
    { to: 'musgo', biome: 'coast', minPopulation: 1 },
    { to: 'planta_vascular', biome: 'land', minPopulation: 1 },
    { to: 'angiosperma', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'alga_vermelha', name: 'Alga Vermelha', emoji: '🪸', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [
    { to: 'coral', biome: 'coast', minPopulation: 1 },
  ] },
  { id: 'esponja', name: 'Esponja', emoji: '🧽', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [
    { to: 'medusa', biome: 'ocean', minPopulation: 1 },
    { to: 'anemona_do_mar', biome: 'coast', minPopulation: 1 },
    { to: 'coral', biome: 'coast', minPopulation: 1 },
    { to: 'verme_plano', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'fungo', name: 'Fungo', emoji: '🍄', allowedBiomes: ['coast', 'land'], worldStage: 2, next: [] },
  { id: 'verme_plano', name: 'Verme Plano', emoji: '🪱', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [
    { to: 'trilobita', biome: 'ocean', minPopulation: 1 },
    { to: 'molusco', biome: 'coast', minPopulation: 1 },
    { to: 'crustaceo', biome: 'coast', minPopulation: 1 },
    { to: 'peixe', biome: 'ocean', minPopulation: 1 },
    { to: 'anelideo', biome: 'ocean', minPopulation: 1 },
    { to: 'nematodeo', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'musgo', name: 'Musgo', emoji: '🌾', allowedBiomes: ['coast', 'land'], worldStage: 2, next: [
    { to: 'planta_vascular', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'medusa', name: 'Medusa', emoji: '🪼', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [] },
  { id: 'anemona_do_mar', name: 'Anêmona-do-mar', emoji: '🌺', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [] },
  { id: 'coral', name: 'Coral', emoji: '🪸', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [] },
  { id: 'trilobita', name: 'Trilobita', emoji: '🦐', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [] },
  { id: 'planta_vascular', name: 'Planta Vascular', emoji: '🌳', allowedBiomes: ['coast', 'land'], worldStage: 2, next: [
    { to: 'angiosperma', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'anelideo', name: 'Anelídeo', emoji: '🪱', allowedBiomes: ['ocean', 'coast', 'land'], worldStage: 1, next: [
    { to: 'crustaceo', biome: 'coast', minPopulation: 1 },
    { to: 'inseto', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'nematodeo', name: 'Nematódeo', emoji: '🪱', allowedBiomes: ['ocean', 'coast', 'land'], worldStage: 1, next: [
    { to: 'inseto', biome: 'land', minPopulation: 1 },
    { to: 'aracnideo', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'molusco', name: 'Molusco', emoji: '🐚', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [
    { to: 'cefalopode', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'crustaceo', name: 'Crustáceo', emoji: '🦀', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [] },
  { id: 'inseto', name: 'Inseto', emoji: '🐛', allowedBiomes: ['land', 'coast'], worldStage: 2, next: [] },
  { id: 'peixe', name: 'Peixe', emoji: '🐟', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [
    { to: 'tubarao', biome: 'ocean', minPopulation: 1 },
    { to: 'anfibio', biome: 'coast', minPopulation: 1 },
  ] },
  { id: 'angiosperma', name: 'Angiosperma', emoji: '🌸', allowedBiomes: ['land', 'coast'], worldStage: 2, next: [] },
  { id: 'cefalopode', name: 'Cefalópode', emoji: '🐙', allowedBiomes: ['ocean'], worldStage: 1, next: [] },
  { id: 'aracnideo', name: 'Aracnídeo', emoji: '🕷️', allowedBiomes: ['land', 'coast'], worldStage: 2, next: [] },
  { id: 'tubarao', name: 'Tubarão', emoji: '🦈', allowedBiomes: ['ocean'], worldStage: 1, next: [] },
  { id: 'anfibio', name: 'Anfíbio', emoji: '🐸', allowedBiomes: ['coast', 'land'], worldStage: 2, next: [
    { to: 'reptil', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'reptil', name: 'Réptil', emoji: '🦎', allowedBiomes: ['land', 'coast'], worldStage: 3, next: [
    { to: 'dinossauro', biome: 'land', minPopulation: 1 },
    { to: 'ave', biome: 'land', minPopulation: 1 },
    { to: 'mamifero', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'dinossauro', name: 'Dinossauro', emoji: '🦕', allowedBiomes: ['land'], worldStage: 3, next: [] },
  { id: 'ave', name: 'Ave', emoji: '🐦', allowedBiomes: ['land', 'coast'], worldStage: 3, next: [] },
  { id: 'mamifero', name: 'Mamífero', emoji: '🐭', allowedBiomes: ['land', 'coast'], worldStage: 3, next: [
    { to: 'primata', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'primata', name: 'Primata', emoji: '🐒', allowedBiomes: ['land'], worldStage: 3, next: [
    { to: 'hominideo', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'hominideo', name: 'Hominídeo', emoji: '🦧', allowedBiomes: ['land'], worldStage: 3, next: [
    { to: 'humano', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'humano', name: 'Humano', emoji: '🧑', allowedBiomes: ['land'], worldStage: 4, next: [] },
];

const EVOLUTION_BY_ID = new Map(EVOLUTION_PATH.map((node) => [node.id, node]));


const BASE_MAP: Biome[][] = [
  ['ocean', 'ocean', 'ocean', 'ocean', 'coast', 'land', 'land', 'land'],
  ['ocean', 'ocean', 'ocean', 'ocean', 'coast', 'land', 'land', 'land'],
  ['ocean', 'ocean', 'ocean', 'coast', 'coast', 'land', 'land', 'land'],
  ['ocean', 'ocean', 'ocean', 'coast', 'land', 'land', 'land', 'land'],
  ['ocean', 'ocean', 'coast', 'coast', 'land', 'land', 'land', 'land'],
  ['ocean', 'ocean', 'coast', 'land', 'land', 'land', 'land', 'land'],
  ['ocean', 'coast', 'coast', 'land', 'land', 'land', 'land', 'land'],
  ['ocean', 'coast', 'land', 'land', 'land', 'land', 'land', 'land'],
];

export class TurnGameScene {
  private readonly hud: TurnHUD;
  private readonly terrain = BASE_MAP.map((row) => [...row]);
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
  private biomass = 6;
  private stageIndex = 0;
  private gameWon = false;
  private cellSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private boardSize = 0;

  constructor(hud: TurnHUD) {
    this.hud = hud;
    this.seedOpeningColonies();
    this.startTurn();
    this.selectedColonyId = 2;
    this.pushLog('Bactérias primitivas surgiram no oceano. Selecione uma colônia e use suas 3 ações.');
    this.updateHUD();
  }

  onResize(width: number, height: number): void {
    const isDesktop = width >= 980;
    const panelWidth = isDesktop ? 320 : 0;
    // Topbar height: compact on mobile, standard on desktop
    const topInset = isDesktop ? 96 : 52;
    // Bottom panel reserve on mobile/tablet
    const bottomInset = isDesktop ? 0 : Math.min(height * 0.28, 180);
    const sidePadding = isDesktop ? 28 : 8;

    const availableWidth = Math.max(200, width - panelWidth - sidePadding * 2);
    const availableHeight = Math.max(200, height - topInset - bottomInset - 8);
    this.boardSize = Math.min(availableWidth, availableHeight);
    this.cellSize = Math.floor(this.boardSize / GRID_SIZE);
    this.boardSize = this.cellSize * GRID_SIZE;

    if (isDesktop) {
      this.offsetX = sidePadding;
    } else {
      // Center the board horizontally on mobile
      this.offsetX = Math.floor((width - this.boardSize) / 2);
    }
    this.offsetY = topInset + Math.floor((availableHeight - this.boardSize) / 2);
  }

  update(): void {
    this.updateHUD();
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#ebe2d3';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.drawBoard(ctx);
    this.drawColonies(ctx);
  }

  handlePointerDown(clientX: number, clientY: number): void {
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
      this.selectedColonyId = colony.id;
      this.pushLog(`Colônia selecionada em ${this.formatCellLabel(colony.x, colony.y)}.`);
      this.updateHUD();
      return;
    }

    this.mode = 'idle';
    this.selectedColonyId = null;
    this.updateHUD();
  }

  performConsolidate(): void {
    const colony = this.getSelectedColony();
    if (!colony || !this.canColonyAct(colony)) return;

    colony.busyUntilTurn = this.turn + 2;
    colony.consolidatingUntilTurn = this.turn + 2;
    this.consumeColonyAction(colony.id);
    this.mode = 'idle';
    this.selectNextAvailableColony(colony.id);
    this.pushLog(`A colônia em ${this.formatCellLabel(colony.x, colony.y)} foi consolidada.`);
    this.updateHUD();
  }

  performAdapt(): void {
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

    colony.lifeFormId = nextEvolution.id;
    this.syncColonyTraversal(colony);
    colony.adaptationPoints -= 1;
    this.consumeColonyAction(colony.id);
    this.syncWorldStage();

    this.pushLog(`A colônia em ${this.formatCellLabel(colony.x, colony.y)} evoluiu para ${nextEvolution.name}.`);

    if (nextEvolution.id === 'humano') {
      this.gameWon = true;
      this.actionPoints = 0;
      this.selectedColonyId = colony.id;
      this.pushLog('Vitória: a longa história da vida chegou ao primeiro humano.');
    }

    this.mode = 'idle';
    if (!this.gameWon) {
      this.selectNextAvailableColony(colony.id);
    }
    this.updateHUD();
  }

  performDecompose(): void {
    const colony = this.getSelectedColony();
    if (!colony || !this.isTerminalColony(colony) || !this.isColonyEstablished(colony)) return;

    const biomassReward = Math.max(2, colony.population + 1);
    const adaptReward = Math.max(1, colony.adaptationPoints);
    this.biomass += biomassReward;

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
    this.selectNextAvailableColony(null);
    this.pushLog(`${name} em ${cell} foi decomposta: +${biomassReward} biomassa${neighbors.length > 0 ? ', adaptação redistribuída' : ''}.`);
    this.mode = 'idle';
    this.updateHUD();
  }

  startExpandMode(): void {
    const colony = this.getSelectedColony();
    if (!colony || !this.canColonyAct(colony) || this.biomass <= 0) return;
    this.mode = 'expand';
    this.pushLog('Modo expandir ativo. Clique em um tile vizinho válido.');
    this.updateHUD();
  }

  startSeedMode(): void {
    if (this.gameWon || this.biomass < SEED_COST) return;
    this.mode = 'seed';
    this.selectedColonyId = null;
    this.pushLog(`Semear vida (custo: ${SEED_COST} biomassa). Clique em um tile de oceano livre.`);
    this.updateHUD();
  }

  private trySeedAt(x: number, y: number): void {
    if (this.biomass < SEED_COST) {
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

    this.biomass -= SEED_COST;
    this.addColony(x, y, { population: 2, lifeFormId: 'bacteria_primitiva' });
    this.mode = 'idle';
    this.pushLog(`Nova vida semeada em ${this.formatCellLabel(x, y)}. Uma nova Bactéria Primitiva surgiu no oceano.`);
    this.updateHUD();
  }

  cancelCurrentMode(): void {
    if (this.mode === 'idle') return;
    const label = this.mode === 'seed' ? 'Semeadura cancelada.' : 'Modo expandir cancelado.';
    this.mode = 'idle';
    this.pushLog(label);
    this.updateHUD();
  }

  endTurn(): void {
    if (this.gameWon) return;
    const previousSelectedColonyId = this.selectedColonyId;
    this.mode = 'idle';
    this.resolveProduction();
    this.checkProgression();
    if (this.gameWon) {
      this.updateHUD();
      return;
    }
    this.turn += 1;
    this.startTurn(previousSelectedColonyId);
    this.pushLog(`Turno ${this.turn} começou.`);
    this.updateHUD();
  }

  private seedOpeningColonies(): void {
    this.addColony(1, 1);
    this.addColony(2, 2);
    this.addColony(1, 3);
  }

  private addColony(x: number, y: number, options?: Partial<Colony>): Colony {
    const colony: Colony = {
      id: this.nextColonyId++,
      x,
      y,
      population: options?.population ?? 2,
      lifeFormId: options?.lifeFormId ?? 'bacteria_primitiva',
      adaptationPoints: options?.adaptationPoints ?? 1,
      coastAdapted: options?.coastAdapted ?? false,
      landAdapted: options?.landAdapted ?? false,
      fortified: options?.fortified ?? false,
      busyUntilTurn: options?.busyUntilTurn ?? 0,
      consolidatingUntilTurn: options?.consolidatingUntilTurn ?? null,
      gestatingUntilTurn: options?.gestatingUntilTurn ?? null,
    };
    this.syncColonyTraversal(colony);
    this.colonies.set(colony.id, colony);
    return colony;
  }

  private startTurn(fromColonyId: number | null = null): void {
    this.resolveTurnTransitions();
    this.actedColonyIds.clear();
    this.turnStartColonyIds = new Set(
      [...this.colonies.values()]
        .filter((colony) => this.isColonyReadyForTurn(colony) && !this.isTerminalColony(colony))
        .map((colony) => colony.id),
    );
    this.actionPoints = this.turnStartColonyIds.size;
    this.selectNextAvailableColony(fromColonyId);
  }

  private resolveTurnTransitions(): void {
    for (const colony of this.colonies.values()) {
      if (colony.gestatingUntilTurn !== null && this.turn >= colony.gestatingUntilTurn) {
        colony.gestatingUntilTurn = null;
        this.pushLog(`A nova colônia em ${this.formatCellLabel(colony.x, colony.y)} terminou a expansão e agora está estável.`);
      }

      if (colony.consolidatingUntilTurn !== null && this.turn >= colony.consolidatingUntilTurn) {
        colony.consolidatingUntilTurn = null;
        colony.population += 1;
        colony.fortified = true;
        this.biomass += 2;
        this.pushLog(`A consolidação em ${this.formatCellLabel(colony.x, colony.y)} foi concluída: +1 população e +2 biomassa.`);
      }
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
        const px = this.offsetX + x * this.cellSize;
        const py = this.offsetY + y * this.cellSize;
        ctx.fillStyle = this.getBiomeColor(this.terrain[y][x]);
        ctx.fillRect(px, py, this.cellSize, this.cellSize);

        if (this.isExpandTarget(x, y)) {
          ctx.fillStyle = 'rgba(255, 244, 131, 0.38)';
          ctx.fillRect(px, py, this.cellSize, this.cellSize);
        }

        if (this.isSeedTarget(x, y)) {
          ctx.fillStyle = 'rgba(100, 180, 255, 0.3)';
          ctx.fillRect(px, py, this.cellSize, this.cellSize);
        }

        if (this.hoverCell?.x === x && this.hoverCell.y === y) {
          ctx.strokeStyle = '#f4f0d0';
          ctx.lineWidth = 3;
          ctx.strokeRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4);
        }

        const colony = this.getColonyAt(x, y);
        if (colony?.id === this.selectedColonyId) {
          ctx.strokeStyle = '#6f4c24';
          ctx.lineWidth = 4;
          ctx.strokeRect(px + 3, py + 3, this.cellSize - 6, this.cellSize - 6);
        }

        ctx.strokeStyle = 'rgba(76, 63, 40, 0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, this.cellSize, this.cellSize);
      }
    }
  }

  private drawColonies(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.floor(this.cellSize * 0.54)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;

    for (const colony of this.colonies.values()) {
      const centerX = this.offsetX + colony.x * this.cellSize + this.cellSize / 2;
      const centerY = this.offsetY + colony.y * this.cellSize + this.cellSize / 2;
      const isGestating = !this.isColonyEstablished(colony);

      ctx.save();
      ctx.globalAlpha = isGestating ? 0.38 : 1;
      ctx.fillText(this.getColonyEmoji(colony), centerX, centerY);

      ctx.font = `${Math.floor(this.cellSize * 0.18)}px system-ui, sans-serif`;
      ctx.fillStyle = '#20160d';
      ctx.fillText(String(colony.population), centerX, centerY + this.cellSize * 0.26);

      if (colony.coastAdapted || colony.landAdapted) {
        ctx.beginPath();
        ctx.fillStyle = colony.landAdapted ? '#7aa34c' : '#c4813f';
        ctx.arc(centerX + this.cellSize * 0.24, centerY - this.cellSize * 0.24, this.cellSize * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }

      if (colony.fortified) {
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.arc(centerX, centerY, this.cellSize * 0.31, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.font = `${Math.floor(this.cellSize * 0.54)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.fillStyle = '#111111';
      ctx.restore();

      if (colony.consolidatingUntilTurn !== null) {
        ctx.beginPath();
        ctx.strokeStyle = '#f7d774';
        ctx.lineWidth = 3;
        ctx.arc(centerX, centerY, this.cellSize * 0.36, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private resolveProduction(): void {
    let biomassGain = 0;

    for (const colony of this.colonies.values()) {
      if (!this.isColonyEstablished(colony)) continue;
      colony.fortified = false;
      biomassGain += 1;
      colony.adaptationPoints += 1;

      // Terminal colonies act as autonomous ecosystems: extra biomass + feed neighbors
      if (this.isTerminalColony(colony)) {
        biomassGain += 1;
        const neighbors = this.getNeighborColonies(colony);
        for (const neighbor of neighbors) {
          if (!this.isTerminalColony(neighbor)) {
            neighbor.adaptationPoints += 1;
          }
        }
      }
    }

    this.biomass += biomassGain;
    this.pushLog(`Fim do turno: +${biomassGain} biomassa.`);
  }

  private checkProgression(): void {
    this.syncWorldStage();
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

    this.biomass -= 1;
    this.addColony(x, y, {
      population: 1,
      lifeFormId: colony.lifeFormId,
      coastAdapted: colony.coastAdapted,
      landAdapted: colony.landAdapted,
      busyUntilTurn: this.turn + 3,
      gestatingUntilTurn: this.turn + 3,
    });
    colony.busyUntilTurn = this.turn + 3;
    this.consumeColonyAction(colony.id);
    this.mode = 'idle';
    this.selectNextAvailableColony(colony.id);
    this.pushLog(`A expansão para ${this.formatCellLabel(x, y)} começou. A nova colônia ficará instável por 2 turnos.`);
    this.updateHUD();
  }

  private isExpandTarget(x: number, y: number): boolean {
    const colony = this.getSelectedColony();
    if (!colony || this.mode !== 'expand') return false;
    if (this.getColonyAt(x, y)) return false;
    if (Math.abs(colony.x - x) + Math.abs(colony.y - y) !== 1) return false;
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
    if (!colony || this.biomass <= 0 || !this.canColonyAct(colony)) return false;

    const candidates = [
      { x: colony.x + 1, y: colony.y },
      { x: colony.x - 1, y: colony.y },
      { x: colony.x, y: colony.y + 1 },
      { x: colony.x, y: colony.y - 1 },
    ];

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

  private getSelectedColony(): Colony | null {
    return this.selectedColonyId === null ? null : this.colonies.get(this.selectedColonyId) ?? null;
  }

  private canColonyAct(colony: Colony): boolean {
    return this.turnStartColonyIds.has(colony.id) && !this.actedColonyIds.has(colony.id) && this.isColonyReadyForTurn(colony);
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

  private selectNextAvailableColony(fromColonyId: number | null): void {
    const orderedIds = [...this.turnStartColonyIds].sort((a, b) => a - b);
    if (orderedIds.length === 0) {
      this.selectedColonyId = null;
      return;
    }

    const currentIndex = fromColonyId === null ? -1 : orderedIds.indexOf(fromColonyId);
    const searchStart = currentIndex >= 0 ? currentIndex + 1 : 0;

    for (let offset = 0; offset < orderedIds.length; offset += 1) {
      const candidateId = orderedIds[(searchStart + offset) % orderedIds.length];
      const candidate = this.colonies.get(candidateId);
      if (candidate && this.canColonyAct(candidate)) {
        this.selectedColonyId = candidateId;
        return;
      }
    }

    this.selectedColonyId = null;
  }

  private getColonyAt(x: number, y: number): Colony | null {
    for (const colony of this.colonies.values()) {
      if (colony.x === x && colony.y === y) return colony;
    }
    return null;
  }

  private getCellAtPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    const localX = clientX - this.offsetX;
    const localY = clientY - this.offsetY;
    if (localX < 0 || localY < 0 || localX >= this.boardSize || localY >= this.boardSize) return null;
    return {
      x: Math.floor(localX / this.cellSize),
      y: Math.floor(localY / this.cellSize),
    };
  }

  private getBiomeColor(biome: Biome): string {
    if (biome === 'ocean') return '#2f6f9f';
    if (biome === 'coast') return '#8fd3ea';
    return '#8ca56a';
  }

  private formatCellLabel(x: number, y: number): string {
    return `${String.fromCharCode(65 + x)}${y + 1}`;
  }

  private updateHUD(): void {
    const selected = this.getSelectedColony();
    const leadEvolution = selected ? EVOLUTION_BY_ID.get(selected.lifeFormId)! : STAGES[this.stageIndex];
    const nextEvolution = this.getNextEvolutionFor(selected);
    const selectedSummary = selected
      ? `${this.getColonyName(selected)} — ${this.formatCellLabel(selected.x, selected.y)} — ${this.getBiomeLabel(this.terrain[selected.y][selected.x])} — pop ${selected.population}${this.getColonyStatusText(selected)}`
      : 'Nenhuma colônia selecionada.';
    const hint = this.buildHint();
    const objective = nextEvolution ? `Evolua para ${nextEvolution.name}` : 'Vitória';
    const objectiveDetail = this.buildObjectiveDetail(selected);
    const canConsolidate = !this.gameWon && selected !== null && this.canColonyAct(selected);
    const canAdapt = !this.gameWon && selected !== null && this.canColonyAct(selected) && selected.adaptationPoints > 0 && this.canSelectedAdapt();
    const adaptBlockedReason = canAdapt ? '' : this.getAdaptBlockedReason(selected);
    const canExpand = !this.gameWon && this.hasExpandTarget(selected);
    const canDecompose = !this.gameWon && selected !== null && this.isColonyEstablished(selected) && this.isTerminalColony(selected);
    const floatingAnchor = selected ? this.getFloatingMenuAnchor(selected) : null;

    this.hud.update({
      turn: this.turn,
      actionPoints: this.actionPoints,
      biomass: this.biomass,
      adaptation: selected?.adaptationPoints ?? this.getTotalAdaptationPoints(),
      stageLabel: `${leadEvolution.emoji} ${'name' in leadEvolution ? leadEvolution.name : leadEvolution.label.replace(/^.\s*/, '')}`,
      objective,
      objectiveDetail,
      selectedSummary,
      hint,
      modeLabel: this.mode === 'expand' ? 'Modo: expandir' : this.mode === 'seed' ? 'Modo: semear' : 'Modo: seleção',
      progress: (this.stageIndex / (STAGES.length - 1)) * 100,
      logLines: this.logLines,
      canConsolidate,
      canAdapt,
      adaptBlockedReason,
      canExpand,
      canDecompose,
      canSeed: !this.gameWon && this.biomass >= SEED_COST && this.mode === 'idle',
      canEndTurn: !this.gameWon,
      endTurnLabel: this.gameWon ? 'Vitória alcançada' : 'Encerrar turno',
      showCancel: this.mode === 'expand' || this.mode === 'seed',
      floatingMenuVisible: !this.gameWon && selected !== null && this.mode === 'idle',
      floatingMenuX: floatingAnchor?.x ?? 0,
      floatingMenuY: floatingAnchor?.y ?? 0,
      floatingMenuSide: floatingAnchor?.side ?? 'right',
      floatingCancelVisible: !this.gameWon && (this.mode === 'expand' || this.mode === 'seed'),
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

    return 'Não é possível adaptar agora.';
  }

  private buildHint(): string {
    if (this.gameWon) {
      return 'A partida termina aqui: o objetivo do jogo era conduzir a vida até o primeiro humano.';
    }
    if (this.mode === 'expand') {
      return 'Clique em um tile vizinho destacado para criar uma nova colônia.';
    }
    const selected = this.getSelectedColony();
    if (selected && !this.isColonyEstablished(selected)) {
      return `A colônia em ${this.formatCellLabel(selected.x, selected.y)} ainda está se formando e ficará pronta no turno ${selected.gestatingUntilTurn}.`;
    }
    if (selected && selected.consolidatingUntilTurn !== null) {
      return `A colônia em ${this.formatCellLabel(selected.x, selected.y)} está consolidando e concluirá no turno ${selected.consolidatingUntilTurn}.`;
    }
    if (selected && this.isTerminalColony(selected)) {
      const neighbors = this.getNeighborColonies(selected).filter(n => !this.isTerminalColony(n));
      const support = neighbors.length > 0
        ? `Sustenta ${neighbors.length} colônia${neighbors.length > 1 ? 's' : ''} vizinha${neighbors.length > 1 ? 's' : ''} com adaptação extra.`
        : 'Posicione colônias ativas ao redor para receber adaptação extra.';
      return `Ecossistema autônomo: +2 biomassa/turno. ${support} Pode ser decomposta para liberar o tile.`;
    }
    const nextEvolution = this.getNextEvolutionFor(selected);
    if (!selected || !nextEvolution) {
      return 'Selecione uma colônia e siga a linha evolutiva principal até o primeiro humano.';
    }

    const requiredBiome = this.getBiomeLabel(nextEvolution.requiredBiome);
    return `Adapte em ${requiredBiome} para avançar de ${this.getColonyName(selected)} para ${nextEvolution.name}.`;
  }

  private buildObjectiveDetail(selected: Colony | null): string {
    if (this.gameWon) {
      return 'A jornada da vida foi concluída no primeiro humano.';
    }

    if (!selected) {
      return `Biomassa: ${this.biomass} — Adaptação total: ${this.getTotalAdaptationPoints()} — População total: ${this.getTotalPopulation()}`;
    }

    if (!this.isColonyEstablished(selected)) {
      return `Expansão em andamento. Essa nova colônia só poderá agir a partir do turno ${selected.gestatingUntilTurn}.`;
    }

    if (selected.consolidatingUntilTurn !== null) {
      return `Consolidação em andamento. Ao concluir no turno ${selected.consolidatingUntilTurn}, ela ganhará +1 população e +2 biomassa.`;
    }

    const nextEvolution = this.getNextEvolutionFor(selected);
    if (!nextEvolution) {
      return 'Essa linhagem já chegou ao limite desta campanha.';
    }

    return `Próxima forma: ${nextEvolution.name} — Bioma exigido: ${this.getBiomeLabel(nextEvolution.requiredBiome)} — População mínima: ${nextEvolution.minPopulation} — Adaptação desta colônia: ${selected.adaptationPoints}`;
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
    if (colony.consolidatingUntilTurn !== null) {
      return ` — consolidando até T${colony.consolidatingUntilTurn}`;
    }
    if (this.isColonyBusy(colony)) {
      return ` — ocupada até T${colony.busyUntilTurn}`;
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
    const dirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
    const neighbors: Colony[] = [];
    for (const { dx, dy } of dirs) {
      const neighbor = this.getColonyAt(colony.x + dx, colony.y + dy);
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

    // Prefer forms not yet on the board, pick the first novel one in list order
    const novel = available.filter((step) => !existingForms.has(step.to));
    const chosen = (novel.length > 0 ? novel : available).at(0);
    if (!chosen) return null;

    const next = EVOLUTION_BY_ID.get(chosen.to);
    if (!next) return null;

    return {
      ...next,
      requiredBiome: chosen.biome,
      minPopulation: chosen.minPopulation,
    };
  }

  private getFloatingMenuAnchor(colony: Colony): { x: number; y: number; side: 'left' | 'right' } {
    const centerX = this.offsetX + colony.x * this.cellSize + this.cellSize / 2;
    const centerY = this.offsetY + colony.y * this.cellSize + this.cellSize / 2;
    const side: 'left' | 'right' = colony.x >= GRID_SIZE / 2 ? 'left' : 'right';
    const horizontalOffset = this.cellSize * 0.72;

    const x = side === 'right' ? centerX + horizontalOffset : centerX - horizontalOffset;
    // Clamp Y so the menu stays within the board area
    const menuHalfHeight = 80;
    const minY = this.offsetY + menuHalfHeight;
    const maxY = this.offsetY + this.boardSize - menuHalfHeight;
    const clampedY = Math.max(minY, Math.min(maxY, centerY));

    return { x, y: clampedY, side };
  }

  private pushLog(message: string): void {
    this.logLines.unshift(message);
    if (this.logLines.length > 5) this.logLines.pop();
  }
}
