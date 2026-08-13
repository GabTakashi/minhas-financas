'use server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { iniciarMesParaUsuario } from '@/lib/newMonth';
import { Parcelado, parcelaDoMes, saldoRestante, semPrazo, TipoParcelado, valorDaParcela } from '@/lib/parcelado';
import { Budget, BudgetGroup, Card, CardPurchase, MonthRow, Transaction, TxType } from '@/lib/types';

// Toda a segurança de acesso a dados vive aqui: cada action resolve o usuário
// da sessão e escopa as queries por user_id (não há RLS como no Supabase).
async function userId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error('Não autenticado');
  return id;
}

/* ── leitura ── */

export async function getMonthRow(month: string): Promise<MonthRow | null> {
  const uid = await userId();
  const rows = await sql`select id, month, meta::float as meta from months
    where user_id = ${uid} and month = ${month}`;
  return (rows[0] as MonthRow | undefined) ?? null;
}

export async function listMonths(): Promise<MonthRow[]> {
  const uid = await userId();
  return await sql`select id, month, meta::float as meta from months
    where user_id = ${uid} order by month` as MonthRow[];
}

export async function listTransactions(month: string): Promise<Transaction[]> {
  const uid = await userId();
  return await sql`select id, month, type, descricao, valor::float as valor, categoria, dia_vencimento, pago, parcelado_id,
    to_char(created_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as data_registro
    from transactions where user_id = ${uid} and month = ${month} order by created_at` as Transaction[];
}

export async function listAllTransactions(): Promise<Transaction[]> {
  const uid = await userId();
  return await sql`select id, month, type, descricao, valor::float as valor, categoria, dia_vencimento, pago
    from transactions where user_id = ${uid}` as Transaction[];
}

export async function getCard(): Promise<Card | null> {
  const uid = await userId();
  const rows = await sql`select id, nome, dia_fechamento, dia_vencimento, limite::float as limite
    from cards where user_id = ${uid} limit 1`;
  return (rows[0] as Card | undefined) ?? null;
}

export async function listPurchases(): Promise<CardPurchase[]> {
  const uid = await userId();
  return await sql`select id, card_id, descricao, valor_total::float as valor_total, parcelas,
    data_compra::text as data_compra, categoria
    from card_purchases where user_id = ${uid} order by data_compra desc, created_at desc` as CardPurchase[];
}

export async function listInvoicePayments(): Promise<{ month: string; pago: boolean }[]> {
  const uid = await userId();
  return await sql`select month, pago from card_invoice_payments where user_id = ${uid}` as { month: string; pago: boolean }[];
}

export async function listBudgets(month: string): Promise<Budget[]> {
  const uid = await userId();
  return await sql`select id, month, categoria, limite::float as limite from budgets
    where user_id = ${uid} and month = ${month}` as Budget[];
}

/** Preferências do usuário. */
export async function getMetaPct(): Promise<number> {
  const uid = await userId();
  const rows = await sql`select meta_pct::float as meta_pct from users where id = ${uid}`;
  return (rows[0]?.meta_pct as number | undefined) ?? 20;
}

export async function setMetaPct(pct: number): Promise<void> {
  const uid = await userId();
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  await sql`update users set meta_pct = ${v} where id = ${uid}`;
}

/** Datas ('YYYY-MM-DD', fuso de SP) em que o usuário registrou algo — base da constância. */
export async function listDiasRegistrados(): Promise<string[]> {
  const uid = await userId();
  const rows = await sql`select distinct
    to_char(created_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as dia
    from transactions where user_id = ${uid} order by dia`;
  return rows.map(r => r.dia as string);
}

export async function listBudgetGroups(): Promise<BudgetGroup[]> {
  const uid = await userId();
  return await sql`select id, nome, percentual::float as percentual, categorias, ordem
    from budget_groups where user_id = ${uid} order by ordem` as BudgetGroup[];
}

/* ── meses ── */

export async function iniciarMes(month: string): Promise<{ copiados: number }> {
  const uid = await userId();
  const { copiados } = await iniciarMesParaUsuario(uid, month);
  return { copiados };
}

export async function setMeta(month: string, meta: number): Promise<void> {
  const uid = await userId();
  await sql`update months set meta = ${meta} where user_id = ${uid} and month = ${month}`;
}

/* ── lançamentos ── */

export interface TxInput {
  month: string;
  type: TxType;
  descricao: string;
  valor: number;
  categoria: string | null;
  dia_vencimento: number | null;
}

export async function insertTransaction(t: TxInput): Promise<void> {
  const uid = await userId();
  await sql`insert into transactions (user_id, month, type, descricao, valor, categoria, dia_vencimento)
    values (${uid}, ${t.month}, ${t.type}, ${t.descricao}, ${t.valor}, ${t.categoria}, ${t.dia_vencimento})`;
}

export async function updateTransaction(id: string, t: TxInput): Promise<void> {
  const uid = await userId();
  await sql`update transactions set descricao = ${t.descricao}, valor = ${t.valor},
    categoria = ${t.categoria}, dia_vencimento = ${t.dia_vencimento}
    where id = ${id} and user_id = ${uid}`;
}

export async function setTransactionPago(id: string, pago: boolean): Promise<void> {
  const uid = await userId();
  await sql`update transactions set pago = ${pago} where id = ${id} and user_id = ${uid}`;
}

export async function deleteTransaction(id: string): Promise<void> {
  const uid = await userId();
  await sql`delete from transactions where id = ${id} and user_id = ${uid}`;
}

/* ── cartão ── */

export async function insertCard(c: { nome: string; dia_fechamento: number; dia_vencimento: number; limite: number | null }): Promise<void> {
  const uid = await userId();
  await sql`insert into cards (user_id, nome, dia_fechamento, dia_vencimento, limite)
    values (${uid}, ${c.nome}, ${c.dia_fechamento}, ${c.dia_vencimento}, ${c.limite})`;
}

export async function insertPurchase(p: { card_id: string; descricao: string; valor_total: number; parcelas: number; data_compra: string; categoria: string }): Promise<void> {
  const uid = await userId();
  await sql`insert into card_purchases (user_id, card_id, descricao, valor_total, parcelas, data_compra, categoria)
    values (${uid}, ${p.card_id}, ${p.descricao}, ${p.valor_total}, ${p.parcelas}, ${p.data_compra}, ${p.categoria})`;
}

export async function deletePurchase(id: string): Promise<void> {
  const uid = await userId();
  await sql`delete from card_purchases where id = ${id} and user_id = ${uid}`;
}

export async function setInvoicePaid(cardId: string, month: string, pago: boolean): Promise<void> {
  const uid = await userId();
  if (pago) {
    await sql`insert into card_invoice_payments (user_id, card_id, month, pago)
      values (${uid}, ${cardId}, ${month}, true)
      on conflict (user_id, card_id, month) do update set pago = true`;
  } else {
    await sql`delete from card_invoice_payments where user_id = ${uid} and card_id = ${cardId} and month = ${month}`;
  }
}

/* ── orçamento ── */

export async function setBudget(month: string, categoria: string, limite: number | null): Promise<void> {
  const uid = await userId();
  if (limite == null || isNaN(limite) || limite <= 0) {
    await sql`delete from budgets where user_id = ${uid} and month = ${month} and categoria = ${categoria}`;
  } else {
    await sql`insert into budgets (user_id, month, categoria, limite)
      values (${uid}, ${month}, ${categoria}, ${limite})
      on conflict (user_id, month, categoria) do update set limite = ${limite}`;
  }
}

export interface BudgetGroupInput { nome: string; percentual: number; categorias: string[] }

/** Substitui todos os grupos de orçamento do usuário pela lista enviada. */
export async function saveBudgetGroups(groups: BudgetGroupInput[]): Promise<void> {
  const uid = await userId();
  await sql`delete from budget_groups where user_id = ${uid}`;
  let ordem = 0;
  for (const g of groups) {
    if (!g.nome.trim()) continue;
    await sql`insert into budget_groups (user_id, nome, percentual, categorias, ordem)
      values (${uid}, ${g.nome.trim()}, ${g.percentual}, ${g.categorias}, ${ordem})`;
    ordem++;
  }
}

/* ── parcelados ── */

export async function listParcelados(): Promise<Parcelado[]> {
  const uid = await userId();
  return await sql`select id, nome, tipo, categoria,
    valor_total::float as valor_total, parcelas, valor_parcela::float as valor_parcela,
    parcelas_pagas, primeiro_vencimento::text as primeiro_vencimento, dia_vencimento
    from parcelados where user_id = ${uid} order by created_at desc` as Parcelado[];
}

export interface ParceladoInput {
  nome: string;
  tipo: TipoParcelado;
  categoria: string;
  valor_total: number | null;
  parcelas: number | null;
  valor_parcela: number;
  parcelas_pagas: number;
  primeiro_vencimento: string;
  dia_vencimento: number;
}

/**
 * Espelha o parcelado como custo fixo nos meses já iniciados: cria/atualiza o
 * lançamento onde ele vigora e remove onde não vigora mais (preservando os pagos).
 */
async function sincronizar(uid: string, parceladoId: string): Promise<void> {
  const rows = await sql`select nome, tipo, categoria, valor_total::float as valor_total,
    parcelas, valor_parcela::float as valor_parcela,
    primeiro_vencimento::text as primeiro_vencimento, dia_vencimento
    from parcelados where id = ${parceladoId} and user_id = ${uid}`;
  const p = rows[0] as (ParceladoInput & { parcelas_pagas?: number }) | undefined;
  if (!p) return;

  const meses = (await sql`select month from months where user_id = ${uid}`).map(r => r.month as string);
  for (const month of meses) {
    const indice = parcelaDoMes(p as never, month);
    const existente = await sql`select id, pago from transactions
      where user_id = ${uid} and month = ${month} and parcelado_id = ${parceladoId}`;

    if (indice === null) {
      // saiu de vigência: só apaga o que ainda não foi pago
      if (existente[0] && !existente[0].pago) {
        await sql`delete from transactions where id = ${existente[0].id}`;
      }
      continue;
    }

    const valor = p.valor_total != null && p.parcelas
      ? valorDaParcela(p.valor_total, p.parcelas, indice)
      : p.valor_parcela;
    const desc = p.parcelas ? `${p.nome} (${indice}/${p.parcelas})` : p.nome;

    if (existente[0]) {
      await sql`update transactions set descricao = ${desc}, valor = ${valor},
        categoria = ${p.categoria}, dia_vencimento = ${p.dia_vencimento}
        where id = ${existente[0].id}`;
    } else {
      await sql`insert into transactions
        (user_id, month, type, descricao, valor, categoria, dia_vencimento, parcelado_id)
        values (${uid}, ${month}, 'fixo', ${desc}, ${valor}, ${p.categoria}, ${p.dia_vencimento}, ${parceladoId})`;
    }
  }
}

export async function saveParcelado(input: ParceladoInput, id?: string): Promise<void> {
  const uid = await userId();
  let alvo = id;
  if (id) {
    await sql`update parcelados set nome = ${input.nome}, tipo = ${input.tipo},
      categoria = ${input.categoria}, valor_total = ${input.valor_total},
      parcelas = ${input.parcelas}, valor_parcela = ${input.valor_parcela},
      parcelas_pagas = ${input.parcelas_pagas},
      primeiro_vencimento = ${input.primeiro_vencimento}, dia_vencimento = ${input.dia_vencimento}
      where id = ${id} and user_id = ${uid}`;
  } else {
    const novo = await sql`insert into parcelados
      (user_id, nome, tipo, categoria, valor_total, parcelas, valor_parcela, parcelas_pagas, primeiro_vencimento, dia_vencimento)
      values (${uid}, ${input.nome}, ${input.tipo}, ${input.categoria}, ${input.valor_total},
        ${input.parcelas}, ${input.valor_parcela}, ${input.parcelas_pagas},
        ${input.primeiro_vencimento}, ${input.dia_vencimento}) returning id`;
    alvo = novo[0].id as string;
  }
  await sincronizar(uid, alvo!);
}

/**
 * Transforma um custo fixo já lançado num parcelado: o lançamento antigo é
 * substituído pelo que o parcelado gera, preservando o status de pago.
 */
export async function converterEmParcelado(txId: string, input: ParceladoInput): Promise<void> {
  const uid = await userId();
  const rows = await sql`select month, pago from transactions
    where id = ${txId} and user_id = ${uid} and type = 'fixo' and parcelado_id is null`;
  const antiga = rows[0] as { month: string; pago: boolean } | undefined;
  if (!antiga) throw new Error('Lançamento não encontrado');

  await sql`delete from transactions where id = ${txId} and user_id = ${uid}`;

  const novo = await sql`insert into parcelados
    (user_id, nome, tipo, categoria, valor_total, parcelas, valor_parcela, parcelas_pagas, primeiro_vencimento, dia_vencimento)
    values (${uid}, ${input.nome}, ${input.tipo}, ${input.categoria}, ${input.valor_total},
      ${input.parcelas}, ${input.valor_parcela}, ${input.parcelas_pagas},
      ${input.primeiro_vencimento}, ${input.dia_vencimento}) returning id`;
  const parceladoId = novo[0].id as string;
  await sincronizar(uid, parceladoId);

  if (antiga.pago) {
    await sql`update transactions set pago = true
      where user_id = ${uid} and month = ${antiga.month} and parcelado_id = ${parceladoId}`;
  }
}

/**
 * Registra o pagamento da parcela do mês: sobe `parcelas_pagas` em 1 (nunca além
 * do total) e marca como pago o lançamento que o parcelado gerou naquele mês.
 */
export async function pagarParcela(id: string, month: string): Promise<void> {
  const uid = await userId();
  const rows = await sql`select parcelas, parcelas_pagas from parcelados
    where id = ${id} and user_id = ${uid}`;
  const p = rows[0] as { parcelas: number | null; parcelas_pagas: number } | undefined;
  if (!p) throw new Error('Parcelado não encontrado');
  if (p.parcelas != null && p.parcelas_pagas >= p.parcelas) return;

  await sql`update parcelados set parcelas_pagas = parcelas_pagas + 1
    where id = ${id} and user_id = ${uid}`;
  await sql`update transactions set pago = true
    where user_id = ${uid} and parcelado_id = ${id} and month = ${month}`;
}

/**
 * Quitação antecipada: fecha o parcelado, apaga os lançamentos pendentes que ele
 * geraria daqui pra frente e — se `lancar` — registra o saldo restante como um
 * gasto variável já pago em `month` (variável, não fixo, para o mês seguinte não
 * copiar a quitação).
 */
export async function quitarParcelado(id: string, month: string, lancar: boolean): Promise<void> {
  const uid = await userId();
  const rows = await sql`select nome, tipo, categoria, valor_total::float as valor_total,
    parcelas, valor_parcela::float as valor_parcela, parcelas_pagas, dia_vencimento
    from parcelados where id = ${id} and user_id = ${uid}`;
  const p = rows[0] as (Parcelado & { dia_vencimento: number }) | undefined;
  if (!p) throw new Error('Parcelado não encontrado');
  if (semPrazo(p.tipo) || !p.parcelas) throw new Error('Recorrente não tem saldo para quitar');

  const restante = saldoRestante(p) ?? 0;

  await sql`delete from transactions
    where user_id = ${uid} and parcelado_id = ${id} and pago = false`;
  await sql`update parcelados set parcelas_pagas = parcelas
    where id = ${id} and user_id = ${uid}`;

  if (lancar && restante > 0) {
    await sql`insert into transactions
      (user_id, month, type, descricao, valor, categoria, dia_vencimento, pago)
      values (${uid}, ${month}, 'variavel', ${`Quitação de ${p.nome}`}, ${restante},
        ${p.categoria}, ${p.dia_vencimento}, true)`;
  }
}

/** Remove o parcelado e os lançamentos ainda não pagos que vieram dele. */
export async function deleteParcelado(id: string): Promise<void> {
  const uid = await userId();
  await sql`delete from transactions where user_id = ${uid} and parcelado_id = ${id} and pago = false`;
  await sql`delete from parcelados where id = ${id} and user_id = ${uid}`;
}

/* ── backup / importação ── */

export async function exportAll(): Promise<Record<string, unknown>> {
  const uid = await userId();
  const [months, transactions, cards, purchases, payments, budgets, budgetGroups] = await Promise.all([
    sql`select month, meta::float as meta from months where user_id = ${uid} order by month`,
    sql`select month, type, descricao, valor::float as valor, categoria, dia_vencimento, pago from transactions where user_id = ${uid}`,
    sql`select nome, dia_fechamento, dia_vencimento, limite::float as limite from cards where user_id = ${uid}`,
    sql`select descricao, valor_total::float as valor_total, parcelas, data_compra::text as data_compra, categoria from card_purchases where user_id = ${uid}`,
    sql`select month, pago from card_invoice_payments where user_id = ${uid}`,
    sql`select month, categoria, limite::float as limite from budgets where user_id = ${uid}`,
    sql`select nome, percentual::float as percentual, categorias, ordem from budget_groups where user_id = ${uid} order by ordem`,
  ]);
  return { versao: 2, months, transactions, cards, purchases, payments, budgets, budgetGroups };
}

interface LegacyItem { desc?: string; valor?: number; recebido?: boolean; pago?: boolean; cat?: string; dia?: number | null }
interface LegacyMonth { meta?: number; entradas?: LegacyItem[]; fixos?: LegacyItem[]; variaveis?: LegacyItem[] }

export async function importLegacy(data: { months?: Record<string, LegacyMonth> }): Promise<{ ok: boolean; nMeses: number; nTx: number; erro?: string }> {
  const uid = await userId();
  if (!data || typeof data !== 'object' || !data.months || typeof data.months !== 'object') {
    return { ok: false, nMeses: 0, nTx: 0, erro: 'Arquivo inválido' };
  }
  try {
    const existentes = new Set(
      (await sql`select month from months where user_id = ${uid}`).map(r => r.month as string),
    );
    let nMeses = 0, nTx = 0;
    for (const [key, m] of Object.entries(data.months)) {
      if (!/^\d{4}-\d{2}$/.test(key) || existentes.has(key)) continue;
      await sql`insert into months (user_id, month, meta) values (${uid}, ${key}, ${m.meta || 0})`;
      const rows: { type: TxType; item: LegacyItem }[] = [
        ...(m.entradas ?? []).map(i => ({ type: 'entrada' as TxType, item: i })),
        ...(m.fixos ?? []).map(i => ({ type: 'fixo' as TxType, item: i })),
        ...(m.variaveis ?? []).map(i => ({ type: 'variavel' as TxType, item: i })),
      ];
      for (const { type, item } of rows) {
        if (!item.desc || !item.valor || item.valor <= 0) continue;
        const isEntrada = type === 'entrada';
        await sql`insert into transactions (user_id, month, type, descricao, valor, categoria, dia_vencimento, pago)
          values (${uid}, ${key}, ${type}, ${item.desc}, ${item.valor},
            ${isEntrada ? null : item.cat || 'Outros'}, ${isEntrada ? null : item.dia || null},
            ${isEntrada ? !!item.recebido : !!item.pago})`;
        nTx++;
      }
      nMeses++;
    }
    return { ok: true, nMeses, nTx };
  } catch {
    return { ok: false, nMeses: 0, nTx: 0, erro: 'Erro durante a importação — tente novamente' };
  }
}
