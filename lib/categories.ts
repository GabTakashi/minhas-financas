export const CATEGORIAS = [
  'Moradia', 'Alimentação', 'Lanche', 'Transporte', 'Saúde', 'Educação',
  'Lazer', 'Assinaturas', 'Dívidas', 'Investimentos', 'Reserva de Emergência', 'Outros',
] as const;

/** Ícone de cada categoria — reconhecimento visual é mais rápido que leitura. */
export const ICONE_CATEGORIA: Record<string, string> = {
  'Moradia': '🏠',
  'Alimentação': '🍽️',
  'Lanche': '🍔',
  'Transporte': '🚗',
  'Saúde': '💊',
  'Educação': '🎓',
  'Lazer': '🎮',
  'Assinaturas': '📺',
  'Dívidas': '💳',
  'Investimentos': '📈',
  'Reserva de Emergência': '🛟',
  'Outros': '📦',
};

export const iconeDe = (categoria?: string | null) =>
  (categoria && ICONE_CATEGORIA[categoria]) || '📦';

/** Gastos nestas categorias não são consumo: é dinheiro guardado. */
export const CATEGORIAS_POUPANCA: string[] = ['Investimentos', 'Reserva de Emergência'];
