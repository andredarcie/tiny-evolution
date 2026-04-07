import { renderEvolutionTreeHtml, renderEmojiHtml, formatBiomass, EVOLUTION_BY_ID, EVOLUTION_PATH, LifeGroup, GROUP_ENERGY_MULTIPLIER, type EvolutionDefinition } from './evolutionData';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

interface ActionHelpContent {
  title: string;
  kicker: string;
  summary: string;
  rules: string[];
  biology: string;
}

interface EncyclopediaTopic {
  id: 'objective' | 'milestones' | 'groups';
  label: string;
  kicker: string;
  title: string;
  summary: string;
  sections: Array<{
    heading: string;
    time?: string;
    body: string;
    colonyIds?: string[];
    coloniesLabel?: string;
    multiplier?: number;
  }>;
}

const ACTION_HELP_CONTENT: Record<'adapt' | 'expand', ActionHelpContent> = {
  adapt: {
    title: 'Adaptar',
    kicker: 'salto evolutivo',
    summary: 'A colônia tenta evoluir para a próxima forma compatível com o bioma, a população atual e a biomassa local disponível.',
    rules: [
      'Consome 1 ponto de adaptação da colônia e sua ação do turno.',
      'Só funciona se o bioma atual for compatível com a próxima etapa evolutiva.',
      'Algumas formas exigem população mínima antes da evolução acontecer.',
      'Também exige biomassa local suficiente: o custo cresce com a energia do tile e com o multiplicador do grupo biológico de destino.',
      'Adaptar a linhagem certa no bioma certo é o que empurra a campanha rumo ao Homo sapiens.',
    ],
    biology: 'Adaptação biológica não é escolha consciente, mas o jogo traduz esse processo em uma decisão estratégica. Em termos científicos, populações acumulam características vantajosas quando pressões ambientais favorecem variantes mais aptas a sobreviver e reproduzir.',
  },
  expand: {
    title: 'Expandir',
    kicker: 'colonização de território',
    summary: 'A colônia usa biomassa própria para ocupar um tile vizinho válido e criar uma nova frente de evolução.',
    rules: [
      'Gasta 1 biomassa local da colônia de origem.',
      'A nova colônia nasce em um tile vizinho permitido para a forma de vida atual.',
      'A nova colônia já entra estável com 1 população e 1 biomassa, sem espera extra na versão atual.',
      'A expansão abre caminhos para alcançar outros biomas e novas etapas evolutivas.',
      'Espalhar linhagens reduz o risco de perder todo o progresso em uma única colônia.',
    ],
    biology: 'Expandir representa dispersão ecológica. Na natureza, organismos se espalham para novos ambientes por correntes, vento, locomoção ou reprodução. Essa ocupação de novos nichos aumenta as chances de sobrevivência da linhagem e cria oportunidades para divergência evolutiva.',
  },
};

function idsByGroup(group: LifeGroup): string[] {
  return EVOLUTION_PATH.filter((f) => f.group === group).map((f) => f.id);
}

const ENCYCLOPEDIA_TOPICS: EncyclopediaTopic[] = [
  {
    id: 'objective',
    label: 'Objetivo',
    kicker: 'visão geral',
    title: 'Objetivo do jogo',
    summary: 'O objetivo é fazer pelo menos uma colônia evoluir de Bactéria Primitiva até Homo sapiens. A campanha termina em derrota se todas as colônias morrem ou se nenhuma colônia viva ainda consegue chegar à linhagem humana.',
    sections: [
      {
        heading: 'Como vencer',
        body: 'Selecione uma colônia que ainda esteja em uma rota até Homo sapiens e avance etapa por etapa. Cada adaptação precisa do bioma correto, da população mínima, de 1 ponto de adaptação e de biomassa local suficiente para pagar o custo mostrado no botão Adaptar.',
      },
      {
        heading: 'O que pode fazer você perder',
        body: 'Você perde se a Seleção Natural, falta de biomassa, isolamento ou escolhas de ramificação eliminarem todas as colônias. Também perde se sobrarem colônias vivas, mas todas estiverem em ramos terminais ou em ramos que não alcançam Homo sapiens.',
      },
      {
        heading: 'Estratégia prática',
        body: 'Use exploração automática para produzir nutrientes e população quando uma colônia ficar sem outra ordem, expanda para alcançar costa e terra, semeie novas bactérias quando tiver biomassa total sobrando e mantenha mais de uma linhagem viável para não depender de um único ramo humano.',
      },
      {
        heading: 'Por que esse objetivo faz sentido cientificamente',
        body: 'O jogo simplifica bilhões de anos de evolução em uma campanha dirigida, mas a lógica central é coerente: a história da vida dependeu de persistência ecológica, ocupação de novos ambientes, inovação biológica e sobrevivência a gargalos ambientais. Homo sapiens aparece no fim não como espécie superior, mas como um ramo extremamente recente de uma árvore muito antiga.',
      },
      {
        heading: 'O que o jogador realmente está administrando',
        body: 'Você não controla indivíduos isolados. Controla populações e colônias ao longo do tempo profundo. Cada decisão representa pressão ecológica, dispersão territorial e persistência de linhagens em ambientes que favorecem ou bloqueiam certos saltos evolutivos.',
      },
    ],
  },
  {
    id: 'milestones',
    label: 'Marcos históricos',
    kicker: 'linha do tempo',
    title: 'Marcos históricos do jogo',
    summary: 'Esses marcos são os grandes eventos biológicos usados pelo jogo para sinalizar transições importantes na história da vida, do surgimento celular até a linhagem humana.',
    sections: [
      {
        heading: 'Surgimento da Vida',
        time: '~3,8–3,5 Ga',
        body: 'Marca o aparecimento das primeiras células vivas, ainda simples e inteiramente ligadas aos ambientes oceânicos primitivos. No jogo, esse é o ponto de partida da campanha e o começo de toda a linha evolutiva.',
        colonyIds: ['bacteria_primitiva', 'archaea'],
      },
      {
        heading: 'Grande Oxidação',
        time: '~2,4 Ga',
        body: 'Representa o momento em que linhagens fotossintetizantes oxigênicas passam a alterar a química do planeta ao liberar oxigênio em escala. No jogo, esse marco sinaliza que a vida deixou de ser apenas persistência microbiana e começou a transformar o próprio ambiente global.',
        colonyIds: ['cianobacteria'],
      },
      {
        heading: 'Surgimento das Células Eucarióticas',
        time: '~2,0 Ga',
        body: 'Esse marco indica o aparecimento de células com núcleo e compartimentos internos. No jogo, ele separa uma biosfera dominada por formas muito simples de uma história da vida capaz de sustentar níveis maiores de organização biológica.',
        colonyIds: ['protozoario', 'ameba'],
      },
      {
        heading: 'Arqueoplastídeos',
        time: '~1,6 Ga',
        body: 'Esse marco representa o ramo dos eucariotos fotossintéticos que herdou plastídios por endossimbiose primária. No jogo, ele organiza melhor a origem das algas e a futura linhagem das plantas terrestres.',
        colonyIds: ['arqueoplastideo', 'alga_verde', 'alga_vermelha'],
      },
      {
        heading: 'Multicelularidade e Primeiros Animais',
        time: '~650 Ma',
        body: 'Marca a transição para corpos compostos por muitas células cooperando entre si. Dentro do jogo, isso funciona como a entrada em uma etapa em que a complexidade estrutural da vida começa a abrir novos nichos e novas linhagens.',
        colonyIds: ['esponja'],
      },
      {
        heading: 'Explosão Cambriana',
        time: '~540 Ma',
        body: 'Esse marco resume a rápida diversificação dos grandes planos corporais animais. No jogo, ele sinaliza o momento em que a árvore evolutiva ganha amplitude e múltiplos ramos passam a ter formas anatômicas claramente distintas.',
        colonyIds: ['verme_plano', 'medusa', 'anemona_do_mar', 'trilobita', 'molusco', 'anelideo', 'nematodeo', 'cordado_ancestral'],
      },
      {
        heading: 'Surgimento dos Vertebrados',
        time: '~480 Ma',
        body: 'Representa a consolidação da linhagem com eixo corporal reforçado, crânio e a base anatômica dos futuros peixes e tetrápodes. No jogo, é um marco importante porque aproxima a campanha da linha que pode chegar aos humanos.',
        colonyIds: ['vertebrado_basal'],
      },
      {
        heading: 'Plantas Terrestres',
        time: '~470–430 Ma',
        body: 'Antes dos vertebrados em terra, plantas e outros organismos já começavam a transformar os continentes. Esse marco explica por que o ambiente terrestre se torna ecologicamente viável e progressivamente mais complexo antes da chegada dos tetrápodes.',
        colonyIds: ['embriofita', 'musgo', 'planta_vascular', 'fungo'],
      },
      {
        heading: 'Vertebrados com Mandíbula',
        time: '~430 Ma',
        body: 'Representa a inovação anatômica que amplia dramaticamente alimentação, defesa e predação entre vertebrados. No jogo, esse marco organiza melhor a passagem entre vertebrados basais e a grande diversificação posterior dos peixes.',
        colonyIds: ['gnatostomado', 'peixe', 'tubarao'],
      },
      {
        heading: 'Peixes de Nadadeiras Lobadas',
        time: '~390 Ma',
        body: 'Esse marco destaca o ramo dos sarcopterígios, cujas nadadeiras com ossos internos robustos ajudam a explicar a origem dos futuros membros dos tetrápodes. No jogo, ele melhora a ponte entre peixes e vertebrados terrestres.',
        colonyIds: ['sarcopterigio'],
      },
      {
        heading: 'Vertebrados em Terra Firme',
        time: '~375 Ma',
        body: 'Marca a ocupação de ambientes fora da água por vertebrados ancestrais. Plantas e artrópodes já estavam em terra antes disso; no jogo, este marco destaca especificamente a entrada dos vertebrados nos ecossistemas continentais.',
        colonyIds: ['anfibio', 'inseto', 'aracnideo'],
      },
      {
        heading: 'Ovo Amniótico',
        time: '~320 Ma',
        body: 'Representa a independência reprodutiva em relação à água livre. No jogo, esse marco mostra por que a vida terrestre se torna muito mais estável e expansiva a partir desse ponto, mesmo que evidências recentes sugiram amniotas potencialmente mais antigos do que a data clássica ensinada em sínteses didáticas.',
        colonyIds: ['reptil', 'sauropsideo', 'sinapsideo'],
      },
      {
        heading: 'Surgimento dos Mamíferos',
        time: '~200 Ma',
        body: 'Esse marco representa a origem dos primeiros mamíferos, com fisiologia e cuidado parental mais sofisticados, mas ainda sem a grande radiação ecológica posterior. No jogo, ele organiza a parte final da campanha em torno do ramo que seguirá para primatas e humanos.',
        colonyIds: ['mamifero', 'monotremado', 'marsupial'],
      },
      {
        heading: 'Radiação dos Mamíferos',
        time: '~66 Ma',
        body: 'Depois da extinção do fim do Cretáceo, mamíferos placentários se diversificam rapidamente e ocupam nichos terrestres, aéreos e aquáticos. No jogo, esse marco explica por que o ramo dos mamíferos deixa de ser estreito e passa a ter muitos desdobramentos paralelos.',
        colonyIds: ['placentario_basal', 'carnivoro', 'cetaceo', 'roedor', 'proboscideo', 'morcego'],
      },
      {
        heading: 'Evolução dos Primatas',
        time: '~55–65 Ma',
        body: 'Marca o aparecimento de uma linhagem com visão, manipulação e cognição cada vez mais refinadas, em uma faixa aproximada de 55 a 65 milhões de anos atrás. Em termos de progressão, o jogo usa esse marco para mostrar que a linhagem humana já está dentro de um corredor evolutivo mais específico.',
        colonyIds: ['primata_ancestral', 'simio_ancestral'],
      },
      {
        heading: 'Surgimento dos Hominínios',
        time: '~6–7 Ma',
        body: 'Representa o aparecimento do ramo que se separa da linhagem dos chimpanzés, em torno de 6 a 7 milhões de anos atrás. No jogo, é o penúltimo grande passo antes do objetivo final da campanha.',
        colonyIds: ['hominino'],
      },
      {
        heading: 'Homo sapiens',
        time: '~300 ka',
        body: 'É o marco final da jornada principal do jogo. Ele não significa o fim da evolução biológica, mas o momento em que a campanha chega à linhagem humana moderna como ponto de chegada.',
        colonyIds: ['homo_sapiens'],
      },
      {
        heading: 'Valor científico dos marcos',
        body: 'Esses marcos não existem só para enfeitar a progressão. Eles organizam a campanha em torno de transições reais e reconhecíveis da história da vida: origem celular, mudança atmosférica, aumento de complexidade, diversificação animal, conquista de novos ambientes e surgimento da linhagem humana. Cientificamente, eles ajudam o jogador a entender que a evolução não é uma sequência aleatória de criaturas, mas uma cadeia de mudanças ecológicas e biológicas com consequências profundas para o planeta inteiro.',
      },
    ],
  },
  {
    id: 'groups',
    label: 'Grupos biológicos',
    kicker: 'classificação da vida',
    title: 'Grupos biológicos',
    summary: 'Os seres vivos do jogo estão organizados em 10 grupos baseados na classificação biológica atual. Cada grupo tem um multiplicador de energia: ao explorar um tile, a biomassa gerada é a energia do tile multiplicada pelo valor do grupo. Esse mesmo multiplicador também pesa no custo de adaptação para formas de vida mais complexas.',
    sections: [
      {
        heading: '🦠 Procariontes',
        multiplier: GROUP_ENERGY_MULTIPLIER[LifeGroup.Procariontes],
        body: 'As formas de vida mais antigas do planeta. Células sem núcleo que dominaram a Terra por mais de 2 bilhões de anos antes de qualquer outra coisa existir. Incluem dois domínios completamente distintos: Bacteria e Archaea. As arqueas são, surpreendentemente, os parentes mais próximos de todas as células eucarióticas.',
        colonyIds: idsByGroup(LifeGroup.Procariontes),
        coloniesLabel: 'Formas de vida',
      },
      {
        heading: '🧫 Protistas',
        multiplier: GROUP_ENERGY_MULTIPLIER[LifeGroup.Protistas],
        body: 'Eucariotos unicelulares que não se encaixam nos grupos multicelulares. Representam a fronteira entre a vida simples e os grandes reinos da vida, o momento em que a célula ganhou núcleo, organelas e, em alguns casos, a capacidade de cooperar com outras células.',
        colonyIds: idsByGroup(LifeGroup.Protistas),
        coloniesLabel: 'Formas de vida',
      },
      {
        heading: '🟢 Algas',
        multiplier: GROUP_ENERGY_MULTIPLIER[LifeGroup.Algas],
        body: 'Eucariotos fotossintéticos aquáticos. Ancestrais diretos de todas as plantas terrestres, as algas produziram grande parte do oxigênio atmosférico atual e são a base das cadeias alimentares marinhas. As algas verdes compartilham a mesma clorofila das plantas superiores.',
        colonyIds: idsByGroup(LifeGroup.Algas),
        coloniesLabel: 'Formas de vida',
      },
      {
        heading: '🌿 Plantas',
        multiplier: GROUP_ENERGY_MULTIPLIER[LifeGroup.Plantas],
        body: 'Organismos fotossintéticos multicelulares adaptados à vida em terra. As plantas transformaram os continentes, criaram solos, alteraram o clima e tornaram o ambiente terrestre habitável para todos os animais que vieram depois. Sem elas, a conquista da terra pelos vertebrados teria sido impossível.',
        colonyIds: idsByGroup(LifeGroup.Plantas),
        coloniesLabel: 'Formas de vida',
      },
      {
        heading: '🍄 Fungos',
        multiplier: GROUP_ENERGY_MULTIPLIER[LifeGroup.Fungos],
        body: 'Nem plantas nem animais: um reino próprio. Os fungos decompõem matéria orgânica, reciclam nutrientes essenciais e formam redes simbióticas subterrâneas com plantas. Geneticamente, são mais próximos dos animais do que das plantas.',
        colonyIds: idsByGroup(LifeGroup.Fungos),
        coloniesLabel: 'Formas de vida',
      },
      {
        heading: '🐚 Invertebrados',
        multiplier: GROUP_ENERGY_MULTIPLIER[LifeGroup.Invertebrados],
        body: 'Animais sem coluna vertebral, o grupo mais diverso do reino animal. Dominam oceanos, costas e terra firme com uma variedade extraordinária de planos corporais: da esponja sem tecidos ao polvo com neurônios distribuídos nos tentáculos. Representam mais de 95% de todas as espécies animais.',
        colonyIds: idsByGroup(LifeGroup.Invertebrados),
        coloniesLabel: 'Formas de vida',
      },
      {
        heading: '🐟 Peixes',
        multiplier: GROUP_ENERGY_MULTIPLIER[LifeGroup.Peixes],
        body: '"Peixes" não é um grupo biológico unificado, é um nome conveniente para os vertebrados aquáticos. Tubarões são mais distantes dos peixes ósseos do que nós somos. Ainda assim, esse agrupamento é útil no jogo para reconhecer as formas de vida vertebrada que permaneceram no ambiente aquático.',
        colonyIds: idsByGroup(LifeGroup.Peixes),
        coloniesLabel: 'Formas de vida',
      },
      {
        heading: '🐸 Anfíbios',
        multiplier: GROUP_ENERGY_MULTIPLIER[LifeGroup.Anfibios],
        body: 'Os primeiros vertebrados a explorar a terra firme, mas ainda dependentes da água para reprodução. Representam a transição mais dramática da história vertebrada: o momento em que um animal com nadadeiras se tornou um animal com patas. Tiktaalik, descoberto em 2004, é o fóssil de transição que documenta esse salto.',
        colonyIds: idsByGroup(LifeGroup.Anfibios),
        coloniesLabel: 'Formas de vida',
      },
      {
        heading: '🦎 Sauropsida',
        multiplier: GROUP_ENERGY_MULTIPLIER[LifeGroup.Sauropsida],
        body: 'O ramo dos amniotas que inclui répteis, dinossauros e aves. As aves são dinossauros vivos, tecnicamente répteis com penas que sobreviveram à extinção do Cretáceo. Sauropsida dominaram a Terra por mais de 250 milhões de anos e ainda hoje são o grupo de vertebrados com mais espécies.',
        colonyIds: idsByGroup(LifeGroup.Sauropsida),
        coloniesLabel: 'Formas de vida',
      },
      {
        heading: '🐾 Mamíferos',
        multiplier: GROUP_ENERGY_MULTIPLIER[LifeGroup.Mamiferos],
        body: 'Vertebrados com temperatura corporal interna, pelos e lactação. Surgiram dos sinapsídeos há 225 milhões de anos, mas permaneceram pequenos e à margem durante a era dos dinossauros. Após a extinção do K-Pg há 66 Ma, diversificaram-se rapidamente para ocupar todos os ambientes, incluindo o oceano (cetáceos) e o ar (morcegos).',
        colonyIds: idsByGroup(LifeGroup.Mamiferos),
        coloniesLabel: 'Formas de vida',
      },
    ],
  },
];

export interface TurnHUDState {
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
  canAdapt: boolean;
  adaptCost: number;
  adaptBlockedReason: string;
  canExpand: boolean;
  canDecompose: boolean;
  canSeed: boolean;
  showCancel: boolean;
  floatingMenuVisible: boolean;
  floatingMenuX: number;
  floatingMenuY: number;
  floatingMenuSide: 'left' | 'right';
  floatingCancelVisible: boolean;
  selectedColonyName: string;
  selectedColonyGroup: string;
  selectedColonyDef: EvolutionDefinition | null;
  phaseBannerTitle: string;
  phaseBannerDetail: string;
  terminalInfoVisible: boolean;
  terminalInfoTitle: string;
  terminalInfoLead: string;
  terminalInfoBenefits: string[];
  terminalInfoBiology: string;
  milestoneNotificationTitle: string;
  milestoneNotificationRead: boolean;
  milestoneInfoVisible: boolean;
  milestoneInfoTitle: string;
  milestoneInfoWhen: string;
  milestoneInfoLead: string;
  milestoneInfoBody: string;
  gameOverVisible: boolean;
  gameOverTitle: string;
  gameOverQuote: string;
  gameOverQuoteAuthor: string;
  gameOverDetail: string;
}

export type HUDActionHandlers = {
  onAdapt: () => void;
  onExpand: () => void;
  onDecompose: () => void;
  onSeed: () => void;
  onCancel: () => void;
  onCloseTerminalInfo: () => void;
  onCloseMilestoneInfo: () => void;
  onOpenMilestoneNotification: () => void;
  onRestart: () => void;
};

export class TurnHUD {
  private root: HTMLElement;
  private biomassEl: HTMLElement;
  private biomassChartEl: HTMLCanvasElement;
  private biomassHistory: number[] = [];
  private adaptationEl: HTMLElement;
  private hintEl: HTMLElement;
  private logEl: HTMLElement;
  private seedBtn: HTMLButtonElement;
  private treeBtn: HTMLButtonElement;
  private encyclopediaBtn: HTMLButtonElement;
  private milestoneNotifyBannerEl: HTMLButtonElement;
  private milestoneNotifyTitleEl: HTMLElement;
  private milestoneNotifyCtaEl: HTMLElement;
  private floatingMenuEl: HTMLElement;
  private floatingCancelEl: HTMLElement;
  private floatingAdaptBtn: HTMLButtonElement;
  private floatingAdaptCostEl: HTMLElement;
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
  private milestoneInfoModalEl: HTMLElement;
  private milestoneInfoTitleEl: HTMLElement;
  private milestoneInfoWhenEl: HTMLElement;
  private milestoneInfoLeadEl: HTMLElement;
  private milestoneInfoBodyEl: HTMLElement;
  private actionHelpModalEl: HTMLElement;
  private actionHelpTitleEl: HTMLElement;
  private actionHelpKickerEl: HTMLElement;
  private actionHelpSummaryEl: HTMLElement;
  private actionHelpRulesEl: HTMLElement;
  private actionHelpBiologyEl: HTMLElement;
  private encyclopediaModalEl: HTMLElement;
  private encyclopediaNavEl: HTMLElement;
  private encyclopediaKickerEl: HTMLElement;
  private encyclopediaTitleEl: HTMLElement;
  private encyclopediaSummaryEl: HTMLElement;
  private encyclopediaSectionsEl: HTMLElement;
  private phaseBannerEl: HTMLElement;
  private phaseBannerTitleEl: HTMLElement;
  private phaseBannerDetailEl: HTMLElement;
  private gameOverModalEl: HTMLElement;
  private gameOverTitleEl: HTMLElement;
  private gameOverQuoteEl: HTMLElement;
  private gameOverDetailEl: HTMLElement;
  private currentColonyDef: EvolutionDefinition | null = null;
  private activeEncyclopediaTopicId: EncyclopediaTopic['id'] = 'objective';

  constructor(container: HTMLElement, handlers: HUDActionHandlers) {
    this.root = document.createElement('div');
    this.root.id = 'hud-overlay';
    this.root.innerHTML = `

      <div class="hud-phase-banner hidden" id="hud-phase-banner">
        <div class="hud-phase-banner-title" id="hud-phase-banner-title"></div>
        <div class="hud-phase-banner-detail" id="hud-phase-banner-detail"></div>
      </div>

      <button class="milestone-notify-banner hidden" id="milestone-notify-banner" aria-label="Ver marco evolutivo">
        <span class="milestone-notify-icon">🏆</span>
        <div class="milestone-notify-text">
          <span class="milestone-notify-label">Marco atingido</span>
          <span class="milestone-notify-title" id="milestone-notify-title"></span>
        </div>
        <span class="milestone-notify-cta" id="milestone-notify-cta">Ver →</span>
      </button>

      <div class="floating-action-menu floating-right hidden" id="floating-action-menu">
        <div class="floating-menu-title" id="floating-menu-title">
          <div class="floating-menu-title-col">
            <span id="floating-menu-title-text"></span>
            <span class="floating-menu-group" id="floating-menu-group"></span>
          </div>
          <button class="floating-info-btn" id="floating-info-btn" aria-label="Curiosidades científicas">ⓘ</button>
        </div>
        <div class="floating-action-row">
          <button id="floating-adapt">
            <span class="action-icon icon-adapt" aria-hidden="true"></span>
            <span class="adapt-label">Evoluir</span>
            <span class="adapt-price-pill" id="floating-adapt-cost"></span>
          </button>
          <button class="floating-inline-info-btn" id="floating-adapt-info" aria-label="Saiba mais sobre adaptar">ⓘ</button>
        </div>
        <div class="floating-action-reason hidden" id="floating-adapt-reason"></div>
        <div class="floating-action-row">
          <button id="floating-expand">
            <span class="action-icon icon-expand" aria-hidden="true"></span>
            <span class="adapt-label">Expandir</span>
            <span class="adapt-price-pill">1 🌿</span>
          </button>
          <button class="floating-inline-info-btn" id="floating-expand-info" aria-label="Saiba mais sobre expandir">ⓘ</button>
        </div>
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

      <div class="tree-modal hidden" id="encyclopedia-modal">
        <div class="tree-modal-backdrop" id="encyclopedia-backdrop"></div>
        <div class="tree-modal-card encyclopedia-modal-card" role="dialog" aria-modal="true" aria-labelledby="encyclopedia-title">
          <div class="tree-modal-header encyclopedia-modal-header">
            <div>
              <div class="tree-modal-kicker">enciclopédia do jogo</div>
              <h2 id="encyclopedia-title">Guia científico</h2>
            </div>
            <button id="encyclopedia-close" class="tree-modal-close" aria-label="Fechar enciclopédia">Fechar</button>
          </div>
          <div class="encyclopedia-layout">
            <nav class="encyclopedia-nav" id="encyclopedia-nav" aria-label="Índice da enciclopédia"></nav>
            <div class="encyclopedia-content">
              <div class="tree-modal-kicker" id="encyclopedia-topic-kicker"></div>
              <h3 class="encyclopedia-topic-title" id="encyclopedia-topic-title"></h3>
              <p class="encyclopedia-topic-summary" id="encyclopedia-topic-summary"></p>
              <div class="encyclopedia-sections" id="encyclopedia-sections"></div>
            </div>
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

      <div class="colony-info-modal hidden" id="milestone-info-modal">
        <div class="colony-info-backdrop" id="milestone-info-backdrop"></div>
        <div class="colony-info-card milestone-info-card" role="dialog" aria-modal="true">
          <div class="colony-info-header milestone-info-header">
            <div>
              <div class="colony-info-kicker">marco da vida na terra</div>
              <h2 class="colony-info-title" id="milestone-info-title"></h2>
            </div>
            <button class="colony-info-close" id="milestone-info-close" aria-label="Fechar">Continuar</button>
          </div>
          <div class="colony-info-body milestone-info-body">
            <div class="terminal-info-hero">
              <p class="colony-info-description terminal-info-lead" id="milestone-info-lead"></p>
            </div>
            <div class="colony-info-facts milestone-info-facts">
              <div class="colony-info-fact terminal-info-fact">
                <span class="colony-info-fact-label">Quando isso aconteceu</span>
                <div class="colony-info-fact-value" id="milestone-info-when"></div>
              </div>
              <div class="colony-info-fact terminal-info-fact terminal-info-fact-biology">
                <span class="colony-info-fact-label">O que aconteceu nessa era</span>
                <div class="colony-info-fact-value milestone-info-body-copy" id="milestone-info-body"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="colony-info-modal hidden" id="action-help-modal">
        <div class="colony-info-backdrop" id="action-help-backdrop"></div>
        <div class="colony-info-card terminal-info-card" role="dialog" aria-modal="true" aria-labelledby="action-help-title">
          <div class="colony-info-header terminal-info-header">
            <div>
              <div class="colony-info-kicker" id="action-help-kicker"></div>
              <h2 class="colony-info-title" id="action-help-title"></h2>
            </div>
            <button class="colony-info-close" id="action-help-close" aria-label="Fechar">✕</button>
          </div>
          <div class="colony-info-body terminal-info-body">
            <div class="terminal-info-hero">
              <p class="colony-info-description terminal-info-lead" id="action-help-summary"></p>
            </div>
            <div class="colony-info-facts terminal-info-grid">
              <div class="colony-info-fact terminal-info-fact terminal-info-fact-benefits">
                <span class="colony-info-fact-label">Como funciona no jogo</span>
                <div class="colony-info-fact-value" id="action-help-rules"></div>
              </div>
              <div class="colony-info-fact terminal-info-fact terminal-info-fact-biology">
                <span class="colony-info-fact-label">Leitura biológica</span>
                <div class="colony-info-fact-value" id="action-help-biology"></div>
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
          <div class="hud-stat hud-stat-biomass">
            <canvas class="hud-biomass-chart" id="hud-biomass-chart" aria-hidden="true"></canvas>
            <span class="hud-stat-label">Biomassa</span>
            <span class="hud-stat-value" id="hud-biomass"></span>
          </div>
          <div class="hud-stat">
            <span class="hud-stat-label">Adapt.</span>
            <span class="hud-stat-value" id="hud-adaptation"></span>
          </div>
        </div>

        <div class="hud-section hud-section-turn">
          <div class="hud-actions-grid">
            <button id="hud-encyclopedia" class="hud-encyclopedia" title="Enciclopédia do jogo" aria-label="Enciclopédia do jogo">📚</button>
            <button id="hud-tree" class="hud-tree" title="Árvore evolutiva completa" aria-label="Árvore evolutiva completa">🌳</button>
            <button id="hud-seed" class="hud-seed" title="Semear vida" aria-label="Semear vida">🌱</button>
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

    this.biomassEl = this.root.querySelector('#hud-biomass')!;
    this.biomassChartEl = this.root.querySelector('#hud-biomass-chart')!;
    this.adaptationEl = this.root.querySelector('#hud-adaptation')!;
    this.hintEl = this.root.querySelector('#hud-hint')!;
    this.phaseBannerEl = this.root.querySelector('#hud-phase-banner')!;
    this.phaseBannerTitleEl = this.root.querySelector('#hud-phase-banner-title')!;
    this.phaseBannerDetailEl = this.root.querySelector('#hud-phase-banner-detail')!;
    this.gameOverModalEl = this.root.querySelector('#game-over-modal')!;
    this.gameOverTitleEl = this.root.querySelector('#game-over-title')!;
    this.gameOverQuoteEl = this.root.querySelector('#game-over-quote')!;
    this.gameOverDetailEl = this.root.querySelector('#game-over-detail')!;
    this.logEl = this.root.querySelector('#hud-log')!;
    this.seedBtn = this.root.querySelector('#hud-seed')!;
    this.treeBtn = this.root.querySelector('#hud-tree')!;
    this.encyclopediaBtn = this.root.querySelector('#hud-encyclopedia')!;
    this.milestoneNotifyBannerEl = this.root.querySelector<HTMLButtonElement>('#milestone-notify-banner')!;
    this.milestoneNotifyTitleEl = this.root.querySelector('#milestone-notify-title')!;
    this.milestoneNotifyCtaEl = this.root.querySelector('#milestone-notify-cta')!;
    this.floatingMenuEl = this.root.querySelector('#floating-action-menu')!;
    this.floatingCancelEl = this.root.querySelector('#floating-cancel-menu')!;
    this.floatingAdaptBtn = this.root.querySelector('#floating-adapt')!;
    this.floatingAdaptCostEl = this.root.querySelector('#floating-adapt-cost')!;
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
    this.milestoneInfoModalEl = this.root.querySelector('#milestone-info-modal')!;
    this.milestoneInfoTitleEl = this.root.querySelector('#milestone-info-title')!;
    this.milestoneInfoWhenEl = this.root.querySelector('#milestone-info-when')!;
    this.milestoneInfoLeadEl = this.root.querySelector('#milestone-info-lead')!;
    this.milestoneInfoBodyEl = this.root.querySelector('#milestone-info-body')!;
    this.actionHelpModalEl = this.root.querySelector('#action-help-modal')!;
    this.actionHelpTitleEl = this.root.querySelector('#action-help-title')!;
    this.actionHelpKickerEl = this.root.querySelector('#action-help-kicker')!;
    this.actionHelpSummaryEl = this.root.querySelector('#action-help-summary')!;
    this.actionHelpRulesEl = this.root.querySelector('#action-help-rules')!;
    this.actionHelpBiologyEl = this.root.querySelector('#action-help-biology')!;
    this.encyclopediaModalEl = this.root.querySelector('#encyclopedia-modal')!;
    this.encyclopediaNavEl = this.root.querySelector('#encyclopedia-nav')!;
    this.encyclopediaKickerEl = this.root.querySelector('#encyclopedia-topic-kicker')!;
    this.encyclopediaTitleEl = this.root.querySelector('#encyclopedia-topic-title')!;
    this.encyclopediaSummaryEl = this.root.querySelector('#encyclopedia-topic-summary')!;
    this.encyclopediaSectionsEl = this.root.querySelector('#encyclopedia-sections')!;
    const floatingInfoBtn = this.root.querySelector('#floating-info-btn')!;
    const floatingAdaptInfoBtn = this.root.querySelector('#floating-adapt-info')!;
    const floatingExpandInfoBtn = this.root.querySelector('#floating-expand-info')!;
    const colonyInfoClose = this.root.querySelector('#colony-info-close')!;
    const colonyInfoBackdrop = this.root.querySelector('#colony-info-backdrop')!;
    const terminalInfoClose = this.root.querySelector('#terminal-info-close')!;
    const terminalInfoBackdrop = this.root.querySelector('#terminal-info-backdrop')!;
    const milestoneInfoClose = this.root.querySelector('#milestone-info-close')!;
    const milestoneInfoBackdrop = this.root.querySelector('#milestone-info-backdrop')!;
    const actionHelpClose = this.root.querySelector('#action-help-close')!;
    const actionHelpBackdrop = this.root.querySelector('#action-help-backdrop')!;
    const encyclopediaClose = this.root.querySelector('#encyclopedia-close')!;
    const encyclopediaBackdrop = this.root.querySelector('#encyclopedia-backdrop')!;
    const gameOverRestart = this.root.querySelector('#game-over-restart')!;

    this.renderEncyclopediaNav();
    this.renderEncyclopediaTopic(this.activeEncyclopediaTopicId);

    this.seedBtn.addEventListener('click', handlers.onSeed);
    this.milestoneNotifyBannerEl.addEventListener('click', handlers.onOpenMilestoneNotification);
    this.encyclopediaBtn.addEventListener('click', () => this.encyclopediaModalEl.classList.remove('hidden'));
    this.treeBtn.addEventListener('click', () => this.treeModalEl.classList.remove('hidden'));
    this.floatingCancelBtn.addEventListener('click', handlers.onCancel);
    this.floatingAdaptBtn.addEventListener('click', handlers.onAdapt);
    this.floatingExpandBtn.addEventListener('click', handlers.onExpand);
    this.floatingDecomposeBtn.addEventListener('click', handlers.onDecompose);
    this.treeModalCloseBtn.addEventListener('click', () => this.treeModalEl.classList.add('hidden'));
    this.root.querySelector('#tree-modal-backdrop')!.addEventListener('click', () => this.treeModalEl.classList.add('hidden'));
    floatingInfoBtn.addEventListener('click', () => {
      if (this.currentColonyDef) this.openColonyInfo(this.currentColonyDef);
    });
    floatingAdaptInfoBtn.addEventListener('click', () => this.openActionHelp('adapt'));
    floatingExpandInfoBtn.addEventListener('click', () => this.openActionHelp('expand'));
    colonyInfoClose.addEventListener('click', () => this.colonyInfoModalEl.classList.add('hidden'));
    colonyInfoBackdrop.addEventListener('click', () => this.colonyInfoModalEl.classList.add('hidden'));
    terminalInfoClose.addEventListener('click', handlers.onCloseTerminalInfo);
    terminalInfoBackdrop.addEventListener('click', handlers.onCloseTerminalInfo);
    milestoneInfoClose.addEventListener('click', handlers.onCloseMilestoneInfo);
    milestoneInfoBackdrop.addEventListener('click', handlers.onCloseMilestoneInfo);
    actionHelpClose.addEventListener('click', () => this.actionHelpModalEl.classList.add('hidden'));
    actionHelpBackdrop.addEventListener('click', () => this.actionHelpModalEl.classList.add('hidden'));
    encyclopediaClose.addEventListener('click', () => this.encyclopediaModalEl.classList.add('hidden'));
    encyclopediaBackdrop.addEventListener('click', () => this.encyclopediaModalEl.classList.add('hidden'));
    gameOverRestart.addEventListener('click', handlers.onRestart);

  }

  update(state: TurnHUDState): void {
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
    const hasNotification = !!state.milestoneNotificationTitle;
    this.milestoneNotifyBannerEl.classList.toggle('hidden', !hasNotification);
    this.milestoneNotifyBannerEl.classList.toggle('is-read', state.milestoneNotificationRead);
    this.milestoneNotifyTitleEl.textContent = state.milestoneNotificationTitle;
    this.milestoneNotifyCtaEl.textContent = state.milestoneNotificationRead ? '✓ Lido' : 'Ver →';
    this.milestoneNotifyBannerEl.disabled = state.milestoneNotificationRead;
    this.milestoneInfoModalEl.classList.toggle('hidden', !state.milestoneInfoVisible);
    this.milestoneInfoTitleEl.textContent = state.milestoneInfoTitle;
    this.milestoneInfoWhenEl.textContent = state.milestoneInfoWhen;
    this.milestoneInfoLeadEl.textContent = state.milestoneInfoLead;
    this.milestoneInfoBodyEl.textContent = state.milestoneInfoBody;
    this.gameOverModalEl.classList.toggle('hidden', !state.gameOverVisible);
    this.gameOverTitleEl.textContent = state.gameOverTitle;
    this.gameOverQuoteEl.innerHTML = state.gameOverQuote
      ? `&ldquo;${escapeHtml(state.gameOverQuote)}&rdquo;<span class="game-over-quote-author">— ${escapeHtml(state.gameOverQuoteAuthor)}</span>`
      : '';
    this.gameOverDetailEl.textContent = state.gameOverDetail;
    this.biomassEl.textContent = formatBiomass(state.biomass);
    this.updateBiomassChart(state.biomass);
    this.adaptationEl.textContent = String(state.adaptation);
    this.hintEl.textContent = state.hint;
    this.logEl.innerHTML = state.logLines.map((line) => `<div class="hud-log-line">${line}</div>`).join('');

    this.seedBtn.disabled = !state.canSeed;
    this.seedBtn.style.display = state.canSeed ? '' : 'none';
    this.floatingAdaptBtn.disabled = !state.canAdapt;
    this.floatingAdaptCostEl.textContent = state.adaptCost > 0 ? `${state.adaptCost} 🌿` : '';
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
    const groupEl = this.root.querySelector('#floating-menu-group');
    if (groupEl) groupEl.textContent = state.selectedColonyGroup;
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

  getBiomassTargetCenter(): { x: number; y: number } | null {
    const card = this.root.querySelector('.hud-stat-biomass');
    if (!card) return null;

    const rect = card.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  launchBiomassOrb(start: { x: number; y: number }, onArrive: () => void): void {
    const target = this.getBiomassTargetCenter();
    if (!target) {
      onArrive();
      return;
    }

    const orb = document.createElement('div');
    orb.className = 'biomass-orb';
    orb.style.left = `${start.x}px`;
    orb.style.top = `${start.y}px`;
    this.root.appendChild(orb);

    const arcLift = Math.max(28, Math.abs(target.y - start.y) * 0.18);
    const animation = orb.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.72)', opacity: 0.15 },
        {
          transform: `translate(${(target.x - start.x) * 0.48}px, ${(target.y - start.y) * 0.48 - arcLift}px) translate(-50%, -50%) scale(1.12)`,
          opacity: 1,
        },
        {
          transform: `translate(${target.x - start.x}px, ${target.y - start.y}px) translate(-50%, -50%) scale(0.54)`,
          opacity: 0.15,
        },
      ],
      {
        duration: 620,
        easing: 'cubic-bezier(0.18, 0.82, 0.25, 1)',
        fill: 'forwards',
      },
    );

    animation.onfinish = () => {
      orb.remove();
      onArrive();
    };
    animation.oncancel = () => {
      orb.remove();
      onArrive();
    };
  }

  clearBiomassOrbs(): void {
    this.root.querySelectorAll('.biomass-orb').forEach((orb) => orb.remove());
  }

  private openColonyInfo(def: EvolutionDefinition): void {
    const nameEl = this.root.querySelector('#colony-info-name')!;
    const eraEl = this.root.querySelector('#colony-info-era')!;
    nameEl.innerHTML = `${renderEmojiHtml(def)} ${escapeHtml(def.name)}`;
    eraEl.textContent = def.era ?? '';

    const allowedBiomes = def.allowedBiomes.map(b =>
      b === 'ocean' ? '🌊 Oceano' : b === 'coast' ? '🏖️ Costa' : '🌳 Terra'
    ).join(' · ');

    const nextForms = def.next.length > 0
      ? def.next.map(n => {
          const node = EVOLUTION_BY_ID.get(n.to);
          return node ? `${renderEmojiHtml(node)} ${escapeHtml(node.name)}` : escapeHtml(n.to);
        }).join(', ')
      : 'Nenhuma (forma terminal)';

    const groupEmoji: Record<LifeGroup, string> = {
      [LifeGroup.Procariontes]: '🦠',
      [LifeGroup.Protistas]: '🧫',
      [LifeGroup.Algas]: '🟢',
      [LifeGroup.Plantas]: '🌿',
      [LifeGroup.Fungos]: '🍄',
      [LifeGroup.Invertebrados]: '🐚',
      [LifeGroup.Peixes]: '🐟',
      [LifeGroup.Anfibios]: '🐸',
      [LifeGroup.Sauropsida]: '🦎',
      [LifeGroup.Mamiferos]: '🐾',
    };

    this.colonyInfoBodyEl.innerHTML = `
      ${def.description ? `<p class="colony-info-description">${escapeHtml(def.description)}</p>` : ''}
      <div class="colony-info-facts">
        <div class="colony-info-fact">
          <span class="colony-info-fact-label">Grupo</span>
          <span class="colony-info-fact-value">${groupEmoji[def.group]} ${def.group}</span>
        </div>
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

  private openActionHelp(action: 'adapt' | 'expand'): void {
    const content = ACTION_HELP_CONTENT[action];
    this.actionHelpTitleEl.textContent = content.title;
    this.actionHelpKickerEl.textContent = content.kicker;
    this.actionHelpSummaryEl.textContent = content.summary;
    this.actionHelpRulesEl.innerHTML = `<ul class="terminal-info-list">${content.rules.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    this.actionHelpBiologyEl.textContent = content.biology;
    this.actionHelpModalEl.classList.remove('hidden');
  }

  private renderEncyclopediaNav(): void {
    this.encyclopediaNavEl.innerHTML = ENCYCLOPEDIA_TOPICS.map((topic) => `
      <button
        class="encyclopedia-nav-btn${topic.id === this.activeEncyclopediaTopicId ? ' is-active' : ''}"
        data-topic-id="${topic.id}"
        type="button"
      >
        ${escapeHtml(topic.label)}
      </button>
    `).join('');

    this.encyclopediaNavEl.querySelectorAll<HTMLButtonElement>('[data-topic-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const topicId = button.dataset.topicId as EncyclopediaTopic['id'];
        this.renderEncyclopediaTopic(topicId);
      });
    });
  }

  private renderEncyclopediaTopic(topicId: EncyclopediaTopic['id']): void {
    const topic = ENCYCLOPEDIA_TOPICS.find((entry) => entry.id === topicId);
    if (!topic) return;

    this.activeEncyclopediaTopicId = topicId;
    this.encyclopediaKickerEl.textContent = topic.kicker;
    this.encyclopediaTitleEl.textContent = topic.title;
    this.encyclopediaSummaryEl.textContent = topic.summary;
    this.encyclopediaSectionsEl.className = `encyclopedia-sections${topic.id === 'milestones' ? ' is-timeline' : ''}`;
    this.encyclopediaSectionsEl.innerHTML = topic.sections.map((section) => `
      <section class="encyclopedia-section${section.time ? ' has-time' : ' is-note'}">
        <div class="encyclopedia-section-timeline${section.time ? '' : ' is-empty'}">
          ${section.time ? `<span class="encyclopedia-section-time">${escapeHtml(section.time)}</span>` : ''}
        </div>
        <div class="encyclopedia-section-body">
          <h4>${escapeHtml(section.heading)}</h4>
          <p>${escapeHtml(section.body)}</p>
          ${section.colonyIds?.length
            ? `<div class="encyclopedia-colonies">
                <div class="encyclopedia-colonies-label">${escapeHtml(section.coloniesLabel ?? 'Colônias desta fase')}</div>
                <div class="encyclopedia-colony-list">
                  ${section.colonyIds.map((colonyId) => {
                    const colony = EVOLUTION_BY_ID.get(colonyId);
                    const label = colony ? `${renderEmojiHtml(colony)} ${escapeHtml(colony.name)}` : escapeHtml(colonyId);
                    return `<span class="encyclopedia-colony-chip">${label}</span>`;
                  }).join('')}
                </div>
              </div>`
            : ''}
          ${section.multiplier != null
            ? `<div class="encyclopedia-multiplier">
                <div class="encyclopedia-multiplier-formula">
                  <span class="encyclopedia-multiplier-rule">⚡ energia do tile × ${section.multiplier}</span>
                  <span class="encyclopedia-multiplier-eq">=</span>
                  <span class="encyclopedia-multiplier-result">biomassa gerada</span>
                </div>
                <div class="encyclopedia-multiplier-examples">
                  ${[1, 2, 3].map(e => `
                    <div class="encyclopedia-multiplier-example">
                      <span class="encyclopedia-multiplier-tile">⚡${e}</span>
                      <span class="encyclopedia-multiplier-arrow">→</span>
                      <span class="encyclopedia-multiplier-value">+${formatBiomass(e * section.multiplier!)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>`
            : ''}
        </div>
      </section>
    `).join('');

    this.encyclopediaNavEl.querySelectorAll<HTMLButtonElement>('[data-topic-id]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.topicId === topicId);
    });
  }

  private updateBiomassChart(biomass: number): void {
    const MAX_POINTS = 50;
    const last = this.biomassHistory[this.biomassHistory.length - 1];
    if (last !== biomass) {
      this.biomassHistory.push(biomass);
      if (this.biomassHistory.length > MAX_POINTS) this.biomassHistory.shift();
    }

    const canvas = this.biomassChartEl;
    const parent = canvas.parentElement!;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w === 0 || h === 0) return;

    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);

    const history = this.biomassHistory;
    if (history.length < 2) return;

    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min || 1;

    const padT = h * 0.18;
    const padB = h * 0.08;
    const n = history.length;
    const toX = (i: number) => (i / (n - 1)) * w;
    const toY = (v: number) => padT + (1 - (v - min) / range) * (h - padT - padB);

    const isGrowing = history[n - 1] >= history[0];
    const lineColor = isGrowing ? 'rgba(79, 140, 74, 0.45)' : 'rgba(180, 60, 40, 0.4)';
    const areaTop   = isGrowing ? 'rgba(79, 140, 74, 0.18)' : 'rgba(180, 60, 40, 0.14)';
    const areaBot   = isGrowing ? 'rgba(79, 140, 74, 0.0)'  : 'rgba(180, 60, 40, 0.0)';

    const drawCurve = (c: CanvasRenderingContext2D) => {
      c.moveTo(toX(0), toY(history[0]));
      for (let i = 1; i < n; i++) {
        const cpx = (toX(i - 1) + toX(i)) / 2;
        c.bezierCurveTo(cpx, toY(history[i - 1]), cpx, toY(history[i]), toX(i), toY(history[i]));
      }
    };

    // Filled area with vertical gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, areaTop);
    grad.addColorStop(1, areaBot);
    ctx.beginPath();
    drawCurve(ctx);
    ctx.lineTo(toX(n - 1), h);
    ctx.lineTo(toX(0), h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    drawCurve(ctx);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dot at latest point
    ctx.beginPath();
    ctx.arc(toX(n - 1), toY(history[n - 1]), 2.5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
  }
}
