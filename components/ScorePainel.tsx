'use client';
import Link from 'next/link';
import { fmtBRL } from '@/lib/money';
import { Ipf } from '@/lib/score';

/** Cor da faixa: verde (bom) → lavanda → âmbar → coral (ruim). */
export function corDaFaixa(total: number): string {
  if (total >= 85) return 'var(--income)';
  if (total >= 70) return 'var(--primary)';
  if (total >= 50) return 'var(--warning)';
  return 'var(--expense)';
}

export default function ScorePainel({ ipf, titulo = 'Visão geral do mês' }: { ipf: Ipf; titulo?: string }) {
  if (!ipf.pronto) {
    return (
      <div className="card score-card">
        <div className="card-label">{titulo}</div>
        <p className="card-sub" style={{ marginBottom: 'var(--s-4)' }}>{ipf.alertas[0]?.texto}</p>
        <Link href="/orcamento" className="btn-ghost">Configurar orçamento</Link>
      </div>
    );
  }

  const cor = corDaFaixa(ipf.total);
  return (
    <div className="card score-card">
      <div className="card-label">{titulo}</div>
      <div className="score-corpo">
        <div className="score-nota">
          <span className="score-num" style={{ color: cor }}>{ipf.total}</span>
          <span className="score-faixa" style={{ color: cor }}>{ipf.faixa}</span>
          <span className="card-sub">regra 50/30/20</span>
        </div>
        <div className="score-pilares">
          {ipf.pilares.map(p => (
            <div className="pilar-linha" key={p.chave}>
              <span className="pilar-nome">
                {p.nome} <span className="card-sub">{p.tipo === 'meta' ? 'guardar' : 'até'} {p.peso}%</span>
              </span>
              <span className="pilar-pontos">
                <strong>{p.pontos}</strong><span className="card-sub">/{p.peso}</span>
              </span>
              <div className="pilar-trilho">
                <div style={{ width: `${p.peso > 0 ? (p.pontos / p.peso) * 100 : 0}%`, background: cor }} />
              </div>
              <span className="pilar-valores card-sub">{fmtBRL(p.gasto)} de {fmtBRL(p.alvo)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
