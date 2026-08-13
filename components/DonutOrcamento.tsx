'use client';
import { useState } from 'react';
import { fmtBRL } from '@/lib/money';
import { FatiaGrupo } from '@/lib/totals';

/**
 * Cor por grupo, em ordem fixa — a cor segue o grupo, não o quanto ele gastou.
 * O bolo "fora dos grupos" é sempre o cinza neutro; um 5º grupo em diante cai
 * nele também, em vez de inventar tom novo.
 */
const SERIES = ['var(--serie-1)', 'var(--serie-2)', 'var(--serie-3)', 'var(--serie-4)'];
export const corDaFatia = (f: FatiaGrupo, i: number) =>
  f.solto ? 'var(--serie-neutra)' : SERIES[i] ?? 'var(--serie-neutra)';

const R = 86, LARGURA = 26, CENTRO = 110;
const VOLTA = 2 * Math.PI * R;
/** vão em unidades de arco: separa as fatias sem depender de borda */
const VAO = 4;

export default function DonutOrcamento({ fatias }: { fatias: FatiaGrupo[] }) {
  const [ativa, setAtiva] = useState<number | null>(null);

  const total = fatias.reduce((s, f) => s + f.valor, 0);
  if (total <= 0) {
    return <div className="empty-row">Nenhum gasto registrado neste mês ainda.</div>;
  }

  const visiveis = fatias.filter(f => f.valor > 0);
  const emFoco = ativa !== null ? fatias[ativa] : null;

  // cada fatia vira um pedaço do tracejado do círculo, girando a partir das 12h
  let percorrido = 0;
  const arcos = fatias.map((f, i) => {
    if (f.valor <= 0) return null;
    const bruto = (f.valor / total) * VOLTA;
    // com uma fatia só não há vizinha de quem se separar
    const comprimento = visiveis.length > 1 ? Math.max(bruto - VAO, 1) : bruto;
    const arco = { i, f, comprimento, offset: -percorrido };
    percorrido += bruto;
    return arco;
  }).filter(a => a !== null);

  return (
    <div className="donut">
      <div className="donut-grafico">
        <svg
          viewBox={`0 0 ${CENTRO * 2} ${CENTRO * 2}`} role="img"
          aria-label={`Distribuição de ${fmtBRL(total)} gastos no mês: ${visiveis.map(f => `${f.nome} ${Math.round(f.pct)}%`).join(', ')}`}
          onMouseLeave={() => setAtiva(null)}
        >
          <circle
            cx={CENTRO} cy={CENTRO} r={R} fill="none"
            stroke="var(--surface-3)" strokeWidth={LARGURA}
          />
          <g transform={`rotate(-90 ${CENTRO} ${CENTRO})`}>
            {arcos.map(a => (
              <circle
                key={a.f.nome}
                cx={CENTRO} cy={CENTRO} r={R} fill="none"
                stroke={corDaFatia(a.f, a.i)} strokeWidth={LARGURA} strokeLinecap="butt"
                strokeDasharray={`${a.comprimento} ${VOLTA - a.comprimento}`}
                strokeDashoffset={a.offset}
                opacity={ativa === null || ativa === a.i ? 1 : 0.32}
                onMouseEnter={() => setAtiva(a.i)}
                style={{ transition: 'opacity 0.15s var(--ease)' }}
              />
            ))}
          </g>
        </svg>

        <div className="donut-centro">
          <span className="card-label">{emFoco ? emFoco.nome : 'Total gasto'}</span>
          <strong>{fmtBRL(emFoco ? emFoco.valor : total)}</strong>
          <span className="card-sub">
            {emFoco ? `${Math.round(emFoco.pct)}% do mês` : `${visiveis.length} grupo(s)`}
          </span>
        </div>
      </div>

      <ul className="donut-legenda">
        {fatias.map((f, i) => (
          <li
            key={f.nome}
            className={ativa !== null && ativa !== i ? 'apagada' : ''}
            onMouseEnter={() => f.valor > 0 && setAtiva(i)}
            onMouseLeave={() => setAtiva(null)}
          >
            <i className="dot" style={{ background: corDaFatia(f, i) }} aria-hidden="true" />
            <span className="donut-legenda-nome">{f.nome}</span>
            <span className="donut-legenda-valor">{fmtBRL(f.valor)}</span>
            <span className="donut-legenda-pct">{Math.round(f.pct)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
