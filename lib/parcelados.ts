import { firstInvoiceMonth, parcelaValor } from './invoice';
import { shiftMonth } from './months';
import { Card, CardPurchase } from './types';

export interface ProgressoParcelado {
  id: string;
  descricao: string;
  categoria: string;
  valorTotal: number;
  parcelas: number;
  valorParcela: number;
  /** parcelas cuja fatura já foi marcada como paga */
  pagas: number;
  /** parcelas que já entraram em alguma fatura até o mês de referência */
  decorridas: number;
  /** quanto ainda falta pagar (parcelas de faturas não quitadas) */
  restante: number;
  primeiroMes: string;
  ultimoMes: string;
  quitado: boolean;
}

/** Progresso de cada compra parcelada, do ponto de vista do mês `mesRef`. */
export function progressoParcelados(
  purchases: CardPurchase[],
  card: Card,
  mesesPagos: string[],
  mesRef: string,
): ProgressoParcelado[] {
  return purchases.map(p => {
    const primeiro = firstInvoiceMonth(p.data_compra, card.dia_fechamento, card.dia_vencimento);
    let pagas = 0, decorridas = 0, restanteCents = 0;

    for (let i = 1; i <= p.parcelas; i++) {
      const mes = shiftMonth(primeiro, i - 1);
      const cents = Math.round(parcelaValor(Number(p.valor_total), p.parcelas, i) * 100);
      if (mes <= mesRef) decorridas++;
      if (mesesPagos.includes(mes)) pagas++;
      else restanteCents += cents;
    }

    return {
      id: p.id,
      descricao: p.descricao,
      categoria: p.categoria,
      valorTotal: Number(p.valor_total),
      parcelas: p.parcelas,
      valorParcela: parcelaValor(Number(p.valor_total), p.parcelas, 1),
      pagas,
      decorridas,
      restante: restanteCents / 100,
      primeiroMes: primeiro,
      ultimoMes: shiftMonth(primeiro, p.parcelas - 1),
      quitado: pagas === p.parcelas,
    };
  });
}

/** Ativos primeiro (mais recentes), quitados por último. */
export function ordenarParcelados(lista: ProgressoParcelado[]): ProgressoParcelado[] {
  return [...lista].sort((a, b) => {
    if (a.quitado !== b.quitado) return a.quitado ? 1 : -1;
    return b.ultimoMes.localeCompare(a.ultimoMes);
  });
}
