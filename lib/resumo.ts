import { faturaDoMes } from './invoice';
import { ResumoMes } from './score';
import { monthTotals } from './totals';
import { Card, CardPurchase, Transaction } from './types';

/** Gastos nestas categorias não são consumo: viram poupança no cálculo do IPF. */
export const CATEGORIAS_POUPANCA = ['Investimentos', 'Reserva de Emergência'];

export function resumoDoMes(
  txsDoMes: Transaction[],
  purchases: CardPurchase[],
  card: Card | null,
  month: string,
): ResumoMes {
  const fatura = card ? faturaDoMes(purchases, card, month) : { items: [], total: 0 };
  const t = monthTotals(txsDoMes, fatura.total);
  const guardado = txsDoMes
    .filter(x => x.type !== 'entrada' && x.categoria && CATEGORIAS_POUPANCA.includes(x.categoria))
    .reduce((s, x) => s + Number(x.valor), 0);
  // o que sobrou + o que foi deliberadamente guardado
  return { month, entradas: t.entradas, saidas: t.saidas, poupado: t.saldo + guardado, fatura: fatura.total };
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
