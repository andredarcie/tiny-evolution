
export interface TurnHUDState {
  turn: number;
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
}

export type HUDActionHandlers = {
  onConsolidate: () => void;
  onAdapt: () => void;
  onExpand: () => void;
  onDecompose: () => void;
  onSeed: () => void;
  onEndTurn: () => void;
  onCancel: () => void;
};

const EVOLUTION_TREE_HTML = `
<ul class="evo-tree">
  <li>
    <div class="evo-node biome-ocean">🦠 Bactéria Primitiva</div>
    <ul>
      <li>
        <div class="evo-node biome-ocean">🧫 Archaea</div>
        <ul>
          <li><div class="evo-node biome-ocean">🫧 Protozoário</div>
            <ul>
              <li><div class="evo-node biome-ocean">🦠 Ameba</div></li>
              <li><div class="evo-node biome-ocean">🧽 Esponja</div>
                <ul>
                  <li><div class="evo-node biome-ocean">🪼 Medusa</div></li>
                  <li><div class="evo-node biome-coast">🌺 Anêmona</div></li>
                  <li><div class="evo-node biome-coast">🪸 Coral</div></li>
                  <li><div class="evo-node biome-ocean">🪱 Verme Plano</div>
                    <ul>
                      <li><div class="evo-node biome-ocean">🦐 Trilobita</div></li>
                      <li><div class="evo-node biome-coast">🐚 Molusco</div>
                        <ul>
                          <li><div class="evo-node biome-ocean">🐙 Cefalópode</div></li>
                        </ul>
                      </li>
                      <li><div class="evo-node biome-coast">🦀 Crustáceo</div></li>
                      <li><div class="evo-node biome-ocean">🪱 Anelídeo</div>
                        <ul>
                          <li><div class="evo-node biome-coast">🦀 Crustáceo</div></li>
                          <li><div class="evo-node biome-land">🐛 Inseto</div></li>
                        </ul>
                      </li>
                      <li><div class="evo-node biome-ocean">🪱 Nematódeo</div>
                        <ul>
                          <li><div class="evo-node biome-land">🐛 Inseto</div></li>
                          <li><div class="evo-node biome-land">🕷️ Aracnídeo</div></li>
                        </ul>
                      </li>
                      <li><div class="evo-node biome-ocean">🐟 Peixe</div>
                        <ul>
                          <li><div class="evo-node biome-ocean">🦈 Tubarão</div></li>
                          <li><div class="evo-node biome-coast">🐸 Anfíbio</div>
                            <ul>
                              <li><div class="evo-node biome-land">🦎 Réptil</div>
                                <ul>
                                  <li><div class="evo-node biome-land">🦕 Dinossauro</div></li>
                                  <li><div class="evo-node biome-land">🐦 Ave</div></li>
                                  <li><div class="evo-node biome-land">🐭 Mamífero</div>
                                    <ul>
                                      <li><div class="evo-node biome-land">🐒 Primata</div>
                                        <ul>
                                          <li><div class="evo-node biome-land">🦧 Hominídeo</div>
                                            <ul>
                                              <li><div class="evo-node biome-land">🧑 Humano</div></li>
                                            </ul>
                                          </li>
                                        </ul>
                                      </li>
                                    </ul>
                                  </li>
                                </ul>
                              </li>
                            </ul>
                          </li>
                        </ul>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
              <li><div class="evo-node biome-coast">🍄 Fungo</div></li>
            </ul>
          </li>
        </ul>
      </li>
      <li>
        <div class="evo-node biome-ocean">🌿 Cianobactéria</div>
        <ul>
          <li><div class="evo-node biome-ocean">🫧 Protozoário <span class="evo-ref">ver acima</span></div></li>
          <li><div class="evo-node biome-coast">🌱 Alga Verde</div>
            <ul>
              <li><div class="evo-node biome-coast">🌾 Musgo</div>
                <ul>
                  <li><div class="evo-node biome-land">🌳 Planta Vascular</div>
                    <ul>
                      <li><div class="evo-node biome-land">🌸 Angiosperma</div></li>
                    </ul>
                  </li>
                </ul>
              </li>
              <li><div class="evo-node biome-land">🌳 Planta Vascular</div>
                <ul>
                  <li><div class="evo-node biome-land">🌸 Angiosperma</div></li>
                </ul>
              </li>
              <li><div class="evo-node biome-land">🌸 Angiosperma</div></li>
            </ul>
          </li>
          <li><div class="evo-node biome-ocean">🪸 Alga Vermelha</div>
            <ul>
              <li><div class="evo-node biome-coast">🪸 Coral</div></li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
`;

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

      <div class="floating-action-menu floating-right hidden" id="floating-action-menu">
        <button id="floating-consolidate">
          <span class="action-icon icon-consolidate" aria-hidden="true"></span>
          <span>Consolidar</span>
        </button>
        <button id="floating-adapt">
          <span class="action-icon icon-adapt" aria-hidden="true"></span>
          <span>Adaptar</span>
        </button>
        <div class="floating-action-reason hidden" id="floating-adapt-reason"></div>
        <button id="floating-expand">
          <span class="action-icon icon-expand" aria-hidden="true"></span>
          <span>Expandir</span>
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
            ${EVOLUTION_TREE_HTML}
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
            <button id="hud-end-turn" class="hud-end-turn">Encerrar turno</button>
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
  }

  update(state: TurnHUDState): void {
    this.turnEl.textContent = String(state.turn);
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
    this.floatingAdaptBtn.disabled = !state.canAdapt;
    this.floatingAdaptReasonEl.textContent = state.adaptBlockedReason;
    this.floatingAdaptReasonEl.classList.toggle('hidden', state.canAdapt || !state.adaptBlockedReason);
    this.floatingExpandBtn.disabled = !state.canExpand;
    this.floatingExpandBtn.style.display = state.canExpand ? 'flex' : 'none';
    this.floatingDecomposeBtn.disabled = !state.canDecompose;
    this.floatingDecomposeBtn.style.display = state.canDecompose ? 'flex' : 'none';
    this.floatingCancelBtn.disabled = !state.showCancel;

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
  }
}
