/**
 * IPF — Índice de Performance Financeira.
 * Indicador interno do app (0–100) formado por 4 pilares de 25 pontos.
 * Não tem relação com score de crédito de bancos.
 */

export interface ResumoMes {
  month: string;
  entradas: number;
  saidas: number;
  /** quanto sobrou + o que foi para investimento/reserva */
  poupado: number;
  /** fatura do cartão do mês (peso de endividamento) */
  fatura: number;
}

export interface Pilar {
  chave: 'poupanca' | 'aderencia' | 'estabilidade' | 'endividamento';
  nome: string;
  pontos: number;
  descricao: string;
  dica: string;
}

export interface Ipf {
  total: number;
  faixa: string;
  pilares: Pilar[];
  alertas: { titulo: string; texto: string }[];
}

const limita = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const pontos = (fracao: number) => Math.round(limita(fracao) * 25);
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

/** Coeficiente de variação (desvio padrão ÷ média). Quanto menor, mais estável. */
export function coefVariacao(valores: number[]): number {
  const uteis = valores.filter(v => v > 0);
  if (uteis.length < 2) return 0;
  const media = uteis.reduce((s, v) => s + v, 0) / uteis.length;
  if (media === 0) return 0;
  const variancia = uteis.reduce((s, v) => s + (v - media) ** 2, 0) / uteis.length;
  return Math.sqrt(variancia) / media;
}

/**
 * @param mes        resumo do mês avaliado
 * @param historico  meses anteriores (mais recentes por último), para estabilidade
 * @param meta       meta de economia do mês (0 = não definida)
 * @param parcelasFuturas total ainda a pagar em parcelas de cartão
 */
export function calcularIpf(
  mes: ResumoMes,
  historico: ResumoMes[],
  meta: number,
  parcelasFuturas = 0,
): Ipf {
  const pilares: Pilar[] = [];
  const alertas: { titulo: string; texto: string }[] = [];

  // 1. Poupança — 20% da renda poupada vale a nota cheia
  const taxa = mes.entradas > 0 ? mes.poupado / mes.entradas : 0;
  const pPoupanca = pontos(taxa / 0.2);
  pilares.push({
    chave: 'poupanca',
    nome: 'Poupança',
    pontos: pPoupanca,
    descricao: 'Quanto da sua renda está sendo poupada ou investida.',
    dica: mes.entradas === 0
      ? 'Registre suas entradas do mês para calcular este pilar.'
      : taxa <= 0
        ? 'Você não poupou neste mês — as saídas consumiram toda a renda.'
        : `Você poupou ${pct(taxa)} da sua renda. A nota cheia vem a partir de 20%.`,
  });
  if (mes.entradas > 0 && taxa <= 0) {
    alertas.push({ titulo: 'Falta de poupança', texto: 'Nenhum valor sobrou neste mês, o que fragiliza sua saúde financeira.' });
  }

  // 2. Aderência à meta
  const pAderencia = meta > 0 ? pontos(mes.poupado / meta) : 0;
  pilares.push({
    chave: 'aderencia',
    nome: 'Aderência à meta',
    pontos: pAderencia,
    descricao: 'O quanto sua poupança do mês se aproxima da meta definida.',
    dica: meta <= 0
      ? 'Defina sua meta de economia na Visão geral para ativar este pilar.'
      : mes.poupado >= meta
        ? 'Meta batida neste mês ✓'
        : `Faltaram ${pct(1 - limita(mes.poupado / meta))} da meta para a nota cheia.`,
  });
  if (meta <= 0) {
    alertas.push({ titulo: 'Sem meta definida', texto: 'Sem uma meta de economia, não dá para medir sua aderência.' });
  }

  // 3. Estabilidade de gastos — CV até 10% é ótimo; a partir de 60% é instável
  const serie = [...historico, mes].map(m => m.saidas);
  const cv = coefVariacao(serie);
  const poucoHistorico = serie.filter(v => v > 0).length < 2;
  const pEstabilidade = poucoHistorico ? 25 : pontos((0.6 - cv) / 0.5);
  pilares.push({
    chave: 'estabilidade',
    nome: 'Estabilidade de gastos',
    pontos: pEstabilidade,
    descricao: 'A consistência dos seus gastos ao longo dos meses.',
    dica: poucoHistorico
      ? 'Ainda há poucos meses registrados para medir variação.'
      : `Seus gastos variam ${pct(cv)} entre os meses.`,
  });

  // 4. Endividamento — fatura + parcelas a vencer sobre a renda
  const comprometido = mes.entradas > 0 ? (mes.fatura + parcelasFuturas) / mes.entradas : 0;
  const pEndividamento = mes.entradas > 0 ? pontos((0.4 - comprometido) / 0.4) : 25;
  pilares.push({
    chave: 'endividamento',
    nome: 'Endividamento',
    pontos: pEndividamento,
    descricao: 'O impacto do cartão e das parcelas sobre a sua renda.',
    dica: mes.entradas === 0
      ? 'Sem entradas registradas não dá para medir o comprometimento.'
      : comprometido === 0
        ? 'Sem dívidas de cartão — comprometimento de renda em 0%.'
        : `${pct(comprometido)} da sua renda está comprometida com cartão e parcelas.`,
  });
  if (comprometido > 0.4) {
    alertas.push({ titulo: 'Endividamento alto', texto: `Cartão e parcelas consomem ${pct(comprometido)} da sua renda.` });
  }

  const total = pilares.reduce((s, p) => s + p.pontos, 0);
  return { total, faixa: faixaDoScore(total), pilares, alertas };
}
