export interface Genes {
  speed: number;      // 0-1: movement speed
  lifespan: number;   // 0-1: how long it lives
  fertility: number;  // 0-1: merge probability
  resilience: number; // 0-1: energy drain resistance
  size: number;       // 0-1: visual scale factor
}

export interface EntityDef {
  level: number;
  emoji: string;
  name: string;
  englishName: string;
  era: string;
  englishEra: string;
  baseGenes: Genes;
  color: number;
  lineage: string;
  description?: string;
}

// ── Lineage compatibility ─────────────────────────────────────────────────────
//
// Lineages define which species can reproduce with which.
// Two parents with lineages A + B can only produce an offspring of lineage C if
// canProduceLineage(A, B, C) returns true.
//
// Lineage tree (simplified):
//   primordial ──┬── plant   (Alga Verde → Fungo → Musgo → Planta Vascular)
//                └── marine  (Alga Vermelha → Esponja → Verme → Medusa)
//                             ├── vertebrate (Peixe → ... → Cidade)
//                             ├── arthropod  (Trilobita → Inseto → Aracnídeo)  ← dead end
//                             └── mollusk    (Molusco → Cefalópode)             ← dead end
//
export function canProduceLineage(parentA: string, parentB: string, child: string): boolean {
  // Primordial ancestors can seed any early lineage
  if (parentA === 'primordial' && parentB === 'primordial') return true;
  if (parentA === 'primordial') return child === parentB;
  if (parentB === 'primordial') return child === parentA;

  // Same lineage → same offspring
  if (parentA === parentB) {
    if (child === parentA) return true;
    // Marine animals also gave rise to vertebrates (chordate branch)
    if (parentA === 'marine' && child === 'vertebrate') return true;
    return false;
  }

  // Cross-lineage rules
  const pair = [parentA, parentB].sort().join('+');
  // Green algae (plant) + Red algae (marine) → marine animals (Esponja)
  if (pair === 'marine+plant') return child === 'marine';
  // Marine + Arthropod ancestor → Mollusks or Arthropods (Cambrian diversification)
  if (pair === 'arthropod+marine') return child === 'mollusk' || child === 'arthropod';

  return false;
}

// ── Entity definitions ────────────────────────────────────────────────────────
//
// NEW level structure (16 levels, 0-16):
//
//  Common trunk (levels 0-8)
//  Level 0-4 : primordial  — universal ancestors
//  Level 5   : plant (Alga Verde) / marine (Alga Vermelha)          — first split
//  Level 6   : marine (Esponja) / plant (Fungo)
//  Level 7   : marine (Verme Plano) / plant (Musgo)
//  Level 8   : marine (Medusa) / arthropod (Trilobita) / plant (Planta Vascular)
//
//  Branching lineages (levels 9+)
//  Level 9   : mollusk (Molusco) / arthropod (Inseto) / vertebrate (Peixe)
//  Level 10  : mollusk (Cefalópode) / arthropod (Aracnídeo) / vertebrate (Tubarão)
//  Level 11+ : vertebrate only → Anfíbio → Réptil/Dinossauro → Ave/Mamífero → Primata/Hominídeo → Humano → Cidade
//              mollusk dead-ends at level 10
//              arthropod dead-ends at level 10
//
export const ENTITY_DEFS: EntityDef[] = [
  // ── Level 0 — Primordial Soup (4.6B ya) ─────────────────────────────────────
  { level: 0, emoji: '💧', name: 'Água',            englishName: 'Water',          lineage: 'primordial', era: '🌋 Sopa Primordial',            englishEra: 'Primordial Soup',        color: 0x44aaff, baseGenes: { speed: 0.3,  lifespan: 0.9,  fertility: 0.8,  resilience: 0.9,  size: 0.7  }, description: 'O solvente universal. Sem água líquida não existe química orgânica possível. Nas profundezas dos oceanos primitivos, moléculas dissolvidas colidiram por bilhões de anos até que algo extraordinário emergiu: a vida.' },
  { level: 0, emoji: '⚡', name: 'Energia',         englishName: 'Energy',         lineage: 'primordial', era: '🌋 Sopa Primordial',            englishEra: 'Primordial Soup',        color: 0xffff44, baseGenes: { speed: 0.9,  lifespan: 0.5,  fertility: 0.8,  resilience: 0.5,  size: 0.7  }, description: 'Raios, calor vulcânico e radiação ultravioleta bombardeavam a Terra jovem. Essa energia transformou gases simples em moléculas orgânicas complexas — o combustível inicial de toda a evolução.' },

  // ── Level 1 — RNA World (3.8B ya) ───────────────────────────────────────────
  { level: 1, emoji: '🧪', name: 'Aminoácido',      englishName: 'Amino Acid',     lineage: 'primordial', era: '⚗️ Mundo do RNA',               englishEra: 'RNA World',              color: 0xaaffcc, baseGenes: { speed: 0.4,  lifespan: 0.8,  fertility: 0.8,  resilience: 0.7,  size: 0.75 }, description: 'Os tijolos da vida. Apenas 20 tipos de aminoácidos combinam-se em cadeias para formar todas as proteínas do planeta. O experimento de Miller-Urey demonstrou que eles podem surgir espontaneamente de gases simples e energia elétrica.' },
  { level: 1, emoji: '🧬', name: 'RNA',             englishName: 'RNA',            lineage: 'primordial', era: '⚗️ Mundo do RNA',               englishEra: 'RNA World',              color: 0xff88ee, baseGenes: { speed: 0.3,  lifespan: 0.7,  fertility: 0.9,  resilience: 0.7,  size: 0.75 }, description: 'Antes do DNA, o RNA governava o mundo. Ele é ao mesmo tempo molécula de informação e catalisador químico. A teoria do "Mundo do RNA" sugere que ele foi a primeira forma de vida autocopiante da Terra.' },

  // ── Level 2 — First Prokaryotes (3.5B ya) ───────────────────────────────────
  { level: 2, emoji: '🦠', name: 'Bactéria',        englishName: 'Bacteria',       lineage: 'primordial', era: '🔬 Primeiros Procariotos',      englishEra: 'First Prokaryotes',      color: 0x66ff66, baseGenes: { speed: 0.5,  lifespan: 0.7,  fertility: 0.8,  resilience: 0.7,  size: 0.8  }, description: 'As primeiras células com DNA. Bactérias são as formas de vida mais antigas preservadas em fósseis — 3,5 bilhões de anos. Sem núcleo, mas com uma eficiência metabólica invejável. Colonizaram cada nicho ecológico do planeta.' },
  { level: 2, emoji: '🧫', name: 'Archaea',         englishName: 'Archaea',        lineage: 'primordial', era: '🔬 Primeiros Procariotos',      englishEra: 'First Prokaryotes',      color: 0xffaa44, baseGenes: { speed: 0.3,  lifespan: 0.9,  fertility: 0.7,  resilience: 0.9,  size: 0.8  }, description: 'Os extremófilos ancestrais. As arqueas sobrevivem em vulcões, fontes hidrotermais a 100°C, lagos hipersalinos e fontes ácidas. São tão diferentes das bactérias que merecem seu próprio domínio da vida — e provavelmente deram origem às células com núcleo.' },

  // ── Level 3 — Great Oxidation (2.7B ya) ─────────────────────────────────────
  { level: 3, emoji: '🌿', name: 'Cianobactéria',   englishName: 'Cyanobacteria',  lineage: 'primordial', era: '☀️ Grande Oxidação',            englishEra: 'Great Oxidation',        color: 0x44cc44, baseGenes: { speed: 0.2,  lifespan: 0.8,  fertility: 0.7,  resilience: 0.8,  size: 0.8  }, description: 'As primeiras fotossintéticas. Há 2,7 bilhões de anos, as cianobactérias começaram a liberar oxigênio como subproduto do metabolismo solar. O resultado foi o "Grande Evento de Oxigenação" — uma revolução química que exterminou a vida anaeróbica dominante e preparou o terreno para toda a vida complexa.' },

  // ── Level 4 — First Eukaryotes (2.0B ya) ────────────────────────────────────
  { level: 4, emoji: '🫧', name: 'Protozoário',     englishName: 'Protozoa',       lineage: 'primordial', era: '🔵 Primeiros Eucariotos',       englishEra: 'First Eukaryotes',       color: 0x88ccff, baseGenes: { speed: 0.4,  lifespan: 0.75, fertility: 0.65, resilience: 0.75, size: 0.85 }, description: 'A célula com núcleo. Os protozoários foram os primeiros organismos com DNA protegido dentro de uma membrana nuclear. Essa inovação — possivelmente resultado de uma bactéria engolindo uma arquea — abriu caminho para toda a vida multicelular.' },
  { level: 4, emoji: '🦠', name: 'Ameba',           englishName: 'Amoeba',         lineage: 'primordial', era: '🔵 Primeiros Eucariotos',       englishEra: 'First Eukaryotes',       color: 0xaad4ff, baseGenes: { speed: 0.35, lifespan: 0.8,  fertility: 0.7,  resilience: 0.78, size: 0.83 }, description: 'Um eucarioto unicelular clássico. As amebas mostram como uma única célula já pode caçar, engolir alimento, mudar de forma e reagir ao ambiente. Elas representam uma parte fundamental da diversidade eucariótica viva, muito antes dos corpos complexos de plantas e animais.' },

  // ── Level 5 — Age of Algae (1.2B ya) — FIRST LINEAGE SPLIT ─────────────────
  { level: 5, emoji: '🌱', name: 'Alga Verde',      englishName: 'Green Algae',    lineage: 'plant',      era: '🌊 Era das Algas',              englishEra: 'Age of Algae',           color: 0x88ee44, baseGenes: { speed: 0.3,  lifespan: 0.7,  fertility: 0.8,  resilience: 0.7,  size: 0.8  }, description: 'O ancestral das plantas terrestres. As algas verdes compartilham clorofila com as plantas superiores e são seus parentes mais próximos. Há 1,2 bilhão de anos, esse ramo divergiu rumo à conquista da terra firme — fungos, musgos e florestas inteiras descendem daqui.' },
  { level: 5, emoji: '🪸', name: 'Alga Vermelha',   englishName: 'Red Algae',      lineage: 'marine',     era: '🌊 Era das Algas',              englishEra: 'Age of Algae',           color: 0xff6688, baseGenes: { speed: 0.1,  lifespan: 0.85, fertility: 0.7,  resilience: 0.85, size: 0.8  }, description: 'Pioneiras dos mares antigos. As algas vermelhas usam pigmentos especiais para capturar luz em profundidades que a clorofila não alcança. São as algas mais antigas do registro fóssil e formam a base da cadeia alimentar marinha que eventualmente produziria animais.' },

  // ── Level 6 — First Multicellular (700M ya) ──────────────────────────────────
  { level: 6, emoji: '🧽', name: 'Esponja',         englishName: 'Sponge',         lineage: 'marine',     era: '🌊 Primeira Vida Multicelular', englishEra: 'First Multicellular',    color: 0xddaa66, baseGenes: { speed: 0.1,  lifespan: 0.8,  fertility: 0.6,  resilience: 0.8,  size: 0.85 }, description: 'O primeiro animal. As esponjas são os animais vivos mais primitivos: sem cérebro, sem músculos, sem sistema nervoso. Apenas poros e canais filtrando água. Mas já possuem células especializadas cooperando — o princípio fundamental de toda a complexidade animal.' },
  { level: 6, emoji: '🍄', name: 'Fungo',           englishName: 'Fungi',          lineage: 'plant',      era: '🌊 Primeira Vida Multicelular', englishEra: 'First Multicellular',    color: 0xcc8822, baseGenes: { speed: 0.05, lifespan: 0.9,  fertility: 0.75, resilience: 0.9,  size: 0.85 }, description: 'Os recicladores do planeta. Os fungos não são plantas nem animais — formam um reino próprio. Decompõem matéria orgânica, formam redes subterrâneas que conectam florestas inteiras e estabeleceram as primeiras simbioses com plantas que tornaram possível a colonização da terra seca.' },

  // ── Level 7 — Bilateria (600M ya) ───────────────────────────────────────────
  { level: 7, emoji: '🪱', name: 'Verme Plano',     englishName: 'Flatworm',       lineage: 'marine',     era: '🔀 Bilatérios',                 englishEra: 'Bilateria',              color: 0xddbb88, baseGenes: { speed: 0.4,  lifespan: 0.6,  fertility: 0.75, resilience: 0.55, size: 0.8  }, description: 'O primeiro animal com simetria bilateral. Ter lado esquerdo e direito parece trivial, mas foi uma revolução: permitiu a formação de cabeça, cauda, frente e fundo distintos. Todos os animais complexos — de insetos a humanos — herdam esse plano corporal dos vermes ancestrais.' },
  { level: 7, emoji: '🌾', name: 'Musgo',           englishName: 'Moss',           lineage: 'plant',      era: '🔀 Bilatérios',                 englishEra: 'Bilateria',              color: 0x44bb44, baseGenes: { speed: 0.05, lifespan: 0.8,  fertility: 0.65, resilience: 0.8,  size: 0.85 }, description: 'Os primeiros colonizadores da terra firme. Os musgos não têm vasos condutores de seiva, mas resistiram ao ambiente terrestre árido há 470 milhões de anos. Criaram solo fértil onde nenhuma planta existia, preparando o terreno para as florestas que viriam.' },

  // ── Level 8 — Cambrian Explosion (541M ya) ───────────────────────────────────
  { level: 8, emoji: '🪼', name: 'Medusa',          englishName: 'Jellyfish',      lineage: 'marine',     era: '🌊 Explosão Cambriana',         englishEra: 'Cambrian Explosion',     color: 0xaaddff, baseGenes: { speed: 0.4,  lifespan: 0.6,  fertility: 0.55, resilience: 0.6,  size: 0.85 }, description: 'Um dos animais mais antigos ainda vivos. As medusas têm 95% de água e existem há 500 milhões de anos praticamente sem mudanças. Sem cérebro, mas com uma rede nervosa difusa e tentáculos paralisantes. Representam um ramo evolutivo distinto dos deuterostômios — o grupo que deu origem aos vertebrados.' },
  { level: 8, emoji: '🌺', name: 'Anêmona-do-mar',  englishName: 'Sea Anemone',    lineage: 'marine',     era: '🌊 Explosão Cambriana',         englishEra: 'Cambrian Explosion',     color: 0xff7799, baseGenes: { speed: 0.08, lifespan: 0.92, fertility: 0.58, resilience: 0.88, size: 0.86 }, description: 'Um cnidário vivo e atual, aparentado de medusas e corais. As anêmonas-do-mar combinam corpo simples com tentáculos urticantes altamente eficientes, servindo de abrigo e predadoras em muitos ecossistemas costeiros. São uma peça central para entender a persistência dos animais mais antigos.' },
  { level: 8, emoji: '🪸', name: 'Coral',           englishName: 'Coral',          lineage: 'marine',     era: '🌊 Explosão Cambriana',         englishEra: 'Cambrian Explosion',     color: 0xff8877, baseGenes: { speed: 0.05, lifespan: 0.95, fertility: 0.6,  resilience: 0.9,  size: 0.88 }, description: 'Colônias de pequenos animais que constroem recifes gigantes. Os corais modernos sustentam alguns dos ecossistemas mais biodiversos do planeta, oferecendo abrigo, alimento e berçário para milhares de espécies marinhas. Embora pareçam plantas ou rochas, são cnidários vivos, parentes das anêmonas e medusas.' },
  { level: 8, emoji: '🦐', name: 'Trilobita',       englishName: 'Trilobite',      lineage: 'arthropod',  era: '🌊 Explosão Cambriana',         englishEra: 'Cambrian Explosion',     color: 0xcc9944, baseGenes: { speed: 0.5,  lifespan: 0.6,  fertility: 0.5,  resilience: 0.6,  size: 0.85 }, description: 'O artrópode dominante do Paleozoico. As trilobitas reinaram nos mares por 270 milhões de anos. Com exoesqueleto segmentado, olhos compostos e patas especializadas, foram um dos experimentos evolutivos mais bem-sucedidos da história — extintas apenas na Grande Morte há 252 milhões de anos.' },
  { level: 8, emoji: '🌳', name: 'Planta Vascular', englishName: 'Vascular Plant', lineage: 'plant',      era: '🌊 Explosão Cambriana',         englishEra: 'Cambrian Explosion',     color: 0x44aa22, baseGenes: { speed: 0.1,  lifespan: 0.9,  fertility: 0.5,  resilience: 0.85, size: 0.9  }, description: 'A conquista definitiva da terra. Com vasos condutores de água e nutrientes, as plantas vasculares cresceram até alturas impossíveis para musgos. Criaram os primeiros solos ricos, florestas densas e o oxigênio que tornou possível a vida terrestre de grande porte.' },

  // ── Level 9 — Age of Invertebrates (475M ya) — SECOND LINEAGE SPLIT ─────────
  { level: 9, emoji: '🪱', name: 'Anelídeo',        englishName: 'Annelid',        lineage: 'marine',     era: '🐚 Era dos Invertebrados',      englishEra: 'Age of Invertebrates',   color: 0xaa7755, baseGenes: { speed: 0.35, lifespan: 0.8,  fertility: 0.65, resilience: 0.75, size: 0.82 }, description: 'Os vermes segmentados incluem minhocas, poliquetas e sanguessugas. Seu corpo dividido em anéis trouxe mais controle de movimento e especialização funcional. Até hoje, anelídeos são fundamentais para reciclagem de nutrientes, aeração do solo e cadeias alimentares aquáticas.' },
  { level: 9, emoji: '🪱', name: 'Nematódeo',       englishName: 'Nematode',       lineage: 'marine',     era: '🐚 Era dos Invertebrados',      englishEra: 'Age of Invertebrates',   color: 0xc49a6c, baseGenes: { speed: 0.45, lifespan: 0.72, fertility: 0.78, resilience: 0.68, size: 0.78 }, description: 'Os nematódeos estão entre os animais mais abundantes do planeta. Existem no solo, na água doce, no mar e dentro de outros seres vivos. Seu sucesso vem do corpo simples, da reprodução eficiente e da capacidade de ocupar praticamente qualquer nicho ecológico.' },
  { level: 9, emoji: '🐚', name: 'Molusco',         englishName: 'Mollusk',        lineage: 'mollusk',    era: '🐚 Era dos Invertebrados',      englishEra: 'Age of Invertebrates',   color: 0xffaacc, baseGenes: { speed: 0.25, lifespan: 0.75, fertility: 0.6,  resilience: 0.75, size: 0.85 }, description: 'Corpo mole, estratégia durável. Os moluscos inventaram a concha calcária como proteção — uma solução tão eficaz que persiste até hoje em caracóis, ostras e mariscos. São o segundo maior filo animal em número de espécies, explorando ambientes marinhos, de água doce e terrestres.' },
  { level: 9, emoji: '🦀', name: 'Crustáceo',       englishName: 'Crustacean',     lineage: 'arthropod',  era: '🐚 Era dos Invertebrados',      englishEra: 'Age of Invertebrates',   color: 0xd46a4c, baseGenes: { speed: 0.52, lifespan: 0.7,  fertility: 0.62, resilience: 0.74, size: 0.86 }, description: 'Caranguejos, camarões, copépodes e krill formam um dos grupos animais mais importantes da Terra. Os crustáceos dominam cadeias alimentares aquáticas e sustentam desde recifes até baleias. São artrópodes essenciais e atuais, não apenas ancestrais extintos.' },
  { level: 9, emoji: '🐛', name: 'Inseto',          englishName: 'Insect',         lineage: 'arthropod',  era: '🐚 Era dos Invertebrados',      englishEra: 'Age of Invertebrates',   color: 0x88cc44, baseGenes: { speed: 0.7,  lifespan: 0.5,  fertility: 0.8,  resilience: 0.55, size: 0.85 }, description: 'O grupo mais diverso da vida animal. Com mais de um milhão de espécies descritas, os insetos representam mais da metade de todas as espécies animais conhecidas. Asas, metamorfose completa e exoesqueleto leve os tornaram conquistadores de todos os ambientes terrestres e de água doce.' },
  { level: 9, emoji: '🐟', name: 'Peixe',           englishName: 'Fish',           lineage: 'vertebrate', era: '🐚 Era dos Invertebrados',      englishEra: 'Age of Invertebrates',   color: 0x55aaff, baseGenes: { speed: 0.6,  lifespan: 0.65, fertility: 0.5,  resilience: 0.6,  size: 0.9  }, description: 'O primeiro vertebrado. A coluna vertebral foi uma revolução estrutural: um eixo rígido que sustenta músculos poderosos e protege o sistema nervoso central. Os peixes primitivos dominaram os oceanos e eventualmente deram origem a toda a vida vertebrada terrestre.' },
  { level: 9, emoji: '🌸', name: 'Angiosperma',     englishName: 'Angiosperm',     lineage: 'plant',      era: '🐚 Era dos Invertebrados',      englishEra: 'Age of Invertebrates',   color: 0xf27bb1, baseGenes: { speed: 0.08, lifespan: 0.88, fertility: 0.7,  resilience: 0.8,  size: 0.92 }, description: 'As plantas com flor dominam a flora terrestre atual. Sua inovação reprodutiva, envolvendo flores, frutos e polinização, remodelou os ecossistemas do planeta e a evolução de inúmeros animais. Quase toda paisagem terrestre moderna depende delas.' },

  // ── Level 10 — Age of Fish (420M ya) ────────────────────────────────────────
  { level: 10, emoji: '🐙', name: 'Cefalópode',     englishName: 'Cephalopod',     lineage: 'mollusk',    era: '🐠 Era dos Peixes',             englishEra: 'Age of Fish',            color: 0xcc44cc, baseGenes: { speed: 0.65, lifespan: 0.6,  fertility: 0.45, resilience: 0.6,  size: 0.9  }, description: 'O invertebrado mais inteligente. Polvos e lulas têm sistema nervoso altamente desenvolvido, memória de curto e longo prazo, capacidade de resolver problemas e até usar ferramentas. O maior invertebrado vivo — a lula-gigante — chega a 13 metros. Representam o ápice evolutivo da linhagem dos moluscos.' },
  { level: 10, emoji: '🕷️', name: 'Aracnídeo',    englishName: 'Arachnid',       lineage: 'arthropod',  era: '🐠 Era dos Peixes',             englishEra: 'Age of Fish',            color: 0x996633, baseGenes: { speed: 0.6,  lifespan: 0.6,  fertility: 0.65, resilience: 0.7,  size: 0.85 }, description: 'Os primeiros predadores terrestres. As aranhas e escorpiões foram os primeiros animais a colonizar com sucesso a terra seca, há 430 milhões de anos. Com oito patas, veneno e seda, tornaram-se predadores eficientes que controlam populações de insetos em todo o planeta.' },
  { level: 10, emoji: '🦈', name: 'Tubarão',        englishName: 'Shark',          lineage: 'vertebrate', era: '🐠 Era dos Peixes',             englishEra: 'Age of Fish',            color: 0x6688aa, baseGenes: { speed: 0.7,  lifespan: 0.7,  fertility: 0.4,  resilience: 0.7,  size: 0.9  }, description: 'Um predador praticamente perfeito. Os tubarões existem há 450 milhões de anos e sobreviveram a todas as cinco grandes extinções em massa. Seus esqueletos de cartilagem, sentidos eletromagnéticos e dentes que se renovam continuamente os tornam máquinas evolutivas virtualmente inalteráveis.' },

  // ── Level 11 — Land Conquest (375M ya) — VERTEBRATE LINEAGE ONLY ────────────
  { level: 11, emoji: '🐸', name: 'Anfíbio',        englishName: 'Amphibian',      lineage: 'vertebrate', era: '🌿 Conquista da Terra',          englishEra: 'Land Conquest',          color: 0x77dd44, baseGenes: { speed: 0.5,  lifespan: 0.7,  fertility: 0.5,  resilience: 0.65, size: 0.9  }, description: 'A ponte entre dois mundos. Os anfíbios foram os primeiros vertebrados a sair do mar e respirar ar, há 375 milhões de anos. Ainda dependem da água para se reproduzir, mas suas pernas articuladas e pulmões primitivos abriram toda a terra firme para os vertebrados.' },

  // ── Level 12 — Age of Reptiles (250M ya) ────────────────────────────────────
  { level: 12, emoji: '🦎', name: 'Réptil',         englishName: 'Reptile',        lineage: 'vertebrate', era: '🦕 Era dos Répteis',            englishEra: 'Age of Reptiles',        color: 0x99bb44, baseGenes: { speed: 0.55, lifespan: 0.7,  fertility: 0.45, resilience: 0.7,  size: 0.9  }, description: 'A independência total da água. Com pele impermeável e ovos amnióticos, os répteis cortaram o último laço com o ambiente aquático. Dominaram a terra por 100 milhões de anos antes dos dinossauros e ainda prosperam hoje em quase todos os continentes.' },
  { level: 12, emoji: '🦕', name: 'Dinossauro',     englishName: 'Dinosaur',       lineage: 'vertebrate', era: '🦕 Era dos Répteis',            englishEra: 'Age of Reptiles',        color: 0x88cc55, baseGenes: { speed: 0.5,  lifespan: 0.75, fertility: 0.4,  resilience: 0.75, size: 0.95 }, description: 'Os senhores da Terra por 165 milhões de anos. Os dinossauros dominaram todos os continentes e foram extintos há 66 milhões de anos por um asteroide de 10 km. Mas não totalmente: as aves são dinossauros terópodes sobreviventes, e seus ossos ocos e postura erguida revelam a herança evolutiva.' },

  // ── Level 13 — Age of Mammals (66M ya) ──────────────────────────────────────
  { level: 13, emoji: '🐦', name: 'Ave',            englishName: 'Bird',           lineage: 'vertebrate', era: '🐾 Era dos Mamíferos',          englishEra: 'Age of Mammals',         color: 0xff9944, baseGenes: { speed: 0.7,  lifespan: 0.7,  fertility: 0.4,  resilience: 0.65, size: 0.9  }, description: 'Dinossauros com asas. As aves são os únicos dinossauros que sobreviveram ao asteroide do Cretáceo. Com mais de 10 mil espécies, conquistaram todos os continentes, incluindo a Antártica. Penas, ossos ocos, visão tetracromática e navegação magnética fazem delas o grupo mais bem-sucedido de tetrápodes.' },
  { level: 13, emoji: '🐭', name: 'Mamífero',       englishName: 'Mammal',         lineage: 'vertebrate', era: '🐾 Era dos Mamíferos',          englishEra: 'Age of Mammals',         color: 0xddbbaa, baseGenes: { speed: 0.5,  lifespan: 0.75, fertility: 0.4,  resilience: 0.75, size: 0.9  }, description: 'Sangue quente e cuidado parental. Os mamíferos mantêm temperatura corporal constante, amamentam filhotes e possuem neocórtex — a região cerebral responsável por raciocínio complexo. Após a extinção dos dinossauros, irradiaram-se para ocupar cada nicho ecológico disponível.' },

  // ── Level 14 — Primate Evolution (55M ya) ───────────────────────────────────
  { level: 14, emoji: '🐒', name: 'Primata',        englishName: 'Primate',        lineage: 'vertebrate', era: '🧬 Evolução dos Primatas',      englishEra: 'Primate Evolution',      color: 0xcc8855, baseGenes: { speed: 0.55, lifespan: 0.8,  fertility: 0.35, resilience: 0.75, size: 0.95 }, description: 'Visão estereoscópica e mãos que pegam. Os primatas desenvolveram visão em 3D para navegar em copas de árvores e mãos com polegar oponível para agarrar galhos. Esses adaptações, combinadas com um cérebro grande relativo ao corpo, criaram a base para a inteligência superior.' },
  { level: 14, emoji: '🦧', name: 'Hominídeo',      englishName: 'Hominid',        lineage: 'vertebrate', era: '🧬 Evolução dos Primatas',      englishEra: 'Primate Evolution',      color: 0xbb7744, baseGenes: { speed: 0.45, lifespan: 0.85, fertility: 0.3,  resilience: 0.8,  size: 0.95 }, description: 'O passo para a bipedia. Os hominídeos desceram das árvores e começaram a andar eretos, liberando as mãos para usar ferramentas. O cérebro cresceu dramaticamente, o rosto achatou e a linguagem primitiva surgiu. Neste ramo estão os australopitecinos e os primeiros Homo.' },

  // ── Level 15 — Age of Humanity (300K ya) ────────────────────────────────────
  { level: 15, emoji: '🧑', name: 'Humano',         englishName: 'Human',          lineage: 'vertebrate', era: '🧑 Era da Humanidade',          englishEra: 'Age of Humanity',        color: 0xffddbb, baseGenes: { speed: 0.5,  lifespan: 0.9,  fertility: 0.3,  resilience: 0.85, size: 1.0  }, description: 'O único animal que questiona sua própria existência. O Homo sapiens surgiu há 300 mil anos na África e colonizou todo o planeta em menos de 70 mil anos. Com linguagem simbólica, cooperação em larga escala e transmissão cultural, iniciou uma forma de evolução que transcende a biologia.' },

  // ── Level 16 — Modern Era (today) ───────────────────────────────────────────
  { level: 16, emoji: '🏙️', name: 'Cidade',        englishName: 'City',           lineage: 'vertebrate', era: '🚀 Era Moderna',               englishEra: 'Modern Era',             color: 0xaabbff, baseGenes: { speed: 0.2,  lifespan: 1.0,  fertility: 0.1,  resilience: 1.0,  size: 1.0  }, description: 'O ápice da evolução cultural. A cidade concentra energia, informação e cooperação em densidades sem precedente na natureza. Mais de 4 bilhões de pessoas vivem em áreas urbanas — o ecossistema mais complexo já criado, resultado de 4,6 bilhões de anos de evolução contínua.' },
];

export const ERA_BY_LEVEL: Record<number, string> = Object.fromEntries(
  ENTITY_DEFS.map(d => [d.level, d.era])
);

export const DEFS_BY_LEVEL: Map<number, EntityDef[]> = new Map();
for (const def of ENTITY_DEFS) {
  const arr = DEFS_BY_LEVEL.get(def.level) ?? [];
  arr.push(def);
  DEFS_BY_LEVEL.set(def.level, arr);
}

export const MAX_LEVEL = 16;
export const MUTATION_RATE = 0.12;
