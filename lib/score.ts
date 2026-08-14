/**
 * IPF — Índice de Performance Financeira.
 *
 * Nota de 0 a 100 tirada da regra 50/30/20: cada grupo de orçamento vale, em
 * pontos, o próprio percentual da renda. Grupos de gasto são **teto** e o de
 * poupança é **meta**; em ambos, dentro da regra vale a nota cheia e fora dela
 * cada ponto percentual de desvio custa PENALIDADE pontos, com chão em zero.
 *
 * Indicador interno deste app — não tem relação com score de crédito de bancos.
 */
import { CATEGORIAS_POUPANCA } from './categories';

export interface GrupoOrcamento {
  nome: string;
  percentual: number;
  categorias: string[];
}

/** teto = gastar até o alvo; meta = alocar o alvo ou mais. */
export type TipoPilar = 'teto' | 'meta';

export interface Pilar {
  chave: string;
  nome: string;
  tipo: TipoPilar;
  /** quanto o pilar vale na nota (é o percentual do grupo) */
  peso: number;
  pontos: number;
  /** valor em R$ que a regra reserva ao grupo */
  alvo: number;
  /** valor em R$ efetivamente gasto/alocado */
  gasto: number;
  /** fatia da renda que o grupo consumiu, 0–1 */
  fatia: number;
  descricao: string;
  dica: string;
}

export interface Ipf {
  total: number;
  faixa: string;
  pilares: Pilar[];
  alertas: { titulo: string; texto: string }[];
  /** false quando ainda falta configurar grupos ou registrar receita */
  pronto: boolean;
}

const limita = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const pct = (v: number) => `${Math.round(v * 100)}%`;

export const FAIXAS = [
  { nome: 'Excelente', de: 90, ate: 100 },
  { nome: 'Muito Bom', de: 75, ate: 89 },
  { nome: 'Atenção', de: 50, ate: 74 },
  { nome: 'Crítico', de: 0, ate: 49 },
] as const;

/** Pontos perdidos por ponto percentual de desvio da regra. */
export const PENALIDADE = 2.5;

export function faixaDoScore(total: number): string {
  return FAIXAS.find(f => total >= f.de && total <= f.ate)?.nome ?? 'Crítico';
}

/** O grupo guarda dinheiro (Investimentos, Reserva) em vez de consumir? */
export function ehGrupoDePoupanca(g: GrupoOrcamento): boolean {
  return g.categorias.length > 0 && g.categorias.every(c => CATEGORIAS_POUPANCA.includes(c));
}

/**
 * Pontos do pilar. Dentro da regra, nota cheia; fora, cada ponto percentual de
 * desvio custa PENALIDADE pontos, sem passar do chão (0) nem do teto (peso).
 *
 * @param peso  percentual da renda reservado ao grupo — é também a nota cheia
 * @param fatia percentual da renda que o grupo consumiu/guardou (0–100)
 */
export function pontosDoPilar(tipo: TipoPilar, peso: number, fatia: number): number {
  const desvio = tipo === 'meta' ? peso - fatia : fatia - peso;
  if (desvio <= 0) return peso;
  return Math.max(0, peso - desvio * PENALIDADE);
}

function inacabado(titulo: string, texto: string): Ipf {
  return { total: 0, faixa: faixaDoScore(0), pilares: [], alertas: [{ titulo, texto }], pronto: false };
}

/**
 * @param entradas receita do mês em R$
 * @param grupos   grupos de orçamento do usuário (nome, % da renda, categorias)
 * @param gastos   quanto foi gasto em cada categoria no mês
 */
export function calcularIpf(
  entradas: number,
  grupos: GrupoOrcamento[],
  gastos: Record<string, number>,
): Ipf {
  if (grupos.length === 0) {
    return inacabado(
      'Sem grupos de orçamento',
      'Crie seus grupos na aba Orçamento — a nota vem da regra 50/30/20 que você definir lá.',
    );
  }
  if (entradas <= 0) {
    return inacabado(
      'Sem receita no mês',
      'Registre suas entradas do mês para a nota poder comparar seus gastos com a renda.',
    );
  }

  const alertas: { titulo: string; texto: string }[] = [];

  const pilares: Pilar[] = grupos.map(g => {
    const peso = Math.max(0, g.percentual);
    const alvo = (peso / 100) * entradas;
    const gasto = g.categorias.reduce((s, c) => s + (gastos[c] || 0), 0);
    const fatia = gasto / entradas;
    const tipo: TipoPilar = ehGrupoDePoupanca(g) ? 'meta' : 'teto';
    const pontos = Math.round(pontosDoPilar(tipo, peso, fatia * 100));

    if (tipo === 'teto' && gasto > alvo && alvo > 0) {
      alertas.push({
        titulo: `${g.nome} acima do previsto`,
        texto: `A regra reserva ${peso}% da renda para ${g.nome.toLowerCase()}, mas você já usou ${pct(fatia)}.`,
      });
    }
    if (tipo === 'meta' && gasto < alvo) {
      alertas.push({
        titulo: `${g.nome} abaixo da regra`,
        texto: `Você guardou ${pct(fatia)} da renda; a regra pede ${peso}%.`,
      });
    }

    return {
      chave: g.nome,
      nome: g.nome,
      tipo,
      peso,
      pontos,
      alvo,
      gasto,
      fatia,
      descricao: tipo === 'meta'
        ? `Guardar pelo menos ${peso}% da renda em ${g.nome.toLowerCase()}.`
        : `Os gastos de ${g.nome.toLowerCase()} devem caber em ${peso}% da renda.`,
      dica: tipo === 'meta'
        ? gasto >= alvo
          ? `Você guardou ${pct(fatia)} da renda — a regra pede ${peso}%. Nota cheia ✓`
          : `Você guardou ${pct(fatia)} da renda. Faltam ${Math.round(peso - fatia * 100)} pontos percentuais para os ${peso}%, e cada um custa ${PENALIDADE} pontos da nota.`
        : gasto <= alvo
          ? `Você usou ${pct(fatia)} da renda, dentro dos ${peso}% da regra.`
          : `Você usou ${pct(fatia)} da renda, ${Math.round(fatia * 100 - peso)} pontos percentuais acima dos ${peso}% da regra — cada um custa ${PENALIDADE} pontos da nota.`,
    };
  });

  // normaliza para 0–100: o usuário pode configurar percentuais que não somam 100
  const somaPesos = pilares.reduce((s, p) => s + p.peso, 0);
  const somaPontos = pilares.reduce((s, p) => s + p.pontos, 0);
  const total = somaPesos > 0 ? Math.round(limita(somaPontos / somaPesos) * 100) : 0;

  return { total, faixa: faixaDoScore(total), pilares, alertas, pronto: true };
}
