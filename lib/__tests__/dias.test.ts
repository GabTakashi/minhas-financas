import { describe, expect, it } from 'vitest';
import { agruparPorDia, dataDaTx, diasDoMes, hojeISO, rotuloDia } from '@/lib/dias';
import { Transaction } from '@/lib/types';

const t = (x: Partial<Transaction> = {}): Transaction => ({
  id: 't', month: '2026-08', type: 'variavel', descricao: 'Mercado', valor: 100,
  categoria: 'Alimentação', dia_vencimento: null, pago: false, ...x,
});

describe('diasDoMes', () => {
  it('conhece fevereiro bissexto e os meses de 30', () => {
    expect(diasDoMes('2024-02')).toBe(29);
    expect(diasDoMes('2026-02')).toBe(28);
    expect(diasDoMes('2026-04')).toBe(30);
    expect(diasDoMes('2026-08')).toBe(31);
  });
});

describe('dataDaTx', () => {
  it('usa o dia informado dentro do mês do lançamento', () => {
    expect(dataDaTx(t({ dia_vencimento: 11 }))).toBe('2026-08-11');
    expect(dataDaTx(t({ dia_vencimento: 5 }))).toBe('2026-08-05');
  });
  it('encurta o dia quando o mês não tem', () => {
    expect(dataDaTx(t({ month: '2026-02', dia_vencimento: 31 }))).toBe('2026-02-28');
  });
  it('sem dia informado, cai no dia em que foi registrado', () => {
    expect(dataDaTx(t({ data_registro: '2026-08-13' }))).toBe('2026-08-13');
  });
  it('ignora o registro feito fora do mês do lançamento', () => {
    expect(dataDaTx(t({ data_registro: '2026-09-02' }))).toBeNull();
  });
  it('fica sem data quando não há nem dia nem registro', () => {
    expect(dataDaTx(t())).toBeNull();
  });
  it('o dia informado ganha do dia do registro', () => {
    expect(dataDaTx(t({ dia_vencimento: 3, data_registro: '2026-08-20' }))).toBe('2026-08-03');
  });
});

describe('agruparPorDia', () => {
  const lista = [
    t({ id: 'a', dia_vencimento: 11, valor: 2500 }),
    t({ id: 'b', dia_vencimento: 11, valor: 5000, type: 'entrada', categoria: null }),
    t({ id: 'c', dia_vencimento: 7, valor: 100 }),
    t({ id: 'd', valor: 40 }),
  ];

  it('agrupa por data, mais recente primeiro', () => {
    expect(agruparPorDia(lista).map(g => g.dia)).toEqual(['2026-08-11', '2026-08-07', null]);
  });
  it('inverte a ordem dos dias, mas o sem data continua no fim', () => {
    expect(agruparPorDia(lista, false).map(g => g.dia)).toEqual(['2026-08-07', '2026-08-11', null]);
  });
  it('soma entradas, saídas e saldo de cada dia', () => {
    const [onze] = agruparPorDia(lista);
    expect(onze).toMatchObject({ entradas: 5000, saidas: 2500, saldo: 2500 });
    expect(onze.itens.map(i => i.id)).toEqual(['a', 'b']);
  });
  it('mantém a ordem em que os lançamentos chegaram dentro do dia', () => {
    const invertida = agruparPorDia([lista[1], lista[0], lista[2], lista[3]]);
    expect(invertida[0].itens.map(i => i.id)).toEqual(['b', 'a']);
  });
  it('devolve lista vazia sem lançamentos', () => {
    expect(agruparPorDia([])).toEqual([]);
  });
});

describe('rotuloDia', () => {
  const hoje = new Date(2026, 7, 13); // 13/08/2026

  it('usa atalhos para hoje e ontem', () => {
    expect(rotuloDia('2026-08-13', hoje)).toBe('Hoje');
    expect(rotuloDia('2026-08-12', hoje)).toBe('Ontem');
  });
  it('escreve a data por extenso nos demais dias', () => {
    expect(rotuloDia('2026-08-11', hoje)).toBe('11 de agosto de 2026');
  });
  it('atravessa a virada do mês', () => {
    expect(rotuloDia('2026-07-31', new Date(2026, 7, 1))).toBe('Ontem');
  });
});

describe('hojeISO', () => {
  it('formata no fuso local, sem passar por UTC', () => {
    expect(hojeISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
