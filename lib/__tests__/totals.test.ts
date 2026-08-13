import { describe, expect, it } from 'vitest';
import {
  budgetGroupTotals, distribuicaoPorGrupo, gastosPorCategoria, gastosPorCategoriaRealizado,
  monthTotals, monthTotalsRealizado,
} from '@/lib/totals';
import { InvoiceItem, Transaction } from '@/lib/types';

function tx(p: Partial<Transaction>): Transaction {
  return { id: 'x', month: '2026-07', type: 'fixo', descricao: 'T', valor: 100, categoria: 'Moradia', dia_vencimento: null, pago: false, ...p };
}

const txs: Transaction[] = [
  tx({ type: 'entrada', valor: 3000, categoria: null }),
  tx({ type: 'fixo', valor: 800, categoria: 'Moradia' }),
  tx({ type: 'variavel', valor: 200, categoria: 'Alimentação' }),
];

describe('monthTotals', () => {
  it('inclui a fatura do cartão nas saídas', () => {
    const t = monthTotals(txs, 500);
    expect(t.entradas).toBe(3000);
    expect(t.fixos).toBe(800);
    expect(t.variaveis).toBe(200);
    expect(t.fatura).toBe(500);
    expect(t.saidas).toBe(1500);
    expect(t.saldo).toBe(1500);
  });
  it('funciona sem fatura', () => {
    expect(monthTotals(txs, 0).saidas).toBe(1000);
  });
});

describe('monthTotalsRealizado', () => {
  const mistos: Transaction[] = [
    tx({ type: 'entrada', valor: 2000, categoria: null, pago: true }),   // recebido
    tx({ type: 'entrada', valor: 1000, categoria: null, pago: false }),  // a receber
    tx({ type: 'fixo', valor: 500, categoria: 'Moradia', pago: true }),  // pago
    tx({ type: 'fixo', valor: 300, categoria: 'Moradia', pago: false }), // pendente
    tx({ type: 'variavel', valor: 200, categoria: 'Alimentação', pago: true }),
    tx({ type: 'variavel', valor: 80, categoria: 'Lanche', pago: false }),
  ];

  it('soma só o que já foi recebido/pago, ignorando pendentes', () => {
    const r = monthTotalsRealizado(mistos, 400, true);
    expect(r.entradas).toBe(2000);
    expect(r.fixos).toBe(500);
    expect(r.variaveis).toBe(200);
    expect(r.fatura).toBe(400);
    expect(r.saidas).toBe(1100);
    expect(r.saldo).toBe(900);
  });

  it('fatura não paga não entra nas saídas realizadas', () => {
    const r = monthTotalsRealizado(mistos, 400, false);
    expect(r.fatura).toBe(0);
    expect(r.saidas).toBe(700);
  });
});

describe('gastosPorCategoria', () => {
  it('soma lançamentos e parcelas do cartão por categoria; entradas ficam de fora', () => {
    const items: InvoiceItem[] = [
      { purchaseId: 'p', descricao: 'Mercado', categoria: 'Alimentação', parcela: 1, parcelas: 1, valor: 150 },
    ];
    const g = gastosPorCategoria(txs, items);
    expect(g['Moradia']).toBe(800);
    expect(g['Alimentação']).toBe(350);
    expect(Object.keys(g)).toHaveLength(2);
  });
  it('usa "Outros" quando a categoria é nula', () => {
    const g = gastosPorCategoria([tx({ type: 'variavel', categoria: null, valor: 40 })], []);
    expect(g['Outros']).toBe(40);
  });
});

describe('gastosPorCategoriaRealizado', () => {
  const mistos: Transaction[] = [
    tx({ type: 'fixo', valor: 500, categoria: 'Moradia', pago: true }),
    tx({ type: 'fixo', valor: 300, categoria: 'Moradia', pago: false }),
    tx({ type: 'variavel', valor: 80, categoria: 'Lanche', pago: false }),
  ];
  const items: InvoiceItem[] = [
    { purchaseId: 'p', descricao: 'Mercado', categoria: 'Alimentação', parcela: 1, parcelas: 1, valor: 150 },
  ];

  it('ignora lançamentos pendentes', () => {
    const g = gastosPorCategoriaRealizado(mistos, [], true);
    expect(g['Moradia']).toBe(500);
    expect(g['Lanche']).toBeUndefined();
  });

  it('só soma as parcelas do cartão se a fatura estiver paga', () => {
    expect(gastosPorCategoriaRealizado(mistos, items, true)['Alimentação']).toBe(150);
    expect(gastosPorCategoriaRealizado(mistos, items, false)['Alimentação']).toBeUndefined();
  });
});

describe('budgetGroupTotals', () => {
  const gastos = { Moradia: 800, Alimentação: 350, Lanche: 60, Investimentos: 0 };
  const grupos = [
    { nome: 'Essenciais', percentual: 50, categorias: ['Moradia', 'Alimentação'] },
    { nome: 'Não essenciais', percentual: 30, categorias: ['Lanche'] },
    { nome: 'Investimentos', percentual: 20, categorias: ['Investimentos'] },
  ];

  it('calcula o orçado como % das entradas e soma o gasto das categorias do grupo', () => {
    const r = budgetGroupTotals(grupos, gastos, 3000);
    expect(r[0]).toMatchObject({ nome: 'Essenciais', orcado: 1500, gasto: 1150 });
    expect(r[1]).toMatchObject({ nome: 'Não essenciais', orcado: 900, gasto: 60 });
    expect(r[2]).toMatchObject({ nome: 'Investimentos', orcado: 600, gasto: 0 });
  });

  it('categoria sem gasto registrado conta como zero', () => {
    const r = budgetGroupTotals([{ nome: 'X', percentual: 10, categorias: ['Educação'] }], gastos, 1000);
    expect(r[0].gasto).toBe(0);
  });

  it('sem entradas, o orçado fica zero', () => {
    const r = budgetGroupTotals(grupos, gastos, 0);
    expect(r[0].orcado).toBe(0);
  });
});

describe('distribuicaoPorGrupo', () => {
  const grupos = [
    { nome: 'Essenciais', categorias: ['Moradia', 'Saúde'] },
    { nome: 'Não essenciais', categorias: ['Lazer'] },
    { nome: 'Investimentos', categorias: ['Investimentos'] },
  ];

  it('reparte o gasto entre os grupos, com o percentual de cada um', () => {
    const d = distribuicaoPorGrupo(grupos, { Moradia: 400, Saúde: 100, Lazer: 300, Investimentos: 200 });
    expect(d.map(f => [f.nome, f.valor, Math.round(f.pct)])).toEqual([
      ['Essenciais', 500, 50],
      ['Não essenciais', 300, 30],
      ['Investimentos', 200, 20],
    ]);
  });

  it('junta o que não está em grupo nenhum no fim', () => {
    const d = distribuicaoPorGrupo(grupos, { Moradia: 500, Outros: 300, Transporte: 200 });
    expect(d.at(-1)).toMatchObject({ nome: 'Fora dos grupos', valor: 500, solto: true });
    expect(Math.round(d.at(-1)!.pct)).toBe(50);
  });

  it('não cria o bolo "fora dos grupos" quando tudo está agrupado', () => {
    const d = distribuicaoPorGrupo(grupos, { Moradia: 100 });
    expect(d.some(f => f.solto)).toBe(false);
  });

  it('mantém na lista o grupo que não gastou nada', () => {
    const d = distribuicaoPorGrupo(grupos, { Moradia: 100 });
    expect(d).toHaveLength(3);
    expect(d[2]).toMatchObject({ nome: 'Investimentos', valor: 0, pct: 0 });
  });

  it('mês sem gasto nenhum devolve tudo zerado, sem dividir por zero', () => {
    const d = distribuicaoPorGrupo(grupos, {});
    expect(d.every(f => f.valor === 0 && f.pct === 0)).toBe(true);
  });

  it('sem grupos, tudo cai fora dos grupos', () => {
    const d = distribuicaoPorGrupo([], { Moradia: 100, Lazer: 300 });
    expect(d).toEqual([{ nome: 'Fora dos grupos', valor: 400, pct: 100, solto: true }]);
  });
});
