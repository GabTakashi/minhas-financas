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
  data_registro?: string | null; // 'YYYY-MM-DD' em que foi lançado — data de quem não informou o dia
}

export interface MonthRow {
  id: string;
  month: string;
  meta: number;
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

