import { Transaction } from './types';

/** Quantos dias tem o mês 'YYYY-MM'. */
export function diasDoMes(month: string): number {
  const [ano, m] = month.split('-').map(Number);
  return new Date(ano, m, 0).getDate();
}

export const hojeISO = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type TxData = Pick<Transaction, 'month' | 'dia_vencimento' | 'data_registro'>;

/**
 * Data em que o lançamento aconteceu, 'YYYY-MM-DD'.
 *
 * Quem manda é o dia informado pelo usuário; quando ele não informou, vale o dia
 * em que o lançamento foi registrado — desde que caia no mês do próprio
 * lançamento. Sobrando nada disso, o lançamento fica sem data.
 */
export function dataDaTx(t: TxData): string | null {
  if (t.dia_vencimento) {
    // encurta o dia quando o mês não tem (ex.: dia 31 em fevereiro)
    const dia = Math.min(t.dia_vencimento, diasDoMes(t.month));
    return `${t.month}-${String(dia).padStart(2, '0')}`;
  }
  if (t.data_registro?.startsWith(t.month)) return t.data_registro;
  return null;
}

export interface GrupoDia {
  /** null = lançamentos sem data, que ficam sempre no fim. */
  dia: string | null;
  entradas: number;
  saidas: number;
  saldo: number;
  itens: Transaction[];
}

/** Agrupa por data, com o subtotal de cada dia. `desc` = mais recente primeiro. */
export function agruparPorDia(txs: Transaction[], desc = true): GrupoDia[] {
  const mapa = new Map<string, Transaction[]>();
  for (const t of txs) {
    const chave = dataDaTx(t) ?? '';
    const atual = mapa.get(chave);
    if (atual) atual.push(t); else mapa.set(chave, [t]);
  }

  const chaves = [...mapa.keys()].filter(k => k !== '').sort();
  if (desc) chaves.reverse();
  if (mapa.has('')) chaves.push('');

  return chaves.map(chave => {
    const itens = mapa.get(chave)!;
    const soma = (entrada: boolean) => itens
      .filter(t => (t.type === 'entrada') === entrada)
      .reduce((s, t) => s + Number(t.valor), 0);
    const entradas = soma(true), saidas = soma(false);
    return {
      dia: chave || null,
      entradas,
      saidas,
      saldo: Math.round((entradas - saidas) * 100) / 100,
      itens,
    };
  });
}

/** '2026-08-11' → '11 de agosto de 2026', com atalho para hoje e ontem. */
export function rotuloDia(dia: string, hoje: Date = new Date()): string {
  if (dia === hojeISO(hoje)) return 'Hoje';
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  if (dia === hojeISO(ontem)) return 'Ontem';
  const [ano, m, d] = dia.split('-').map(Number);
  return new Date(ano, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}
