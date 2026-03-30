Original prompt: Crie um novo turno que é automatico e roda sozinho, chamado Seleção Natural, que deixa claro erros cometidos pelo jogador

- 2026-03-30: análise inicial concluída. O loop principal fica em `src/game/turns/TurnGameScene.ts`, com resolução instantânea em `endTurn()`.
- Plano: transformar o fim do turno em duas fases (`jogador` e `Seleção Natural`), adicionar feedback visual no HUD e cobrir a nova regra com testes.
- 2026-03-30: implementada a fase automatica de Selecao Natural com punicao por isolamento e estagnacao de bioma. Hooks de debug adicionados em Game.\n- Validacao: 
pm test -- src/tests/TurnGameScene.test.ts --run e 
px tsc --noEmit passaram.
- Browser check: Vite abriu em http://127.0.0.1:5173 e o fim de turno exibiu a resolucao automatica da Selecao Natural no registro.\n
