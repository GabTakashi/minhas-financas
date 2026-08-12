# Handoff — Minhas Finanças

**Gerado em:** 12/08/2026
**Foco da próxima sessão:** terminar as 2 telas pendentes (Transações por dia, Parcelados no estilo novo).

---

## 1. O que é

App de finanças pessoais auto-hospedado, em produção e em uso diário real pelo usuário.

| Item | Onde |
|---|---|
| **Código** | `C:\Users\Takashi\Documents\Pessoal\Finanças` |
| **App no ar** | https://minhas-financas-beige-rho.vercel.app |
| **Repositório de origem** | https://github.com/junoorb36-bot/minhas-financas |
| **Guia do projeto** | `CLAUDE.md` na raiz — leia antes de mexer |
| **Banco** | Neon (Postgres). String de conexão em `.env.local` (**não versionado**) |
| **Deploy** | Vercel, projeto `minhas-financas` (org `gabtakashis-projects`) |

**Stack:** Next.js 15 (App Router) + TypeScript + Postgres (Neon serverless driver) + NextAuth
(login só por identificador, sem senha) + React Query. Idioma de todo o produto: **pt-BR**.

---

## 2. Estado atual

- **Branch:** `main`, working tree limpo, tudo commitado
- **Último commit:** `161e034 feat: faixa de receita no painel e aba Metas dedicada`
- **117 testes** passando (`npm test`), typecheck limpo (`npm run typecheck`)
- **~6.100 linhas** em `app/`, `components/`, `lib/`, `hooks/`
- Todo o histórico do que foi construído está nos **14 commits** — use `git log --oneline` e
  `git show <hash>` em vez de reler o código inteiro.

---

## 3. Onde está cada coisa

### Lógica de negócio pura (`lib/`) — tem teste, mexa aqui primeiro
| Arquivo | Responsabilidade |
|---|---|
| `score.ts` | IPF (0–100), 4 pilares de 25 pts |
| `resumo.ts` | `resumoDoMes`, `guardadoNoMes` — **poupança = saldo + Investimentos/Reserva** |
| `parcelado.ts` | Parcelados: valor da parcela, vigência, calendário, saldo |
| `parcelados.ts` | Progresso das compras parceladas **do cartão** (fonte diferente) |
| `metas.ts` | Série de metas, análise de padrão, status do mês |
| `streak.ts` | Constância: dias registrados, selos |
| `filtros.ts` | Busca e ordenação de lançamentos |
| `invoice.ts` | Fatura do cartão, parcelas, limite utilizado |
| `totals.ts` | Totais do mês, **realizado vs previsto**, gastos por categoria |
| `newMonth.ts` | Criação do mês novo (copia fixos, recria parcelados) |
| `money.ts` `months.ts` `categories.ts` `types.ts` | Utilitários |

### Acesso a dados
- **`lib/actions.ts`** — TODAS as server actions. **Aqui mora a segurança**: cada função resolve
  `userId()` da sessão e escopa por `user_id`. Não há RLS no banco. Nunca escreva query sem isso.
- `lib/db.ts` — cliente Neon.
- `hooks/useFinance.ts` — hooks React Query que embrulham as actions.

### Telas (`app/(app)/`)
`page.tsx` (painel) · `lancamentos/` · `cartao/` · `parcelados/` · `metas/` · `orcamento/` ·
`desempenho/` · `config/`

### Componentes-chave (`components/`)
`Sidebar.tsx` (lateral no desktop + **barra de abas no celular** + folha "Mais") ·
`TxModal.tsx` (modal de lançamento) · `ParceladoWizard.tsx` (assistente 4 etapas) ·
`FaixaReceita.tsx` · `ScorePainel.tsx` · `Constancia.tsx` · `EvolutionChart.tsx` ·
`PullToRefresh.tsx` · `Logo.tsx`

### Estilo
- **`app/globals.css`** — arquivo único, ~900 linhas. Tokens no `:root` (paleta FINANCIA:
  Ink Black `#080910`, Black Denim `#1C1C2B`, lavanda `#C0B4FE`).
- Fontes: **Urbanist** (interface) + **JetBrains Mono** (todo valor em R$, com `tabular-nums`).
- Não existe Tailwind nem CSS-in-JS. Classes semânticas em português.

### Banco
- **`db/schema.sql`** — schema completo e comentado.
- Tabelas: `users` (tem `meta_pct`), `months` (tem `meta`), `transactions` (tem `parcelado_id`),
  `cards`, `card_purchases`, `card_invoice_payments`, `budgets`, `budget_groups`,
  `parcelados`, `telegram_pending`.
- **Atenção:** o schema foi alterado por `ALTER TABLE` direto no banco em várias sessões.
  `schema.sql` foi mantido em dia, mas ele **não é idempotente** — serve para instalar do zero.

### Scripts
- `scripts/apply-schema.mjs` — aplica o schema num banco vazio
- `scripts/backup-db.mjs` — **exporta todas as tabelas para JSON**

---

## 4. Backups (o que está salvo)

Em `backups/` (fora do git, por conter dados pessoais — veja `.gitignore`):

- `backup-2026-08-03T16-49-33-222Z.json`
- `backup-2026-08-04T16-13-07-844Z.json`
- `backup-2026-08-12T12-42-03-151Z.json` ← **mais recente**: 2 usuários, 33 lançamentos

Para gerar outro:
```bash
DATABASE_URL="<string do .env.local>" node scripts/backup-db.mjs
```

O app também exporta backup pela interface, em **Ajustes → Exportar backup**.

---

## 5. Decisões de projeto que NÃO devem ser desfeitas

1. **Poupança inclui o que foi separado.** Gastos em `Investimentos` e `Reserva de Emergência`
   contam como economia, não como consumo (`CATEGORIAS_POUPANCA` em `lib/resumo.ts`). Sem isso o
   app penaliza quem poupa — foi um bug real, já corrigido.
2. **Realizado vs Previsto.** Cards do painel mostram o realizado grande e o previsto embaixo.
   `monthTotals` = previsto; `monthTotalsRealizado` = só pago/recebido.
3. **Parcelado é a fonte da verdade.** Um parcelado gera lançamento fixo em cada mês vigente
   (ligado por `transactions.parcelado_id`). Editar propaga; sair de vigência remove o pendente;
   `newMonth.ts` recria a partir do parcelado, **não** copia o fixo antigo.
4. **Paleta dos gráficos validada para daltonismo** (`#3DD6A0` / `#E04B6E` / `#C0B4FE`,
   ΔE 14.5 deutan). Se trocar, revalide com o validador da skill `dataviz`.
5. **Excluir parcelado preserva lançamentos já pagos** (histórico real); só remove pendentes.

---

## 6. Pegadinhas conhecidas

- **Deploy da Vercel falha com "Not authorized" de forma intermitente.** Simplesmente rode
  `npx vercel deploy --prod --yes` de novo — funciona na segunda.
- **Env vars da Vercel no PowerShell:** use Git Bash com `printf '%s' "$v" | npx vercel env add ...`,
  senão um `\r` é anexado e quebra o build.
- **Testar no navegador:** a Browser pane às vezes não compõe frames — screenshots falham e
  **transições CSS não avançam** (valores computados ficam no estado inicial). Para medir estado
  final, injete `* { transition: none !important }` antes de ler.
- **`input.blur()` não dispara o `onBlur` do React** nessa condição. Prefira validar a lógica pelo
  banco ou por eventos que o React delega (`mouseover`, `focusout` real).
- **Sempre rode `npm run build`** quando mexer com `useSearchParams` — só ele pega erro de
  pré-renderização.

---

## 7. O que falta fazer

O usuário mandou prints do app **TRIVY** como referência e pediu 4 telas. **2 foram entregues**
(faixa de receita no painel; aba Metas). Faltam:

### a) Transações agrupadas por dia
Hoje `app/(app)/lancamentos/page.tsx` agrupa por tipo (Entradas / Fixos / Variáveis).
O usuário quer ver **em que dia** cada gasto foi feito, com subtotal por dia.
- Os dados permitem: use `dia_vencimento` (o usuário preenche com o dia do gasto).
  Lançamentos sem dia vão para um grupo "sem data".
- **Não há coluna de data completa** em `transactions` — só `month` + `dia_vencimento` + `created_at`.
- Ele disse que pode ser **na própria aba de Lançamentos** (ex.: um toggle "por tipo / por dia").

### b) Parcelados no estilo do TRIVY
`app/(app)/parcelados/page.tsx` já tem os dados; falta a apresentação:
- Card grande **RESTANTE** + linha de métricas (impacto mensal, comprometimento da renda, ativos)
- **Gráfico de projeção** da dívida caindo mês a mês até quitar (dá para derivar de
  `lib/parcelado.ts` → `calendario()` + `saldoRestante()`)
- Botões **"Pagar Parcela"** e **"Quitar Parcelado"** (hoje só existe Editar/Excluir).
  "Pagar Parcela" = incrementar `parcelas_pagas` e marcar o lançamento do mês como pago.

**Ordem sugerida:** (b) primeiro — tem mais coisa nova e o usuário demonstrou mais interesse.

---

## 8. Como validar antes de entregar

```bash
npm run typecheck && npm test && npm run build
```

Depois teste no navegador com dados reais (`preview_start` → `financas-dev`), em **1500px e 375px**,
conferindo estouro horizontal:
```js
document.documentElement.scrollWidth > document.documentElement.clientWidth
```

**Se criar dado de teste no banco, apague depois** — é o banco de produção do usuário, em uso real.

---

## 9. Skills sugeridas

| Skill | Quando |
|---|---|
| **`dataviz`** | **Obrigatória** antes de escrever qualquer gráfico ou escolher cor de série. O gráfico de projeção dos Parcelados cai nisso. Rode `scripts/validate_palette.js` — não confie no olho. |
| `handoff` | Ao fim da próxima sessão, para passar adiante. |
| `simplify` | Depois de fechar as duas telas — `globals.css` e `lib/actions.ts` cresceram bastante. |
| `code-review` / `security-review` | Antes de mudanças em `lib/actions.ts` (é onde mora o escopo por usuário). |

---

## 10. Segredos — NÃO estão neste documento

Ficam apenas em `.env.local` (fora do git) e nas env vars da Vercel:
`DATABASE_URL`, `AUTH_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
`TELEGRAM_CHAT_ID`, `TELEGRAM_USER_LOGIN`, `VERCEL_OIDC_TOKEN`.

⚠️ **O login do app funciona como senha** (autenticação só por identificador, sem senha).
Ele está no `.env.local` e no banco — **nunca** o escreva em documento, commit ou log.
Para pegá-lo: `select login from users;` ou leia `TELEGRAM_USER_LOGIN` do `.env.local`.
