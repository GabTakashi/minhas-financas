import { ResumoMes } from './resumo';

export interface PontoMeta { month: string; economia: number; meta: number; pct: number }

/** Economia de cada mês contra a meta daquele mês. */
export function serieMetas(resumos: ResumoMes[], metaPorMes: Record<string, number>): PontoMeta[] {
  return resumos.map(r => {
    const meta = metaPorMes[r.month] ?? 0;
    return {
      month: r.month,
      economia: r.poupado,
      meta,
      pct: meta > 0 ? Math.round((r.poupado / meta) * 100) : 0,
    };
  });
}

export interface AnaliseMeta { texto: string; tom: 'bom' | 'neutro' | 'alerta' }

/**
 * Lê o padrão dos últimos meses (fora o atual) e resume numa frase.
 * Só considera meses que tinham meta definida.
 */
export function analisarPadrao(serie: PontoMeta[], quantos = 3): AnaliseMeta {
  const anteriores = serie.slice(0, -1).filter(p => p.meta > 0).slice(-quantos);
  if (anteriores.length === 0) {
    return { texto: 'Ainda não há meses anteriores com meta definida para comparar.', tom: 'neutro' };
  }
  const media = Math.round(anteriores.reduce((s, p) => s + p.pct, 0) / anteriores.length);
  const plural = anteriores.length === 1 ? 'mês' : 'meses';
  if (media >= 100) {
    return { texto: `Você vem batendo a meta — média de ${media}% nos últimos ${anteriores.length} ${plural}.`, tom: 'bom' };
  }
  if (media >= 70) {
    return { texto: `Padrão estável — média de ${media}% da meta nos últimos ${anteriores.length} ${plural}.`, tom: 'neutro' };
  }
  return { texto: `Atenção: média de só ${media}% da meta nos últimos ${anteriores.length} ${plural}.`, tom: 'alerta' };
}

/** Frase de status do mês atual. */
export function statusDoMes(economia: number, meta: number): { texto: string; superou: boolean } {
  if (meta <= 0) return { texto: 'Defina uma meta para acompanhar seu progresso.', superou: false };
  const diff = economia - meta;
  if (diff >= 0) return { texto: `${fmt(diff)} acima da meta`, superou: true };
  return { texto: `${fmt(-diff)} para alcançar a meta`, superou: false };
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
