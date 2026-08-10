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
