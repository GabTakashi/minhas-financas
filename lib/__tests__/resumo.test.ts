import { describe, expect, it } from 'vitest';
import { guardadoNoMes, resumoDoMes, serieDeResumos } from '@/lib/resumo';
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
    const r = resumoDoMes(txs, '2026-08');
    expect(r.entradas).toBe(5000);
    expect(r.saidas).toBe(2000);
    // sobrou 3000 e ainda guardou 1000 dentro das saídas
    expect(r.poupado).toBe(4000);
  });

  it('sem categorias de poupança, poupado é só o saldo', () => {
    const txs = [tx({ type: 'entrada', valor: 1000, categoria: null }), tx({ valor: 400 })];
    expect(resumoDoMes(txs, '2026-08').poupado).toBe(600);
  });

  it('mês sem lançamentos vira tudo zero', () => {
    const r = resumoDoMes([], '2026-08');
    expect(r).toMatchObject({ entradas: 0, saidas: 0, poupado: 0, poupadoPrevisto: 0 });
  });

  it('entrada a receber não conta como economia, mas entra no previsto', () => {
    const txs = [
      tx({ type: 'entrada', valor: 5000, categoria: null, pago: true }),
      tx({ type: 'entrada', valor: 300, categoria: null, pago: false }), // a receber
      tx({ type: 'variavel', valor: 1000, categoria: 'Alimentação', pago: true }),
      tx({ type: 'fixo', valor: 600, categoria: 'Reserva de Emergência', pago: true }),
    ];
    const r = resumoDoMes(txs, '2026-08');
    // realizado: sobrou 3400 do que entrou de fato, mais os 600 separados
    expect(r.poupado).toBe(4000);
    // previsto: os 300 a receber entram na conta
    expect(r.poupadoPrevisto).toBe(4300);
    expect(r.entradas).toBe(5300);
  });

  it('poupança ainda não paga só conta no previsto', () => {
    const txs = [
      tx({ type: 'entrada', valor: 1000, categoria: null, pago: true }),
      tx({ type: 'fixo', valor: 400, categoria: 'Investimentos', pago: false }),
    ];
    const r = resumoDoMes(txs, '2026-08');
    expect(r.poupado).toBe(1000);        // nada saiu ainda: sobrou tudo
    expect(r.poupadoPrevisto).toBe(1000); // 600 de saldo + 400 separados
  });
});

describe('guardadoNoMes', () => {
  it('soma só as categorias de poupança', () => {
    const txs = [
      tx({ type: 'fixo', valor: 600, categoria: 'Reserva de Emergência' }),
      tx({ type: 'fixo', valor: 400, categoria: 'Investimentos' }),
      tx({ type: 'variavel', valor: 100, categoria: 'Alimentação' }),
    ];
    expect(guardadoNoMes(txs)).toBe(1000);
  });
  it('entrada nunca conta como guardado', () => {
    expect(guardadoNoMes([tx({ type: 'entrada', valor: 5000, categoria: 'Investimentos' })])).toBe(0);
  });
  it('sem categoria de poupança, é zero', () => {
    expect(guardadoNoMes([tx({ valor: 80, categoria: 'Lanche' })])).toBe(0);
  });
});

describe('serieDeResumos', () => {
  it('separa os lançamentos por mês, na ordem pedida', () => {
    const txs = [
      tx({ month: '2026-07', type: 'entrada', valor: 3000, categoria: null }),
      tx({ month: '2026-08', type: 'entrada', valor: 5000, categoria: null }),
    ];
    const s = serieDeResumos(txs, ['2026-07', '2026-08']);
    expect(s.map(r => r.entradas)).toEqual([3000, 5000]);
  });
});
