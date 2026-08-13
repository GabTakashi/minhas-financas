import { describe, expect, it } from 'vitest';
import { combina, filtrarOrdenar, normaliza } from '@/lib/filtros';
import { Transaction } from '@/lib/types';

const tx = (p: Partial<Transaction>): Transaction =>
  ({ id: 'x', month: '2026-08', type: 'variavel', descricao: 'T', valor: 100, categoria: 'Outros', dia_vencimento: null, pago: false, ...p });

describe('normaliza', () => {
  it('tira acento e caixa', () => {
    expect(normaliza('Alimentação')).toBe('alimentacao');
    expect(normaliza('SAÚDE')).toBe('saude');
  });
});

describe('combina', () => {
  const t = tx({ descricao: 'Almoço no shopping', categoria: 'Alimentação' });
  it('acha por descrição, ignorando acento', () => {
    expect(combina(t, 'almoco')).toBe(true);
    expect(combina(t, 'SHOPPING')).toBe(true);
  });
  it('acha por categoria', () => {
    expect(combina(t, 'alimentacao')).toBe(true);
  });
  it('busca vazia passa tudo', () => {
    expect(combina(t, '   ')).toBe(true);
  });
  it('não casa o que não existe', () => {
    expect(combina(t, 'gasolina')).toBe(false);
  });
});

describe('filtrarOrdenar', () => {
  const lista = [
    tx({ descricao: 'Barbeiro', valor: 55, dia_vencimento: 5 }),
    tx({ descricao: 'Academia', valor: 120, dia_vencimento: 18 }),
    tx({ descricao: 'Claude', valor: 118, dia_vencimento: null }),
  ];

  it('ordena por data, com "sem data" no fim', () => {
    expect(filtrarOrdenar(lista).map(t => t.descricao)).toEqual(['Barbeiro', 'Academia', 'Claude']);
  });

  it('mantém "sem data" no fim mesmo invertendo a ordem', () => {
    expect(filtrarOrdenar(lista, { desc: true }).map(t => t.descricao)).toEqual(['Academia', 'Barbeiro', 'Claude']);
  });

  it('usa o dia do registro de quem não informou o dia', () => {
    const comRegistro = [
      tx({ descricao: 'Pix', dia_vencimento: null, data_registro: '2026-08-20' }),
      tx({ descricao: 'Barbeiro', dia_vencimento: 5 }),
    ];
    expect(filtrarOrdenar(comRegistro).map(t => t.descricao)).toEqual(['Barbeiro', 'Pix']);
  });

  it('ordena por valor', () => {
    expect(filtrarOrdenar(lista, { ordem: 'valor' }).map(t => t.valor)).toEqual([55, 118, 120]);
    expect(filtrarOrdenar(lista, { ordem: 'valor', desc: true }).map(t => t.valor)).toEqual([120, 118, 55]);
  });

  it('ordena por nome', () => {
    expect(filtrarOrdenar(lista, { ordem: 'nome' }).map(t => t.descricao)).toEqual(['Academia', 'Barbeiro', 'Claude']);
  });

  it('aplica a busca antes de ordenar', () => {
    expect(filtrarOrdenar(lista, { busca: 'aca' }).map(t => t.descricao)).toEqual(['Academia']);
  });

  it('não altera o array original', () => {
    const copia = [...lista];
    filtrarOrdenar(lista, { ordem: 'valor' });
    expect(lista).toEqual(copia);
  });
});
