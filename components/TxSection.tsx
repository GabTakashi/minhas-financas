'use client';
import TxLinha from './TxLinha';
import { fmtBRL } from '@/lib/money';
import { Transaction } from '@/lib/types';

export default function TxSection({ title, txs, color, aoEditar, vazio }: {
  title: string;
  txs: Transaction[];
  color: 'income' | 'expense';
  aoEditar: (t: Transaction) => void;
  /** mensagem quando a lista está vazia (muda se houver busca ativa) */
  vazio: string;
}) {
  const total = txs.reduce((s, t) => s + Number(t.valor), 0);

  return (
    <div className="section">
      <div className="section-header">
        <h2>{title} <span className="card-sub">({txs.length})</span></h2>
        <span className="total" style={{ color: `var(--${color})` }}>{fmtBRL(total)}</span>
      </div>

      <div className="lista">
        {txs.length === 0 && <div className="empty-row">{vazio}</div>}
        {txs.map(t => <TxLinha key={t.id} t={t} aoEditar={aoEditar} mostraDia />)}
      </div>
    </div>
  );
}
