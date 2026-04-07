# Tiny Evolution

Simulador de evolução biológica com interface em português brasileiro (pt-BR).

## Regras atuais do jogo

O jogo roda em um `canvas` e usa uma cena principal por turnos em um mapa hexagonal `6x6` com três biomas: `oceano`, `costa` e `terra`. O mapa é gerado aleatoriamente, mas sempre mantém variedade mínima de biomas e adjacências viáveis entre mar, litoral e interior.

### Objetivo

O objetivo da campanha é fazer pelo menos uma colônia evoluir de `Bactéria Primitiva` até `Homo sapiens`.

Na prática, vencer significa manter uma linhagem viva em uma rota humana, juntar biomassa local suficiente, posicioná-la no bioma certo e adaptar etapa por etapa até `Homo sapiens`. A partida termina em derrota em dois casos:

- quando todas as colônias são extintas;
- quando ainda existem colônias vivas, mas nenhuma pertence mais a um ramo capaz de chegar a `Homo sapiens`.

Isso torna expansão e redundância importantes: depender de uma única colônia pode perder a campanha se a Seleção Natural ou uma ramificação sem saída eliminar a última rota humana.

### Início da partida

A partida começa com `1` colônia de `Bactéria Primitiva` em um tile de oceano com nutrientes, quando possível. A colônia inicial começa com:

- `2` de população;
- `2` de biomassa local;
- `1` ponto de adaptação.

### Estrutura do turno

Cada turno tem duas fases:

1. `Planejamento`: o jogador seleciona colônias e executa ações.
2. `Seleção Natural`: o ambiente resolve automaticamente suporte, atrito e punições ecológicas.

Os pontos de ação do turno não são fixos. Eles são iguais ao número de colônias prontas para agir no início do turno. Em geral, cada colônia não terminal pode agir `1` vez por turno.

### Biomas e ocupação

Cada forma de vida possui biomas permitidos. Uma colônia só pode existir ou se expandir para tiles compatíveis com a forma de vida atual.

Na prática:

- formas primitivas ficam restritas ao oceano;
- algumas linhagens marinhas passam a aceitar costa;
- linhagens terrestres exigem costa ou terra, dependendo do estágio.

Isso significa que o posicionamento no tabuleiro é parte central da progressão evolutiva.

### Ações do jogador

#### Explorar automaticamente

Se uma colônia pronta para agir chega ao fim do turno sem outra ordem, ela entra em exploração automática. Quando a exploração é resolvida, a colônia consome sua ação e recebe:

- biomassa local igual à energia do tile multiplicada pelo grupo biológico da colônia;
- `+1` população;
- fortificação temporária contra isolamento naquele ciclo.

Na produção ecológica do mesmo fim de turno, colônias não terminais estabelecidas também recebem biomassa pelo tile (`mínimo +1`) e `+1` ponto de adaptação. Na prática, colônias deixadas sem ordem tendem a gerar recursos para preparar adaptações futuras.

#### Adaptar

Gasta `1` ponto de adaptação da colônia e faz a linhagem avançar para a próxima forma evolutiva disponível.

Para adaptar, a colônia precisa:

- ainda ter adaptação disponível;
- estar em um bioma compatível com a próxima etapa;
- cumprir a população mínima da transição.
- ter biomassa local suficiente para pagar o custo de adaptação.

O custo de adaptação é calculado a partir da energia do tile e do multiplicador do grupo biológico de destino. Formas mais complexas tendem a exigir mais biomassa, então explorar antes de adaptar faz parte do planejamento.

O jogo não deixa o jogador escolher livremente qualquer ramo da árvore. Quando existem vários caminhos possíveis, o sistema prioriza automaticamente ramos que ainda preservam uma rota até `Homo sapiens`.

#### Expandir

Cria uma nova colônia em um tile hexagonal vizinho válido.

Regras da expansão:

- custa `1` biomassa local da colônia de origem;
- a nova colônia nasce com a mesma forma de vida da colônia-mãe;
- a nova colônia começa com `1` de população e `1` de biomassa;
- a expansão é imediata na versão atual, sem espera adicional.

#### Semear vida

Permite criar uma nova `Bactéria Primitiva` em qualquer tile livre de oceano.

Regras da semeadura:

- custa `4` de biomassa do total somado entre todas as colônias;
- a nova colônia nasce com `2` de população;
- a nova colônia nasce com `2` de biomassa;
- ela entra em jogo já pronta como uma nova linhagem primitiva.

#### Decompor

Disponível apenas para colônias terminais, isto é, colônias que chegaram ao fim do próprio ramo evolutivo nesta campanha.

Ao decompor:

- a colônia é removida do tabuleiro;
- seus pontos de adaptação são redistribuídos entre colônias vizinhas;
- o tile é liberado para reposicionamento do ecossistema.

### Colônias terminais

Uma colônia terminal é uma linhagem que chegou a um ponto sem novas evoluções naquela campanha, como por exemplo alguns ramos especializados.

Essas colônias deixam de servir para avançar rumo ao humano, mas passam a ter valor ecológico:

- não sofrem atrito passivo de biomassa na Seleção Natural;
- cada colônia adjacente recebe `+1` biomassa por colônia terminal vizinha;
- no fim do turno, também ajudam colônias vizinhas não terminais com adaptação extra.

### Fim do turno

Quando o jogador encerra o turno, o jogo resolve nesta ordem:

1. ordens automáticas de exploração;
2. recompensa imediata das colônias em exploração;
3. produção ecológica do turno;
4. atualização do estágio global da vida;
5. fase automática de `Seleção Natural`.

Durante a produção ecológica:

- toda colônia estabelecida recebe `+1` ponto de adaptação;
- toda colônia não terminal estabelecida recebe biomassa do tile (`mínimo +1`);
- colônias terminais distribuem adaptação extra para vizinhas não terminais.

### Seleção Natural

A Seleção Natural pune erros de posicionamento e sustenta ecossistemas bem montados. Hoje ela aplica quatro tipos principais de evento:

- `support`: colônias vizinhas de ramos terminais recebem biomassa;
- `attrition`: colônias não terminais e antigas perdem `1` biomassa local para sustentar a linhagem;
- `exposure`: colônias isoladas fora do oceano perdem população se não estiverem fortificadas;
- `stagnation`: colônias estacionadas no bioma errado perdem adaptação e, se já estiverem sem adaptação, passam a perder população.

Se uma colônia chega a `0` de biomassa ou `0` de população, ela é extinta.

### Progressão evolutiva

A árvore evolutiva parte de `Bactéria Primitiva` e atravessa formas marinhas, costeiras e terrestres até chegar a `Homo sapiens`.

O sistema atual foi desenhado para preservar pelo menos um caminho viável até o humano:

- ramos sem saída podem ser bloqueados se forem destruir a última rota restante;
- desvios especializados ficam mais seguros quando já existem outras linhagens paralelas mantendo o caminho principal;
- o jogador precisa usar expansão, biomassa, adaptação e posicionamento para sustentar mais de uma frente evolutiva ao mesmo tempo.

## Desenvolvimento

```bash
npm run dev       # servidor de desenvolvimento
npm run build     # build de produção
npm run test      # testes
```

## Encoding do projeto

Este projeto utiliza **UTF-8** em todos os arquivos. Isso é necessário porque o código contém:

- Texto em português com acentos (á, é, ã, ç, etc.)
- Emojis usados na interface (🌋, 🧬, 🦠, 💧, etc.)
- Caracteres especiais decorativos (──, ═══, →, ×)

### Regras de encoding

| Aspecto         | Valor   | Configurado em       |
|-----------------|---------|----------------------|
| Charset         | UTF-8   | `.editorconfig`      |
| Line endings    | LF      | `.editorconfig`, `.gitattributes` |
| HTML charset    | UTF-8   | `index.html` (`<meta charset="UTF-8">`) |
| BOM             | Nenhum  | Não usar BOM em nenhum arquivo |

### Como evitar problemas

1. **Editor**: configure seu editor para salvar em UTF-8 sem BOM e com line endings LF. O `.editorconfig` cuida disso automaticamente se seu editor tiver suporte (VS Code, JetBrains, etc.).
2. **Git (Windows)**: o `.gitattributes` já força `eol=lf`. Se ainda tiver problemas, configure:
   ```bash
   git config core.autocrlf input
   ```
3. **Novos arquivos**: sempre crie arquivos em UTF-8 com line endings LF.
