import { describe, expect, it } from 'vitest';
import { resumoDoMes, serieDeResumos } from '@/lib/resumo';
import { Transaction } from '@/lib/types';

const tx = (p: Partial<Transaction>): Transaction =>
  ({ id: 'x', month: '2026-08', type: 'variavel', descricao: 'T', valor: 100, categoria: 'Outros', dia_vencimento: null, pago: true, ...p });

describe('resumoDoMes', () => {
  it('trata investimento e reserva como poupança, não como consumo', () => {
    const txs = [
      tx({ type: 'entrada', valor: 5000, categoria: null }),
      tx({ type: 'variavel', valor: 1000, categoria: 'Alimentação' }),
      tx({ type: 'fixo', valor: 600, categoria: 'Reserva de Emergência' }),
      tx({ type: 'fixo', valor: 400, categoria: 'Investimentos' }),
    ];
    const r = resumoDoMes(txs, [], null, '2026-08');
    expect(r.entradas).toBe(5000);
    expect(r.saidas).toBe(2000);
    // sobrou 3000 e ainda guardou 1000 dentro das saídas
    expect(r.poupado).toBe(4000);
  });

  it('sem categorias de poupança, poupado é só o saldo', () => {
    const txs = [tx({ type: 'entrada', valor: 1000, categoria: null }), tx({ valor: 400 })];
    expect(resumoDoMes(txs, [], null, '2026-08').poupado).toBe(600);
  });

  it('mês sem lançamentos vira tudo zero', () => {
    const r = resumoDoMes([], [], null, '2026-08');
    expect(r).toMatchObject({ entradas: 0, saidas: 0, poupado: 0, fatura: 0 });
  });
});

describe('serieDeResumos', () => {
  it('separa os lançamentos por mês, na ordem pedida', () => {
    const txs = [
      tx({ month: '2026-07', type: 'entrada', valor: 3000, categoria: null }),
      tx({ month: '2026-08', type: 'entrada', valor: 5000, categoria: null }),
    ];
    const s = serieDeResumos(txs, [], null, ['2026-07', '2026-08']);
    expect(s.map(r => r.entradas)).toEqual([3000, 5000]);
  });
});
