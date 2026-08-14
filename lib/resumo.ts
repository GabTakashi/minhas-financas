import { CATEGORIAS_POUPANCA } from './categories';
import { monthTotals, monthTotalsRealizado } from './totals';
import { Transaction } from './types';

export { CATEGORIAS_POUPANCA };

export interface ResumoMes {
  month: string;
  /** entradas previstas do mês, incluindo o que ainda está a receber */
  entradas: number;
  /** saídas previstas do mês, incluindo o que ainda está pendente */
  saidas: number;
  /**
   * Economia de fato: o que sobrou do que já entrou e saiu, mais o que já foi
   * separado. Segue a mesma régua dos cards do painel — realizado no número
   * grande — para "sobrou X" não brigar com o saldo do mês.
   */
  poupado: number;
  /** a mesma conta no previsto, contando o que ainda está a receber/pagar */
  poupadoPrevisto: number;
}

/**
 * Quanto foi deliberadamente guardado no mês: lançamentos nas categorias de
 * poupança. Sai da conta de "gasto" e entra na de "economia".
 *
 * @param somentePago conta só o que já saiu da conta de verdade
 */
export function guardadoNoMes(txsDoMes: Transaction[], somentePago = false): number {
  return txsDoMes
    .filter(x => x.type !== 'entrada' && x.categoria && CATEGORIAS_POUPANCA.includes(x.categoria))
    .filter(x => !somentePago || x.pago)
    .reduce((s, x) => s + Number(x.valor), 0);
}

export function resumoDoMes(txsDoMes: Transaction[], month: string): ResumoMes {
  const previsto = monthTotals(txsDoMes);
  const realizado = monthTotalsRealizado(txsDoMes);
  return {
    month,
    entradas: previsto.entradas,
    saidas: previsto.saidas,
    poupado: realizado.saldo + guardadoNoMes(txsDoMes, true),
    poupadoPrevisto: previsto.saldo + guardadoNoMes(txsDoMes),
  };
}

/** Resumo de cada mês em `months`, na ordem recebida. */
export function serieDeResumos(todasTxs: Transaction[], months: string[]): ResumoMes[] {
  return months.map(m => resumoDoMes(todasTxs.filter(t => t.month === m), m));
}
