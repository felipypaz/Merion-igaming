# Bank Robbery Slot

Protótipo de slot feito com `PixiJS` e `Vite`, com motor de jogo baseado em grade, camada autoritativa local persistida e regras de UX mais próximas de um fluxo iGaming.

## Como rodar

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
```

## Arquitetura principal

- `src/game/slotEngine.js`
  Motor matemático do slot: reels, paylines, paytable, avaliação de vitórias, bonus e free spins.
- `src/backend/gameServer.js`
  Camada autoritativa local persistida em `localStorage`, responsável por autorização, settle, audit trail, recovery e regras de responsible gaming.
- `src/scenes/MainGameScene.js`
  Orquestra spin, auto spin, recovery, popup de win e integração da UI com o backend local.
- `src/components/SlotGrid.js`
  Grade visual, animação dos reels, turbo spin e highlights das linhas ganhas.
- `src/components/GameOverlays.js`
  Paytable, history, audit, last round, free spins e responsible gaming.

## Regras já aplicadas

### Estrutura do jogo

- Grade `6x5`.
- `20 paylines`.
- Pagamento `left-to-right`.
- Mínimo de `3` símbolos iguais consecutivos para pagar.
- Reels com strips fixos e ponderados por símbolo.
- Resultado visual da grade é o mesmo resultado usado no cálculo da rodada.

### Bet, saldo e rodada

- `Bet` mínima: `50`.
- `Bet` máxima: `10.000`.
- Passo da `bet`: `50`.
- O saldo nunca fica negativo.
- Se `balance < bet`, o spin não inicia.
- Se o saldo zerar e não houver free spins, a UI mostra mensagem de bloqueio.
- A `bet` não pode ser alterada durante spin.
- A `bet` não pode ser alterada com auto spin ativo.
- Existe estado de rodada: `idle`, `authorized`, `spinning`, `settling`, `settled`.

### Paytable e cálculo de vitória

- Cada símbolo tem payout próprio para `3`, `4`, `5` e `6` acertos.
- O ganho por linha usa:
  `bet * multiplicador do símbolo * payout scale * multiplicador de free spin`.
- `Payout scale` atual: `1.85`.
- O `totalWin` é a soma de todas as linhas vencedoras.
- O jogo destaca as posições vencedoras e desenha as linhas ganhas na grade.

### Bonus symbol e free spins

- Símbolo de bônus atual: `Bank`.
- O bônus dispara com `4+ Bank` em qualquer posição da grade.
- Os símbolos de bônus precisam aparecer em pelo menos `4 reels` diferentes.
- Ao disparar bônus, o jogador recebe `8 free spins`.
- Free spins usam multiplicador de ganho `x2`.
- Durante free spin, o custo do spin é `0`.
- O número de free spins restantes fica visível no topo da tela.
- O bônus pode pagar na linha como símbolo comum e também disparar free spins.

### Win tiers e apresentação

- `total`: abaixo de `5x bet`.
- `big`: `>= 5x bet`.
- `mega`: `>= 15x bet`.
- `super_mega`: `>= 30x bet`.
- O popup de win usa sequências dedicadas em `animation/_Sequences/Wins`.
- O valor real ganho aparece separado da arte fixa do win.

### Auto spin e turbo

- Auto spin com opções fixas:
  `10`, `30`, `50`, `80`, `100`, `500`, `1000`.
- O auto spin para quando:
  - acaba a quantidade escolhida
  - o saldo não cobre a `bet`
  - acontece `big win` ou acima
  - acontece bônus
  - surge `reality check`
- `Turbo spin` acelera início, parada dos reels e tempo de settle visual.
- A preferência de turbo fica persistida na camada autoritativa local.

### Última rodada, history e auditoria

- A UI mostra a última rodada com:
  - `round id`
  - `win`
  - quantidade de linhas ganhas
  - `winning lines`
  - símbolo principal vencedor
  - multiplicador principal
  - status
  - informação de bônus
- Existe painel de `Round History`.
- Existe `Audit Trail` com eventos como:
  - `SERVER_INITIALIZED`
  - `ROUND_AUTHORIZED`
  - `ROUND_SETTLED`
  - `BONUS_TRIGGERED`
  - `TURBO_CHANGED`
  - `COOLDOWN_STARTED`
  - `SELF_EXCLUSION_SET`
  - `REALITY_CHECK_ACKNOWLEDGED`
- O histórico de rodadas e a trilha de auditoria ficam persistidos.

### Backend autoritativo local

- O protótipo já não depende do front-end solto para decidir prêmio.
- Antes da animação, a rodada é autorizada pela camada `gameServer`.
- Depois da animação, a rodada é finalizada por `settleRound`.
- O débito da aposta e o crédito do prêmio acontecem na camada autoritativa local.
- O snapshot persistido guarda:
  - wallet
  - free spins
  - preferences
  - session
  - current round
  - last round
  - round history
  - audit trail

### Recovery de rodada

- Se a página recarregar com rodada autorizada e ainda não liquidada, o jogo recupera a rodada.
- O round em recovery é retomado com o mesmo resultado previamente autorizado.
- Isso evita perda de estado no meio do spin.

### Responsible gaming já aplicado

- `Session spin limit`: `300`.
- `Loss limit`: `12.500`.
- `Reality check`: a cada `15 minutos`.
- `Cooldown`: `1 minuto`.
- `Self-exclusion`: `24 horas`.
- Se um bloqueio estiver ativo, o backend local recusa novas rodadas.
- O `reality check` pausa a continuidade do jogo até confirmação do jogador.

## Itens adicionados nesta etapa

- Bonus symbol disparando rodada bônus.
- Free spins.
- Paytable visível para o jogador.
- Última rodada com detalhes visíveis.
- Winning lines, símbolo vencedor e multiplicador principal visíveis.
- Turbo spin.
- Round history.
- Audit trail.
- Recovery de rodada interrompida em reload.
- Limites e fluxos básicos de responsible gaming.
- Camada autoritativa local para saldo e resultado.

## O que esta implementação faz e o que ela ainda não faz

### Já faz no protótipo

- Emula um backend autoritativo dentro do navegador.
- Persiste saldo e rodada entre reloads.
- Autoriza e liquida rodadas de forma centralizada.
- Aplica débito, crédito, history e auditoria no mesmo fluxo.

### Ainda não é backend real de produção

- Não existe servidor remoto.
- Não existe banco de dados externo.
- Não existe wallet service separado.
- Não existe RNG certificado por laboratório.
- Não existe autenticação de usuário.
- Não existe reconciliação entre cliente e servidor real.
- Não existe assinatura criptográfica ou round proof.
- Não existe fila, lock distribuído ou transação ACID real.

Em outras palavras:
o projeto já tem um backend autoritativo local para protótipo e debug, mas ainda não substitui um backend iGaming real.

## Regras matemáticas atuais

- Símbolos com payout:
  - `Bank`
  - `Safe`
  - `Dynamit`
  - `Handcuffs`
  - `Cell`
  - `A`
  - `K`
  - `Q`
  - `J`
  - `10`
- Trigger de bônus:
  - `4+ Bank` em qualquer posição
  - mínimo de `4 reels` diferentes com bônus
- Free spins:
  - `8`
- Multiplicador dos free spins:
  - `x2`
- Big win stop para auto spin:
  - `>= 5x bet`

## Observações de tuning

- O RTP e a frequência de bônus ainda são de protótipo.
- O fluxo está pronto para tuning via:
  - paytable
  - reel strips
  - trigger de bônus
  - quantidade de free spins
  - multiplicador de free spin
- Qualquer ajuste matemático deve ser feito em `src/game/slotEngine.js`.

## Reset do estado local

O backend local usa a chave:

```txt
merion-slot-server-state-v1
```

Para resetar o estado durante desenvolvimento, remova essa chave do `localStorage` no navegador.

## Próximos passos recomendados

- Trocar o backend local por um serviço remoto real.
- Persistir wallet e rounds em banco.
- Adicionar autenticação de sessão.
- Introduzir RNG/seed assinado pelo servidor.
- Criar paytable visual com ícones dos símbolos.
- Adicionar tela detalhada da última rodada com cada linha vencedora.
- Ajustar a frequência do bônus se necessário para o balanceamento final.
