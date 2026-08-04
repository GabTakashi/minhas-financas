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
