import { describe, expect, it } from 'vitest';
import {
  calendario, mesFinal, parcelaDoMes, Parcelado, projecaoDivida, quitado,
  saldoRestante, valorDaParcela, vigenteEm,
} from '@/lib/parcelado';

const p = (x: Partial<Parcelado> = {}): Parcelado => ({
  id: 'p', nome: 'Geladeira', tipo: 'parcelamento', categoria: 'Moradia',
  valor_total: 1200, parcelas: 12, valor_parcela: 100, parcelas_pagas: 0,
  primeiro_vencimento: '2026-08-10', dia_vencimento: 10, ...x,
});

describe('valorDaParcela', () => {
  it('divide igualmente quando dá certo', () => {
    expect(valorDaParcela(120, 12)).toBe(10);
  });
  it('joga os centavos que sobram na última parcela', () => {
    expect(valorDaParcela(100, 3, 1)).toBe(33.33);
    expect(valorDaParcela(100, 3, 3)).toBe(33.34);
  });
});

describe('mesFinal e vigência', () => {
  it('calcula o mês da última parcela', () => {
    expect(mesFinal(p())).toBe('2027-07');
  });
  it('recorrente não tem fim', () => {
    expect(mesFinal(p({ tipo: 'recorrente', parcelas: null }))).toBeNull();
    expect(vigenteEm(p({ tipo: 'recorrente', parcelas: null }), '2030-01')).toBe(true);
  });
  it('não vigora antes do primeiro vencimento nem depois do fim', () => {
    expect(vigenteEm(p(), '2026-07')).toBe(false);
    expect(vigenteEm(p(), '2026-08')).toBe(true);
    expect(vigenteEm(p(), '2027-07')).toBe(true);
    expect(vigenteEm(p(), '2027-08')).toBe(false);
  });
});

describe('parcelaDoMes', () => {
  it('numera a partir de 1 no mês inicial', () => {
    expect(parcelaDoMes(p(), '2026-08')).toBe(1);
    expect(parcelaDoMes(p(), '2026-09')).toBe(2);
    expect(parcelaDoMes(p(), '2027-07')).toBe(12);
  });
  it('devolve null fora da vigência', () => {
    expect(parcelaDoMes(p(), '2027-08')).toBeNull();
  });
});

describe('calendario', () => {
  it('lista todas as parcelas com mês e dia', () => {
    const c = calendario(p());
    expect(c).toHaveLength(12);
    expect(c[0]).toMatchObject({ indice: 1, mes: '2026-08', iso: '2026-08-10', valor: 100 });
    expect(c[11].mes).toBe('2027-07');
  });
  it('encurta o dia em meses que não têm (dia 31 → fevereiro)', () => {
    const c = calendario(p({ primeiro_vencimento: '2026-01-31', dia_vencimento: 31, parcelas: 2 }));
    expect(c[1].iso).toBe('2026-02-28');
  });
  it('recorrente mostra a quantidade pedida', () => {
    expect(calendario(p({ tipo: 'recorrente', parcelas: null, valor_total: null }), 6)).toHaveLength(6);
  });
});

describe('saldoRestante e quitado', () => {
  it('desconta as parcelas já pagas', () => {
    expect(saldoRestante(p({ parcelas_pagas: 3 }))).toBe(900);
  });
  it('zera quando tudo foi pago', () => {
    expect(saldoRestante(p({ parcelas_pagas: 12 }))).toBe(0);
    expect(quitado(p({ parcelas_pagas: 12 }))).toBe(true);
  });
  it('recorrente não tem saldo nem quitação', () => {
    const r = p({ tipo: 'recorrente', parcelas: null, valor_total: null });
    expect(saldoRestante(r)).toBeNull();
    expect(quitado(r)).toBe(false);
  });
});

describe('projecaoDivida', () => {
  it('cai uma parcela por mês até encostar no zero', () => {
    const { pontos, mesQuitacao, truncado } = projecaoDivida([p({ parcelas: 3, valor_total: 300 })], '2026-08');
    expect(pontos.map(x => [x.mes, x.restante, x.aPagar])).toEqual([
      ['2026-08', 300, 100],
      ['2026-09', 200, 100],
      ['2026-10', 100, 100],
      ['2026-11', 0, 0],
    ]);
    expect(mesQuitacao).toBe('2026-10');
    expect(truncado).toBe(false);
  });

  it('começa do saldo restante, ignorando as parcelas já pagas', () => {
    const { pontos } = projecaoDivida([p({ parcelas: 12, parcelas_pagas: 10 })], '2027-06');
    expect(pontos[0]).toEqual({ mes: '2027-06', restante: 200, aPagar: 100 });
    expect(pontos.at(-1)).toEqual({ mes: '2027-08', restante: 0, aPagar: 0 });
  });

  it('soma vários parcelados no mesmo mês', () => {
    const proj = projecaoDivida([
      p({ parcelas: 2, valor_total: 200 }),
      p({ id: 'q', parcelas: 3, valor_total: 900, primeiro_vencimento: '2026-08-05' }),
    ], '2026-08');
    expect(proj.pontos[0]).toEqual({ mes: '2026-08', restante: 1100, aPagar: 400 });
    expect(proj.pontos[1]).toEqual({ mes: '2026-09', restante: 700, aPagar: 400 });
    expect(proj.pontos[2]).toEqual({ mes: '2026-10', restante: 300, aPagar: 300 });
    expect(proj.mesQuitacao).toBe('2026-10');
  });

  it('traz parcela atrasada para o mês inicial', () => {
    // 3 parcelas desde ago/2026, nenhuma paga, mas já estamos em out/2026
    const { pontos } = projecaoDivida([p({ parcelas: 3, valor_total: 300 })], '2026-10');
    expect(pontos[0]).toEqual({ mes: '2026-10', restante: 300, aPagar: 300 });
    expect(pontos[1]).toEqual({ mes: '2026-11', restante: 0, aPagar: 0 });
  });

  it('ignora recorrentes e quitados', () => {
    const proj = projecaoDivida([
      p({ tipo: 'recorrente', parcelas: null, valor_total: null }),
      p({ id: 'q', parcelas: 12, parcelas_pagas: 12 }),
    ], '2026-08');
    expect(proj.pontos).toEqual([]);
    expect(proj.mesQuitacao).toBeNull();
  });

  it('corta no limite de meses e avisa', () => {
    const proj = projecaoDivida([p({ parcelas: 360, valor_total: 360000, valor_parcela: 1000 })], '2026-08', 24);
    expect(proj.pontos).toHaveLength(24);
    expect(proj.truncado).toBe(true);
    expect(proj.mesQuitacao).toBeNull();
  });

  it('distribui os centavos que sobram como o resto do app', () => {
    const { pontos } = projecaoDivida([p({ parcelas: 3, valor_total: 100 })], '2026-08');
    expect(pontos.map(x => x.aPagar)).toEqual([33.33, 33.33, 33.34, 0]);
    expect(pontos[0].restante).toBe(100);
  });
});
