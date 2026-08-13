import { CATEGORIAS_POUPANCA } from './categories';
import { faturaDoMes } from './invoice';
import { monthTotals } from './totals';
import { Card, CardPurchase, Transaction } from './types';

export { CATEGORIAS_POUPANCA };

export interface ResumoMes {
  month: string;
  entradas: number;
  saidas: number;
  /** quanto sobrou + o que foi para investimento/reserva */
  poupado: number;
  /** fatura do cartão do mês */
  fatura: number;
}

/**
 * Quanto foi deliberadamente guardado no mês: lançamentos nas categorias de
 * poupança. Sai da conta de "gasto" e entra na de "economia".
 */
export function guardadoNoMes(txsDoMes: Transaction[]): number {
  return txsDoMes
    .filter(x => x.type !== 'entrada' && x.categoria && CATEGORIAS_POUPANCA.includes(x.categoria))
    .reduce((s, x) => s + Number(x.valor), 0);
}

export function resumoDoMes(
  txsDoMes: Transaction[],
  purchases: CardPurchase[],
  card: Card | null,
  month: string,
): ResumoMes {
  const fatura = card ? faturaDoMes(purchases, card, month) : { items: [], total: 0 };
  const t = monthTotals(txsDoMes, fatura.total);
  // o que sobrou + o que foi deliberadamente guardado
  return { month, entradas: t.entradas, saidas: t.saidas, poupado: t.saldo + guardadoNoMes(txsDoMes), fatura: fatura.total };
}

/** Resumo de cada mês em `months`, na ordem recebida. */
export function serieDeResumos(
  todasTxs: Transaction[],
  purchases: CardPurchase[],
  card: Card | null,
  months: string[],
): ResumoMes[] {
  return months.map(m => resumoDoMes(todasTxs.filter(t => t.month === m), purchases, card, m));
}
