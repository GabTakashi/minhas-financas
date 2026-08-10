import { Transaction } from './types';

export type Ordem = 'data' | 'valor' | 'nome';

/** Remove acentos e caixa para a busca casar "alimentacao" com "Alimentação". */
export function normaliza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export interface OpcoesFiltro {
  busca?: string;
  ordem?: Ordem;
  /** true = decrescente (maior primeiro / mais tarde primeiro) */
  desc?: boolean;
}

/** Casa o texto contra descrição e categoria. */
export function combina(t: Transaction, busca: string): boolean {
  const alvo = normaliza(busca.trim());
  if (!alvo) return true;
  return normaliza(t.descricao).includes(alvo) || normaliza(t.categoria ?? '').includes(alvo);
}

export function filtrarOrdenar(txs: Transaction[], op: OpcoesFiltro = {}): Transaction[] {
  const { busca = '', ordem = 'data', desc = false } = op;
  const lista = txs.filter(t => combina(t, busca));
  const sinal = desc ? -1 : 1;
  return [...lista].sort((a, b) => {
    if (ordem === 'valor') return (Number(a.valor) - Number(b.valor)) * sinal;
    if (ordem === 'nome') return a.descricao.localeCompare(b.descricao, 'pt-BR') * sinal;
    // data: sem dia de vencimento vai para o fim, independente da direção
    const da = a.dia_vencimento ?? 99, db = b.dia_vencimento ?? 99;
    if (da === db) return a.descricao.localeCompare(b.descricao, 'pt-BR');
    return (da - db) * sinal;
  });
}
