export type Biome = 'ocean' | 'coast' | 'land';

export interface StageDefinition {
  label: string;
  emoji: string;
  objective: string;
}

export interface EvolutionDefinition {
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

export const STAGES: StageDefinition[] = [
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
    label: '🧠 Homo sapiens',
    emoji: '🧠',
    objective: 'Vitória',
  },
];

export const EVOLUTION_PATH: EvolutionDefinition[] = [
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
  { id: 'protozoario', name: 'Protoeucarioto', emoji: '🧫', allowedBiomes: ['ocean', 'coast'], worldStage: 0, next: [
    { to: 'ameba', biome: 'ocean', minPopulation: 1 },
    { to: 'fungo', biome: 'coast', minPopulation: 1 },
    { to: 'esponja', biome: 'ocean', minPopulation: 1 },
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
  { id: 'esponja', name: 'Animal Basal', emoji: '🧽', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [
    { to: 'medusa', biome: 'ocean', minPopulation: 1 },
    { to: 'anemona_do_mar', biome: 'coast', minPopulation: 1 },
    { to: 'coral', biome: 'coast', minPopulation: 1 },
    { to: 'verme_plano', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'fungo', name: 'Fungo', emoji: '🍄', allowedBiomes: ['coast', 'land'], worldStage: 2, next: [] },
  { id: 'verme_plano', name: 'Bilatério Ancestral', emoji: '🪱', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [
    { to: 'trilobita', biome: 'ocean', minPopulation: 1 },
    { to: 'molusco', biome: 'coast', minPopulation: 1 },
    { to: 'crustaceo', biome: 'coast', minPopulation: 1 },
    { to: 'anelideo', biome: 'ocean', minPopulation: 1 },
    { to: 'nematodeo', biome: 'ocean', minPopulation: 1 },
    { to: 'cordado_ancestral', biome: 'ocean', minPopulation: 1 },
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
  { id: 'cordado_ancestral', name: 'Cordado Ancestral', emoji: '🪱', allowedBiomes: ['ocean'], worldStage: 1, next: [
    { to: 'vertebrado_basal', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'vertebrado_basal', name: 'Vertebrado Basal', emoji: '🐟', allowedBiomes: ['ocean'], worldStage: 1, next: [
    { to: 'peixe', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'molusco', name: 'Molusco', emoji: '🐚', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [
    { to: 'cefalopode', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'crustaceo', name: 'Crustáceo', emoji: '🦀', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [] },
  { id: 'inseto', name: 'Inseto', emoji: '🐛', allowedBiomes: ['land', 'coast'], worldStage: 2, next: [] },
  { id: 'peixe', name: 'Peixe Ósseo Ancestral', emoji: '🐟', allowedBiomes: ['ocean', 'coast'], worldStage: 1, next: [
    { to: 'tubarao', biome: 'ocean', minPopulation: 1 },
    { to: 'anfibio', biome: 'coast', minPopulation: 1 },
  ] },
  { id: 'angiosperma', name: 'Angiosperma', emoji: '🌸', allowedBiomes: ['land', 'coast'], worldStage: 2, next: [] },
  { id: 'cefalopode', name: 'Cefalópode', emoji: '🐙', allowedBiomes: ['ocean'], worldStage: 1, next: [] },
  { id: 'aracnideo', name: 'Aracnídeo', emoji: '🕷️', allowedBiomes: ['land', 'coast'], worldStage: 2, next: [] },
  { id: 'tubarao', name: 'Tubarão', emoji: '🦈', allowedBiomes: ['ocean'], worldStage: 1, next: [] },
  { id: 'anfibio', name: 'Tetrápode Ancestral', emoji: '🐸', allowedBiomes: ['coast', 'land'], worldStage: 2, next: [
    { to: 'reptil', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'reptil', name: 'Amniota', emoji: '🥚', allowedBiomes: ['land', 'coast'], worldStage: 3, next: [
    { to: 'sauropsideo', biome: 'land', minPopulation: 1 },
    { to: 'sinapsideo', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'sauropsideo', name: 'Sauropsídeo Ancestral', emoji: '🦎', allowedBiomes: ['land', 'coast'], worldStage: 3, next: [
    { to: 'dinossauro', biome: 'land', minPopulation: 1 },
    { to: 'ave', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'sinapsideo', name: 'Sinapsídeo', emoji: '🦣', allowedBiomes: ['land'], worldStage: 3, next: [
    { to: 'mamifero', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'dinossauro', name: 'Dinossauro', emoji: '🦕', allowedBiomes: ['land'], worldStage: 3, next: [] },
  { id: 'ave', name: 'Ave', emoji: '🐦', allowedBiomes: ['land', 'coast'], worldStage: 3, next: [] },
  { id: 'mamifero', name: 'Mamífero Basal', emoji: '🐭', allowedBiomes: ['land', 'coast'], worldStage: 3, next: [
    { to: 'primata_ancestral', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'primata_ancestral', name: 'Primata Ancestral', emoji: '🐒', allowedBiomes: ['land'], worldStage: 3, next: [
    { to: 'simio_ancestral', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'simio_ancestral', name: 'Símio Ancestral', emoji: '🦧', allowedBiomes: ['land'], worldStage: 3, next: [
    { to: 'hominino', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'hominino', name: 'Hominino', emoji: '🧍', allowedBiomes: ['land'], worldStage: 3, next: [
    { to: 'homo_sapiens', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'homo_sapiens', name: 'Homo sapiens', emoji: '🧠', allowedBiomes: ['land'], worldStage: 4, next: [] },
];

export const EVOLUTION_BY_ID = new Map(EVOLUTION_PATH.map((node) => [node.id, node]));
export const HUMAN_EVOLUTION_ID = 'homo_sapiens';

function biomeClassName(biome: Biome): string {
  return biome === 'ocean' ? 'biome-ocean' : biome === 'coast' ? 'biome-coast' : 'biome-land';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderEvolutionNode(nodeId: string, biome: Biome, path: Set<string>): string {
  const node = EVOLUTION_BY_ID.get(nodeId);
  if (!node) return '';
  if (path.has(nodeId)) return '';

  const nextPath = new Set(path);
  nextPath.add(nodeId);
  const childrenHtml = node.next
    .map((step) => renderEvolutionNode(step.to, step.biome, nextPath))
    .filter(Boolean)
    .join('');

  return `
    <li>
      <div class="evo-node ${biomeClassName(biome)}">${escapeHtml(node.emoji)} ${escapeHtml(node.name)}</div>
      ${childrenHtml ? `<ul>${childrenHtml}</ul>` : ''}
    </li>
  `;
}

export function renderEvolutionTreeHtml(): string {
  const root = EVOLUTION_BY_ID.get('bacteria_primitiva');
  if (!root) return '<ul class="evo-tree"></ul>';

  const childrenHtml = root.next
    .map((step) => renderEvolutionNode(step.to, step.biome, new Set([root.id])))
    .filter(Boolean)
    .join('');

  return `
    <ul class="evo-tree">
      <li>
        <div class="evo-node biome-ocean">${escapeHtml(root.emoji)} ${escapeHtml(root.name)}</div>
        ${childrenHtml ? `<ul>${childrenHtml}</ul>` : ''}
      </li>
    </ul>
  `;
}
