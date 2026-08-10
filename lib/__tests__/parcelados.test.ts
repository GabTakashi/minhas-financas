import { describe, expect, it } from 'vitest';
import { ordenarParcelados, progressoParcelados } from '@/lib/parcelados';
import { Card, CardPurchase } from '@/lib/types';

const card: Card = { id: 'c', nome: 'Nubank', dia_fechamento: 20, dia_vencimento: 27, limite: 5000 };

const compra = (p: Partial<CardPurchase>): CardPurchase =>
  ({ id: 'p1', card_id: 'c', descricao: 'Geladeira', valor_total: 1200, parcelas: 12, data_compra: '2026-01-10', categoria: 'Moradia', ...p });

describe('progressoParcelados', () => {
  it('divide o total pelo número de parcelas', () => {
    const [r] = progressoParcelados([compra({})], card, [], '2026-01');
    expect(r.valorParcela).toBe(100);
    expect(r.parcelas).toBe(12);
    expect(r.primeiroMes).toBe('2026-01');
    expect(r.ultimoMes).toBe('2026-12');
  });

  it('conta as parcelas já decorridas até o mês de referência', () => {
    const [r] = progressoParcelados([compra({})], card, [], '2026-04');
    expect(r.decorridas).toBe(4);
    expect(r.pagas).toBe(0);
  });

  it('conta as pagas e desconta do restante', () => {
    const pagos = ['2026-01', '2026-02', '2026-03'];
    const [r] = progressoParcelados([compra({})], card, pagos, '2026-04');
    expect(r.pagas).toBe(3);
    expect(r.restante).toBe(900);
    expect(r.quitado).toBe(false);
  });

  it('marca como quitado quando todas as faturas foram pagas', () => {
    const todos = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
    const [r] = progressoParcelados([compra({})], card, todos, '2026-12');
    expect(r.quitado).toBe(true);
    expect(r.restante).toBe(0);
  });

  it('compra à vista tem uma parcela só', () => {
    const [r] = progressoParcelados([compra({ parcelas: 1, valor_total: 80 })], card, [], '2026-01');
    expect(r.parcelas).toBe(1);
    expect(r.valorParcela).toBe(80);
    expect(r.primeiroMes).toBe(r.ultimoMes);
  });
});

describe('ordenarParcelados', () => {
  it('deixa os quitados no fim', () => {
    const lista = progressoParcelados(
      [compra({ id: 'a', parcelas: 1, data_compra: '2026-01-10' }), compra({ id: 'b', parcelas: 3, data_compra: '2026-05-10' })],
      card, ['2026-01'], '2026-06',
    );
    const ordenada = ordenarParcelados(lista);
    expect(ordenada[0].id).toBe('b');
    expect(ordenada[1].quitado).toBe(true);
  });
});
