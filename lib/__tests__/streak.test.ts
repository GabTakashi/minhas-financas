import { describe, expect, it } from 'vitest';
import { calendarioDoMes, diasNoMes, proximoSelo, selosConquistados } from '@/lib/streak';

describe('diasNoMes', () => {
  it('conta dias distintos do mês pedido', () => {
    const datas = ['2026-08-01', '2026-08-01', '2026-08-05', '2026-07-30'];
    expect(diasNoMes(datas, '2026-08')).toBe(2);
  });
  it('devolve zero quando não há registros', () => {
    expect(diasNoMes([], '2026-08')).toBe(0);
  });
});

describe('selos', () => {
  it('nenhum selo antes de 7 dias', () => {
    expect(selosConquistados(6)).toHaveLength(0);
    expect(proximoSelo(1)).toMatchObject({ faltam: 6 });
    expect(proximoSelo(1)!.selo.nome).toBe('Primeiros Traços');
  });
  it('acumula selos conforme os dias', () => {
    expect(selosConquistados(30).map(s => s.nome)).toEqual(['Primeiros Traços', 'Contorno']);
  });
  it('não há próximo selo depois do último', () => {
    expect(proximoSelo(400)).toBeNull();
  });
});

describe('calendarioDoMes', () => {
  it('agosto/2026 começa num sábado — 5 células vazias antes do dia 1', () => {
    const c = calendarioDoMes([], '2026-08');
    expect(c.slice(0, 5).every(x => x.dia === null)).toBe(true);
    expect(c[5].dia).toBe(1);
    expect(c.filter(x => x.dia !== null)).toHaveLength(31);
  });
  it('marca os dias registrados e o dia de hoje', () => {
    const c = calendarioDoMes(['2026-08-07'], '2026-08', '2026-08-10');
    expect(c.find(x => x.dia === 7)!.registrado).toBe(true);
    expect(c.find(x => x.dia === 8)!.registrado).toBe(false);
    expect(c.find(x => x.dia === 10)!.hoje).toBe(true);
  });
});
