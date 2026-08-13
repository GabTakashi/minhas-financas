import { describe, expect, it } from 'vitest';
import { calcularIpf, ehGrupoDePoupanca, faixaDoScore, fracaoDoPilar, GrupoOrcamento } from '@/lib/score';

const ESSENCIAIS: GrupoOrcamento = { nome: 'Essenciais', percentual: 50, categorias: ['Moradia', 'Alimentação', 'Saúde'] };
const LAZER: GrupoOrcamento = { nome: 'Não essenciais', percentual: 30, categorias: ['Lazer', 'Lanche'] };
const INVEST: GrupoOrcamento = { nome: 'Investimentos', percentual: 20, categorias: ['Investimentos', 'Reserva de Emergência'] };
const TRES = [ESSENCIAIS, LAZER, INVEST];

const ponto = (r: ReturnType<typeof calcularIpf>, nome: string) =>
  r.pilares.find(p => p.nome === nome)!.pontos;

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

describe('fracaoDoPilar', () => {
  it('teto: nota cheia até o alvo', () => {
    expect(fracaoDoPilar('teto', 400, 1000)).toBe(1);
    expect(fracaoDoPilar('teto', 1000, 1000)).toBe(1);
  });
  it('teto: cai proporcionalmente ao excesso e zera no dobro', () => {
    expect(fracaoDoPilar('teto', 1500, 1000)).toBe(0.5);
    expect(fracaoDoPilar('teto', 2000, 1000)).toBe(0);
    expect(fracaoDoPilar('teto', 3000, 1000)).toBe(0);
  });
  it('meta: proporcional ao que foi alocado, sem passar de cheia', () => {
    expect(fracaoDoPilar('meta', 500, 1000)).toBe(0.5);
    expect(fracaoDoPilar('meta', 1000, 1000)).toBe(1);
    expect(fracaoDoPilar('meta', 4000, 1000)).toBe(1);
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

  it('essenciais em 75% da renda derruba o pilar pela metade', () => {
    const r = calcularIpf(5000, TRES, { Moradia: 3750, Lazer: 1500, Investimentos: 1000 });
    expect(ponto(r, 'Essenciais')).toBe(25);
    expect(r.total).toBe(75);
  });

  it('gastar o dobro do teto zera o pilar', () => {
    const r = calcularIpf(5000, TRES, { Lazer: 3000, Moradia: 2500, Investimentos: 1000 });
    expect(ponto(r, 'Não essenciais')).toBe(0);
  });

  it('investir metade do alvo vale metade dos pontos', () => {
    const r = calcularIpf(5000, TRES, { Moradia: 2500, Lazer: 1500, Investimentos: 500 });
    expect(ponto(r, 'Investimentos')).toBe(10);
    expect(r.total).toBe(90);
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
