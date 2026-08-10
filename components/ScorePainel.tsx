'use client';
import { Ipf } from '@/lib/score';

/** Cor da faixa: verde (bom) → lavanda → âmbar → coral (ruim). */
export function corDaFaixa(total: number): string {
  if (total >= 85) return 'var(--income)';
  if (total >= 70) return 'var(--primary)';
  if (total >= 50) return 'var(--warning)';
  return 'var(--expense)';
}

export default function ScorePainel({ ipf, titulo = 'Visão geral do mês' }: { ipf: Ipf; titulo?: string }) {
  const cor = corDaFaixa(ipf.total);
  return (
    <div className="card score-card">
      <div className="card-label">{titulo}</div>
      <div className="score-corpo">
        <div className="score-nota">
          <span className="score-num" style={{ color: cor }}>{ipf.total}</span>
          <span className="score-faixa" style={{ color: cor }}>{ipf.faixa}</span>
          <span className="card-sub">de 100</span>
        </div>
        <div className="score-pilares">
          {ipf.pilares.map(p => (
            <div className="pilar-linha" key={p.chave}>
              <span className="pilar-nome">{p.nome}</span>
              <span className="pilar-pontos">
                <strong>{p.pontos}</strong><span className="card-sub">/25</span>
              </span>
              <div className="pilar-trilho">
                <div style={{ width: `${(p.pontos / 25) * 100}%`, background: cor }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
