/** Constância de registro: dias em que o usuário lançou algo, e os selos por acumulado. */

export interface Selo { nome: string; dias: number; ordem: number }

export const SELOS: Selo[] = [
  { nome: 'Primeiros Traços', dias: 7, ordem: 1 },
  { nome: 'Contorno', dias: 28, ordem: 2 },
  { nome: 'Foco', dias: 84, ordem: 3 },
  { nome: 'Nitidez', dias: 168, ordem: 4 },
  { nome: 'Alta Definição', dias: 280, ordem: 5 },
  { nome: 'Panorama', dias: 365, ordem: 6 },
];

export function selosConquistados(totalDias: number): Selo[] {
  return SELOS.filter(s => totalDias >= s.dias);
}

export function proximoSelo(totalDias: number): { selo: Selo; faltam: number } | null {
  const s = SELOS.find(x => totalDias < x.dias);
  return s ? { selo: s, faltam: s.dias - totalDias } : null;
}

/** Quantos dias do mês (YYYY-MM) aparecem na lista de datas 'YYYY-MM-DD'. */
export function diasNoMes(datas: string[], month: string): number {
  return new Set(datas.filter(d => d.startsWith(month))).size;
}

export interface CelulaCalendario { dia: number | null; registrado: boolean; hoje: boolean }

/**
 * Grade do mês começando na segunda-feira, com células vazias antes do dia 1.
 * `hojeISO` no formato 'YYYY-MM-DD' marca o dia atual (só se for do mesmo mês).
 */
export function calendarioDoMes(datas: string[], month: string, hojeISO?: string): CelulaCalendario[] {
  const [ano, mes] = month.split('-').map(Number);
  const registrados = new Set(datas.filter(d => d.startsWith(month)).map(d => Number(d.slice(8, 10))));
  const totalDias = new Date(ano, mes, 0).getDate();
  // getDay(): 0=domingo … 6=sábado → deslocamento com a semana começando na segunda
  const inicio = (new Date(ano, mes - 1, 1).getDay() + 6) % 7;

  const celulas: CelulaCalendario[] = [];
  for (let i = 0; i < inicio; i++) celulas.push({ dia: null, registrado: false, hoje: false });
  for (let d = 1; d <= totalDias; d++) {
    const iso = `${month}-${String(d).padStart(2, '0')}`;
    celulas.push({ dia: d, registrado: registrados.has(d), hoje: hojeISO === iso });
  }
  return celulas;
}
