import { InvoiceItem, Transaction, TxType } from './types';

export interface MonthTotals {
  entradas: number; fixos: number; variaveis: number;
  fatura: number; saidas: number; saldo: number;
}

/** "Previsto": soma todos os lançamentos do mês, independente do status pago/recebido. */
export function monthTotals(txs: Transaction[], faturaTotal: number): MonthTotals {
  const sum = (type: TxType) =>
    txs.filter(t => t.type === type).reduce((s, t) => s + Number(t.valor), 0);
  const entradas = sum('entrada');
  const fixos = sum('fixo');
  const variaveis = sum('variavel');
  const saidas = fixos + variaveis + faturaTotal;
  return { entradas, fixos, variaveis, fatura: faturaTotal, saidas, saldo: entradas - saidas };
}

/** "Realizado": só o que já foi de fato recebido/pago — entradas "a receber" e contas "pendentes" ficam de fora. */
export function monthTotalsRealizado(txs: Transaction[], faturaTotal: number, faturaPaga: boolean): MonthTotals {
  const sum = (type: TxType) =>
    txs.filter(t => t.type === type && t.pago).reduce((s, t) => s + Number(t.valor), 0);
  const entradas = sum('entrada');
  const fixos = sum('fixo');
  const variaveis = sum('variavel');
  const fatura = faturaPaga ? faturaTotal : 0;
  const saidas = fixos + variaveis + fatura;
  return { entradas, fixos, variaveis, fatura, saidas, saldo: entradas - saidas };
}

/** Gastos (fixos + variáveis + parcelas do cartão) somados por categoria — "previsto", inclui pendentes. */
export function gastosPorCategoria(txs: Transaction[], invoiceItems: InvoiceItem[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of txs) {
    if (t.type === 'entrada') continue;
    const c = t.categoria || 'Outros';
    map[c] = (map[c] || 0) + Number(t.valor);
  }
  for (const i of invoiceItems) {
    map[i.categoria] = (map[i.categoria] || 0) + i.valor;
  }
  return map;
}

/** Mesma soma por categoria, mas só o que já foi pago — usada na visão "Realizado". */
export function gastosPorCategoriaRealizado(txs: Transaction[], invoiceItems: InvoiceItem[], faturaPaga: boolean): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of txs) {
    if (t.type === 'entrada' || !t.pago) continue;
    const c = t.categoria || 'Outros';
    map[c] = (map[c] || 0) + Number(t.valor);
  }
  if (faturaPaga) {
    for (const i of invoiceItems) {
      map[i.categoria] = (map[i.categoria] || 0) + i.valor;
    }
  }
  return map;
}

export interface FatiaGrupo {
  nome: string;
  valor: number;
  /** fatia do total gasto, 0–100 */
  pct: number;
  /** true no bolo das categorias que não estão em grupo nenhum */
  solto: boolean;
}

/**
 * Divide o total gasto no mês entre os grupos de orçamento, com o que sobrou
 * fora deles no fim. Grupos sem gasto ficam na lista (com 0) para a legenda
 * continuar mostrando todos; "Fora dos grupos" só aparece quando existe.
 */
export function distribuicaoPorGrupo(
  groups: { nome: string; categorias: string[] }[],
  gastosPorCategoria: Record<string, number>,
): FatiaGrupo[] {
  const agrupadas = new Set(groups.flatMap(g => g.categorias));
  const fatias: FatiaGrupo[] = groups.map(g => ({
    nome: g.nome,
    valor: g.categorias.reduce((s, c) => s + (gastosPorCategoria[c] || 0), 0),
    pct: 0,
    solto: false,
  }));

  const fora = Object.entries(gastosPorCategoria)
    .filter(([c]) => !agrupadas.has(c))
    .reduce((s, [, v]) => s + v, 0);
  if (fora > 0) fatias.push({ nome: 'Fora dos grupos', valor: fora, pct: 0, solto: true });

  const total = fatias.reduce((s, f) => s + f.valor, 0);
  return fatias.map(f => ({ ...f, pct: total > 0 ? (f.valor / total) * 100 : 0 }));
}

export interface BudgetGroupTotal {
  nome: string;
  percentual: number;
  categorias: string[];
  orcado: number;
  gasto: number;
}

/** Para cada grupo, quanto foi orçado (% das entradas do mês) e quanto já foi gasto nas categorias dele. */
export function budgetGroupTotals(
  groups: { nome: string; percentual: number; categorias: string[] }[],
  gastosPorCategoria: Record<string, number>,
  entradas: number,
): BudgetGroupTotal[] {
  return groups.map(g => ({
    nome: g.nome,
    percentual: g.percentual,
    categorias: g.categorias,
    orcado: (g.percentual / 100) * entradas,
    gasto: g.categorias.reduce((s, c) => s + (gastosPorCategoria[c] || 0), 0),
  }));
}
