'use client';
import { useState } from 'react';
import { fmtBRL } from '@/lib/money';
import { shortMonth } from '@/lib/months';

export interface EvoPoint { key: string; entradas: number; saidas: number; saldo: number; }

/** Catmull-Rom → cubic bézier: curva suave que passa exatamente por todos os pontos. */
function curva(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? pts[i + 1];
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export default function EvolutionChart({ data }: { data: EvoPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <div className="empty-row">Sem dados ainda.</div>;

  const W = 560, H = 220, padL = 46, padR = 10, padT = 16, padB = 28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxVal = Math.max(1, ...data.map(d => Math.max(d.entradas, d.saidas, Math.abs(d.saldo))));
  const slot = innerW / data.length;
  const barW = Math.min(20, slot * 0.26);
  const base = padT + innerH;
  const y = (v: number) => base - (Math.max(0, v) / maxVal) * innerH;

  const pts = data.map((d, i) => ({ x: padL + slot * i + slot / 2, y: y(d.saldo) }));
  const linha = curva(pts);
  // área sob a linha do saldo, fechada na base
  const area = pts.length > 1 ? `${linha} L${pts[pts.length - 1].x},${base} L${pts[0].x},${base} Z` : '';

  const ticks = [0, 0.5, 1].map(f => ({ v: maxVal * f, py: base - f * innerH }));
  const compacto = (v: number) => v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label="Gráfico de evolução mensal de entradas, saídas e saldo"
      onMouseLeave={() => setHover(null)}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="evo-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.30" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* grade recessiva + eixo y */}
      {ticks.map(t => (
        <g key={t.py}>
          <line x1={padL} y1={t.py} x2={W - padR} y2={t.py} stroke="var(--border-soft)" />
          <text x={padL - 9} y={t.py + 3.5} textAnchor="end" fontSize={9.5} fill="var(--text-3)" fontFamily="var(--font-mono)">
            {compacto(t.v)}
          </text>
        </g>
      ))}

      {/* barras: entradas e saídas — a posição fixa (esquerda/direita) reforça a identidade além da cor */}
      {data.map((d, i) => {
        const cx = pts[i].x;
        const hE = (d.entradas / maxVal) * innerH, hS = (d.saidas / maxVal) * innerH;
        return (
          <g key={d.key} onMouseEnter={() => setHover(i)}>
            <rect x={padL + slot * i} y={padT} width={slot} height={innerH} fill="transparent" />
            <rect x={cx - barW - 1} y={base - hE} width={barW} height={Math.max(hE, 1.5)} rx={4} fill="var(--income)" opacity={hover === null || hover === i ? 0.95 : 0.4} />
            <rect x={cx + 1} y={base - hS} width={barW} height={Math.max(hS, 1.5)} rx={4} fill="var(--expense)" opacity={hover === null || hover === i ? 0.95 : 0.4} />
            <text x={cx} y={H - 9} textAnchor="middle" fontSize={10} fill={hover === i ? 'var(--text-1)' : 'var(--text-3)'}>{shortMonth(d.key)}</text>
          </g>
        );
      })}

      {/* saldo: área com degradê + linha suave */}
      {pts.length > 1 && <path d={area} fill="url(#evo-area)" />}
      {pts.length > 1 && <path d={linha} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => (
        <circle key={data[i].key} cx={p.x} cy={p.y} r={hover === i ? 5 : 3.5} fill="var(--primary)" stroke="var(--surface-1)" strokeWidth={2} />
      ))}

      {/* crosshair + tooltip */}
      {hover !== null && (() => {
        const d = data[hover], p = pts[hover];
        const larg = 128, alt = 62;
        const tx = Math.min(Math.max(p.x - larg / 2, padL), W - padR - larg);
        const ty = Math.max(p.y - alt - 12, 2);
        return (
          <g pointerEvents="none">
            <line x1={p.x} y1={padT} x2={p.x} y2={base} stroke="var(--border-medium)" strokeDasharray="3 3" />
            <rect x={tx} y={ty} width={larg} height={alt} rx={8} fill="var(--surface-2)" stroke="var(--border-medium)" />
            <text x={tx + 10} y={ty + 16} fontSize={9.5} fill="var(--text-3)">{shortMonth(d.key)}</text>
            <text x={tx + 10} y={ty + 31} fontSize={10} fill="var(--income)" fontFamily="var(--font-mono)">+{fmtBRL(d.entradas)}</text>
            <text x={tx + 10} y={ty + 44} fontSize={10} fill="var(--expense)" fontFamily="var(--font-mono)">−{fmtBRL(d.saidas)}</text>
            <text x={tx + 10} y={ty + 57} fontSize={10} fill="var(--primary)" fontFamily="var(--font-mono)">={fmtBRL(d.saldo)}</text>
          </g>
        );
      })()}
    </svg>
  );
}
