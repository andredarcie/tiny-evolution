# Tiny Evolution

Simulador de evolução biológica com interface em português brasileiro (pt-BR).

## Como o projeto funciona

O jogo roda em um `canvas` e usa uma cena principal por turnos em um mapa `8x8` com três biomas: oceano, costa e terra. O jogador começa com colônias de vida primitiva no oceano e, a cada turno, administra ações para expandir, consolidar, adaptar ou semear novas colônias.

Cada colônia pertence a uma forma de vida e só pode ocupar biomas compatíveis com sua etapa evolutiva. Ao acumular biomassa, população e pontos de adaptação, a colônia avança pela árvore evolutiva do projeto, saindo de bactérias primitivas e passando por formas marinhas e terrestres até chegar ao humano, que marca a vitória.

No fim de cada turno, colônias estabelecidas produzem biomassa e ganham adaptação. Algumas ações levam mais de um turno para concluir, então o progresso depende de posicionamento no mapa, escolha do bioma correto e gestão do tempo de cada colônia.

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
