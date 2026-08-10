'use client';
import { useQueryClient } from '@tanstack/react-query';
import { deleteTransaction, setTransactionPago } from '@/lib/actions';
import { iconeDe } from '@/lib/categories';
import { fmtBRL } from '@/lib/money';
import { Transaction, TxType } from '@/lib/types';

export default function TxSection({ title, type, txs, color, aoEditar, vazio }: {
  title: string;
  type: TxType;
  txs: Transaction[];
  color: 'income' | 'expense';
  aoEditar: (t: Transaction) => void;
  /** mensagem quando a lista está vazia (muda se houver busca ativa) */
  vazio: string;
}) {
  const qc = useQueryClient();
  const isEntrada = type === 'entrada';
  const total = txs.reduce((s, t) => s + Number(t.valor), 0);

  async function alternar(t: Transaction) {
    await setTransactionPago(t.id, !t.pago);
    qc.invalidateQueries();
  }

  async function remover(t: Transaction) {
    if (!confirm(`Excluir "${t.descricao}"?`)) return;
    await deleteTransaction(t.id);
    qc.invalidateQueries();
  }

  return (
    <div className="section">
      <div className="section-header">
        <h2>{title} <span className="card-sub">({txs.length})</span></h2>
        <span className="total" style={{ color: `var(--${color})` }}>{fmtBRL(total)}</span>
      </div>

      <div className="lista">
        {txs.length === 0 && <div className="empty-row">{vazio}</div>}
        {txs.map(t => (
          <div className={`tx-linha ${t.pago ? 'quitado' : ''}`} key={t.id}>
            <span className="tx-icone">{isEntrada ? '💰' : iconeDe(t.categoria)}</span>

            <button className="tx-principal" onClick={() => aoEditar(t)} title="Editar lançamento">
              <strong>{t.descricao}</strong>
              <span className="tx-meta">
                {!isEntrada && <>{t.categoria || 'Outros'}{t.dia_vencimento ? ` · dia ${t.dia_vencimento}` : ''}</>}
                {isEntrada && (t.pago ? 'recebido' : 'a receber')}
              </span>
            </button>

            <span className="tx-valor" style={{ color: `var(--${color})` }}>
              {isEntrada ? '+' : '−'}{fmtBRL(Number(t.valor))}
            </span>

            <button className={`status-btn ${t.pago ? 'pago' : 'pendente'}`} onClick={() => alternar(t)}>
              {t.pago ? (isEntrada ? 'Recebido' : 'Pago') : (isEntrada ? 'A receber' : 'Pendente')}
            </button>

            <button className="icon-btn danger" title="Excluir" onClick={() => remover(t)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
