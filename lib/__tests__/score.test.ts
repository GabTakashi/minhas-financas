import { describe, expect, it } from 'vitest';
import { calcularIpf, ehGrupoDePoupanca, faixaDoScore, GrupoOrcamento, pontosDoPilar } from '@/lib/score';

const ESSENCIAIS: GrupoOrcamento = { nome: 'Essenciais', percentual: 50, categorias: ['Moradia', 'Alimentação', 'Saúde'] };
const LAZER: GrupoOrcamento = { nome: 'Não essenciais', percentual: 30, categorias: ['Lazer', 'Lanche'] };
const INVEST: GrupoOrcamento = { nome: 'Investimentos', percentual: 20, categorias: ['Investimentos', 'Reserva de Emergência'] };
const TRES = [ESSENCIAIS, LAZER, INVEST];

const ponto = (r: ReturnType<typeof calcularIpf>, nome: string) =>
  r.pilares.find(p => p.nome === nome)!.pontos;

describe('faixaDoScore', () => {
  it('classifica cada faixa', () => {
    expect(faixaDoScore(100)).toBe('Excelente');
    expect(faixaDoScore(90)).toBe('Excelente');
    expect(faixaDoScore(89)).toBe('Muito Bom');
    expect(faixaDoScore(75)).toBe('Muito Bom');
    expect(faixaDoScore(74)).toBe('Atenção');
    expect(faixaDoScore(50)).toBe('Atenção');
    expect(faixaDoScore(49)).toBe('Crítico');
    expect(faixaDoScore(0)).toBe('Crítico');
  });
});

describe('ehGrupoDePoupanca', () => {
  it('reconhece o grupo formado só por categorias de poupança', () => {
    expect(ehGrupoDePoupanca(INVEST)).toBe(true);
  });
  it('grupo de consumo não é de poupança', () => {
    expect(ehGrupoDePoupanca(ESSENCIAIS)).toBe(false);
    expect(ehGrupoDePoupanca({ nome: 'Misto', percentual: 20, categorias: ['Investimentos', 'Lazer'] })).toBe(false);
  });
  it('grupo sem categoria nenhuma não é de poupança', () => {
    expect(ehGrupoDePoupanca({ nome: 'Vazio', percentual: 10, categorias: [] })).toBe(false);
  });
});

describe('pontosDoPilar', () => {
  it('teto: nota cheia enquanto couber no limite', () => {
    expect(pontosDoPilar('teto', 50, 20)).toBe(50);
    expect(pontosDoPilar('teto', 50, 50)).toBe(50);
  });
  it('teto: cada ponto percentual a mais custa 2,5 pontos', () => {
    expect(pontosDoPilar('teto', 50, 54)).toBe(40);
    expect(pontosDoPilar('teto', 30, 34)).toBe(20);
  });
  it('teto: zera de vez e não fica negativo', () => {
    expect(pontosDoPilar('teto', 50, 70)).toBe(0);
    expect(pontosDoPilar('teto', 50, 95)).toBe(0);
  });
  it('meta: nota cheia ao alcançar ou passar do alvo', () => {
    expect(pontosDoPilar('meta', 20, 20)).toBe(20);
    expect(pontosDoPilar('meta', 20, 45)).toBe(20);
  });
  it('meta: cada ponto percentual a menos custa 2,5 pontos', () => {
    expect(pontosDoPilar('meta', 20, 16)).toBe(10);
    expect(pontosDoPilar('meta', 20, 12)).toBe(0);
    expect(pontosDoPilar('meta', 20, 0)).toBe(0);
  });
});

describe('calcularIpf — regra 50/30/20', () => {
  it('dá 100 quando o mês segue a regra à risca', () => {
    const r = calcularIpf(5000, TRES, { Moradia: 2500, Lazer: 1500, Investimentos: 1000 });
    expect(ponto(r, 'Essenciais')).toBe(50);
    expect(ponto(r, 'Não essenciais')).toBe(30);
    expect(ponto(r, 'Investimentos')).toBe(20);
    expect(r.total).toBe(100);
    expect(r.faixa).toBe('Excelente');
  });

  it('gastar menos que o teto também vale nota cheia', () => {
    const r = calcularIpf(5000, TRES, { Moradia: 1000, Lazer: 200, Investimentos: 1000 });
    expect(ponto(r, 'Essenciais')).toBe(50);
    expect(ponto(r, 'Não essenciais')).toBe(30);
  });

  it('estourar pouco já cobra caro: 4 pontos percentuais custam 10 da nota', () => {
    const r = calcularIpf(5000, TRES, { Moradia: 2700, Lazer: 1500, Investimentos: 1000 });
    expect(ponto(r, 'Essenciais')).toBe(40);
    expect(r.total).toBe(90);
  });

  it('essenciais em 60% da renda derrubam o pilar pela metade', () => {
    const r = calcularIpf(5000, TRES, { Moradia: 3000, Lazer: 1500, Investimentos: 1000 });
    expect(ponto(r, 'Essenciais')).toBe(25);
    expect(r.total).toBe(75);
    expect(r.faixa).toBe('Muito Bom');
  });

  it('teto zera ao passar do peso mais o peso dividido por 2,5', () => {
    // essenciais zera em 70% (50 + 50/2,5); não essenciais, em 42%
    expect(ponto(calcularIpf(5000, TRES, { Moradia: 3500 }), 'Essenciais')).toBe(0);
    expect(ponto(calcularIpf(5000, TRES, { Lazer: 2100 }), 'Não essenciais')).toBe(0);
  });

  it('investir 16% em vez de 20% custa metade do pilar', () => {
    const r = calcularIpf(5000, TRES, { Moradia: 2500, Lazer: 1500, Investimentos: 800 });
    expect(ponto(r, 'Investimentos')).toBe(10);
    expect(r.total).toBe(90);
  });

  it('investir 12% ou menos zera o pilar de poupança', () => {
    const r = calcularIpf(5000, TRES, { Moradia: 2500, Lazer: 1500, Investimentos: 600 });
    expect(ponto(r, 'Investimentos')).toBe(0);
    expect(r.total).toBe(80);
  });

  it('investir acima do alvo não passa dos 20 pontos', () => {
    const r = calcularIpf(5000, TRES, { Moradia: 2500, Lazer: 1500, Investimentos: 3000 });
    expect(ponto(r, 'Investimentos')).toBe(20);
    expect(r.total).toBe(100);
  });

  it('soma as categorias do grupo e a reserva conta como investimento', () => {
    const r = calcularIpf(5000, TRES, { Moradia: 1000, Alimentação: 800, Saúde: 700, 'Reserva de Emergência': 1000 });
    expect(ponto(r, 'Essenciais')).toBe(50);
    expect(ponto(r, 'Investimentos')).toBe(20);
  });

  it('categoria fora de qualquer grupo não entra na nota', () => {
    const r = calcularIpf(5000, TRES, { Moradia: 2500, Lazer: 1500, Investimentos: 1000, Outros: 4000 });
    expect(r.total).toBe(100);
  });

  it('normaliza para 0–100 quando os percentuais não somam 100', () => {
    const meio = [{ nome: 'Essenciais', percentual: 50, categorias: ['Moradia'] }];
    const r = calcularIpf(5000, meio, { Moradia: 2500 });
    expect(ponto(r, 'Essenciais')).toBe(50);
    expect(r.total).toBe(100);
  });

  it('sem grupos, a nota não é calculada', () => {
    const r = calcularIpf(5000, [], { Moradia: 100 });
    expect(r.pronto).toBe(false);
    expect(r.total).toBe(0);
    expect(r.alertas[0].titulo).toBe('Sem grupos de orçamento');
  });

  it('sem receita, a nota não é calculada', () => {
    const r = calcularIpf(0, TRES, { Moradia: 100 });
    expect(r.pronto).toBe(false);
    expect(r.alertas[0].titulo).toBe('Sem receita no mês');
  });

  it('avisa o grupo estourado e o investimento abaixo da regra', () => {
    const r = calcularIpf(5000, TRES, { Moradia: 4000, Lazer: 1500, Investimentos: 0 });
    expect(r.alertas.some(a => a.titulo === 'Essenciais acima do previsto')).toBe(true);
    expect(r.alertas.some(a => a.titulo === 'Investimentos abaixo da regra')).toBe(true);
  });

  it('mês zerado devolve nota nos limites válidos', () => {
    const r = calcularIpf(5000, TRES, {});
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
    // gastou nada: os dois tetos dão cheio, o investimento dá zero
    expect(r.total).toBe(80);
  });
});
