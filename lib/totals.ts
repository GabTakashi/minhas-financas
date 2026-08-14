import { Transaction, TxType } from './types';

export interface MonthTotals {
  entradas: number; fixos: number; variaveis: number;
  saidas: number; saldo: number;
}

/** "Previsto": soma todos os lançamentos do mês, independente do status pago/recebido. */
export function monthTotals(txs: Transaction[]): MonthTotals {
  const sum = (type: TxType) =>
    txs.filter(t => t.type === type).reduce((s, t) => s + Number(t.valor), 0);
  const entradas = sum('entrada');
  const fixos = sum('fixo');
  const variaveis = sum('variavel');
  const saidas = fixos + variaveis;
  return { entradas, fixos, variaveis, saidas, saldo: entradas - saidas };
}

/** "Realizado": só o que já foi de fato recebido/pago — entradas "a receber" e contas "pendentes" ficam de fora. */
export function monthTotalsRealizado(txs: Transaction[]): MonthTotals {
  return monthTotals(txs.filter(t => t.pago));
}

/** Gastos (fixos + variáveis) somados por categoria — "previsto", inclui pendentes. */
export function gastosPorCategoria(txs: Transaction[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of txs) {
    if (t.type === 'entrada') continue;
    const c = t.categoria || 'Outros';
    map[c] = (map[c] || 0) + Number(t.valor);
  }
  return map;
}

/** Mesma soma por categoria, mas só o que já foi pago — usada na visão "Realizado". */
export function gastosPorCategoriaRealizado(txs: Transaction[]): Record<string, number> {
  return gastosPorCategoria(txs.filter(t => t.pago));
}

export interface FatiaGrupo {
  nome: string;
  valor: number;
  /** fatia do total gasto, 0–100 */
  pct: number;
}

/**
 * Divide o total gasto no mês entre os grupos de orçamento. Toda despesa
 * pertence a um grupo — categoria fora de grupo é um erro de configuração, e
 * quem denuncia isso é `categoriasSemGrupo`. Grupos sem gasto ficam na lista
 * (com 0) para a legenda continuar mostrando todos.
 */
export function distribuicaoPorGrupo(
  groups: { nome: string; categorias: string[] }[],
  gastosPorCategoria: Record<string, number>,
): FatiaGrupo[] {
  const fatias = groups.map(g => ({
    nome: g.nome,
    valor: g.categorias.reduce((s, c) => s + (gastosPorCategoria[c] || 0), 0),
  }));
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  return fatias.map(f => ({ ...f, pct: total > 0 ? (f.valor / total) * 100 : 0 }));
}

/**
 * Categorias com gasto no mês que ficaram fora de todos os grupos. Elas não
 * entram na nota nem no gráfico, então precisam aparecer como aviso em vez de
 * sumir de mansinho.
 */
export function categoriasSemGrupo(
  groups: { categorias: string[] }[],
  gastosPorCategoria: Record<string, number>,
): { categoria: string; valor: number }[] {
  const agrupadas = new Set(groups.flatMap(g => g.categorias));
  return Object.entries(gastosPorCategoria)
    .filter(([c, v]) => v > 0 && !agrupadas.has(c))
    .map(([categoria, valor]) => ({ categoria, valor }));
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
