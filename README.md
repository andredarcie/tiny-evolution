# Tiny Evolution

Simulador de evolução biológica com interface em português brasileiro (pt-BR).

## Regras atuais do jogo

O jogo roda em um `canvas` e usa uma cena principal por turnos em um mapa `8x8` com três biomas: `oceano`, `costa` e `terra`. O mapa é gerado aleatoriamente, mas sempre tenta manter uma transição viável entre mar, litoral e interior.

### Objetivo

O objetivo da campanha é conduzir pelo menos uma linhagem evolutiva até `Homo sapiens`.

Você vence quando uma colônia adapta para `Homo sapiens`. Você perde em dois casos:

- quando todas as colônias são extintas;
- quando ainda existem colônias vivas, mas nenhuma pertence mais a um ramo capaz de chegar ao humano.

### Início da partida

A partida começa com `3` colônias de `Bactéria Primitiva`, todas no oceano. Cada colônia inicial começa com:

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

#### Consolidar

Ativa o modo de consolidação automática para a colônia selecionada. Quando o turno termina, se essa colônia ainda puder agir, ela consome sua ação automaticamente e recebe:

- `+2` biomassa local;
- `+1` população;
- fortificação temporária contra isolamento naquele ciclo.

A consolidação automática continua ativa nos turnos seguintes até o jogador desligá-la.

#### Adaptar

Gasta `1` ponto de adaptação da colônia e faz a linhagem avançar para a próxima forma evolutiva disponível.

Para adaptar, a colônia precisa:

- ainda ter adaptação disponível;
- estar em um bioma compatível com a próxima etapa;
- cumprir a população mínima da transição.

O jogo não deixa o jogador escolher livremente qualquer ramo da árvore. Quando existem vários caminhos possíveis, o sistema prioriza automaticamente ramos que ainda preservam uma rota até `Homo sapiens`.

#### Expandir

Cria uma nova colônia em um tile ortogonal adjacente válido.

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

1. ordens automáticas de consolidação;
2. recompensa imediata das colônias consolidadas;
3. produção ecológica do turno;
4. atualização do estágio global da vida;
5. fase automática de `Seleção Natural`.

Durante a produção ecológica:

- toda colônia estabelecida recebe `+1` ponto de adaptação;
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
