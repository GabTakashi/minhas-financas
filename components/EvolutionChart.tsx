import { shortMonth } from '@/lib/months';

export interface EvoPoint { key: string; entradas: number; saidas: number; saldo: number; }

export default function EvolutionChart({ data }: { data: EvoPoint[] }) {
  if (!data.length) return <div className="empty-row">Sem dados ainda.</div>;

  const W = 560, H = 210, padL = 8, padR = 8, padT = 14, padB = 26;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxVal = Math.max(1, ...data.map(d => Math.max(d.entradas, d.saidas, Math.abs(d.saldo))));
  const slot = innerW / data.length;
  const barW = Math.min(24, slot * 0.28);
  const base = padT + innerH;

  const pts = data.map((d, i) => {
    const cx = padL + slot * i + slot / 2;
    const sy = base - (Math.max(0, d.saldo) / maxVal) * innerH;
    return { cx, sy: d.saldo >= 0 ? sy : base + Math.min(8, (Math.abs(d.saldo) / maxVal) * innerH * 0.1) };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Gráfico de evolução mensal">
      <line x1={padL} y1={base} x2={W - padR} y2={base} stroke="var(--border-soft)" />
      {data.map((d, i) => {
        const cx = pts[i].cx;
        const hE = (d.entradas / maxVal) * innerH;
        const hS = (d.saidas / maxVal) * innerH;
        return (
          <g key={d.key}>
            <rect x={cx - barW - 2} y={base - hE} width={barW} height={Math.max(hE, 1)} rx={5} fill="var(--income)" opacity={0.9} />
            <rect x={cx + 2} y={base - hS} width={barW} height={Math.max(hS, 1)} rx={5} fill="var(--expense)" opacity={0.85} />
            <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--text-3)">{shortMonth(d.key)}</text>
          </g>
        );
      })}
      {pts.length > 1 && (
        <polyline points={pts.map(p => `${p.cx},${p.sy}`).join(' ')} fill="none" stroke="var(--accent-500)" strokeWidth={2} strokeLinejoin="round" />
      )}
      {pts.map((p, i) => (
        <circle key={data[i].key} cx={p.cx} cy={p.sy} r={3.5} fill="var(--accent-500)" stroke="var(--surface-1)" strokeWidth={1.5} />
      ))}
    </svg>
  );
}
