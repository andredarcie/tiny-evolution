# Plano de Eras para Tiny Evolution

Este documento propõe transformar grandes mudanças da história da Terra em eras jogáveis dentro de `Tiny Evolution`.

Objetivo:
- aumentar variedade entre turnos;
- dar contexto histórico às mudanças do mapa;
- criar picos de dificuldade e de oportunidade;
- tornar a progressão evolutiva mais dramática.

## Princípios

- Cada era precisa mudar o jogo de forma perceptível.
- A mudança deve ser entendida pelo jogador em uma frase curta.
- Cada era deve combinar:
  - mudança visual;
  - regra sistêmica;
  - risco novo;
  - oportunidade nova.
- O jogador deve conseguir prever parte do impacto antes da transição.

## Estrutura recomendada

Cada era pode ter estes campos:

```ts
type EraDefinition = {
  id: string;
  name: string;
  rangeLabel: string;
  summary: string;
  unlockCondition: string;
  introLog: string;
  effects: string[];
  hazards: string[];
  bonuses: string[];
  visualTheme: {
    oceanColor: string;
    coastColor: string;
    landColor: string;
    overlay?: string;
  };
};
```

## Eras propostas

### 1. Mundo Microbiano

- Nome: Mundo Microbiano
- Janela histórica: Arqueano e início do Proterozoico
- Ideia: a vida existe quase só no oceano, em condições hostis
- Objetivo de design: ensinar o ciclo básico do jogo

Efeitos:
- Sem pressão em terra porque a terra ainda não é relevante
- Expansão oceânica barata
- Colonização fora do oceano muito limitada ou impossível

Risco:
- Baixa adaptação total
- Crescimento lento fora da água

Feedback visual:
- oceano dominante;
- terra apagada e árida;
- HUD com atmosfera primitiva.

### 2. Era do Oxigênio

- Nome: Grande Oxigenação
- Janela histórica: cerca de 2,4 bilhões de anos atrás
- Ideia: o planeta muda por causa da fotossíntese
- Objetivo de design: introduzir primeira grande ruptura sistêmica

Efeitos:
- linhagens muito primitivas sofrem mais com estagnação;
- colônias fotossintéticas ou associadas à produção de oxigênio geram bônus;
- adaptação passa a ter peso maior que simples expansão.

Risco:
- linhagens antigas não adaptadas perdem eficiência;
- manter muitas colônias “antigas” se torna custo.

Bônus:
- cianobactérias e ramos ligados a plantas ficam mais valiosos;
- aumento de biomassa em colônias específicas.

Feedback visual:
- mudança gradual da paleta do oceano;
- logs do tipo `a atmosfera mudou`.

### 3. Complexidade Eucariótica

- Nome: Ascensão dos Eucariontes
- Janela histórica: Proterozoico médio e tardio
- Ideia: a vida fica estruturalmente mais complexa
- Objetivo de design: abrir mais ramos e decisões de especialização

Efeitos:
- desbloqueio de mais ramos evolutivos;
- colônias com maior adaptação podem gerar sinergias;
- crescimento por “qualidade” começa a importar mais que quantidade.

Risco:
- colônias atrasadas ficam para trás;
- erro de bioma fica mais caro.

### 4. Explosão Cambriana

- Nome: Explosão Cambriana
- Janela histórica: a partir de 541 Ma
- Ideia: diversificação rápida de animais e estratégias biológicas
- Objetivo de design: aumentar variedade e pressão competitiva

Efeitos:
- ganho temporário de novas opções de adaptação;
- mais caminhos laterais;
- colônias podem receber modificadores curtos de especialização.

Risco:
- mais linhagens terminais e becos sem saída;
- decisões ruins ficam mais tentadoras.

Bônus:
- primeira grande sensação de “build diversity”.

Feedback visual:
- mais contraste;
- mais ícones de fauna;
- banner forte de transição.

### 5. Conquista da Terra

- Nome: Colonização da Terra
- Janela histórica: Siluriano e Devoniano
- Ideia: vida deixa de depender só do oceano
- Objetivo de design: transformar o mapa em problema espacial de verdade

Efeitos:
- terra e costa ganham importância estratégica;
- novas penalidades por isolamento em terra;
- primeiras cadeias terrestres ficam disponíveis.

Risco:
- expandir cedo demais para terra gera mortalidade;
- colônias costeiras viram ponte logística crítica.

Bônus:
- colônias bem posicionadas em costa podem acelerar transição para terra.

Feedback visual:
- terra ganha saturação;
- possíveis highlights para rotas costeiras.

### 6. Florestas e Solos Complexos

- Nome: Florestas do Devoniano e Carbonífero
- Janela histórica: Devoniano tardio e Carbonífero
- Ideia: ecossistemas terrestres ficam densos e produtivos
- Objetivo de design: dar fase de crescimento forte e preparação

Efeitos:
- mais biomassa em terra;
- fungos, plantas e cadeias associadas podem apoiar colônias vizinhas;
- consolidar colônias terrestres fica mais valioso.

Risco:
- colônias frágeis podem virar gargalo se o jogador só expandir;
- competição por tiles terrestres bons aumenta.

### 7. Crise do Permiano

- Nome: Extinção Permiano-Triássico
- Janela histórica: 252 Ma
- Ideia: colapso global
- Objetivo de design: criar o maior pico de dificuldade da campanha

Efeitos:
- várias colônias sofrem pressão ao mesmo tempo;
- custo de manutenção sobe;
- algumas classes de linhagem são mais atingidas que outras.

Risco:
- expansionismo excessivo é punido;
- mapa superlotado entra em colapso.

Bônus:
- sobreviver à crise dá recompensa forte;
- abre espaço para ramos futuros dominantes.

Feedback visual:
- paleta seca;
- logs de catástrofe;
- possível overlay atmosférico ou vulcânico.

### 8. Era dos Amniotas e Dinossauros

- Nome: Domínio dos Grandes Vertebrados
- Janela histórica: Triássico, Jurássico e Cretáceo
- Ideia: ecossistemas terrestres maduros e dominados por grandes linhagens
- Objetivo de design: fase de estabilidade estratégica com alto valor de posicionamento

Efeitos:
- ramos terrestres avançados ganham eficiência;
- colônias de topo podem irradiar suporte ou pressão;
- aves e mamíferos iniciais aparecem como opções táticas.

Risco:
- ficar preso em ramos antigos reduz competitividade.

### 9. Evento K-Pg

- Nome: Extinção do Cretáceo-Paleógeno
- Janela histórica: 66 Ma
- Ideia: ruptura que destrói dominantes antigos e abre nichos
- Objetivo de design: virar o meta do fim de jogo

Efeitos:
- certas linhagens dominantes sofrem perdas fortes;
- mamíferos e ramos menores ficam comparativamente melhores;
- mapa pode reconfigurar risco por alguns turnos.

Risco:
- investir tudo em um ramo vulnerável gera colapso.

Bônus:
- jogador preparado consegue trocar de eixo e acelerar rumo aos primatas.

### 10. Ascensão dos Mamíferos e Primatas

- Nome: Cenozoico
- Janela histórica: 66 Ma até hominínios
- Ideia: nichos terrestres reorganizados favorecem novas linhagens
- Objetivo de design: reta final com foco em especialização correta

Efeitos:
- mamíferos, primatas e hominínios ganham progressão mais clara;
- erros de bioma e de timing ficam mais caros;
- pressão por eficiência substitui expansão bruta.

### 11. Janela Humana

- Nome: Emergência do Homo sapiens
- Janela histórica: ~300 ka
- Ideia: fase final de vitória
- Objetivo de design: transformar o fim em clímax, não só em último upgrade

Efeitos:
- objetivos finais explícitos;
- HUD destaca a corrida final;
- possível condição de estabilidade mínima antes da vitória.

## Como usar no jogo

### Modelo de progressão

Opção recomendada:
- a era muda quando o mundo atinge certo `worldStage`;
- algumas eras especiais também exigem marcos de mapa ou quantidade de colônias.

Exemplo:

```ts
if (highestWorldStage >= 1) era = 'great_oxygenation';
if (highestWorldStage >= 2) era = 'colonization_of_land';
if (highestWorldStage >= 3) era = 'amniote_age';
if (highestWorldStage >= 4) era = 'human_window';
```

Melhor ainda:
- usar `worldStage` + condições extras.

Exemplos:
- `Colonização da Terra` só começa quando existir vida estável em costa
- `Florestas` só começa quando houver planta terrestre ou fungo terrestre
- `Crise do Permiano` dispara ao entrar em répteis/sinapsídeos
- `K-Pg` dispara perto do ramo de mamíferos/aves

## Mecânicas novas recomendadas por era

### Mecânicas baratas de implementar primeiro

- modificador global de biomassa por era;
- modificador global de adaptação por era;
- lista de biomas temporariamente hostis;
- multiplicador de punição da Seleção Natural;
- banners e logs de transição.

### Mecânicas médias

- tiles com fertilidade variável por era;
- bônus por tipo de linhagem;
- preview de risco por colônia antes de encerrar turno.

### Mecânicas caras

- eventos climáticos localizados;
- remodelagem parcial do mapa;
- eras com regras próprias de IA/ecossistema.

## Ordem recomendada de implementação

### Fase 1

- adicionar `EraDefinition`
- guardar `currentEraId` no estado da cena
- mostrar nome da era no HUD
- disparar banner ao trocar de era

### Fase 2

- aplicar modificadores simples por era:
  - biomassa;
  - adaptação;
  - severidade da Seleção Natural.

### Fase 3

- ligar eras a marcos reais do mapa e da árvore evolutiva
- criar 2 crises reais:
  - Grande Oxigenação
  - Extinção Permiano-Triássico

### Fase 4

- introduzir eras tardias:
  - K-Pg
  - Ascensão dos Mamíferos
  - Janela Humana

## Recomendação prática

Se for escolher só o primeiro pacote de trabalho, faça:

1. `Grande Oxigenação`
2. `Colonização da Terra`
3. `Crise do Permiano`
4. `K-Pg`

Essas quatro já criam:
- começo;
- expansão;
- grande crise;
- virada final.

## Fontes-base

- Artigo usado como referência inicial: [História evolutiva da vida - Wikipédia](https://pt.wikipedia.org/wiki/Hist%C3%B3ria_evolutiva_da_vida)
- Apoio útil para eventos específicos:
  - [Grande Evento de Oxigenação](https://pt.wikipedia.org/wiki/Grande_evento_de_oxigena%C3%A7%C3%A3o)
  - [Extinção em massa](https://pt.wikipedia.org/wiki/Extin%C3%A7%C3%A3o_em_massa)
  - [Evento de extinção Cretáceo-Paleógeno](https://pt.wikipedia.org/wiki/Evento_de_extin%C3%A7%C3%A3o_Cret%C3%A1ceo%E2%80%93Pale%C3%B3geno)
