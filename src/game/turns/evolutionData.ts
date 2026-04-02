export type Biome = 'ocean' | 'coast' | 'land';

export enum LifeGroup {
  Procariontes = 'Procariontes',
  Protistas = 'Protistas',
  Algas = 'Algas',
  Fungos = 'Fungos',
  Plantas = 'Plantas',
  Invertebrados = 'Invertebrados',
  Peixes = 'Peixes',
  Anfibios = 'Anfíbios',
  Sauropsida = 'Sauropsida',
  Mamiferos = 'Mamíferos',
}

export const GROUP_ENERGY_MULTIPLIER: Record<LifeGroup, number> = {
  [LifeGroup.Procariontes]: 1,
  [LifeGroup.Protistas]:    2,
  [LifeGroup.Algas]:        3,
  [LifeGroup.Fungos]:       4,
  [LifeGroup.Plantas]:      5,
  [LifeGroup.Invertebrados]: 6,
  [LifeGroup.Peixes]:       7,
  [LifeGroup.Anfibios]:     8,
  [LifeGroup.Sauropsida]:   9,
  [LifeGroup.Mamiferos]:   10,
};

export function formatBiomass(value: number): string {
  if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${+(value / 1_000).toFixed(1)}k`;
  return String(value);
}

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
  description?: string;
  era?: string;
  group: LifeGroup;
  emojiFilter?: string;
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

export const MAMMAL_LIFE_FORM_IDS = new Set([
  'mamifero',
  'monotremado',
  'marsupial',
  'placentario_basal',
  'carnivoro',
  'cetaceo',
  'roedor',
  'proboscideo',
  'morcego',
  'primata_ancestral',
  'simio_ancestral',
  'hominino',
  'homo_sapiens',
]);

export const EVOLUTION_PATH: EvolutionDefinition[] = [
  { id: 'bacteria_primitiva', name: 'Bactéria Primitiva', emoji: '🦠', allowedBiomes: ['ocean'], worldStage: 0, group: LifeGroup.Procariontes, era: '🌋 Arqueano · ~3,5 Ga', description: 'As primeiras células vivas do planeta. Procariotos sem núcleo que dominaram a Terra por mais de 1 bilhão de anos em absoluta solidão. Seus fósseis mais antigos foram encontrados em formações de chert da Austrália com 3,5 bilhões de anos.', next: [
    { to: 'cianobacteria', biome: 'ocean', minPopulation: 1 },
    { to: 'archaea', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'archaea', name: 'Archaea', emoji: '🧫', allowedBiomes: ['ocean'], worldStage: 0, group: LifeGroup.Procariontes, era: '🌋 Arqueano · ~3,5 Ga', description: 'Tão primitivas quanto as bactérias, mas tão distintas que formam um domínio próprio da vida. As arqueas sobrevivem em fontes hidrotermais a 121°C, lagos saturados de sal e ambientes sem oxigênio. Evidências genéticas sugerem que as arqueas são os parentes mais próximos das células eucarióticas.', next: [
    { to: 'protozoario', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'cianobacteria', name: 'Cianobactéria', emoji: '🫧', allowedBiomes: ['ocean'], worldStage: 0, group: LifeGroup.Procariontes, era: '☀️ Proterozoico · ~2,7 Ga', description: 'As primeiras fotossintéticas da Terra. Ao liberar oxigênio como subproduto do metabolismo solar, as cianobactérias causaram o "Grande Evento de Oxidação" há 2,4 Ga — a maior extinção em massa da história, que eliminou a vida anaeróbica dominante e tornou o ar respirável.', next: [
    { to: 'protozoario', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'protozoario', name: 'Protoeucarioto', emoji: '🧫', allowedBiomes: ['ocean', 'coast'], worldStage: 0, group: LifeGroup.Protistas, emojiFilter: 'hue-rotate(90deg) saturate(1.3)', era: '🔵 Proterozoico · ~2,0 Ga', description: 'Os primeiros eucariotos — células com núcleo e organelas. Provavelmente surgiram quando uma arquea engoliu uma bactéria sem digeri-la (endossimbiose). Essa fusão deu origem à mitocôndria e abriu o caminho para toda a vida multicelular complexa.', next: [
    { to: 'ameba', biome: 'ocean', minPopulation: 1 },
    { to: 'arqueoplastideo', biome: 'coast', minPopulation: 1 },
    { to: 'fungo', biome: 'coast', minPopulation: 1 },
    { to: 'esponja', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'ameba', name: 'Ameba', emoji: '🦠', allowedBiomes: ['ocean'], worldStage: 0, group: LifeGroup.Protistas, emojiFilter: 'hue-rotate(150deg) saturate(1.4)', era: '🔵 Proterozoico · ~1,8 Ga', description: 'Eucariotos unicelulares que caçam e engolfam alimento por fagocitose. Algumas amebas formam colônias temporárias com divisão de trabalho — um prenúncio da multicelularidade. Dictyostelium, uma ameba social, é amplamente estudada para entender como células cooperam.', next: [] },
  { id: 'arqueoplastideo', name: 'Arqueoplastídeo Ancestral', emoji: '🟢', allowedBiomes: ['ocean', 'coast'], worldStage: 1, group: LifeGroup.Algas, era: '🌊 Proterozoico · ~1,6 Ga', description: 'Representa o tronco dos eucariotos fotossintéticos que herdaram plastídios por endossimbiose primária com uma cianobactéria. Desse grande ramo surgiriam algas vermelhas, algas verdes e, muito mais tarde, as plantas terrestres.', next: [
    { to: 'alga_verde', biome: 'coast', minPopulation: 1 },
    { to: 'alga_vermelha', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'alga_verde', name: 'Alga Verde', emoji: '🌱', allowedBiomes: ['ocean', 'coast'], worldStage: 1, group: LifeGroup.Algas, era: '🌊 Proterozoico · ~1,2 Ga', description: 'O ancestral comum de todas as plantas terrestres. As algas verdes compartilham a mesma clorofila a e b das plantas superiores. Há cerca de 500 Ma, algumas colonizaram a terra firme, iniciando a maior transformação dos ecossistemas terrestres da história.', next: [
    { to: 'embriofita', biome: 'coast', minPopulation: 1 },
    { to: 'angiosperma', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'alga_vermelha', name: 'Alga Vermelha', emoji: '🪸', allowedBiomes: ['ocean', 'coast'], worldStage: 1, group: LifeGroup.Algas, era: '🌊 Proterozoico · ~1,2 Ga', description: 'As algas mais antigas do registro fóssil. Usam ficoeritrina para capturar comprimentos de onda de luz que penetram águas profundas. São fundamentais na produção de ágar e carragenana, compostos usados em biotecnologia e na indústria alimentícia.', next: [
    { to: 'coral', biome: 'coast', minPopulation: 1 },
  ] },
  { id: 'embriofita', name: 'Planta Terrestre Basal', emoji: '🌿', allowedBiomes: ['coast', 'land'], worldStage: 2, group: LifeGroup.Plantas, era: '🌿 Ordoviciano · ~470 Ma', description: 'Representa as primeiras embriófitas, o ramo de plantas que fez a transição definitiva para a terra firme. A retenção do embrião e adaptações contra dessecação ajudaram a abrir caminho para musgos, plantas vasculares e toda a flora terrestre posterior.', next: [
    { to: 'musgo', biome: 'coast', minPopulation: 1 },
    { to: 'planta_vascular', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'esponja', name: 'Animal Basal', emoji: '🧽', allowedBiomes: ['ocean', 'coast'], worldStage: 1, group: LifeGroup.Invertebrados, era: '❄️ Ediacarano · ~650 Ma', description: 'Os animais mais simples conhecidos: sem tecidos, sem órgãos, sem sistema nervoso. As esponjas filtram até 10.000 litros de água por quilograma por dia e são os animais multicelulares mais antigos do registro fóssil. Seus genes de adesão celular são ancestrais diretos dos nossos tecidos.', next: [
    { to: 'medusa', biome: 'ocean', minPopulation: 1 },
    { to: 'anemona_do_mar', biome: 'coast', minPopulation: 1 },
    { to: 'coral', biome: 'coast', minPopulation: 1 },
    { to: 'verme_plano', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'fungo', name: 'Fungo', emoji: '🍄', allowedBiomes: ['coast', 'land'], worldStage: 2, group: LifeGroup.Fungos, era: '🌿 Ordoviciano · ~450 Ma', description: 'Nem planta nem animal — um reino próprio. Os fungos decompõem matéria orgânica e reciclam nutrientes essenciais para toda a vida. As micorrizas formam redes subterrâneas que conectam as raízes de árvores diferentes, permitindo troca de açúcares e minerais em escala florestal.', next: [] },
  { id: 'verme_plano', name: 'Bilatério Ancestral', emoji: '🪱', allowedBiomes: ['ocean', 'coast'], worldStage: 1, group: LifeGroup.Invertebrados, era: '💥 Cambriano · ~540 Ma', description: 'O ancestral de quase todos os animais com simetria bilateral — incluindo você. Os bilateriais foram os primeiros animais com frente, atrás, dorsal e ventral definidos, o que permitiu a evolução de cabeças, cérebros e locomoção direcionada. A explosão cambriana foi protagonizada por eles.', next: [
    { to: 'trilobita', biome: 'ocean', minPopulation: 1 },
    { to: 'molusco', biome: 'coast', minPopulation: 1 },
    { to: 'crustaceo', biome: 'coast', minPopulation: 1 },
    { to: 'anelideo', biome: 'ocean', minPopulation: 1 },
    { to: 'nematodeo', biome: 'ocean', minPopulation: 1 },
    { to: 'cordado_ancestral', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'musgo', name: 'Musgo', emoji: '🌾', allowedBiomes: ['coast', 'land'], worldStage: 2, group: LifeGroup.Plantas, era: '🌿 Ordoviciano · ~450 Ma', description: 'As primeiras plantas a conquistar a terra firme, sem raízes verdadeiras nem vasos condutores. Os musgos absorvem água diretamente pela superfície e dependem dela para a reprodução. Turfa de musgo (Sphagnum) cobre 3% da superfície terrestre e armazena mais carbono do que todas as florestas tropicais juntas.', next: [
    { to: 'planta_vascular', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'medusa', name: 'Medusa', emoji: '🪼', allowedBiomes: ['ocean', 'coast'], worldStage: 1, group: LifeGroup.Invertebrados, era: '💥 Cambriano · ~505 Ma', description: 'Predadoras primitivas com 95% do corpo composto de água. As águas-vivas não possuem coração, pulmões, cérebro nem sangue — apenas uma rede nervosa difusa. São os animais com maior eficiência calórica do oceano e algumas espécies são biologicamente imortais, revertendo ao estágio larval quando estressadas.', next: [] },
  { id: 'anemona_do_mar', name: 'Anêmona-do-mar', emoji: '🌺', allowedBiomes: ['ocean', 'coast'], worldStage: 1, group: LifeGroup.Invertebrados, era: '💥 Cambriano · ~540 Ma', description: 'Cnidários solitários que parecem flores mas são predadores com tentáculos urticantes. Possuem uma relação simbiótica famosa com o peixe-palhaço, que é imune ao veneno. Algumas anêmonas vivem por mais de 100 anos e são parentes próximas dos corais construtores de recifes.', next: [] },
  { id: 'coral', name: 'Coral', emoji: '🪸', allowedBiomes: ['ocean', 'coast'], worldStage: 1, group: LifeGroup.Invertebrados, emojiFilter: 'hue-rotate(40deg) saturate(2)', era: '🪸 Ordoviciano · ~480 Ma', description: 'Animais coloniais que constroem as maiores estruturas biológicas do planeta. Os recifes de coral cobrem apenas 0,1% do oceano mas abrigam 25% de todas as espécies marinhas. Cada pólipo secretar carbonato de cálcio, e colônias centenárias constroem estruturas visíveis do espaço.', next: [] },
  { id: 'trilobita', name: 'Trilobita', emoji: '🦐', allowedBiomes: ['ocean', 'coast'], worldStage: 1, group: LifeGroup.Invertebrados, era: '💥 Cambriano · ~521 Ma', description: 'Os artrópodes dominantes por 270 milhões de anos. As trilobitas foram os primeiros animais com olhos compostos sofisticados, capazes de ver em quase 360°. Com mais de 20.000 espécies descritas e uma exoesqueleto mineralizado, formam um dos registros fósseis mais completos e estudados da paleontologia.', next: [] },
  { id: 'planta_vascular', name: 'Planta Vascular', emoji: '🌳', allowedBiomes: ['coast', 'land'], worldStage: 2, group: LifeGroup.Plantas, era: '🌱 Siluriano · ~430 Ma', description: 'A evolução de xilema e floema — vasos internos para transporte de água e nutrientes — liberou as plantas da dependência de ambientes úmidos. As primeiras plantas vasculares, como as psilófitas, não passavam de 30 cm, mas inauguraram a era das florestas que transformaria para sempre o clima terrestre.', next: [
    { to: 'angiosperma', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'anelideo', name: 'Anelídeo', emoji: '🪱', allowedBiomes: ['ocean', 'coast', 'land'], worldStage: 1, group: LifeGroup.Invertebrados, emojiFilter: 'hue-rotate(60deg) saturate(1.4)', era: '💥 Cambriano · ~530 Ma', description: 'Vermes segmentados com sistema circulatório fechado e neurônios agrupados em gânglios. Os anelídeos foram ancestrais dos artrópodes e demonstram que a segmentação corporal é uma estratégia evolutiva poderosa. As minhocas processam toneladas de solo por hectare por ano, sendo fundamentais para a fertilidade agrícola.', next: [
    { to: 'crustaceo', biome: 'coast', minPopulation: 1 },
    { to: 'inseto', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'nematodeo', name: 'Nematódeo', emoji: '🪱', allowedBiomes: ['ocean', 'coast', 'land'], worldStage: 1, group: LifeGroup.Invertebrados, emojiFilter: 'hue-rotate(130deg) saturate(1.3)', era: '💥 Cambriano · ~530 Ma', description: 'Os animais mais numerosos da Terra: estimam-se 57 bilhões de nematódeos por cada ser humano. Ocupam todos os ambientes, do fundo do oceano a solos árticos, e são essenciais na decomposição e reciclagem de nutrientes. Caenorhabditis elegans, um nematódeo de 1 mm, foi o primeiro animal multicelular a ter seu genoma completamente sequenciado.', next: [
    { to: 'inseto', biome: 'land', minPopulation: 1 },
    { to: 'aracnideo', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'cordado_ancestral', name: 'Cordado Ancestral', emoji: '🪱', allowedBiomes: ['ocean'], worldStage: 1, group: LifeGroup.Peixes, emojiFilter: 'hue-rotate(210deg) saturate(1.4)', era: '💥 Cambriano · ~530 Ma', description: 'Os primeiros animais com notocorda — um eixo de suporte flexível que, em nossos descendentes, evoluiu para a coluna vertebral. Pikaia, um cordado do Cambriano, é o parente mais antigo conhecido de todos os vertebrados. Nessa linhagem está o blueprint anatômico do ser humano.', next: [
    { to: 'vertebrado_basal', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'vertebrado_basal', name: 'Vertebrado Basal', emoji: '🐟', allowedBiomes: ['ocean'], worldStage: 1, group: LifeGroup.Peixes, era: '🐟 Ordoviciano · ~480 Ma', description: 'Os primeiros animais com crânio e rudimentos de vértebras, mas ainda sem mandíbulas. Representados pelos conodontos e ostracodermos, esses peixes primitivos dependiam de filtração ou sucção para se alimentar. A evolução da mandíbula, derivada dos arcos branquiais, abriria um leque enorme de possibilidades alimentares.', next: [
    { to: 'gnatostomado', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'gnatostomado', name: 'Gnatostomado Ancestral', emoji: '🦈', allowedBiomes: ['ocean', 'coast'], worldStage: 1, group: LifeGroup.Peixes, era: '🦈 Siluriano · ~430 Ma', description: 'Representa os primeiros vertebrados com mandíbula, uma inovação decisiva na história animal. Mandíbulas permitiram predação mais eficiente, novos modos de alimentação e a diversificação que levaria a tubarões, peixes ósseos e, muito mais tarde, aos vertebrados terrestres.', next: [
    { to: 'peixe', biome: 'ocean', minPopulation: 1 },
    { to: 'tubarao', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'molusco', name: 'Molusco', emoji: '🐚', allowedBiomes: ['ocean', 'coast'], worldStage: 1, group: LifeGroup.Invertebrados, era: '💥 Cambriano · ~530 Ma', description: 'O segundo maior filo animal em número de espécies descritas, com mais de 85.000. De lesmas a polvos, os moluscos demonstram a plasticidade evolutiva de um plano corporal simples. O nautilo é considerado um fóssil vivo — praticamente idêntico a seus antepassados de 500 Ma.', next: [
    { to: 'cefalopode', biome: 'ocean', minPopulation: 1 },
  ] },
  { id: 'crustaceo', name: 'Crustáceo', emoji: '🦀', allowedBiomes: ['ocean', 'coast'], worldStage: 1, group: LifeGroup.Invertebrados, era: '🦀 Ordoviciano · ~490 Ma', description: 'Artrópodes com exoesqueleto rígido de quitina e carbonato de cálcio. Crustáceos colonizaram mares, água doce e terra firme com enorme sucesso. O krill antártico, em biomassa, é um dos organismos mais abundantes da Terra, sustentando baleias, pinguins e focas na base da cadeia alimentar polar.', next: [] },
  { id: 'inseto', name: 'Inseto', emoji: '🐛', allowedBiomes: ['land', 'coast'], worldStage: 2, group: LifeGroup.Invertebrados, era: '🌿 Devoniano · ~385 Ma', description: 'Com mais de 1 milhão de espécies descritas, os insetos são o grupo animal mais diverso da Terra — e possivelmente 80% de todas as espécies animais. Foram os primeiros animais a voar (Carbonífero, ~325 Ma) e desenvolveram metamorfose completa para explorar nichos distintos em fases diferentes da vida.', next: [] },
  { id: 'peixe', name: 'Peixe Ósseo Ancestral', emoji: '🐟', allowedBiomes: ['ocean', 'coast'], worldStage: 1, group: LifeGroup.Peixes, emojiFilter: 'hue-rotate(120deg) saturate(1.4)', era: '🐟 Devoniano · ~420 Ma', description: 'Os peixes ósseos (Osteichthyes) são o grupo de vertebrados mais diverso, com mais de 30.000 espécies. A bexiga natatória, usada para controlar flutuabilidade, é homóloga aos pulmões dos tetrápodes — evidência de que a transição da água para a terra começou dentro desse grande ramo.', next: [
    { to: 'sarcopterigio', biome: 'coast', minPopulation: 1 },
  ] },
  { id: 'sarcopterigio', name: 'Sarcopterígio Ancestral', emoji: '🫧', allowedBiomes: ['ocean', 'coast'], worldStage: 2, group: LifeGroup.Peixes, emojiFilter: 'hue-rotate(180deg) saturate(1.5)', era: '🐟 Devoniano · ~390 Ma', description: 'Os peixes de nadadeiras lobadas possuem estruturas ósseas internas que antecipam o padrão dos membros dos tetrápodes. É dentro desse ramo que a transição para vertebrados terrestres se torna anatomicamente plausível.', next: [
    { to: 'anfibio', biome: 'coast', minPopulation: 1 },
  ] },
  { id: 'angiosperma', name: 'Angiosperma', emoji: '🌸', allowedBiomes: ['land', 'coast'], worldStage: 2, group: LifeGroup.Plantas, era: '🌸 Cretáceo · ~130 Ma', description: 'As plantas com flores dominam 90% dos ecossistemas vegetais terrestres atuais. Surgiram no Cretáceo e coevoluíram com insetos polinizadores em uma das maiores parcerias da evolução. Charles Darwin as chamou de "abominável mistério" por terem se diversificado tão rapidamente no registro fóssil.', next: [] },
  { id: 'cefalopode', name: 'Cefalópode', emoji: '🐙', allowedBiomes: ['ocean'], worldStage: 1, group: LifeGroup.Invertebrados, era: '🐙 Ordoviciano · ~480 Ma', description: 'Os invertebrados mais inteligentes do planeta. Os polvos possuem neurônios distribuídos nos tentáculos e são capazes de resolver problemas, usar ferramentas e mudar de cor instantaneamente. Os cefalópodes dominaram os mares antes dos peixes, e o nautilo sobreviveu praticamente sem mudanças por 500 Ma.', next: [] },
  { id: 'aracnideo', name: 'Aracnídeo', emoji: '🕷️', allowedBiomes: ['land', 'coast'], worldStage: 2, group: LifeGroup.Invertebrados, era: '🕷️ Siluriano · ~430 Ma', description: 'Os primeiros animais terrestres com exoesqueleto a respirar por meio de pulmões-livro. Os escorpiões, com 430 Ma de existência, são quase idênticos aos seus antepassados marinhos. As aranhas produzem seda mais resistente que o aço proporcional ao peso — inspiração para biomateriais avançados.', next: [] },
  { id: 'tubarao', name: 'Tubarão', emoji: '🦈', allowedBiomes: ['ocean'], worldStage: 1, group: LifeGroup.Peixes, emojiFilter: 'hue-rotate(160deg) saturate(1.3)', era: '🦈 Devoniano · ~450 Ma', description: 'Predadores de topo com 450 milhões de anos de história evolutiva quase sem mudanças — sobreviveram a todas as cinco grandes extinções em massa. Em vez de ossos, possuem esqueleto de cartilagem. Seus dentes são constantemente substituídos — um tubarão pode produzir mais de 30.000 dentes ao longo da vida.', next: [] },
  { id: 'anfibio', name: 'Tetrápode Ancestral', emoji: '🐸', allowedBiomes: ['coast', 'land'], worldStage: 2, group: LifeGroup.Anfibios, era: '🐸 Devoniano · ~375 Ma', description: 'A transição mais dramática da história vertebrada. Tiktaalik, descoberto em 2004, é o fóssil de transição entre peixes e tetrápodes — tinha nadadeiras com estrutura de membros. Os primeiros tetrápodes saíram da água não para "conquistar a terra", mas para cruzar entre poças durante secas.', next: [
    { to: 'reptil', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'reptil', name: 'Amniota', emoji: '🥚', allowedBiomes: ['land', 'coast'], worldStage: 3, group: LifeGroup.Sauropsida, era: '🥚 Carbonífero · ~312 Ma', description: 'O ovo amniótico foi a inovação revolucionária: uma câmara aquosa portátil que liberou os vertebrados da dependência de água para reprodução. Amniota inclui répteis, aves e mamíferos. Há 312 Ma, uma população de anfíbios desenvolveu esse ovo e tornou possível a colonização de ambientes áridos do interior continental.', next: [
    { to: 'sauropsideo', biome: 'land', minPopulation: 1 },
    { to: 'sinapsideo', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'sauropsideo', name: 'Sauropsídeo Ancestral', emoji: '🦎', allowedBiomes: ['land', 'coast'], worldStage: 3, group: LifeGroup.Sauropsida, era: '🦎 Permiano · ~280 Ma', description: 'O ramo dos amniota que originou todos os répteis, crocodilianos, dinossauros e aves. Os sauropsídeos desenvolveram escamas de queratina, temperatura dependente de ambiente e metabolismo adaptado ao calor. Dos 250 Ma de dominância ao Cretáceo, passaram por extinções e renascimentos múltiplos.', next: [
    { to: 'dinossauro', biome: 'land', minPopulation: 1 },
    { to: 'ave', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'sinapsideo', name: 'Sinapsídeo', emoji: '🐊', allowedBiomes: ['land'], worldStage: 3, group: LifeGroup.Mamiferos, era: '🐊 Permiano · ~280 Ma', description: 'Os "répteis parecidos com mamíferos" que dominaram a Terra antes dos dinossauros. O crânio sinápsideo tem uma fossa temporal que aumenta a área de fixação muscular da mandíbula. Ao longo de 100 Ma de evolução, os sinapsídeos desenvolveram temperatura corporal interna, pelagem e lactação — tornando-se mamíferos.', next: [
    { to: 'mamifero', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'dinossauro', name: 'Dinossauro', emoji: '🦕', allowedBiomes: ['land'], worldStage: 3, group: LifeGroup.Sauropsida, era: '🦕 Triássico · ~230 Ma', description: 'Dominaram a Terra por 165 milhões de anos — mais de 800 vezes o tempo que os humanos existem. Pesquisas recentes mostram que muitos dinossauros eram endotérmicos (de sangue quente) e cobertos de penas. O maior predador terrestre, Spinosaurus, media até 15 metros e pesava 7 toneladas.', next: [] },
  { id: 'ave', name: 'Ave', emoji: '🐦', allowedBiomes: ['land', 'coast'], worldStage: 3, group: LifeGroup.Sauropsida, era: '🐦 Jurássico · ~150 Ma', description: 'As aves são dinossauros terópodes que sobreviveram à extinção do Cretáceo. Archaeopteryx, com 150 Ma, tinha penas e garras — um fóssil de transição perfeito. Com mais de 10.000 espécies, as aves colonizaram todos os continentes incluindo a Antártica, e algumas percorrem mais de 70.000 km por ano em migração.', next: [] },
  { id: 'mamifero', name: 'Mamífero Basal', emoji: '🐭', allowedBiomes: ['land', 'coast'], worldStage: 3, group: LifeGroup.Mamiferos, era: '🐭 Jurássico · ~200 Ma', description: 'Mamíferos surgiram dos sinapsídeos há 225 Ma, mas permaneceram pequenos e noturnos durante a era dos dinossauros. Depois da extinção do K-Pg há 66 Ma, os mamíferos explodiu em diversidade, ocupando todos os nichos deixados pelos dinossauros. A lactação, o maior investimento parental de qualquer grupo animal, é sua marca registrada.', next: [
    { to: 'monotremado', biome: 'land', minPopulation: 1 },
    { to: 'marsupial', biome: 'land', minPopulation: 1 },
    { to: 'placentario_basal', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'monotremado', name: 'Monotremado', emoji: '🥚', allowedBiomes: ['land', 'coast'], worldStage: 3, group: LifeGroup.Mamiferos, emojiFilter: 'hue-rotate(30deg) saturate(2.5) brightness(0.9)', era: '🥚 Cretáceo · ~110 Ma', description: 'Monotremados são mamíferos que ainda põem ovos, como o ornitorrinco e as équidnas. Eles preservam uma combinação rara de características ancestrais e mamalianas, mostrando que a história dos mamíferos não foi linear nem uniforme.', next: [] },
  { id: 'marsupial', name: 'Marsupial', emoji: '🦘', allowedBiomes: ['land', 'coast'], worldStage: 3, group: LifeGroup.Mamiferos, era: '🦘 Cretáceo · ~125 Ma', description: 'Marsupiais investem menos tempo na gestação interna e mais no desenvolvimento pós-natal, geralmente em bolsa. Esse ramo mostra uma solução reprodutiva distinta da placentária e bem-sucedida em diversos ambientes, especialmente na Austrália e nas Américas.', next: [] },
  { id: 'placentario_basal', name: 'Placentário Basal', emoji: '🐾', allowedBiomes: ['land', 'coast'], worldStage: 3, group: LifeGroup.Mamiferos, era: '🐾 Paleoceno · ~66 Ma', description: 'Os mamíferos placentários expandem o desenvolvimento intrauterino e diversificam rapidamente após a extinção do fim do Cretáceo. Desse grande ramo surgem primatas, carnívoros, cetáceos, roedores, morcegos, proboscídeos e muitos outros grupos modernos.', next: [
    { to: 'primata_ancestral', biome: 'land', minPopulation: 1 },
    { to: 'carnivoro', biome: 'land', minPopulation: 1 },
    { to: 'cetaceo', biome: 'coast', minPopulation: 1 },
    { to: 'roedor', biome: 'land', minPopulation: 1 },
    { to: 'proboscideo', biome: 'land', minPopulation: 1 },
    { to: 'morcego', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'carnivoro', name: 'Carnívoro', emoji: '🐺', allowedBiomes: ['land', 'coast'], worldStage: 3, group: LifeGroup.Mamiferos, era: '🐺 Paleoceno · ~60 Ma', description: 'Carnívoros incluem a linhagem que daria origem a cães, gatos, ursos, focas e muitos outros predadores e onívoros. Dentição cortante, olfato refinado e estratégias de caça variadas transformaram esse grupo em um dos mais bem-sucedidos entre os mamíferos placentários.', next: [] },
  { id: 'cetaceo', name: 'Cetáceo', emoji: '🐋', allowedBiomes: ['coast', 'ocean'], worldStage: 3, group: LifeGroup.Mamiferos, era: '🐋 Eoceno · ~50 Ma', description: 'Cetáceos descendem de mamíferos terrestres artiodáctilos que retornaram ao ambiente aquático. Baleias e golfinhos são um dos exemplos mais impressionantes de reversão ecológica entre vertebrados, com adaptações profundas para nado, audição subaquática e mergulho.', next: [] },
  { id: 'roedor', name: 'Roedor', emoji: '🐹', allowedBiomes: ['land', 'coast'], worldStage: 3, group: LifeGroup.Mamiferos, era: '🐹 Paleoceno · ~60 Ma', description: 'Roedores são o grupo de mamíferos mais diverso em número de espécies. Seus incisivos de crescimento contínuo e a enorme plasticidade ecológica permitiram ocupar quase todos os continentes e habitats, de florestas e desertos a cidades humanas.', next: [] },
  { id: 'proboscideo', name: 'Proboscídeo', emoji: '🐘', allowedBiomes: ['land'], worldStage: 3, group: LifeGroup.Mamiferos, era: '🐘 Paleoceno · ~60 Ma', description: 'Proboscídeos incluem elefantes modernos e seus parentes extintos, como mamutes e mastodontes. A tromba, os grandes corpos e a inteligência social fazem desse ramo um dos mais marcantes entre os mamíferos terrestres de grande porte.', next: [] },
  { id: 'morcego', name: 'Morcego', emoji: '🦇', allowedBiomes: ['land', 'coast'], worldStage: 3, group: LifeGroup.Mamiferos, era: '🦇 Eoceno · ~52 Ma', description: 'Morcegos são os únicos mamíferos com voo ativo verdadeiro. Além do voo, vários grupos desenvolveram ecolocalização refinada, tornando-os um exemplo extraordinário de inovação sensorial e ocupação noturna do espaço aéreo.', next: [] },
  { id: 'primata_ancestral', name: 'Primata Ancestral', emoji: '🐒', allowedBiomes: ['land'], worldStage: 3, group: LifeGroup.Mamiferos, era: '🐒 Paleoceno · ~65 Ma', description: 'Os primeiros primatas eram pequenos, noturnos e arbóreos — parecidos com o musaranho-arbóreo atual. A visão binocular colorida, as mãos com unhas e o cérebro proporcional grande os distinguem de outros mamíferos. Há 65 Ma, após a extinção dos dinossauros, os primatas diversificaram-se rapidamente nas florestas tropicais.', next: [
    { to: 'simio_ancestral', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'simio_ancestral', name: 'Símio Ancestral', emoji: '🦧', allowedBiomes: ['land'], worldStage: 3, group: LifeGroup.Mamiferos, era: '🦧 Mioceno · ~25 Ma', description: 'Os grandes primatas sem cauda que divergiram dos macacos do Velho Mundo. O genoma do chimpanzé é 98,7% idêntico ao humano — a diferença resulta em capacidade de linguagem simbólica, planejamento de longo prazo e cultura acumulativa. O Proconsul, vivendo há 25 Ma na África, é o ancestral conhecido dos grandes símios.', next: [
    { to: 'hominino', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'hominino', name: 'Hominino', emoji: '🧍', allowedBiomes: ['land'], worldStage: 3, group: LifeGroup.Mamiferos, era: '🧍 Plioceno · ~4 Ma', description: 'Bípedes com cérebros cada vez maiores. Australopithecus afarensis (Lucy), com 3,2 Ma, já caminhava ereto mas tinha cérebro de chimpanzé. O bipedismo liberou as mãos para o uso de ferramentas, iniciando uma retroalimentação evolutiva entre cérebro, mão e linguagem que culminou no Homo sapiens.', next: [
    { to: 'homo_sapiens', biome: 'land', minPopulation: 1 },
  ] },
  { id: 'homo_sapiens', name: 'Homo sapiens', emoji: '🧠', allowedBiomes: ['land'], worldStage: 4, group: LifeGroup.Mamiferos, era: '🧠 Pleistoceno · ~300 ka', description: 'A única espécie capaz de refletir sobre sua própria evolução. Homo sapiens surgiu na África há ~300.000 anos e colonizou todos os continentes em menos de 100.000 anos. A linguagem, a escrita e a ciência são extensões culturais da biologia — ferramentas de adaptação mais rápidas que qualquer mutação genética.', next: [] },
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

export function renderEmojiHtml(def: EvolutionDefinition): string {
  if (def.emojiFilter) {
    return `<span style="filter:${def.emojiFilter};display:inline-block">${escapeHtml(def.emoji)}</span>`;
  }
  return escapeHtml(def.emoji);
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
      <div class="evo-node ${biomeClassName(biome)}">${renderEmojiHtml(node)} ${escapeHtml(node.name)}</div>
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
        <div class="evo-node biome-ocean">${renderEmojiHtml(root)} ${escapeHtml(root.name)}</div>
        ${childrenHtml ? `<ul>${childrenHtml}</ul>` : ''}
      </li>
    </ul>
  `;
}
