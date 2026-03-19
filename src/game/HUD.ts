import type { EvolutionStats, MergeRecord } from './systems/EvolutionSystem';
import { ENVIRONMENT_PROFILES, type EnvironmentProfile } from './systems/EnvironmentSystem';
import { ENTITY_DEFS, DEFS_BY_LEVEL, MAX_LEVEL } from './entities/EntityTypes';
import type { EntityDef } from './entities/EntityTypes';
import { canProduceLineage } from './entities/EntityTypes';

const GUIDE_ENTITY_DEFS = ENTITY_DEFS.filter(def => def.level >= 2 && def.level < MAX_LEVEL);

// Geological time (years ago) mapped to each evolutionary level
const ERA_YEARS_AGO: number[] = [
  4_600_000_000, //  0 – Sopa Primordial
  3_800_000_000, //  1 – Mundo do RNA
  3_500_000_000, //  2 – Primeiros Procariotos
  2_700_000_000, //  3 – Grande Oxidação
  2_000_000_000, //  4 – Primeiros Eucariotos
  1_200_000_000, //  5 – Era das Algas
    700_000_000, //  6 – Primeira Vida Multicelular
    600_000_000, //  7 – Bilatérios
    541_000_000, //  8 – Explosão Cambriana
    475_000_000, //  9 – Era dos Invertebrados
    420_000_000, // 10 – Era dos Peixes
    375_000_000, // 11 – Conquista da Terra
    250_000_000, // 12 – Era dos Répteis
     66_000_000, // 13 – Era dos Mamíferos
     55_000_000, // 14 – Evolução dos Primatas
        300_000, // 15 – Era da Humanidade
              0, // 16 – Era Moderna
];

// Era names shown in the bar tooltip area
const ERA_NAMES: string[] = [
  'Sopa Primordial',
  'Mundo do RNA',
  'Primeiros Procariotos',
  'Grande Oxidação',
  'Primeiros Eucariotos',
  'Era das Algas',
  'Primeira Vida Multicelular',
  'Bilatérios',
  'Explosão Cambriana',
  'Era dos Invertebrados',
  'Era dos Peixes',
  'Conquista da Terra',
  'Era dos Répteis',
  'Era dos Mamíferos',
  'Evolução dos Primatas',
  'Era da Humanidade',
  'Era Moderna',
];

// One representative emoji per level
const ERA_EMOJIS: string[] = Array.from(
  { length: MAX_LEVEL + 1 },
  (_, lvl) => DEFS_BY_LEVEL.get(lvl)?.[0]?.emoji ?? '❓'
);

// Labels pinned below the bar at key geological anchors
const CHRONO_MILESTONES: { level: number; label: string }[] = [
  { level: 0,  label: '4.6B a.a.' },
  { level: 5,  label: '1.2B a.a.' },
  { level: 8,  label: '541M a.a.' },
  { level: 11, label: '375M a.a.' },
  { level: 15, label: '300K a.a.' },
  { level: 16, label: 'Hoje'       },
];

function formatYearsAgo(years: number): string {
  if (years === 0) return 'Hoje · 2026';
  if (years >= 1_000_000_000) return `${(years / 1_000_000_000).toFixed(1)} bilhões de anos atrás`;
  if (years >= 1_000_000)     return `${Math.round(years / 1_000_000).toLocaleString('pt-BR')} milhões de anos atrás`;
  if (years >= 1_000)         return `${Math.round(years / 1_000).toLocaleString('pt-BR')} mil anos atrás`;
  return `${years.toLocaleString('pt-BR')} anos atrás`;
}

export class HUD {
  private genEl: HTMLElement;
  private lifeEl: HTMLElement;
  private eraEl: HTMLElement;
  private envEl: HTMLElement;
  private entropyEl: HTMLElement;
  private mergesEl: HTMLElement;
  private bannerEl: HTMLElement;
  private chronoFill!: HTMLElement;
  private chronoCursor!: HTMLElement;
  private chronoDateEl!: HTMLElement;
  private chronoEraEl!: HTMLElement;
  private chronoMarkers: HTMLElement[] = [];
  private legendCounts = new Map<string, HTMLElement>();
  private bannerTimer = 0;
  private lastGeneration = -1;
  private lastMaxEra = -1;
  private getHistory!: () => readonly MergeRecord[];
  private entityModal!: HTMLElement;
  private entityModalBody!: HTMLElement;
  private entityModalNavLabel!: HTMLElement;
  private entityModalPrev!: HTMLButtonElement;
  private entityModalNext!: HTMLButtonElement;
  private currentDefIndex = 0;
  private infoModal!: HTMLElement;
  private infoModalBody!: HTMLElement;
  private envGuideEl!: HTMLElement;

  constructor(container: HTMLElement) {
    const overlay = document.createElement('div');
    overlay.id = 'hud-overlay';
    overlay.innerHTML = `
      <div id="hud-chrono">
        <div class="chrono-header">
          <span class="chrono-title">LINHA DO TEMPO DA VIDA NA TERRA</span>
          <div class="chrono-right">
            <span class="chrono-era-name" id="chrono-era">🌋 Sopa Primordial</span>
            <span class="chrono-date" id="chrono-date">4.6 bilhões de anos atrás</span>
          </div>
        </div>
        <div class="chrono-markers-row" id="chrono-markers"></div>
        <div class="chrono-track">
          <div class="chrono-fill" id="chrono-fill"></div>
          <div class="chrono-cursor" id="chrono-cursor">
            <div class="chrono-cursor-line"></div>
          </div>
        </div>
        <div class="chrono-labels" id="chrono-labels"></div>
      </div>

      <div id="hud-stats">
        <div class="stat-block">
          <span class="stat-label label-gen">GERAÇÃO</span>
          <span class="stat-value value-gen" id="gen-value">0</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-block">
          <span class="stat-label label-life">VIDA TOTAL</span>
          <span class="stat-value value-life" id="life-value">0 organismos</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-block">
          <span class="stat-label label-era">ERA ATUAL</span>
          <span class="stat-value value-era" id="era-value">🌋 Sopa Primordial</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-block">
          <span class="stat-label label-env">PRESSÃO AMBIENTAL</span>
          <span class="stat-value value-env" id="env-value">Sopa primordial instável</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-block">
          <span class="stat-label label-entropy">ENTROPIA</span>
          <span class="stat-value value-entropy" id="entropy-value">18%</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-block">
          <span class="stat-label label-merges">FUSÕES TOTAIS</span>
          <span class="stat-value value-merges" id="merges-value">0</span>
        </div>
      </div>

      <button id="legend-toggle-btn">📖</button>

      <div id="hud-legend">
        <div class="legend-header">GUIA DE FORMAS DE VIDA</div>
        <div class="legend-grid" id="legend-grid"></div>
        <div class="legend-header env-guide-header">GUIA AMBIENTAL</div>
        <div class="env-guide-grid" id="env-guide-grid"></div>
      </div>


      <div id="hud-actions">
        <button id="algo-info-btn" aria-label="Como o algoritmo funciona" title="Como o algoritmo funciona">🧠</button>
        <button id="merge-history-btn" aria-label="Histórico de Fusões" title="Histórico de Fusões">📜</button>
      </div>

      <div id="entity-modal" class="modal-hidden">
        <div id="entity-modal-panel">
          <button id="entity-modal-close">✕</button>
          <div id="entity-modal-body"></div>
          <div id="entity-modal-nav">
            <button id="entity-modal-prev" aria-label="Anterior">&#8592;</button>
            <span id="entity-modal-nav-label"></span>
            <button id="entity-modal-next" aria-label="Próximo">&#8594;</button>
          </div>
        </div>
      </div>

      <div id="info-modal" class="modal-hidden">
        <div id="info-modal-panel">
          <div id="info-modal-header">
            <span id="info-modal-title">COMO O ALGORITMO FUNCIONA</span>
            <button id="info-modal-close">✕</button>
          </div>
          <div id="info-modal-body"></div>
        </div>
      </div>

      <div id="merge-modal" class="modal-hidden">
        <div id="merge-modal-panel">
          <div id="merge-modal-header">
            <span id="merge-modal-title">HISTÓRICO DE FUSÕES</span>
            <button id="merge-modal-close">✕</button>
          </div>
          <div id="merge-modal-body"></div>
        </div>
      </div>
    `;
    container.appendChild(overlay);

    this.genEl    = overlay.querySelector('#gen-value')!;
    this.lifeEl   = overlay.querySelector('#life-value')!;
    this.eraEl    = overlay.querySelector('#era-value')!;
    this.envEl    = overlay.querySelector('#env-value')!;
    this.entropyEl = overlay.querySelector('#entropy-value')!;
    this.mergesEl = overlay.querySelector('#merges-value')!;
    this.bannerEl = document.createElement('div'); // unused, kept for API compat

    this.chronoFill   = overlay.querySelector('#chrono-fill')!;
    this.chronoCursor = overlay.querySelector('#chrono-cursor')!;
    this.chronoDateEl = overlay.querySelector('#chrono-date')!;
    this.chronoEraEl  = overlay.querySelector('#chrono-era')!;
    this.envGuideEl   = overlay.querySelector('#env-guide-grid')!;

    this.buildChronoMarkers(overlay.querySelector('#chrono-markers')!);
    this.buildChronoLabels(overlay.querySelector('#chrono-labels')!);
    this.buildLegend(overlay.querySelector('#legend-grid')!);
    this.bindHistoryModal(overlay);
    this.bindAlgorithmModal(overlay);
    this.bindEntityModal(overlay);

    // Mobile legend toggle
    const legendToggle = overlay.querySelector('#legend-toggle-btn')!;
    const legendPanel  = overlay.querySelector('#hud-legend')!;
    legendToggle.addEventListener('click', () => {
      legendPanel.classList.toggle('legend-open');
    });
  }

  setHistoryProvider(fn: () => readonly MergeRecord[]): void {
    this.getHistory = fn;
  }

  // ── Chronological bar ────────────────────────────────────────────────────────

  private buildChronoMarkers(container: HTMLElement): void {
    for (let lvl = 0; lvl <= MAX_LEVEL; lvl++) {
      const pct = (lvl / MAX_LEVEL) * 100;
      const m = document.createElement('div');
      m.className = 'chrono-marker';
      m.style.left = `${pct}%`;
      m.innerHTML = `
        <span class="chrono-m-emoji">${ERA_EMOJIS[lvl]}</span>
        <span class="chrono-m-dot"></span>
      `;
      container.appendChild(m);
      this.chronoMarkers.push(m);
    }
  }

  private buildChronoLabels(container: HTMLElement): void {
    for (const { level, label } of CHRONO_MILESTONES) {
      const span = document.createElement('span');
      span.className = 'chrono-label';
      span.style.left = `${(level / MAX_LEVEL) * 100}%`;
      span.textContent = label;
      container.appendChild(span);
    }
  }

  private updateChrono(maxEra: number): void {
    const pct = (maxEra / MAX_LEVEL) * 100;
    this.chronoFill.style.width = `${pct}%`;
    this.chronoCursor.style.left = `${pct}%`;
    this.chronoDateEl.textContent = formatYearsAgo(ERA_YEARS_AGO[maxEra] ?? 0);
    this.chronoEraEl.textContent  = `${ERA_EMOJIS[maxEra]} ${ERA_NAMES[maxEra]}`;

    this.chronoMarkers.forEach((m, lvl) => {
      m.classList.toggle('cm-discovered', lvl <= maxEra);
      m.classList.toggle('cm-current',    lvl === maxEra);
    });
  }

  // ── Legend ───────────────────────────────────────────────────────────────────

  private buildLegend(grid: HTMLElement): void {
    GUIDE_ENTITY_DEFS.forEach((def, index) => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.dataset.defIndex = String(index);
      item.innerHTML = `
        <span class="legend-emoji">${def.emoji}</span>
        <div class="legend-info">
          <span class="legend-name">${def.name} <span class="legend-count">(0)</span></span>
          <span class="legend-era">${def.era}</span>
        </div>
      `;
      grid.appendChild(item);
      this.legendCounts.set(def.name, item.querySelector('.legend-count')!);
    });

    // Single delegated listener on the grid container — avoids pointer-events inheritance issues
    grid.style.pointerEvents = 'auto';
    grid.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('[data-def-index]') as HTMLElement | null;
      if (!item) return;
      const def = GUIDE_ENTITY_DEFS[Number(item.dataset.defIndex)];
      if (def) this.showEntityModal(def);
    });
  }

  // ── Stats update ─────────────────────────────────────────────────────────────

  update(stats: EvolutionStats, counts?: Map<string, number>, environmentProfile?: EnvironmentProfile): void {
    if (counts) {
      for (const [name, el] of this.legendCounts) {
        el.textContent = `(${counts.get(name) ?? 0})`;
      }
    }
    if (environmentProfile) this.updateEnvironmentGuide(environmentProfile);
    this.lifeEl.textContent   = `${stats.population} organismos`;
    this.eraEl.textContent    = stats.eraName;
    this.envEl.textContent    = stats.environmentalPressure;
    this.entropyEl.textContent = `${Math.round(stats.entropy * 100)}%`;
    this.mergesEl.textContent = String(stats.totalMerges);

    if (stats.generation !== this.lastGeneration) {
      this.lastGeneration = stats.generation;
      this.genEl.textContent = String(stats.generation);
      this.genEl.classList.remove('gen-pulse');
      void this.genEl.offsetWidth;
      if (stats.generation > 0) this.genEl.classList.add('gen-pulse');
    }

    if (stats.maxEraReached !== this.lastMaxEra) {
      this.lastMaxEra = stats.maxEraReached;
      this.updateChrono(stats.maxEraReached);
    }
  }

  private updateEnvironmentGuide(profile: EnvironmentProfile): void {
    this.envGuideEl.innerHTML = profile.guide.map(item => `
      <div class="env-guide-item">
        <span class="env-guide-emoji">${item.emoji}</span>
        <div class="env-guide-copy">
          <span class="env-guide-name">${item.label}</span>
          <span class="env-guide-detail">${item.detail}</span>
        </div>
      </div>
    `).join('');
  }

  private bindHistoryModal(overlay: HTMLElement): void {
    const btn   = overlay.querySelector('#merge-history-btn')!;
    const modal = overlay.querySelector('#merge-modal')!;
    const close = overlay.querySelector('#merge-modal-close')!;
    const body  = overlay.querySelector('#merge-modal-body')!;

    const open = () => {
      const records = this.getHistory?.() ?? [];
      body.innerHTML = records.length === 0
        ? '<div class="merge-empty">Nenhuma fusão ainda.</div>'
        : records.map(r => `
            <div class="merge-row">
              <span class="merge-num">#${r.index}</span>
              <span class="merge-parent">${r.aEmoji} <span class="merge-name">${r.aName}</span></span>
              <span class="merge-plus">+</span>
              <span class="merge-parent">${r.bEmoji} <span class="merge-name">${r.bName}</span></span>
              <span class="merge-arrow">→</span>
              <span class="merge-child">${r.childEmoji} <span class="merge-name">${r.childName}</span>
                <span class="merge-lvl">Lv${r.childLevel}</span></span>
            </div>`).join('');
      modal.classList.remove('modal-hidden');
    };

    btn.addEventListener('click', open);
    close.addEventListener('click', () => modal.classList.add('modal-hidden'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('modal-hidden'); });
  }

  private bindAlgorithmModal(overlay: HTMLElement): void {
    const btn   = overlay.querySelector('#algo-info-btn')!;
    this.infoModal = overlay.querySelector('#info-modal')!;
    this.infoModalBody = overlay.querySelector('#info-modal-body')!;
    const close = overlay.querySelector('#info-modal-close')!;

    const open = () => {
      const environmentDetails = ENVIRONMENT_PROFILES.map(profile => `
        <div class="info-env-row">
          <div class="info-env-head">
            <span class="info-env-badge">${profile.badgeEmoji}</span>
            <span class="info-env-name">${profile.name}</span>
          </div>
          <div class="info-env-metrics">
            <span>Hostilidade: ${Math.round(profile.hostility * 100)}%</span>
            <span>Reprodução relativa: ${Math.round(profile.reproductionBias * 100)}%</span>
          </div>
          ${profile.guide.map(item => `
            <div class="info-env-item">
              <span class="info-env-item-emoji">${item.emoji}</span>
              <span><strong>${item.label}:</strong> ${item.detail}</span>
            </div>
          `).join('')}
        </div>
      `).join('');

      this.infoModalBody.innerHTML = `
        <div class="info-section">
          <div class="info-section-title">Resumo</div>
          <p>A simulação roda em uma grade. Cada ser ocupa uma célula, envelhece, tenta se mover e interage com os vizinhos imediatos. Agora o ambiente também seleciona quais perfis genéticos sobrevivem melhor.</p>
        </div>
        <div class="info-section">
          <div class="info-section-title">Ciclo de execução</div>
          <ol class="info-list">
            <li>O sistema percorre todos os seres vivos do tabuleiro.</li>
            <li>Cada ser envelhece e pode morrer quando ultrapassa seu limite de vida.</li>
            <li>Quando o temporizador individual chega a zero, ele tenta andar.</li>
          </ol>
        </div>
        <div class="info-section">
          <div class="info-section-title">Seleção ambiental</div>
          <ul class="info-list">
            <li>Cada era aplica uma pressão diferente sobre velocidade, resistência, longevidade, fertilidade e tamanho.</li>
            <li>Organismos mais adaptados vivem mais e sofrem menos risco de morte por estresse ambiental.</li>
            <li>Organismos mal adaptados ainda podem existir, mas perdem vantagem reprodutiva e tendem a desaparecer.</li>
          </ul>
        </div>
        <div class="info-section">
          <div class="info-section-title">Entropia global</div>
          <ul class="info-list">
            <li>A entropia sobe com população alta, complexidade alta e eras mais avançadas.</li>
            <li>Ela cai um pouco quando o ecossistema tem organismos mais resilientes e ambientes menos instáveis.</li>
            <li>Quando fica muito alta, aumenta a mortalidade, reduz a fusão e pode disparar colapsos ambientais locais.</li>
          </ul>
        </div>
        <div class="info-section">
          <div class="info-section-title">Tipos de ambiente</div>
          <div class="info-env-list">${environmentDetails}</div>
        </div>
        <div class="info-section">
          <div class="info-section-title">Regras de movimento</div>
          <ul class="info-list">
            <li>Se a célula vizinha estiver vazia, o ser se move.</li>
            <li>Se encontrar um nível menor, ele predará o ocupante.</li>
            <li>Se encontrar um nível maior, ele é removido.</li>
            <li>Se encontrar o mesmo nível, tenta gerar uma fusão.</li>
          </ul>
        </div>
        <div class="info-section">
          <div class="info-section-title">Fusão e evolução</div>
          <ul class="info-list">
            <li>A chance de fusão usa a fertilidade média dos pais e também a adaptação deles ao ambiente atual.</li>
            <li>Se a fusão acontecer, nasce um descendente em uma célula livre próxima.</li>
            <li>Os pais continuam vivos; a fusão cria um novo ser, não substitui os dois.</li>
            <li>Quando surge um nível inédito, a geração sobe e a linha do tempo avança.</li>
          </ul>
        </div>
        <div class="info-section">
          <div class="info-section-title">Controles de estabilidade</div>
          <p>Há limite máximo de população e o histórico guarda apenas as fusões mais recentes, para a simulação não saturar.</p>
        </div>
      `;
      this.infoModal.classList.remove('modal-hidden');
    };

    btn.addEventListener('click', open);
    close.addEventListener('click', () => this.infoModal.classList.add('modal-hidden'));
    this.infoModal.addEventListener('click', e => {
      if (e.target === this.infoModal) this.infoModal.classList.add('modal-hidden');
    });
  }

  private bindEntityModal(overlay: HTMLElement): void {
    this.entityModal          = overlay.querySelector('#entity-modal')!;
    this.entityModalBody      = overlay.querySelector('#entity-modal-body')!;
    this.entityModalNavLabel  = overlay.querySelector('#entity-modal-nav-label')!;
    this.entityModalPrev      = overlay.querySelector('#entity-modal-prev')!;
    this.entityModalNext      = overlay.querySelector('#entity-modal-next')!;

    const closeBtn = overlay.querySelector('#entity-modal-close')!;
    closeBtn.addEventListener('click', () => this.entityModal.classList.add('modal-hidden'));
    this.entityModal.addEventListener('click', e => {
      if (e.target === this.entityModal) this.entityModal.classList.add('modal-hidden');
    });

    this.entityModalPrev.addEventListener('click', () => {
      const idx = (this.currentDefIndex - 1 + GUIDE_ENTITY_DEFS.length) % GUIDE_ENTITY_DEFS.length;
      this.showEntityModal(GUIDE_ENTITY_DEFS[idx]);
    });
    this.entityModalNext.addEventListener('click', () => {
      const idx = (this.currentDefIndex + 1) % GUIDE_ENTITY_DEFS.length;
      this.showEntityModal(GUIDE_ENTITY_DEFS[idx]);
    });
  }

  showEntityModal(def: EntityDef): void {
    this.currentDefIndex = Math.max(0, GUIDE_ENTITY_DEFS.indexOf(def));
    this.entityModalNavLabel.textContent = `${this.currentDefIndex + 1} / ${GUIDE_ENTITY_DEFS.length}`;

    const lineageLabel = (l: string) => ({
      primordial: '🌌 Ancestral Universal',
      plant:      '🌿 Linhagem Vegetal',
      marine:     '🌊 Linhagem Marinha',
      arthropod:  '🦀 Linhagem Artrópode',
      mollusk:    '🐚 Linhagem Molusco',
      vertebrate: '🦴 Linhagem Vertebrada',
    }[l] ?? l);
    const g         = def.baseGenes;
    const maxAge    = Math.floor(20 + g.lifespan * 20 + def.level * 15);
    const ticksMove = Math.round(1 + (1 - g.speed) * 3);
    const fertility = Math.min(0.55, g.fertility + 0.15);
    const allNext   = DEFS_BY_LEVEL.get(def.level + 1) ?? [];
    const nextDefs  = allNext.filter(d => canProduceLineage(def.lineage, def.lineage, d.lineage));
    const prevDefs  = DEFS_BY_LEVEL.get(def.level - 1) ?? [];
    const yearsAgo  = ERA_YEARS_AGO[def.level] ?? 0;

    const geneLabel = (key: keyof typeof g): string => {
      const v = g[key];
      if (key === 'speed') {
        if (v < 0.15) return 'Estático';
        if (v < 0.35) return 'Lento';
        if (v < 0.55) return 'Moderado';
        if (v < 0.75) return 'Rápido';
        return 'Veloz';
      }
      if (key === 'lifespan') {
        if (v < 0.4)  return 'Efêmero';
        if (v < 0.6)  return 'Curto';
        if (v < 0.75) return 'Moderado';
        if (v < 0.9)  return 'Longevo';
        return 'Ancestral';
      }
      if (key === 'fertility') {
        if (v < 0.2)  return 'Raro';
        if (v < 0.4)  return 'Baixa';
        if (v < 0.6)  return 'Moderada';
        if (v < 0.75) return 'Alta';
        return 'Prolífico';
      }
      if (key === 'resilience') {
        if (v < 0.4)  return 'Frágil';
        if (v < 0.6)  return 'Vulnerável';
        if (v < 0.75) return 'Resistente';
        if (v < 0.9)  return 'Robusto';
        return 'Indestrutível';
      }
      if (v < 0.6)  return 'Minúsculo';
      if (v < 0.75) return 'Pequeno';
      if (v < 0.9)  return 'Médio';
      if (v < 0.97) return 'Grande';
      return 'Imenso';
    };

    const geneBar = (key: keyof typeof g, label: string, color: string): string => {
      const pct = Math.round(g[key] * 100);
      return `
        <div class="em-gene-row">
          <span class="em-gene-label">${label}</span>
          <div class="em-gene-track">
            <div class="em-gene-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <span class="em-gene-value">${geneLabel(key)}</span>
        </div>`;
    };

    const defTags = (defs: typeof nextDefs) =>
      defs.map(d => `<span class="em-offspring">${d.emoji} ${d.name}</span>`).join(' ');

    const offspring = nextDefs.length > 0
      ? `<div class="em-rule"><span class="em-rule-icon">🧬</span><span>Evolui para: ${defTags(nextDefs)}</span></div>`
      : `<div class="em-rule"><span class="em-rule-icon">🏁</span><span>Topo da cadeia — não pode evoluir mais</span></div>`;

    const predates = def.level > 0
      ? `<div class="em-rule"><span class="em-rule-icon">🦴</span><span>Preda qualquer ser de nível inferior — incluindo ${defTags(prevDefs)}</span></div>`
      : `<div class="em-rule"><span class="em-rule-icon">🛡️</span><span>Nível 0 — não preda outros seres</span></div>`;

    const predatedBy = def.level < MAX_LEVEL
      ? `<div class="em-rule"><span class="em-rule-icon">⚠️</span><span>É predado por seres de nível superior (${def.level + 1}+)</span></div>`
      : `<div class="em-rule"><span class="em-rule-icon">👑</span><span>Topo da cadeia — nenhum ser pode predá-lo</span></div>`;

    const hex = '#' + def.color.toString(16).padStart(6, '0');

    this.entityModalBody.innerHTML = `
      <div class="em-header" style="border-bottom:3px solid ${hex}33">
        <div class="em-emoji">${def.emoji}</div>
        <div class="em-header-info">
          <div class="em-name">${def.name}</div>
          <div class="em-era">${def.era}</div>
          <div class="em-time">${formatYearsAgo(yearsAgo)}</div>
          <div class="em-lineage-tag" data-lineage="${def.lineage}">${lineageLabel(def.lineage)}</div>
        </div>
        <div class="em-level-badge" style="background:${hex}22;border-color:${hex}66;color:${hex}">Nv.${def.level}</div>
      </div>

      ${def.description ? `<div class="em-description">${def.description}</div>` : ''}

      <div class="em-section">
        <div class="em-section-title">Genes Base</div>
        ${geneBar('speed',      'Velocidade',   '#3a8adf')}
        ${geneBar('lifespan',   'Longevidade',  '#3aaa50')}
        ${geneBar('fertility',  'Fertilidade',  '#cc55aa')}
        ${geneBar('resilience', 'Resiliência',  '#cc7722')}
        ${geneBar('size',       'Tamanho',      '#7755cc')}
        <div class="em-genes-note">Genes sofrem mutação de ±12% a cada reprodução</div>
      </div>

      <div class="em-section">
        <div class="em-section-title">Regras na Simulação</div>
        <div class="em-rules">
          <div class="em-rule"><span class="em-rule-icon">⚡</span><span>Move a cada <strong>${ticksMove}</strong> tick${ticksMove > 1 ? 's' : ''} · Longevidade máxima: ~<strong>${maxAge}</strong> ticks</span></div>
          <div class="em-rule"><span class="em-rule-icon">💞</span><span>Chance de fusão base: <strong>${Math.round(fertility * 100)}%</strong> — funde com o mesmo nível ou nível adjacente (±1)</span></div>
          ${predates}
          ${predatedBy}
          ${offspring}
        </div>
      </div>
    `;

    this.entityModal.classList.remove('modal-hidden');
  }

  showEraBanner(eraName: string): void {
    this.bannerEl.textContent = `✨ ${eraName}`;
    this.bannerEl.classList.remove('era-show');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('era-show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => {
      this.bannerEl.classList.remove('era-show');
    }, 2800);
  }
}
