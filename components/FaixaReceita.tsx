'use client';

/**
 * Barra entre os cards do mês e o IPF: quanto da receita ainda está disponível.
 * Ela encolhe conforme as despesas do mês avançam.
 */
export default function FaixaReceita({ receita, despesas }: {
  receita: number;
  despesas: number;
}) {
  const consumido = receita > 0 ? Math.min(100, (despesas / receita) * 100) : 0;
  const restantePct = Math.max(0, 100 - consumido);

  return (
    <div className="faixa">
      <div
        className="faixa-barra"
        role="img"
        aria-label={`${Math.round(consumido)}% da receita já foi consumida pelas despesas`}
      >
        <div style={{ width: `${restantePct}%` }} />
      </div>
      <div className="faixa-legenda">
        <span>{Math.round(restantePct)}% da receita ainda disponível</span>
        <span>{Math.round(consumido)}% consumido</span>
      </div>
    </div>
  );
}
