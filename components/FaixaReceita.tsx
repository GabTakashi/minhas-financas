'use client';
import { fmtBRL } from '@/lib/money';

/**
 * Faixa do topo do painel: a receita do mês e quanto dela já foi consumida
 * pelas despesas. A barra encolhe conforme o mês avança.
 */
export default function FaixaReceita({ receita, despesas, guardado }: {
  receita: number;
  despesas: number;
  guardado: number;
}) {
  const saldo = receita - despesas;
  const consumido = receita > 0 ? Math.min(100, (despesas / receita) * 100) : 0;
  const restantePct = Math.max(0, 100 - consumido);
  // "poupança" = o que sobrou + o que foi separado, sobre o total recebido
  const poupancaPct = receita > 0 ? Math.round(((saldo + guardado) / receita) * 100) : 0;

  const [inteiro, centavos] = fmtBRL(receita).replace('R$', '').trim().split(',');

  return (
    <div className="faixa">
      <div className="faixa-topo">
        <div className="faixa-receita">
          <span className="card-label">Receita</span>
          <span className="faixa-valor">
            <small>R$</small>{inteiro}<small>,{centavos}</small>
          </span>
        </div>

        <div className="faixa-metricas">
          <div>
            <span className="card-label">Despesas</span>
            <strong className="faixa-num expense"><small>R$</small>{fmtBRL(despesas).replace('R$', '').trim()}</strong>
          </div>
          <div>
            <span className="card-label">Saldo</span>
            <strong className="faixa-num"><small>R$</small>{fmtBRL(saldo).replace('R$', '').trim()}</strong>
          </div>
          <div>
            <span className="card-label">Poupança</span>
            <strong className="faixa-num primary">{poupancaPct}%</strong>
            <span className="card-sub">do total recebido</span>
          </div>
        </div>
      </div>

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
