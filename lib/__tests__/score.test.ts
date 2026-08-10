import { describe, expect, it } from 'vitest';
import { calcularIpf, coefVariacao, faixaDoScore, ResumoMes } from '@/lib/score';

const mes = (p: Partial<ResumoMes> = {}): ResumoMes =>
  ({ month: '2026-08', entradas: 5000, saidas: 4000, poupado: 1000, fatura: 0, ...p });

describe('coefVariacao', () => {
  it('é zero quando os valores são iguais', () => {
    expect(coefVariacao([1000, 1000, 1000])).toBe(0);
  });
  it('cresce conforme a dispersão', () => {
    expect(coefVariacao([500, 1500])).toBeGreaterThan(0.4);
  });
  it('ignora série curta demais', () => {
    expect(coefVariacao([1000])).toBe(0);
  });
});

describe('faixaDoScore', () => {
  it('classifica cada faixa', () => {
    expect(faixaDoScore(100)).toBe('Excelente');
    expect(faixaDoScore(85)).toBe('Excelente');
    expect(faixaDoScore(70)).toBe('Muito Bom');
    expect(faixaDoScore(50)).toBe('Atenção');
    expect(faixaDoScore(30)).toBe('Risco');
    expect(faixaDoScore(0)).toBe('Crítico');
  });
});

describe('calcularIpf', () => {
  it('dá nota cheia em poupança a partir de 20% da renda', () => {
    const r = calcularIpf(mes({ poupado: 1000, entradas: 5000 }), [], 1000);
    expect(r.pilares.find(p => p.chave === 'poupanca')!.pontos).toBe(25);
  });

  it('pontua poupança proporcionalmente abaixo de 20%', () => {
    const r = calcularIpf(mes({ poupado: 500, entradas: 5000 }), [], 0); // 10% → metade
    expect(r.pilares.find(p => p.chave === 'poupanca')!.pontos).toBe(13);
  });

  it('zera aderência quando não há meta e avisa', () => {
    const r = calcularIpf(mes(), [], 0);
    expect(r.pilares.find(p => p.chave === 'aderencia')!.pontos).toBe(0);
    expect(r.alertas.some(a => a.titulo === 'Sem meta definida')).toBe(true);
  });

  it('dá nota cheia de aderência quando bate a meta', () => {
    const r = calcularIpf(mes({ poupado: 800 }), [], 800);
    expect(r.pilares.find(p => p.chave === 'aderencia')!.pontos).toBe(25);
  });

  it('penaliza endividamento acima de 40% da renda', () => {
    const r = calcularIpf(mes({ entradas: 1000, fatura: 500 }), [], 0);
    expect(r.pilares.find(p => p.chave === 'endividamento')!.pontos).toBe(0);
    expect(r.alertas.some(a => a.titulo === 'Endividamento alto')).toBe(true);
  });

  it('sem dívida, endividamento é nota cheia', () => {
    const r = calcularIpf(mes({ fatura: 0 }), [], 0);
    expect(r.pilares.find(p => p.chave === 'endividamento')!.pontos).toBe(25);
  });

  it('com poucos meses, estabilidade não pune o usuário', () => {
    const r = calcularIpf(mes(), [], 0);
    expect(r.pilares.find(p => p.chave === 'estabilidade')!.pontos).toBe(25);
  });

  it('gastos muito irregulares derrubam a estabilidade', () => {
    const hist = [mes({ saidas: 500 }), mes({ saidas: 6000 }), mes({ saidas: 800 })];
    const r = calcularIpf(mes({ saidas: 7000 }), hist, 0);
    expect(r.pilares.find(p => p.chave === 'estabilidade')!.pontos).toBeLessThan(13);
  });

  it('soma os 4 pilares e classifica', () => {
    const r = calcularIpf(mes({ poupado: 1000, entradas: 5000, fatura: 0 }), [], 1000);
    expect(r.total).toBe(100);
    expect(r.faixa).toBe('Excelente');
    expect(r.pilares).toHaveLength(4);
  });

  it('a meta de poupança configurada muda o alvo do pilar', () => {
    const m = mes({ poupado: 500, entradas: 5000 }); // poupou 10%
    // alvo 10% → nota cheia; alvo 40% → um quarto da nota
    expect(calcularIpf(m, [], 0, 0, 10).pilares.find(p => p.chave === 'poupanca')!.pontos).toBe(25);
    expect(calcularIpf(m, [], 0, 0, 40).pilares.find(p => p.chave === 'poupanca')!.pontos).toBe(6);
  });

  it('mês sem entradas não quebra o cálculo', () => {
    const r = calcularIpf(mes({ entradas: 0, saidas: 300, poupado: -300 }), [], 0);
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
  });
});
