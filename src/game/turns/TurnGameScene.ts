import type { TurnHUD } from './TurnHUD';
import { random } from '../random';
import {
  EVOLUTION_BY_ID,
  HUMAN_EVOLUTION_ID,
  STAGES,
  type Biome,
  type EvolutionDefinition,
} from './evolutionData';

type ActionMode = 'idle' | 'expand' | 'seed';
type TurnPhase = 'player' | 'natural-selection';

interface NaturalSelectionEvent {
  colonyId: number;
  kind: 'exposure' | 'stagnation' | 'attrition';
  detail: string;
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
  busyUntilTurn: number;
  consolidatingUntilTurn: number | null;
  gestatingUntilTurn: number | null;
  createdTurn: number;
  parentColonyId: number | null;
}

const GRID_SIZE = 8;
const SEED_COST = 4;
const HUMAN_PATH_PRIORITY_CHANCE = 0.8;
const MIN_PARALLEL_HUMAN_PATHS_FOR_BRANCHING = 2;
const NATURAL_SELECTION_EVENT_DELAY_FRAMES = 60;

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
  private phase: TurnPhase = 'player';
  private actionPoints = 0;
  private biomass = 6;
  private stageIndex = 0;
  private gameWon = false;
  private gameOver = false;
  private naturalSelectionQueue: NaturalSelectionEvent[] = [];
  private naturalSelectionDelay = 0;
  private naturalSelectionResolvedCount = 0;
  private naturalSelectionBanner = '';
  private naturalSelectionDetail = '';
  private naturalSelectionSummaryLines: string[] = [];
  private naturalSelectionSummaryVisible = false;
  private readonly floatingDeltas: FloatingDelta[] = [];
  private readonly extinctionBursts: ExtinctionBurst[] = [];
  private gameOverTitle = '';
  private gameOverDetail = '';
  private cellSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private boardSize = 0;
  private isDesktop = false;

  constructor(hud: TurnHUD) {
    this.hud = hud;
    this.seedOpeningColonies();
    this.startTurn();
    this.selectedColonyId = 2;
    this.pushLog('Bactérias primitivas surgiram no oceano. Selecione uma colônia e use suas 3 ações.');
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
    this.phase = 'player';
    this.actionPoints = 0;
    this.biomass = 6;
    this.stageIndex = 0;
    this.gameWon = false;
    this.gameOver = false;
    this.naturalSelectionQueue = [];
    this.naturalSelectionDelay = 0;
    this.naturalSelectionResolvedCount = 0;
    this.naturalSelectionBanner = '';
    this.naturalSelectionDetail = '';
    this.naturalSelectionSummaryLines = [];
    this.naturalSelectionSummaryVisible = false;
    this.floatingDeltas.length = 0;
    this.extinctionBursts.length = 0;
    this.gameOverTitle = '';
    this.gameOverDetail = '';
    this.seedOpeningColonies();
    this.startTurn();
    this.selectedColonyId = 2;
    this.pushLog('BactÃ©rias primitivas surgiram no oceano. Selecione uma colÃ´nia e use suas 3 aÃ§Ãµes.');
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
        case 'c':
          if (this.selectedColonyId !== null && this.mode === 'idle') this.performConsolidate();
          break;
        case 'a':
          if (this.selectedColonyId !== null && this.mode === 'idle') this.performAdapt();
          break;
        case 'e':
          if (this.selectedColonyId !== null && this.mode === 'idle') this.startExpandMode();
          break;
        case 'enter':
          if (this.mode === 'idle') this.endTurn();
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

    const overlay = document.getElementById('hud-overlay');
    if (overlay) {
      overlay.classList.toggle('layout-side',    isDesktop);
      overlay.classList.toggle('layout-stacked', !isDesktop);
    }
  }

  update(): void {
    if (this.phase === 'natural-selection') {
      this.updateNaturalSelection();
    }
    this.updateFloatingDeltas();
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
    if (this.phase !== 'player' || this.gameOver) return;

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

  performConsolidate(): void {
    if (this.phase !== 'player' || this.gameOver) return;
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
    if (this.phase !== 'player' || this.gameOver) return;
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

    if (nextEvolution.id === HUMAN_EVOLUTION_ID) {
      this.gameWon = true;
      this.actionPoints = 0;
      this.selectedColonyId = colony.id;
      this.pushLog('Vitória: esta linhagem ancestral chegou ao Homo sapiens.');
    }

    this.mode = 'idle';
    if (!this.gameWon) {
      this.selectNextAvailableColony(colony.id);
    }
    this.updateHUD();
  }

  performDecompose(): void {
    if (this.phase !== 'player' || this.gameOver) return;
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
    if (this.phase !== 'player' || this.gameOver) return;
    const colony = this.getSelectedColony();
    if (!colony || !this.canColonyAct(colony) || this.biomass <= 0) return;
    this.mode = 'expand';
    this.pushLog('Modo expandir ativo. Clique em um tile vizinho válido.');
    this.updateHUD();
  }

  startSeedMode(): void {
    if (this.phase !== 'player' || this.gameOver) return;
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
    if (this.phase !== 'player' || this.gameOver) return;
    if (this.mode === 'idle') return;
    const label = this.mode === 'seed' ? 'Semeadura cancelada.' : 'Modo expandir cancelado.';
    this.mode = 'idle';
    this.pushLog(label);
    this.updateHUD();
  }

  endTurn(): void {
    if (this.gameWon || this.gameOver || this.phase !== 'player') return;
    const previousSelectedColonyId = this.selectedColonyId;
    this.mode = 'idle';
    this.resolveProduction();
    this.checkProgression();
    if (this.gameWon) {
      this.updateHUD();
      return;
    }
    this.beginNaturalSelection(previousSelectedColonyId);
    this.pushLog(`Turno ${this.turn} começou.`);
    this.updateHUD();
  }

  private seedOpeningColonies(): void {
    this.addColony(1, 1, { createdTurn: 0 });
    this.addColony(2, 2, { createdTurn: 0 });
    this.addColony(1, 3, { createdTurn: 0 });
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
      busyUntilTurn: options?.busyUntilTurn ?? 0,
      consolidatingUntilTurn: options?.consolidatingUntilTurn ?? null,
      gestatingUntilTurn: options?.gestatingUntilTurn ?? null,
      createdTurn: options?.createdTurn ?? this.turn,
      parentColonyId: options?.parentColonyId ?? null,
    };
    this.syncColonyTraversal(colony);
    this.colonies.set(colony.id, colony);
    return colony;
  }

  private startTurn(fromColonyId: number | null = null): void {
    this.phase = 'player';
    this.naturalSelectionQueue = [];
    this.naturalSelectionDelay = 0;
    this.naturalSelectionResolvedCount = 0;
    this.naturalSelectionBanner = '';
    this.naturalSelectionDetail = '';
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
        colony.parentColonyId = null;
        this.pushLog(`A nova colônia em ${this.formatCellLabel(colony.x, colony.y)} terminou a expansão e agora está estável.`);
      }

      if (colony.consolidatingUntilTurn !== null && this.turn >= colony.consolidatingUntilTurn) {
        colony.consolidatingUntilTurn = null;
        colony.population += 1;
        colony.biomass += 1;
        colony.fortified = true;
        this.biomass += 2;
        this.pushLog(`A consolidação em ${this.formatCellLabel(colony.x, colony.y)} foi concluída: +1 população, +1 biomassa local e +2 biomassa.`);
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

      const badgeY = centerY + this.cellSize * 0.28;
      const badgeWidth = this.cellSize * 0.34;
      const badgeHeight = this.cellSize * 0.2;
      const badgeRadius = badgeHeight / 2;
      ctx.fillStyle = 'rgba(255, 248, 238, 0.94)';
      ctx.strokeStyle = 'rgba(111, 76, 36, 0.28)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(centerX - badgeWidth / 2, badgeY - badgeHeight / 2, badgeWidth, badgeHeight, badgeRadius);
      ctx.fill();
      ctx.stroke();

      ctx.font = `600 ${Math.floor(this.cellSize * 0.18)}px system-ui, sans-serif`;
      ctx.fillStyle = '#5f452b';
      ctx.fillText(String(colony.biomass), centerX, badgeY + 0.5);

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

    this.drawFloatingDeltas(ctx);
  }

  dismissNaturalSelectionSummary(): void {
    this.naturalSelectionSummaryVisible = false;
    this.updateHUD();
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
      framesLeft: 54,
    });
  }

  private drawFloatingDeltas(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    if (this.floatingDeltas.length > 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.floor(this.cellSize * 0.24)}px system-ui, sans-serif`;

      for (const delta of this.floatingDeltas) {
        const colony = this.colonies.get(delta.colonyId);
        if (!colony) continue;

        const centerX = this.offsetX + colony.x * this.cellSize + this.cellSize / 2;
        const progress = 1 - delta.framesLeft / 54;
        const centerY = this.offsetY + colony.y * this.cellSize + this.cellSize * (0.1 - progress * 0.55);
        ctx.globalAlpha = Math.max(0, Math.min(1, delta.framesLeft / 40));
        ctx.fillStyle = delta.color;
        ctx.fillText(delta.text, centerX, centerY);
      }
    }

    for (const burst of this.extinctionBursts) {
      const centerX = this.offsetX + burst.x * this.cellSize + this.cellSize / 2;
      const centerY = this.offsetY + burst.y * this.cellSize + this.cellSize / 2;
      const progress = 1 - burst.framesLeft / 42;
      const radius = this.cellSize * (0.22 + progress * 0.35);
      ctx.globalAlpha = Math.max(0, 0.9 - progress);
      ctx.strokeStyle = 'rgba(138, 58, 45, 0.95)';
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
    this.gameOver = true;
    this.mode = 'idle';
    this.actionPoints = 0;
    this.turnStartColonyIds.clear();
    this.actedColonyIds.clear();
    this.naturalSelectionQueue = [];
    this.gameOverTitle = 'Fim da vida na Terra';
    this.gameOverDetail = 'Sem linhagens remanescentes, a biosfera colapsou. Na história real da Terra, extinções em massa eliminaram a maior parte das espécies, mas a vida persistiu porque alguns ramos sobreviveram. Nesta partida, nenhuma colônia resistiu para reconstruir o ecossistema.';
    this.naturalSelectionDetail = 'Nenhuma colonia sobreviveu. A historia evolutiva foi interrompida.';
    this.pushLog('Game over: a ultima linhagem desapareceu e a vida na Terra entrou em colapso.');
  }

  private extinctColony(colony: Colony, detail: string, summaryReason: string): void {
    const name = this.getColonyName(colony);
    const cell = this.formatCellLabel(colony.x, colony.y);
    this.triggerExtinctionAnimation(colony);
    this.colonies.delete(colony.id);
    if (this.selectedColonyId === colony.id) this.selectedColonyId = null;
    this.pushLog(`Selecao Natural: ${detail} A colonia foi extinta em ${cell}.`);
    this.naturalSelectionSummaryLines.push(`${name} em ${cell}: extinta (${summaryReason}).`);
    this.naturalSelectionDetail = `${name} colapsou e desapareceu em ${cell}.`;

    const dependents = [...this.colonies.values()].filter(
      (candidate) =>
        candidate.parentColonyId === colony.id
        && candidate.gestatingUntilTurn !== null
        && !this.isColonyEstablished(candidate),
    );

    for (const dependent of dependents) {
      this.extinctColony(
        dependent,
        `A expansao em ${this.formatCellLabel(dependent.x, dependent.y)} dependia de ${name}, que foi perdida.`,
        'expansao abortada',
      );
    }

    this.naturalSelectionQueue = this.naturalSelectionQueue.filter((event) => event.colonyId !== colony.id);
    if (this.colonies.size === 0) {
      this.triggerGameOver();
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

  private beginNaturalSelection(previousSelectedColonyId: number | null): void {
    this.phase = 'natural-selection';
    this.mode = 'idle';
    this.selectedColonyId = previousSelectedColonyId;
    this.naturalSelectionSummaryLines = [];
    this.naturalSelectionSummaryVisible = false;
    this.naturalSelectionQueue = this.buildNaturalSelectionQueue();
    this.naturalSelectionDelay = NATURAL_SELECTION_EVENT_DELAY_FRAMES + 24;
    this.naturalSelectionResolvedCount = 0;
    this.naturalSelectionBanner = 'Selecao Natural';

    if (this.naturalSelectionQueue.length === 0) {
      this.naturalSelectionDetail = 'Nenhum erro grave foi punido neste ciclo.';
      this.pushLog('Selecao Natural: nenhuma colonia sofreu pressao evolutiva neste ciclo.');
      return;
    }

    this.naturalSelectionDetail = `${this.naturalSelectionQueue.length} erro(s) de posicionamento ou planejamento serao punidos automaticamente.`;
    this.pushLog('Selecao Natural: o ambiente vai cobrar os erros deste turno.');
  }

  private buildNaturalSelectionQueue(): NaturalSelectionEvent[] {
    const events: NaturalSelectionEvent[] = [];

    for (const colony of this.colonies.values()) {
      if (!this.isColonyEstablished(colony)) continue;

      if (colony.createdTurn < this.turn) {
        events.push({
          colonyId: colony.id,
          kind: 'attrition',
          detail: `${this.getColonyName(colony)} em ${this.formatCellLabel(colony.x, colony.y)} perdeu 1 biomassa para sustentar a linhagem neste ciclo.`,
        });
      }

      if (this.isTerminalColony(colony)) continue;

      const biome = this.terrain[colony.y][colony.x];
      const neighborCount = this.getNeighborColonies(colony).length;
      if (biome !== 'ocean' && neighborCount === 0 && !colony.fortified) {
        events.push({
          colonyId: colony.id,
          kind: 'exposure',
          detail: `${this.getColonyName(colony)} em ${this.formatCellLabel(colony.x, colony.y)} ficou isolada em ${this.getBiomeLabel(biome)} sem suporte.`,
        });
        continue;
      }

      const current = EVOLUTION_BY_ID.get(colony.lifeFormId);
      if (!current || current.next.length === 0) continue;

      const sameBiomeSteps = current.next.filter((step) => step.biome === biome);
      if (sameBiomeSteps.length > 0) continue;

      const targetBiomes = [...new Set(current.next.map((step) => this.getBiomeLabel(step.biome)))];
      events.push({
        colonyId: colony.id,
        kind: 'stagnation',
        detail: `${this.getColonyName(colony)} em ${this.formatCellLabel(colony.x, colony.y)} estÃ¡ no bioma errado para continuar evoluindo. Precisa migrar para ${targetBiomes.join(' ou ')}.`,
      });
    }

    return events;
  }

  private updateNaturalSelection(): void {
    if (this.naturalSelectionDelay > 0) {
      this.naturalSelectionDelay -= 1;
      return;
    }

    if (this.naturalSelectionQueue.length === 0) {
      this.finishNaturalSelection();
      return;
    }

    const event = this.naturalSelectionQueue.shift();
    if (!event) {
      this.finishNaturalSelection();
      return;
    }

    this.applyNaturalSelectionEvent(event);
    this.naturalSelectionDelay = NATURAL_SELECTION_EVENT_DELAY_FRAMES + 12;
  }

  private applyNaturalSelectionEvent(event: NaturalSelectionEvent): void {
    const colony = this.colonies.get(event.colonyId);
    if (!colony || !this.isColonyEstablished(colony)) return;

    if (event.kind === 'attrition') {
      colony.biomass = Math.max(0, colony.biomass - 1);
      this.naturalSelectionResolvedCount += 1;
      this.spawnFloatingDelta(colony.id, '-1', '#f7df8b');
      if (colony.biomass <= 0) {
        this.extinctColony(colony, `${event.detail} Ficou sem biomassa local.`, 'biomassa local zerada');
        return;
      }

      this.naturalSelectionSummaryLines.push(`${this.getColonyName(colony)} em ${this.formatCellLabel(colony.x, colony.y)}: -1 biomassa local.`);
      this.pushLog(`Selecao Natural: ${event.detail}`);
      this.naturalSelectionDetail = event.detail;
      return;
    }

    if (event.kind === 'exposure') {
      colony.population -= 1;
      this.naturalSelectionResolvedCount += 1;
      this.naturalSelectionSummaryLines.push(`${this.getColonyName(colony)} em ${this.formatCellLabel(colony.x, colony.y)}: -1 populacao por exposicao.`);

      if (colony.population <= 0) {
        this.extinctColony(colony, `${event.detail} A colonia colapsou.`, 'exposicao');
        return;
      }

      this.pushLog(`Selecao Natural: ${event.detail} Perdeu 1 populacao.`);
      this.naturalSelectionDetail = event.detail;
      return;
    }

    if (colony.adaptationPoints > 0) {
      colony.adaptationPoints -= 1;
      this.naturalSelectionResolvedCount += 1;
      this.naturalSelectionSummaryLines.push(`${this.getColonyName(colony)} em ${this.formatCellLabel(colony.x, colony.y)}: -1 adaptacao por estagnacao.`);
      this.pushLog(`Selecao Natural: ${event.detail} Perdeu 1 adaptacao por estagnacao.`);
      this.naturalSelectionDetail = event.detail;
      return;
    }

    colony.population -= 1;
    this.naturalSelectionResolvedCount += 1;
    this.naturalSelectionSummaryLines.push(`${this.getColonyName(colony)} em ${this.formatCellLabel(colony.x, colony.y)}: -1 populacao por falta de adaptacao.`);

    if (colony.population <= 0) {
      this.extinctColony(colony, `${event.detail} Sem adaptacao restante, a colonia foi extinta.`, 'falta de adaptacao');
      return;
    }

    this.pushLog(`Selecao Natural: ${event.detail} Sem adaptacao restante, perdeu 1 populacao.`);
    this.naturalSelectionDetail = event.detail;
  }

  private finishNaturalSelection(): void {
    if (this.gameOver) {
      this.phase = 'player';
      this.naturalSelectionSummaryVisible = true;
      return;
    }

    const previousSelectedColonyId = this.selectedColonyId;
    const resolved = this.naturalSelectionResolvedCount;
    this.turn += 1;
    this.startTurn(previousSelectedColonyId);
    this.naturalSelectionSummaryVisible = this.naturalSelectionSummaryLines.length > 0;
    if (resolved > 0) {
      this.pushLog(`Selecao Natural encerrou: ${resolved} erro(s) foram punidos automaticamente.`);
    }
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

    this.biomass -= 1;
    colony.biomass -= 1;
    this.addColony(x, y, {
      population: 1,
      biomass: 1,
      lifeFormId: colony.lifeFormId,
      coastAdapted: colony.coastAdapted,
      landAdapted: colony.landAdapted,
      busyUntilTurn: this.turn + 3,
      gestatingUntilTurn: this.turn + 3,
      createdTurn: this.turn,
      parentColonyId: colony.id,
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
    if (!colony || this.biomass <= 0 || colony.biomass <= 0 || !this.canColonyAct(colony)) return false;

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
    const objective = this.phase === 'natural-selection'
      ? 'Seleção Natural'
      : nextEvolution ? `Evolua para ${nextEvolution.name}` : 'Vitória';
    const objectiveDetail = this.buildObjectiveDetail(selected);
    const isPlayerPhase = this.phase === 'player' && !this.gameOver;
    const canConsolidate = isPlayerPhase && !this.gameWon && selected !== null && this.canColonyAct(selected);
    const canAdapt = isPlayerPhase && !this.gameWon && selected !== null && this.canColonyAct(selected) && selected.adaptationPoints > 0 && this.canSelectedAdapt();
    const adaptBlockedReason = canAdapt ? '' : this.getAdaptBlockedReason(selected);
    const canExpand = isPlayerPhase && !this.gameWon && this.hasExpandTarget(selected);
    const canDecompose = isPlayerPhase && !this.gameWon && selected !== null && this.isColonyEstablished(selected) && this.isTerminalColony(selected);
    const floatingAnchor = selected ? this.getFloatingMenuAnchor(selected) : null;
    const phaseLabel = this.phase === 'natural-selection' ? 'Selecao Natural' : 'Planejamento';

    this.hud.update({
      turn: this.turn,
      phaseLabel,
      actionPoints: this.actionPoints,
      biomass: this.biomass,
      adaptation: selected?.adaptationPoints ?? this.getTotalAdaptationPoints(),
      stageLabel: `${leadEvolution.emoji} ${'name' in leadEvolution ? leadEvolution.name : leadEvolution.label.replace(/^.\s*/, '')}`,
      objective,
      objectiveDetail,
      selectedSummary,
      hint,
      modeLabel: this.phase === 'natural-selection'
        ? 'Modo: seleção natural automática'
        : this.mode === 'expand' ? 'Modo: expandir' : this.mode === 'seed' ? 'Modo: semear' : 'Modo: seleção',
      progress: (this.stageIndex / (STAGES.length - 1)) * 100,
      logLines: this.logLines,
      canConsolidate,
      canAdapt,
      adaptBlockedReason,
      canExpand,
      canDecompose,
      canSeed: isPlayerPhase && !this.gameWon && this.biomass >= SEED_COST && this.mode === 'idle',
      canEndTurn: isPlayerPhase && !this.gameWon,
      endTurnLabel: this.gameWon ? 'Vitória alcançada' : 'Encerrar turno',
      showCancel: isPlayerPhase && (this.mode === 'expand' || this.mode === 'seed'),
      floatingMenuVisible: isPlayerPhase && !this.gameWon && selected !== null && this.mode === 'idle',
      floatingMenuX: floatingAnchor?.x ?? 0,
      floatingMenuY: floatingAnchor?.y ?? 0,
      floatingMenuSide: floatingAnchor?.side ?? 'right',
      floatingCancelVisible: isPlayerPhase && !this.gameWon && (this.mode === 'expand' || this.mode === 'seed'),
      selectedColonyName: selected ? this.getColonyName(selected) : '',
      selectedColonyDef: selected ? (EVOLUTION_BY_ID.get(selected.lifeFormId) ?? null) : null,
      phaseBannerTitle: this.naturalSelectionBanner,
      phaseBannerDetail: this.naturalSelectionDetail,
      naturalSelectionSummaryVisible: this.naturalSelectionSummaryVisible,
      naturalSelectionSummaryLines: this.naturalSelectionSummaryLines,
      gameOverVisible: this.gameOver,
      gameOverTitle: this.gameOverTitle,
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

    return 'Não é possível adaptar agora.';
  }

  private buildHint(): string {
    if (this.phase === 'natural-selection') {
      return 'A Selecao Natural resolve automaticamente colonias isoladas e linhagens paradas no bioma errado.';
    }
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
      return 'Selecione uma colônia e siga a linha evolutiva principal até o Homo sapiens.';
    }

    const requiredBiome = this.getBiomeLabel(nextEvolution.requiredBiome);
    return `Adapte em ${requiredBiome} para avançar de ${this.getColonyName(selected)} para ${nextEvolution.name}.`;
  }

  private buildObjectiveDetail(selected: Colony | null): string {
    if (this.phase === 'natural-selection') {
      return this.naturalSelectionDetail || 'O ambiente esta aplicando as consequencias das suas escolhas.';
    }
    if (this.gameWon) {
      return 'A jornada desta linhagem foi concluída no Homo sapiens.';
    }

    if (!selected) {
      return `Biomassa: ${this.biomass} — Adaptação total: ${this.getTotalAdaptationPoints()} — População total: ${this.getTotalPopulation()}`;
    }

    if (!this.isColonyEstablished(selected)) {
      return `Expansão em andamento. Essa nova colônia só poderá agir a partir do turno ${selected.gestatingUntilTurn}.`;
    }

    if (selected.consolidatingUntilTurn !== null) {
      return `Consolidação em andamento. Ao concluir no turno ${selected.consolidatingUntilTurn}, ela ganhará +1 população, +1 biomassa local e +2 biomassa.`;
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
    let chosen =
      canBranchAwayFromHumanPath && humanPathAvailable.length > 0 && alternateAvailable.length > 0
        ? (random() < HUMAN_PATH_PRIORITY_CHANCE
            ? choosePreferredEvolutionStep(humanPathAvailable, existingForms)
            : choosePreferredEvolutionStep(alternateAvailable, existingForms))
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

  getDebugState(): Record<string, unknown> {
    return {
      turn: this.turn,
      phase: this.phase,
      gameOver: this.gameOver,
      actionPoints: this.actionPoints,
      biomass: this.biomass,
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
