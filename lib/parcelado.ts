import { shiftMonth } from './months';

export type TipoParcelado = 'parcelamento' | 'cartao' | 'recorrente' | 'financiamento';

export const TIPOS: { chave: TipoParcelado; nome: string; sub: string; icone: string }[] = [
  { chave: 'parcelamento', nome: 'Parcelamento', sub: 'Nº de parcelas definido', icone: '🗓️' },
  { chave: 'cartao', nome: 'Cartão', sub: 'Compra parcelada no cartão', icone: '💳' },
  { chave: 'recorrente', nome: 'Recorrente', sub: 'Sem prazo definido', icone: '🔁' },
  { chave: 'financiamento', nome: 'Financiamento', sub: 'Imóvel, veículo…', icone: '🏦' },
];

export const semPrazo = (tipo: TipoParcelado) => tipo === 'recorrente';

export interface Parcelado {
  id: string;
  nome: string;
  tipo: TipoParcelado;
  categoria: string;
  valor_total: number | null;
  parcelas: number | null;
  valor_parcela: number;
  parcelas_pagas: number;
  primeiro_vencimento: string; // 'YYYY-MM-DD'
  dia_vencimento: number;
}

/** Divide o total pelas parcelas; os centavos que sobram vão para a última. */
export function valorDaParcela(valorTotal: number, parcelas: number, indice = 1): number {
  if (parcelas < 1) return 0;
  const cents = Math.round(valorTotal * 100);
  const base = Math.floor(cents / parcelas);
  const resto = cents - base * parcelas;
  return (indice === parcelas ? base + resto : base) / 100;
}

export const mesDe = (iso: string) => iso.slice(0, 7);

/** Mês (YYYY-MM) da última parcela. null quando não há prazo. */
export function mesFinal(p: Pick<Parcelado, 'tipo' | 'parcelas' | 'primeiro_vencimento'>): string | null {
  if (semPrazo(p.tipo) || !p.parcelas) return null;
  return shiftMonth(mesDe(p.primeiro_vencimento), p.parcelas - 1);
}

/** O parcelado gera lançamento neste mês? */
export function vigenteEm(p: Pick<Parcelado, 'tipo' | 'parcelas' | 'primeiro_vencimento'>, month: string): boolean {
  const inicio = mesDe(p.primeiro_vencimento);
  if (month < inicio) return false;
  const fim = mesFinal(p);
  return fim === null || month <= fim;
}

/** Índice (1-based) da parcela que cai no mês. null se fora da vigência. */
export function parcelaDoMes(p: Pick<Parcelado, 'tipo' | 'parcelas' | 'primeiro_vencimento'>, month: string): number | null {
  if (!vigenteEm(p, month)) return null;
  const [ai, mi] = mesDe(p.primeiro_vencimento).split('-').map(Number);
  const [am, mm] = month.split('-').map(Number);
  return (am - ai) * 12 + (mm - mi) + 1;
}

export interface Vencimento { indice: number; mes: string; iso: string; valor: number }

/** Calendário das próximas parcelas a partir do início (para a prévia do cadastro). */
export function calendario(
  p: Pick<Parcelado, 'tipo' | 'parcelas' | 'primeiro_vencimento' | 'dia_vencimento' | 'valor_parcela' | 'valor_total'>,
  limite = 12,
): Vencimento[] {
  const total = semPrazo(p.tipo) ? limite : Math.min(p.parcelas ?? 0, limite);
  const inicio = mesDe(p.primeiro_vencimento);
  const saida: Vencimento[] = [];
  for (let i = 1; i <= total; i++) {
    const mes = shiftMonth(inicio, i - 1);
    const [ano, m] = mes.split('-').map(Number);
    // encurta o dia quando o mês não tem (ex.: dia 31 em fevereiro)
    const dia = Math.min(p.dia_vencimento, new Date(ano, m, 0).getDate());
    const valor = !semPrazo(p.tipo) && p.parcelas && p.valor_total != null
      ? valorDaParcela(p.valor_total, p.parcelas, i)
      : p.valor_parcela;
    saida.push({ indice: i, mes, iso: `${mes}-${String(dia).padStart(2, '0')}`, valor });
  }
  return saida;
}

/** Quanto ainda falta pagar. Recorrente não tem saldo final. */
export function saldoRestante(p: Pick<Parcelado, 'tipo' | 'parcelas' | 'parcelas_pagas' | 'valor_parcela' | 'valor_total'>): number | null {
  if (semPrazo(p.tipo) || !p.parcelas) return null;
  const total = p.valor_total ?? p.valor_parcela * p.parcelas;
  const pagas = Math.min(p.parcelas_pagas, p.parcelas);
  const jaPago = Array.from({ length: pagas }, (_, i) => valorDaParcela(total, p.parcelas!, i + 1))
    .reduce((s, v) => s + v, 0);
  return Math.round((total - jaPago) * 100) / 100;
}

export function quitado(p: Pick<Parcelado, 'tipo' | 'parcelas' | 'parcelas_pagas'>): boolean {
  return !semPrazo(p.tipo) && !!p.parcelas && p.parcelas_pagas >= p.parcelas;
}

const cent = (v: number) => Math.round(v * 100) / 100;

export interface PontoProjecao {
  mes: string;
  /** Quanto ainda se deve no começo do mês, antes de pagar as parcelas dele. */
  restante: number;
  /** Soma das parcelas que vencem neste mês. */
  aPagar: number;
}

export interface Projecao {
  pontos: PontoProjecao[];
  /** Mês em que a última parcela é paga. null se a lista não quita dentro do limite. */
  mesQuitacao: string | null;
  /** true quando o horizonte foi cortado pelo limite de meses. */
  truncado: boolean;
}

type ParceladoProjetavel = Pick<
  Parcelado, 'tipo' | 'parcelas' | 'parcelas_pagas' | 'valor_parcela' | 'valor_total' | 'primeiro_vencimento'
>;

/**
 * Projeta a dívida caindo mês a mês até quitar, somando todos os parcelados.
 *
 * Recorrentes ficam de fora: não têm saldo final, entrariam como dívida infinita.
 * Parcela vencida (mês anterior a `mesInicial` e ainda não paga) é trazida para
 * `mesInicial` — a dívida existe hoje, não no passado.
 */
export function projecaoDivida(
  lista: ParceladoProjetavel[],
  mesInicial: string,
  limite = 36,
): Projecao {
  const aPagarPorMes = new Map<string, number>();

  for (const p of lista) {
    if (semPrazo(p.tipo) || !p.parcelas) continue;
    const total = p.valor_total ?? p.valor_parcela * p.parcelas;
    const inicio = mesDe(p.primeiro_vencimento);
    const pagas = Math.max(0, Math.min(p.parcelas_pagas, p.parcelas));
    for (let i = pagas + 1; i <= p.parcelas; i++) {
      const venc = shiftMonth(inicio, i - 1);
      const mes = venc < mesInicial ? mesInicial : venc;
      aPagarPorMes.set(mes, cent((aPagarPorMes.get(mes) ?? 0) + valorDaParcela(total, p.parcelas, i)));
    }
  }

  let saldo = cent([...aPagarPorMes.values()].reduce((s, v) => s + v, 0));
  if (saldo <= 0) return { pontos: [], mesQuitacao: null, truncado: false };

  const pontos: PontoProjecao[] = [];
  let mes = mesInicial;
  let mesQuitacao: string | null = null;
  let truncado = false;

  for (;;) {
    const aPagar = aPagarPorMes.get(mes) ?? 0;
    pontos.push({ mes, restante: saldo, aPagar });
    saldo = cent(saldo - aPagar);
    if (saldo <= 0) {
      mesQuitacao = mes;
      // ponto extra para a linha encostar no zero
      pontos.push({ mes: shiftMonth(mes, 1), restante: 0, aPagar: 0 });
      break;
    }
    if (pontos.length >= limite) { truncado = true; break; }
    mes = shiftMonth(mes, 1);
  }

  return { pontos, mesQuitacao, truncado };
}
