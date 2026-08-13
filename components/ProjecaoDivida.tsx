'use client';
import { useState } from 'react';
import { fmtBRL } from '@/lib/money';
import { shortMonth } from '@/lib/months';
import { PontoProjecao } from '@/lib/parcelado';

/**
 * Uma série só (o saldo devedor em R$), então não leva legenda — o título nomeia.
 * O valor da parcela de cada mês vive no tooltip, não num segundo eixo.
 */
export default function ProjecaoDivida({ pontos, mesQuitacao }: { pontos: PontoProjecao[]; mesQuitacao: string | null }) {
  const [hover, setHover] = useState<number | null>(null);
  if (pontos.length < 2) return <div className="empty-row">Sem dívida projetada.</div>;

  const W = 680, H = 230, padL = 48, padR = 16, padT = 20, padB = 30;
  const iw = W - padL - padR, ih = H - padT - padB;
  const maxV = Math.max(1, ...pontos.map(p => p.restante));
  const base = padT + ih;
  const px = (i: number) => padL + (i / (pontos.length - 1)) * iw;
  const py = (v: number) => base - (Math.max(0, v) / maxV) * ih;
  const compacto = (v: number) => v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v));

  const linha = pontos.map((p, i) => `${px(i)},${py(p.restante)}`).join(' L');
  const area = `M${linha} L${px(pontos.length - 1)},${base} L${px(0)},${base} Z`;
  // com muitos meses, rotula um a cada N para os nomes não se atropelarem
  const passo = Math.ceil(pontos.length / 8);
  const marcarPonto = pontos.length <= 14;
  const fim = pontos.length - 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label="Projeção do saldo devedor dos parcelados, mês a mês, até a quitação"
      onMouseLeave={() => setHover(null)}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="divida-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.30" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* grade recessiva */}
      {[0, 0.5, 1].map(f => (
        <g key={f}>
          <line x1={padL} y1={py(maxV * f)} x2={W - padR} y2={py(maxV * f)} stroke="var(--border-soft)" strokeDasharray="3 4" />
          <text x={padL - 8} y={py(maxV * f) + 3.5} textAnchor="end" fontSize={9.5} fill="var(--text-3)" fontFamily="var(--font-mono)">
            {compacto(maxV * f)}
          </text>
        </g>
      ))}

      <path d={area} fill="url(#divida-area)" />
      <path d={`M${linha}`} fill="none" stroke="var(--primary)" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />

      {/* faixa de captura + rótulo do mês */}
      {pontos.map((p, i) => (
        <g key={p.mes} onMouseEnter={() => setHover(i)}>
          <rect x={px(i) - iw / (pontos.length - 1) / 2} y={padT} width={iw / (pontos.length - 1)} height={ih} fill="transparent" />
          {(i % passo === 0 || i === fim) && (
            <text x={px(i)} y={H - 9} textAnchor="middle" fontSize={10} fill={hover === i ? 'var(--text-1)' : 'var(--text-3)'}>
              {shortMonth(p.mes)}
            </text>
          )}
          {marcarPonto && i !== fim && (
            <circle cx={px(i)} cy={py(p.restante)} r={hover === i ? 5 : 3.5} fill="var(--primary)" stroke="var(--surface-1)" strokeWidth={2} />
          )}
        </g>
      ))}

      {/* chegada no zero — rotulada direto, sem depender de cor.
          O mês da última parcela é o anterior a este ponto, então o rótulo não
          nomeia mês: quem dá a data é a métrica "Livre em" da faixa. */}
      {mesQuitacao && (
        <>
          <circle cx={px(fim)} cy={py(0)} r={5} fill="var(--income)" stroke="var(--surface-1)" strokeWidth={2} />
          <text x={px(fim)} y={py(0) - 12} textAnchor="end" fontSize={10.5} fill="var(--income)">
            sem dívida
          </text>
        </>
      )}

      {hover !== null && (() => {
        const p = pontos[hover];
        const larg = 150, alt = p.aPagar > 0 ? 60 : 46;
        const tx = Math.min(Math.max(px(hover) - larg / 2, padL), W - padR - larg);
        const ty = Math.max(py(p.restante) - alt - 12, 2);
        return (
          <g pointerEvents="none">
            <line x1={px(hover)} y1={padT} x2={px(hover)} y2={base} stroke="var(--border-medium)" strokeDasharray="3 3" />
            <rect x={tx} y={ty} width={larg} height={alt} rx={8} fill="var(--surface-2)" stroke="var(--border-medium)" />
            <text x={tx + 10} y={ty + 16} fontSize={9.5} fill="var(--text-3)">{shortMonth(p.mes)}</text>
            <text x={tx + 10} y={ty + 32} fontSize={10.5} fill="var(--text-1)" fontFamily="var(--font-mono)">
              resta {fmtBRL(p.restante)}
            </text>
            {p.aPagar > 0 && (
              <text x={tx + 10} y={ty + 48} fontSize={10.5} fill="var(--text-2)" fontFamily="var(--font-mono)">
                paga {fmtBRL(p.aPagar)}
              </text>
            )}
          </g>
        );
      })()}
    </svg>
  );
}
