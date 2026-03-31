import { renderEvolutionTreeHtml, EVOLUTION_BY_ID, type EvolutionDefinition } from './evolutionData';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export interface TurnHUDState {
  turn: number;
  phaseLabel: string;
  actionPoints: number;
  biomass: number;
  adaptation: number;
  stageLabel: string;
  objective: string;
  objectiveDetail: string;
  selectedSummary: string;
  hint: string;
  modeLabel: string;
  progress: number;
  logLines: string[];
  canConsolidate: boolean;
  consolidateActive: boolean;
  canAdapt: boolean;
  adaptBlockedReason: string;
  canExpand: boolean;
  canDecompose: boolean;
  canSeed: boolean;
  canEndTurn: boolean;
  endTurnLabel: string;
  showCancel: boolean;
  floatingMenuVisible: boolean;
  floatingMenuX: number;
  floatingMenuY: number;
  floatingMenuSide: 'left' | 'right';
  floatingCancelVisible: boolean;
  selectedColonyName: string;
  selectedColonyDef: EvolutionDefinition | null;
  phaseBannerTitle: string;
  phaseBannerDetail: string;
  terminalInfoVisible: boolean;
  terminalInfoTitle: string;
  terminalInfoLead: string;
  terminalInfoBenefits: string[];
  terminalInfoBiology: string;
  gameOverVisible: boolean;
  gameOverTitle: string;
  gameOverQuote: string;
  gameOverQuoteAuthor: string;
  gameOverDetail: string;
}

export type HUDActionHandlers = {
  onConsolidate: () => void;
  onAdapt: () => void;
  onExpand: () => void;
  onDecompose: () => void;
  onSeed: () => void;
  onEndTurn: () => void;
  onCancel: () => void;
  onCloseTerminalInfo: () => void;
  onRestart: () => void;
};

export class TurnHUD {
  private root: HTMLElement;
  private turnEl: HTMLElement;
  private actionsEl: HTMLElement;
  private biomassEl: HTMLElement;
  private adaptationEl: HTMLElement;
  private stageEl: HTMLElement;
  private objectiveEl: HTMLElement;
  private objectiveDetailEl: HTMLElement;
  private selectedEl: HTMLElement;
  private hintEl: HTMLElement;
  private modeEl: HTMLElement;
  private progressFillEl: HTMLElement;
  private logEl: HTMLElement;
  private endTurnBtn: HTMLButtonElement;
  private seedBtn: HTMLButtonElement;
  private treeBtn: HTMLButtonElement;
  private floatingMenuEl: HTMLElement;
  private floatingCancelEl: HTMLElement;
  private floatingConsolidateBtn: HTMLButtonElement;
  private floatingAdaptBtn: HTMLButtonElement;
  private floatingAdaptReasonEl: HTMLElement;
  private floatingExpandBtn: HTMLButtonElement;
  private floatingDecomposeBtn: HTMLButtonElement;
  private floatingCancelBtn: HTMLButtonElement;
  private treeModalEl: HTMLElement;
  private treeModalCloseBtn: HTMLButtonElement;
  private colonyInfoModalEl: HTMLElement;
  private colonyInfoBodyEl: HTMLElement;
  private terminalInfoModalEl: HTMLElement;
  private terminalInfoTitleEl: HTMLElement;
  private terminalInfoLeadEl: HTMLElement;
  private terminalInfoBenefitsEl: HTMLElement;
  private terminalInfoBiologyEl: HTMLElement;
  private phaseBannerEl: HTMLElement;
  private phaseBannerTitleEl: HTMLElement;
  private phaseBannerDetailEl: HTMLElement;
  private gameOverModalEl: HTMLElement;
  private gameOverTitleEl: HTMLElement;
  private gameOverQuoteEl: HTMLElement;
  private gameOverDetailEl: HTMLElement;
  private currentColonyDef: EvolutionDefinition | null = null;

  constructor(container: HTMLElement, handlers: HUDActionHandlers) {
    this.root = document.createElement('div');
    this.root.id = 'hud-overlay';
    this.root.innerHTML = `
      <div class="hud-topbar">
        <div class="hud-title-group">
          <span class="hud-kicker">vida na terra</span>
          <span class="hud-title">Minimal Civilization</span>
        </div>
        <div class="hud-stage-group">
          <span class="hud-stage-label">Forma atual</span>
          <span class="hud-stage-value" id="hud-stage"></span>
        </div>
      </div>

      <div class="hud-progress">
        <div class="hud-progress-fill" id="hud-progress-fill"></div>
      </div>

      <div class="hud-phase-banner hidden" id="hud-phase-banner">
        <div class="hud-phase-banner-title" id="hud-phase-banner-title"></div>
        <div class="hud-phase-banner-detail" id="hud-phase-banner-detail"></div>
      </div>

      <div class="floating-action-menu floating-right hidden" id="floating-action-menu">
        <div class="floating-menu-title" id="floating-menu-title">
          <span id="floating-menu-title-text"></span>
          <button class="floating-info-btn" id="floating-info-btn" aria-label="Curiosidades científicas">ⓘ</button>
        </div>
        <button id="floating-consolidate">
          <span class="action-icon icon-consolidate" aria-hidden="true"></span>
          <span>Consolidar</span>
          <kbd class="action-kbd">C</kbd>
        </button>
        <button id="floating-adapt">
          <span class="action-icon icon-adapt" aria-hidden="true"></span>
          <span>Adaptar</span>
          <kbd class="action-kbd">A</kbd>
        </button>
        <div class="floating-action-reason hidden" id="floating-adapt-reason"></div>
        <button id="floating-expand">
          <span class="action-icon icon-expand" aria-hidden="true"></span>
          <span>Expandir</span>
          <kbd class="action-kbd">E</kbd>
        </button>
        <button id="floating-decompose">
          <span class="action-icon icon-decompose" aria-hidden="true"></span>
          <span>Decompor</span>
        </button>
      </div>

      <div class="floating-action-menu floating-cancel-menu floating-right hidden" id="floating-cancel-menu">
        <button id="floating-cancel">
          <span class="action-icon icon-cancel" aria-hidden="true"></span>
          <span>Cancelar</span>
        </button>
      </div>

      <div class="tree-modal hidden" id="tree-modal">
        <div class="tree-modal-backdrop" id="tree-modal-backdrop"></div>
        <div class="tree-modal-card" role="dialog" aria-modal="true" aria-labelledby="tree-modal-title">
          <div class="tree-modal-header">
            <div>
              <div class="tree-modal-kicker">referência completa</div>
              <h2 id="tree-modal-title">Árvore evolutiva completa</h2>
            </div>
            <button id="tree-modal-close" class="tree-modal-close" aria-label="Fechar árvore evolutiva">Fechar</button>
          </div>
          <div class="tree-modal-content">
            ${renderEvolutionTreeHtml()}
          </div>
        </div>
      </div>

      <div class="colony-info-modal hidden" id="colony-info-modal">
        <div class="colony-info-backdrop" id="colony-info-backdrop"></div>
        <div class="colony-info-card" role="dialog" aria-modal="true">
          <div class="colony-info-header" id="colony-info-header">
            <div>
              <div class="colony-info-kicker" id="colony-info-era"></div>
              <h2 class="colony-info-title" id="colony-info-name"></h2>
            </div>
            <button class="colony-info-close" id="colony-info-close" aria-label="Fechar">✕</button>
          </div>
          <div class="colony-info-body" id="colony-info-body"></div>
        </div>
      </div>

      <div class="colony-info-modal hidden" id="terminal-info-modal">
        <div class="colony-info-backdrop" id="terminal-info-backdrop"></div>
        <div class="colony-info-card terminal-info-card" role="dialog" aria-modal="true">
          <div class="colony-info-header terminal-info-header">
            <div>
              <div class="colony-info-kicker">ramo terminal</div>
              <h2 class="colony-info-title" id="terminal-info-title"></h2>
            </div>
            <button class="colony-info-close" id="terminal-info-close" aria-label="Fechar">✕</button>
          </div>
          <div class="colony-info-body terminal-info-body">
            <div class="terminal-info-hero">
              <p class="colony-info-description terminal-info-lead" id="terminal-info-lead"></p>
            </div>
            <div class="colony-info-facts terminal-info-grid">
              <div class="colony-info-fact terminal-info-fact terminal-info-fact-benefits">
                <span class="colony-info-fact-label">O que muda agora</span>
                <div class="colony-info-fact-value" id="terminal-info-benefits"></div>
              </div>
              <div class="colony-info-fact terminal-info-fact terminal-info-fact-biology">
                <span class="colony-info-fact-label">Por que isso existe na biologia</span>
                <div class="colony-info-fact-value" id="terminal-info-biology"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="colony-info-modal hidden" id="game-over-modal">
        <div class="colony-info-backdrop"></div>
        <div class="colony-info-card" role="dialog" aria-modal="true">
          <div class="colony-info-header">
            <div>
              <div class="colony-info-kicker">game over</div>
              <h2 class="colony-info-title" id="game-over-title"></h2>
            </div>
          </div>
          <div class="colony-info-body">
            <blockquote class="game-over-quote" id="game-over-quote"></blockquote>
            <p class="colony-info-description" id="game-over-detail"></p>
            <button class="hud-end-turn game-over-restart" id="game-over-restart">Reiniciar jogo</button>
          </div>
        </div>
      </div>

      <div class="hud-panel">
        <div class="hud-stats">
          <div class="hud-stat">
            <span class="hud-stat-label">Turno</span>
            <span class="hud-stat-value" id="hud-turn"></span>
          </div>
          <div class="hud-stat">
            <span class="hud-stat-label">Ações</span>
            <span class="hud-stat-value" id="hud-actions"></span>
          </div>
          <div class="hud-stat">
            <span class="hud-stat-label">Biomassa</span>
            <span class="hud-stat-value" id="hud-biomass"></span>
          </div>
          <div class="hud-stat">
            <span class="hud-stat-label">Adaptação</span>
            <span class="hud-stat-value" id="hud-adaptation"></span>
          </div>
        </div>

        <div class="hud-section hud-section-objective">
          <span class="hud-section-label">Objetivo</span>
          <div class="hud-objective" id="hud-objective"></div>
          <div class="hud-objective-detail" id="hud-objective-detail"></div>
        </div>

        <div class="hud-section hud-section-selection">
          <span class="hud-section-label">Seleção</span>
          <div class="hud-selection" id="hud-selection"></div>
          <div class="hud-mode" id="hud-mode"></div>
        </div>

        <div class="hud-section hud-section-turn">
          <span class="hud-section-label">Turno</span>
          <div class="hud-actions-grid">
            <button id="hud-tree" class="hud-tree">Árvore evolutiva completa</button>
            <button id="hud-seed" class="hud-seed">Semear vida</button>
            <button id="hud-end-turn" class="hud-end-turn">Encerrar turno<kbd class="action-kbd kbd-enter">↵</kbd></button>
          </div>
        </div>

        <div class="hud-section hud-section-hint">
          <span class="hud-section-label">Dica</span>
          <div class="hud-hint" id="hud-hint"></div>
        </div>

        <div class="hud-section hud-section-log">
          <span class="hud-section-label">Registro</span>
          <div class="hud-log" id="hud-log"></div>
        </div>
      </div>
    `;
    container.appendChild(this.root);

    this.turnEl = this.root.querySelector('#hud-turn')!;
    this.actionsEl = this.root.querySelector('#hud-actions')!;
    this.biomassEl = this.root.querySelector('#hud-biomass')!;
    this.adaptationEl = this.root.querySelector('#hud-adaptation')!;
    this.stageEl = this.root.querySelector('#hud-stage')!;
    this.objectiveEl = this.root.querySelector('#hud-objective')!;
    this.objectiveDetailEl = this.root.querySelector('#hud-objective-detail')!;
    this.selectedEl = this.root.querySelector('#hud-selection')!;
    this.hintEl = this.root.querySelector('#hud-hint')!;
    this.modeEl = this.root.querySelector('#hud-mode')!;
    this.progressFillEl = this.root.querySelector('#hud-progress-fill')!;
    this.phaseBannerEl = this.root.querySelector('#hud-phase-banner')!;
    this.phaseBannerTitleEl = this.root.querySelector('#hud-phase-banner-title')!;
    this.phaseBannerDetailEl = this.root.querySelector('#hud-phase-banner-detail')!;
    this.gameOverModalEl = this.root.querySelector('#game-over-modal')!;
    this.gameOverTitleEl = this.root.querySelector('#game-over-title')!;
    this.gameOverQuoteEl = this.root.querySelector('#game-over-quote')!;
    this.gameOverDetailEl = this.root.querySelector('#game-over-detail')!;
    this.logEl = this.root.querySelector('#hud-log')!;
    this.endTurnBtn = this.root.querySelector('#hud-end-turn')!;
    this.seedBtn = this.root.querySelector('#hud-seed')!;
    this.treeBtn = this.root.querySelector('#hud-tree')!;
    this.floatingMenuEl = this.root.querySelector('#floating-action-menu')!;
    this.floatingCancelEl = this.root.querySelector('#floating-cancel-menu')!;
    this.floatingConsolidateBtn = this.root.querySelector('#floating-consolidate')!;
    this.floatingAdaptBtn = this.root.querySelector('#floating-adapt')!;
    this.floatingAdaptReasonEl = this.root.querySelector('#floating-adapt-reason')!;
    this.floatingExpandBtn = this.root.querySelector('#floating-expand')!;
    this.floatingDecomposeBtn = this.root.querySelector('#floating-decompose')!;
    this.floatingCancelBtn = this.root.querySelector('#floating-cancel')!;
    this.treeModalEl = this.root.querySelector('#tree-modal')!;
    this.treeModalCloseBtn = this.root.querySelector('#tree-modal-close')!;
    this.colonyInfoModalEl = this.root.querySelector('#colony-info-modal')!;
    this.colonyInfoBodyEl = this.root.querySelector('#colony-info-body')!;
    this.terminalInfoModalEl = this.root.querySelector('#terminal-info-modal')!;
    this.terminalInfoTitleEl = this.root.querySelector('#terminal-info-title')!;
    this.terminalInfoLeadEl = this.root.querySelector('#terminal-info-lead')!;
    this.terminalInfoBenefitsEl = this.root.querySelector('#terminal-info-benefits')!;
    this.terminalInfoBiologyEl = this.root.querySelector('#terminal-info-biology')!;
    const floatingInfoBtn = this.root.querySelector('#floating-info-btn')!;
    const colonyInfoClose = this.root.querySelector('#colony-info-close')!;
    const colonyInfoBackdrop = this.root.querySelector('#colony-info-backdrop')!;
    const terminalInfoClose = this.root.querySelector('#terminal-info-close')!;
    const terminalInfoBackdrop = this.root.querySelector('#terminal-info-backdrop')!;
    const gameOverRestart = this.root.querySelector('#game-over-restart')!;

    this.endTurnBtn.addEventListener('click', handlers.onEndTurn);
    this.seedBtn.addEventListener('click', handlers.onSeed);
    this.treeBtn.addEventListener('click', () => this.treeModalEl.classList.remove('hidden'));
    this.floatingCancelBtn.addEventListener('click', handlers.onCancel);
    this.floatingConsolidateBtn.addEventListener('click', handlers.onConsolidate);
    this.floatingAdaptBtn.addEventListener('click', handlers.onAdapt);
    this.floatingExpandBtn.addEventListener('click', handlers.onExpand);
    this.floatingDecomposeBtn.addEventListener('click', handlers.onDecompose);
    this.treeModalCloseBtn.addEventListener('click', () => this.treeModalEl.classList.add('hidden'));
    this.root.querySelector('#tree-modal-backdrop')!.addEventListener('click', () => this.treeModalEl.classList.add('hidden'));
    floatingInfoBtn.addEventListener('click', () => {
      if (this.currentColonyDef) this.openColonyInfo(this.currentColonyDef);
    });
    colonyInfoClose.addEventListener('click', () => this.colonyInfoModalEl.classList.add('hidden'));
    colonyInfoBackdrop.addEventListener('click', () => this.colonyInfoModalEl.classList.add('hidden'));
    terminalInfoClose.addEventListener('click', handlers.onCloseTerminalInfo);
    terminalInfoBackdrop.addEventListener('click', handlers.onCloseTerminalInfo);
    gameOverRestart.addEventListener('click', handlers.onRestart);
  }

  update(state: TurnHUDState): void {
    this.turnEl.textContent = String(state.turn);
    this.phaseBannerTitleEl.textContent = state.phaseBannerTitle;
    this.phaseBannerDetailEl.textContent = state.phaseBannerDetail;
    this.phaseBannerEl.classList.toggle('hidden', !state.phaseBannerTitle);
    this.terminalInfoModalEl.classList.toggle('hidden', !state.terminalInfoVisible);
    this.terminalInfoTitleEl.textContent = state.terminalInfoTitle;
    this.terminalInfoLeadEl.textContent = state.terminalInfoLead;
    this.terminalInfoBenefitsEl.innerHTML = state.terminalInfoBenefits.length > 0
      ? `<ul class="terminal-info-list">${state.terminalInfoBenefits.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : '';
    this.terminalInfoBiologyEl.textContent = state.terminalInfoBiology;
    this.gameOverModalEl.classList.toggle('hidden', !state.gameOverVisible);
    this.gameOverTitleEl.textContent = state.gameOverTitle;
    this.gameOverQuoteEl.innerHTML = state.gameOverQuote
      ? `&ldquo;${escapeHtml(state.gameOverQuote)}&rdquo;<span class="game-over-quote-author">— ${escapeHtml(state.gameOverQuoteAuthor)}</span>`
      : '';
    this.gameOverDetailEl.textContent = state.gameOverDetail;
    this.actionsEl.textContent = String(state.actionPoints);
    this.biomassEl.textContent = String(state.biomass);
    this.adaptationEl.textContent = String(state.adaptation);
    this.stageEl.textContent = state.stageLabel;
    this.objectiveEl.textContent = state.objective;
    this.objectiveDetailEl.textContent = state.objectiveDetail;
    this.selectedEl.textContent = state.selectedSummary;
    this.hintEl.textContent = state.hint;
    this.modeEl.textContent = state.modeLabel;
    this.progressFillEl.style.width = `${Math.max(0, Math.min(100, state.progress))}%`;
    this.logEl.innerHTML = state.logLines.map((line) => `<div class="hud-log-line">${line}</div>`).join('');

    this.endTurnBtn.disabled = !state.canEndTurn;
    this.endTurnBtn.textContent = state.endTurnLabel;
    this.seedBtn.disabled = !state.canSeed;
    this.seedBtn.style.display = state.canSeed ? '' : 'none';
    this.floatingConsolidateBtn.disabled = !state.canConsolidate;
    this.floatingConsolidateBtn.classList.toggle('is-active', state.consolidateActive);
    this.floatingConsolidateBtn.setAttribute('aria-pressed', state.consolidateActive ? 'true' : 'false');
    this.floatingAdaptBtn.disabled = !state.canAdapt;
    this.floatingAdaptReasonEl.textContent = state.adaptBlockedReason;
    this.floatingAdaptReasonEl.classList.toggle('hidden', state.canAdapt || !state.adaptBlockedReason);
    this.floatingExpandBtn.disabled = !state.canExpand;
    this.floatingExpandBtn.style.display = state.canExpand ? 'flex' : 'none';
    this.floatingDecomposeBtn.disabled = !state.canDecompose;
    this.floatingDecomposeBtn.style.display = state.canDecompose ? 'flex' : 'none';
    this.floatingCancelBtn.disabled = !state.showCancel;

    this.currentColonyDef = state.selectedColonyDef;
    const infoBtn = this.root.querySelector('#floating-info-btn') as HTMLButtonElement;
    if (infoBtn) infoBtn.style.display = state.selectedColonyDef?.description ? '' : 'none';
    const titleTextEl = this.root.querySelector('#floating-menu-title-text');
    if (titleTextEl) titleTextEl.textContent = state.selectedColonyName;
    this.floatingMenuEl.classList.toggle('hidden', !state.floatingMenuVisible);
    this.floatingMenuEl.classList.toggle('floating-left', state.floatingMenuSide === 'left');
    this.floatingMenuEl.classList.toggle('floating-right', state.floatingMenuSide === 'right');
    this.floatingMenuEl.style.left = `${state.floatingMenuX}px`;
    this.floatingMenuEl.style.top = `${state.floatingMenuY}px`;

    this.floatingCancelEl.classList.toggle('hidden', !state.floatingCancelVisible);
    this.floatingCancelEl.classList.toggle('floating-left', state.floatingMenuSide === 'left');
    this.floatingCancelEl.classList.toggle('floating-right', state.floatingMenuSide === 'right');
    this.floatingCancelEl.style.left = `${state.floatingMenuX}px`;
    this.floatingCancelEl.style.top = `${state.floatingMenuY}px`;

    this.turnEl.textContent = state.phaseLabel ? `${state.turn} · ${state.phaseLabel}` : String(state.turn);
  }

  private openColonyInfo(def: EvolutionDefinition): void {
    const nameEl = this.root.querySelector('#colony-info-name')!;
    const eraEl = this.root.querySelector('#colony-info-era')!;
    nameEl.textContent = `${def.emoji} ${def.name}`;
    eraEl.textContent = def.era ?? '';

    const allowedBiomes = def.allowedBiomes.map(b =>
      b === 'ocean' ? '🌊 Oceano' : b === 'coast' ? '🏖️ Costa' : '🌳 Terra'
    ).join(' · ');

    const nextForms = def.next.length > 0
      ? def.next.map(n => {
          const node = EVOLUTION_BY_ID.get(n.to);
          return node ? `${node.emoji} ${node.name}` : n.to;
        }).join(', ')
      : 'Nenhuma (forma terminal)';

    this.colonyInfoBodyEl.innerHTML = `
      ${def.description ? `<p class="colony-info-description">${escapeHtml(def.description)}</p>` : ''}
      <div class="colony-info-facts">
        <div class="colony-info-fact">
          <span class="colony-info-fact-label">Biomas</span>
          <span class="colony-info-fact-value">${allowedBiomes}</span>
        </div>
        <div class="colony-info-fact">
          <span class="colony-info-fact-label">Evolui para</span>
          <span class="colony-info-fact-value">${nextForms}</span>
        </div>
      </div>
    `;
    this.colonyInfoModalEl.classList.remove('hidden');
  }
}
