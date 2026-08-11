export type TxType = 'entrada' | 'fixo' | 'variavel';

export interface Transaction {
  id: string;
  month: string; // 'YYYY-MM'
  type: TxType;
  descricao: string;
  valor: number;
  categoria: string | null; // null para entradas
  dia_vencimento: number | null; // null para entradas
  pago: boolean; // para entradas significa "recebido"
  parcelado_id?: string | null; // quando o fixo vem de um parcelado cadastrado
}

export interface MonthRow {
  id: string;
  month: string;
  meta: number;
}

export interface Card {
  id: string;
  nome: string;
  dia_fechamento: number; // 1–28
  dia_vencimento: number; // 1–28
  limite: number | null;
}

export interface CardPurchase {
  id: string;
  card_id: string;
  descricao: string;
  valor_total: number;
  parcelas: number; // >= 1
  data_compra: string; // 'YYYY-MM-DD'
  categoria: string;
}

export interface Budget {
  id: string;
  month: string;
  categoria: string;
  limite: number;
}

export interface BudgetGroup {
  id: string;
  nome: string;
  percentual: number;
  categorias: string[];
  ordem: number;
}

export interface InvoiceItem {
  purchaseId: string;
  descricao: string;
  categoria: string;
  parcela: number; // 1-based
  parcelas: number;
  valor: number;
}
