/**
 * IPF — Índice de Performance Financeira.
 *
 * Nota de 0 a 100 tirada da regra 50/30/20: cada grupo de orçamento vale, em
 * pontos, o próprio percentual da renda. Grupos de gasto são **teto** (gastar
 * até o alvo dá a nota cheia; a partir daí a nota cai proporcionalmente, e
 * zera ao gastar o dobro do alvo). O grupo de poupança é **meta** (alocar o
 * alvo ou mais dá a nota cheia; alocar menos pontua proporcionalmente).
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
  { nome: 'Excelente', de: 85, ate: 100 },
  { nome: 'Muito Bom', de: 70, ate: 84 },
  { nome: 'Atenção', de: 50, ate: 69 },
  { nome: 'Risco', de: 30, ate: 49 },
  { nome: 'Crítico', de: 0, ate: 29 },
] as const;

export function faixaDoScore(total: number): string {
  return FAIXAS.find(f => total >= f.de && total <= f.ate)?.nome ?? 'Crítico';
}

/** O grupo guarda dinheiro (Investimentos, Reserva) em vez de consumir? */
export function ehGrupoDePoupanca(g: GrupoOrcamento): boolean {
  return g.categorias.length > 0 && g.categorias.every(c => CATEGORIAS_POUPANCA.includes(c));
}

/**
 * Fração da nota do pilar, 0–1.
 * - meta: proporcional ao quanto do alvo foi alocado.
 * - teto: cheia até o alvo, caindo depois na mesma proporção do excesso.
 */
export function fracaoDoPilar(tipo: TipoPilar, gasto: number, alvo: number): number {
  if (alvo <= 0) return tipo === 'meta' ? 0 : 1;
  return limita(tipo === 'meta' ? gasto / alvo : 2 - gasto / alvo);
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
    const pontos = Math.round(fracaoDoPilar(tipo, gasto, alvo) * peso);

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
          : `Você guardou ${pct(fatia)} da renda. A nota cheia vem a partir de ${peso}%.`
        : gasto <= alvo
          ? `Você usou ${pct(fatia)} da renda, dentro dos ${peso}% da regra.`
          : `Você usou ${pct(fatia)} da renda, acima dos ${peso}% da regra. A nota zera ao dobrar o alvo.`,
    };
  });

  // normaliza para 0–100: o usuário pode configurar percentuais que não somam 100
  const somaPesos = pilares.reduce((s, p) => s + p.peso, 0);
  const somaPontos = pilares.reduce((s, p) => s + p.pontos, 0);
  const total = somaPesos > 0 ? Math.round(limita(somaPontos / somaPesos) * 100) : 0;

  return { total, faixa: faixaDoScore(total), pilares, alertas, pronto: true };
}
