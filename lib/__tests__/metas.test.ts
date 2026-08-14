import { describe, expect, it } from 'vitest';
import { analisarPadrao, PontoMeta, serieMetas, statusDoMes } from '@/lib/metas';
import { ResumoMes } from '@/lib/resumo';

const r = (month: string, poupado: number): ResumoMes =>
  ({ month, entradas: 5000, saidas: 5000 - poupado, poupado });

const p = (month: string, economia: number, meta: number): PontoMeta =>
  ({ month, economia, meta, pct: meta > 0 ? Math.round((economia / meta) * 100) : 0 });

describe('serieMetas', () => {
  it('casa cada mês com a meta dele e calcula o percentual', () => {
    const s = serieMetas([r('2026-07', 500), r('2026-08', 1200)], { '2026-07': 1000, '2026-08': 1000 });
    expect(s[0]).toMatchObject({ economia: 500, meta: 1000, pct: 50 });
    expect(s[1]).toMatchObject({ economia: 1200, meta: 1000, pct: 120 });
  });
  it('mês sem meta fica com pct zero', () => {
    expect(serieMetas([r('2026-08', 800)], {})[0].pct).toBe(0);
  });
});

describe('analisarPadrao', () => {
  it('ignora o mês atual e só olha os anteriores', () => {
    const s = [p('2026-06', 1000, 1000), p('2026-07', 1000, 1000), p('2026-08', 0, 1000)];
    expect(analisarPadrao(s).texto).toContain('100%');
    expect(analisarPadrao(s).tom).toBe('bom');
  });
  it('classifica padrão estável entre 70% e 99%', () => {
    const s = [p('2026-06', 800, 1000), p('2026-07', 800, 1000), p('2026-08', 0, 1000)];
    expect(analisarPadrao(s).tom).toBe('neutro');
    expect(analisarPadrao(s).texto).toContain('80%');
  });
  it('alerta quando a média fica baixa', () => {
    const s = [p('2026-06', 300, 1000), p('2026-07', 300, 1000), p('2026-08', 0, 1000)];
    expect(analisarPadrao(s).tom).toBe('alerta');
  });
  it('sem meses anteriores com meta, avisa que não dá para comparar', () => {
    expect(analisarPadrao([p('2026-08', 500, 1000)]).tom).toBe('neutro');
    expect(analisarPadrao([p('2026-08', 500, 1000)]).texto).toContain('Ainda não há');
  });
});

describe('statusDoMes', () => {
  it('avisa quando superou', () => {
    const s = statusDoMes(1500, 1000);
    expect(s.superou).toBe(true);
    expect(s.texto).toContain('acima da meta');
  });
  it('mostra o que falta', () => {
    const s = statusDoMes(400, 1000);
    expect(s.superou).toBe(false);
    expect(s.texto).toContain('alcançar');
  });
  it('sem meta, pede para definir', () => {
    expect(statusDoMes(500, 0).texto).toContain('Defina');
  });
});
