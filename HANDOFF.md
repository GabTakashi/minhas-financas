# Handoff — Minhas Finanças

**Gerado em:** 25/08/2026
**Último commit:** `a175d0c feat: painel com heroi do saldo e faixa da regra 50/30/20`

---

## 1. O que é

App de finanças pessoais auto-hospedado, em produção e em uso diário real pelo usuário.

| Item | Onde |
|---|---|
| **Código** | `C:\Users\Takashi\Documents\Pessoal\Finanças` |
| **App no ar** | https://minhas-financas-beige-rho.vercel.app |
| **Repositório** | https://github.com/GabTakashi/minhas-financas (público) |
| **Guia do projeto** | `CLAUDE.md` na raiz — leia antes de mexer |
| **Banco** | Neon (Postgres). String de conexão em `.env.local` (**não versionado**) |
| **Deploy** | Vercel, projeto `minhas-financas` (org `gabtakashis-projects`) |

**Stack:** Next.js 16 (App Router) + TypeScript + Postgres (Neon serverless driver) + NextAuth
(login só por identificador, sem senha) + React Query. Idioma de todo o produto: **pt-BR**.

**Não há Tailwind nem biblioteca de gráficos.** O estilo é um `app/globals.css` único com classes
semânticas em português, e os cinco gráficos são SVG escrito à mão. Isso é deliberado — veja a
seção 5.

---

## 2. Estado atual

- **Branch:** `main`, working tree limpo, tudo commitado e publicado
- **140 testes** passando (`npm test`), typecheck e build limpos
- **~5.840 linhas** em `app/`, `components/`, `lib/`, `hooks/`
- O histórico dos **49 commits** é a documentação viva do projeto: as mensagens registram o
  *porquê* das decisões não óbvias. Use `git log --oneline` e `git show <hash>` em vez de reler
  o código inteiro.

### O que as últimas sessões entregaram

Os hashes mudaram em 24/08: o repositório foi republicado em
`github.com/GabTakashi/minhas-financas` (o remote antigo, `junoorb36-bot`, não aceitava push —
as credenciais desta máquina são da conta `GabTakashi`).

| Commit | O quê |
|---|---|
| `f4275ea` | Parcelados: card RESTANTE, gráfico de projeção da dívida, Pagar parcela / Quitar parcelado |
| `3eb3be2` | Extrato agrupado por dia + data explícita no lançamento |
| `f5b7d1f` | Nota pela regra 50/30/20 + orçamento em grupos expansíveis |
| `bb13591` | Rosca da distribuição de gastos no topo do Orçamento |
| `da0fde3` | Nota punitiva (2,5×), remoção do Cartão, limpeza de UI e acessibilidade |
| `09d5c38` | Economia do mês no realizado + nota compacta centralizada |
| `b408f79` | **Next 16 + next-auth beta.32** — 19 CVEs do scan de segurança |
| `a175d0c` | Painel com herói do saldo e faixa da regra 50/30/20 |

---

## 3. Onde está cada coisa

### Lógica de negócio pura (`lib/`) — tem teste, mexa aqui primeiro
| Arquivo | Responsabilidade |
|---|---|
| `score.ts` | IPF (0–100) **pela regra 50/30/20** — veja a seção 4 |
| `resumo.ts` | `resumoDoMes`, `guardadoNoMes` — **poupança = saldo + Investimentos/Reserva** |
| `totals.ts` | Totais do mês, realizado vs previsto, gastos por categoria, distribuição por grupo |
| `dias.ts` | Data do lançamento e agrupamento do extrato por dia |
| `parcelado.ts` | Parcelados: valor da parcela, vigência, calendário, saldo, projeção da dívida |
| `metas.ts` | Série de metas, análise de padrão, status do mês |
| `streak.ts` | Constância: dias registrados, selos |
| `filtros.ts` | Busca e ordenação de lançamentos |
| `newMonth.ts` | Criação do mês novo (copia fixos, recria parcelados) |
| `money.ts` `months.ts` `categories.ts` `types.ts` | Utilitários |

### Acesso a dados
- **`lib/actions.ts`** — TODAS as server actions. **Aqui mora a segurança**: cada função resolve
  `userId()` da sessão e escopa por `user_id`. Não há RLS no banco. Nunca escreva query sem isso.
- `lib/db.ts` — cliente Neon.
- `hooks/useFinance.ts` — hooks React Query que embrulham as actions.

### Telas (`app/(app)/`)
`page.tsx` (painel) · `lancamentos/` · `parcelados/` · `metas/` · `orcamento/` ·
`desempenho/` · `config/`

### Componentes-chave (`components/`)
`Sidebar.tsx` (lateral no desktop + barra de abas no celular + folha "Mais") ·
`TxModal.tsx` · `TxLinha.tsx` (linha compartilhada) · `TxDias.tsx` (extrato por dia) ·
`TxSection.tsx` (extrato por tipo) · `ParceladoWizard.tsx` · `BudgetGroups.tsx` (accordion) ·
`DonutOrcamento.tsx` · `ProjecaoDivida.tsx` · `EvolutionChart.tsx` · `ScorePainel.tsx` ·
`FaixaRegra.tsx` (faixa 50/30/20 do painel) · `Constancia.tsx` · `PullToRefresh.tsx` · `Logo.tsx`

### Banco
- **`db/schema.sql`** — schema completo e comentado.
- Tabelas: `users` (tem `meta_pct`), `months` (tem `meta`), `transactions` (tem `parcelado_id`),
  `budgets`, `budget_groups`, `parcelados`, `telegram_pending`.
- **Ainda existem** `cards`, `card_purchases` e `card_invoice_payments`, **vazias**. A feature de
  Cartão foi removida do app em `d6488ed`, mas as tabelas ficaram de propósito (e `exportAll`
  continua exportando as três) como rede de segurança. Ninguém as lê hoje.
- **Atenção:** o schema foi alterado por `ALTER TABLE` direto no banco em várias sessões.
  `schema.sql` foi mantido em dia, mas **não é idempotente** — serve para instalar do zero.

### Scripts
- `scripts/apply-schema.mjs` — aplica o schema num banco vazio
- `scripts/backup-db.mjs` — **exporta todas as tabelas para JSON**

---

## 4. Como a nota (IPF) funciona hoje

Vale reler antes de mexer — a matemática mudou duas vezes em 14/08.

- A nota **sai dos grupos de orçamento do próprio usuário**, não de pesos escritos no código. Se
  ele mudar Essenciais para 60%, o pilar passa a valer 60 pontos.
- Grupo de gasto é **teto**, grupo de poupança é **meta**. Dentro da regra, nota cheia.
- Fora da regra, **cada ponto percentual de desvio custa 2,5 pontos** (`PENALIDADE`), com chão
  em 0. Efeito: Essenciais zera aos 70% da renda, Não essenciais aos 42%, e o pilar de poupança
  zera guardando 12% ou menos.
- Quem é "meta" **não vem do nome do grupo**, e sim de ele conter só categorias de
  `CATEGORIAS_POUPANCA` — continua funcionando se o usuário renomear o grupo.
- Faixas: 90–100 Excelente · 75–89 Muito Bom · 50–74 Atenção · 0–49 Crítico.
  `corDaFaixa()` em `ScorePainel.tsx` segue os mesmos cortes — **mude os dois juntos**.
- Sem grupos ou sem receita, `pronto: false` e o card chama para configurar, em vez de mostrar
  um zero que puniria quem só não configurou ainda.
- **Toda categoria precisa estar num grupo**, senão a regra não fecha em 100% dos gastos. O
  editor não oferece mais "Sem grupo"; se ainda houver categoria órfã com gasto, a tela de
  Orçamento mostra um aviso nomeando-a — nunca deixe esse dinheiro sumir em silêncio.

---

## 5. Decisões de projeto que NÃO devem ser desfeitas

1. **Poupança inclui o que foi separado.** Gastos em `Investimentos` e `Reserva de Emergência`
   contam como economia, não como consumo (`CATEGORIAS_POUPANCA` em `lib/categories.ts`). Sem isso
   o app penaliza quem poupa — foi um bug real, já corrigido.
2. **Realizado vs Previsto.** Cards do painel mostram o realizado grande e o previsto embaixo.
3. **Parcelado é a fonte da verdade.** Um parcelado gera lançamento fixo em cada mês vigente
   (ligado por `transactions.parcelado_id`). Editar propaga; sair de vigência remove o pendente;
   `newMonth.ts` recria a partir do parcelado, **não** copia o fixo antigo.
4. **Excluir parcelado preserva lançamentos já pagos** (histórico real); só remove pendentes.
5. **Quitação antecipada lança despesa `variavel`, não `fixo`** — como fixo, o `newMonth.ts`
   copiaria a quitação para todo mês seguinte.
6. **Nos parcelados, quem manda sobre "parcela paga" é `parcelas_pagas`**, não o status do
   lançamento: é o contador que define o saldo. Por isso um parcelado atrasado ainda oferece o
   botão "Pagar parcela", que serve justamente para reconciliar os dois.
7. **A data do lançamento é `month` + `dia_vencimento`**, sem coluna nova no banco. Quem não
   informou dia usa o dia em que registrou (`data_registro`, vindo de `created_at` no fuso de SP).
   O seletor é limitado ao mês aberto — fora dele, o lançamento iria para um mês que talvez nem
   tenha sido iniciado.
8. **Nada de biblioteca de gráficos.** Recharts custaria ~100 KB gzipped no First Load, que hoje
   é 102 KB inteiro. Os cinco gráficos são SVG à mão, seguindo o mesmo padrão.
9. **Cor de série segue a entidade, nunca o estado.** Nas barras de orçamento o verde significa
   "dentro do teto" e viraria vermelho ao estourar; na rosca a cor é fixa por grupo
   (`--serie-1..4`), senão as fatias trocariam de cor conforme o mês.
10. **Paletas de gráfico são validadas, não escolhidas a olho.** Rode
    `scripts/validate_palette.js` da skill `dataviz`. O laranja `--serie-2` é mais quente que
    `--warning` porque o âmbar dava só ΔE 6.5 contra o verde em protanopia (piso é 8).
11. **`--text-3` é `#8B8FA8`** porque o antigo `#6E7191` dava 3.95:1 sobre o card, abaixo do
    mínimo AA de 4.5:1. Não escureça de volta.
12. **A JetBrains Mono é a face de display do painel**, não só a fonte dos valores. O saldo do mês
    vai a 68px em mono com tracking −0.055em; a Urbanist recua para rótulo e interface. A mono já
    era a voz do dinheiro no app, e em escala grande dá o caráter de registro contábil.
13. **A faixa 50/30/20 (`FaixaRegra.tsx`) são duas trilhas empilhadas**, régua em cima e real
    embaixo, na mesma escala. A primeira versão marcava o alvo com traços verticais **por cima**
    do bloco real: eles caíam dentro do bloco, cortavam-no em pedaços e pareciam divisórias de
    grupo. Não reintroduza a marca sobreposta.
14. **`next-auth` é atualizado pela tag `beta`, nunca pela `latest`.** A `latest` aponta para a
    linha v4 (4.24.15); um `npm i next-auth@latest` faz **downgrade** e quebra o login inteiro,
    porque a API da v4 é outra. Ficar no Next 15.x também não resolve CVE de `postcss`/`sharp`:
    o 15.5.23 ainda pina as versões vulneráveis, só o Next 16 traz as corrigidas.

---

## 6. Pegadinhas conhecidas

- **NUNCA rode `npm run build` com o dev server no ar.** O build sobrescreve o `.next/` e o dev
  passa a responder 500 em tudo (`Cannot find module './xxx.js'`, `ENOENT @auth.js`). Isso
  aconteceu **três vezes** em 14/08. O certo: pare o dev, rode o build, apague o `.next/`, suba o
  dev de novo. Vale também para apagar o `.next/` — só com o servidor parado.
- **Deploy da Vercel falha com "Not authorized" de forma intermitente.** Rode
  `npx vercel deploy --prod --yes` de novo — funciona na segunda.
- **A pasta fica no OneDrive**, que às vezes trava arquivos do `.git` no meio de uma operação
  (`Unable to create '.git/CHERRY_PICK_HEAD.lock': File exists`, `could not remove .git/sequencer`).
  Não é processo git concorrente: apague o `.lock`/`sequencer` e refaça. Em operação longa, um
  commit de cada vez sofre menos que tudo de uma vez.
- **`next-env.d.ts` alterna sozinho** entre `.next/types` e `.next/dev/types` conforme o último
  comando tenha sido `build` ou `dev`. É ruído esperado no `git status`; o `tsconfig.json` inclui
  os dois caminhos, então funciona nos dois modos.
- **Não há identidade git configurada globalmente.** Já está setada localmente neste repo como
  `Gabriel <gabrieltgyamashita@gmail.com>`; se aparecer "Author identity unknown", é isso.
- **Env vars da Vercel no PowerShell:** use Git Bash com `printf '%s' "$v" | npx vercel env add ...`,
  senão um `\r` é anexado e quebra o build.
- **Testar no navegador exige login**, e o login do usuário **funciona como senha** — não o
  digite. Peça para ele entrar na Browser pane e siga daí.
- **A Browser pane atrasa o frame:** screenshots logo após um clique mostram o estado anterior.
  Confirme pelo DOM (`javascript_tool`) antes de concluir que algo não funcionou.
- **`npm test -- --run <arquivo>`** roda um teste só; `npm test` roda tudo.
- **Numeric do Postgres** chega como string via driver — os selects usam `::float`; mantenha o
  padrão em queries novas.

---

## 7. O que falta / próximos passos

Não há pendência funcional aberta — as 4 telas pedidas pelo usuário foram entregues e todas as
mudanças estão em produção. Candidatos naturais:

- **Migração para shadcn/ui** — a skill está instalada (`skills-lock.json`) e o usuário quer
  avaliar numa sessão dedicada. O custo é alto: exige Tailwind + Radix, que o projeto não usa;
  seria reescrever a camada de apresentação inteira e refazer a paleta validada (decisões 8 a 11).
  O ganho é acessibilidade pronta em modais e accordions. Não comece sem confirmar com ele.
- **`simplify`** — `app/globals.css` passou de 1.200 linhas e `lib/actions.ts` cresceu bastante.
  A remoção do Cartão deixou espaço para uma passada de limpeza.
- **Ordem dos grupos na rosca, no accordion e na faixa** — as três listas seguem
  `budget_groups.ordem`, então as cores batem entre si. Se a ordem divergir, as cores divergem.
- **Propagar o refino visual** — o herói e a hierarquia nova estão só na Visão geral. Lançamentos,
  Orçamento e Desempenho seguem no layout antigo de cards de peso uniforme.
- **Meses futuros:** o app depende de o mês ser "iniciado" para aparecer. O cron em
  `app/api/cron/route.ts` faz isso automaticamente se `CRON_SECRET` estiver configurado na Vercel.

---

## 8. Como validar antes de entregar

```bash
npm run typecheck && npm test && npm run build
```

Depois teste no navegador com dados reais (`preview_start` → `financas-dev`, **com o build já
encerrado**), em **1500px e 375px**, conferindo estouro horizontal:
```js
document.documentElement.scrollWidth > document.documentElement.clientWidth
```

**Se criar dado de teste no banco, apague depois** — é o banco de produção do usuário, em uso real.
Para diagnóstico, um script `.mjs` lendo `DATABASE_URL` do `.env.local` funciona bem, mas rode-o
**de dentro da pasta do projeto** (senão o Node não acha `@neondatabase/serverless`).

---

## 9. Backups (o que está salvo)

Em `backups/` (fora do git, por conter dados pessoais — veja `.gitignore`):

- `backup-2026-08-03T16-49-33-222Z.json`
- `backup-2026-08-04T16-13-07-844Z.json`
- `backup-2026-08-12T12-42-03-151Z.json` ← **mais recente**

Para gerar outro:
```bash
DATABASE_URL="<string do .env.local>" node scripts/backup-db.mjs
```

O app também exporta backup pela interface, em **Ajustes → Exportar backup**.

---

## 10. Skills sugeridas

| Skill | Quando |
|---|---|
| **`dataviz`** | **Obrigatória** antes de escrever qualquer gráfico ou escolher cor de série. Rode `scripts/validate_palette.js` — não confie no olho. |
| `simplify` | Primeiro item da seção 7. |
| `code-review` / `security-review` | Antes de mudanças em `lib/actions.ts` (é onde mora o escopo por usuário). |
| `handoff` | Ao fim da próxima sessão, para passar adiante. |

---

## 11. Segredos — NÃO estão neste documento

Ficam apenas em `.env.local` (fora do git) e nas env vars da Vercel:
`DATABASE_URL`, `AUTH_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
`TELEGRAM_CHAT_ID`, `TELEGRAM_USER_LOGIN`, `CRON_SECRET`, `VERCEL_OIDC_TOKEN`.

⚠️ **O login do app funciona como senha** (autenticação só por identificador, sem senha).
Ele está no `.env.local` e no banco — **nunca** o escreva em documento, commit ou log.
Para pegá-lo: `select login from users;` ou leia `TELEGRAM_USER_LOGIN` do `.env.local`.
