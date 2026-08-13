'use client';
import { useQueryClient } from '@tanstack/react-query';
import { deleteTransaction, setTransactionPago } from '@/lib/actions';
import { iconeDe } from '@/lib/categories';
import { fmtBRL } from '@/lib/money';
import { Transaction } from '@/lib/types';

/** Uma linha de lançamento, igual na visão por dia e na visão por tipo. */
export default function TxLinha({ t, aoEditar, mostraDia }: {
  t: Transaction;
  aoEditar: (t: Transaction) => void;
  /** na visão por dia a data já está no cabeçalho do grupo — não repete na linha */
  mostraDia?: boolean;
}) {
  const qc = useQueryClient();
  const isEntrada = t.type === 'entrada';
  const cor = isEntrada ? 'income' : 'expense';

  async function alternar() {
    await setTransactionPago(t.id, !t.pago);
    qc.invalidateQueries();
  }

  async function remover() {
    if (!confirm(`Excluir "${t.descricao}"?`)) return;
    await deleteTransaction(t.id);
    qc.invalidateQueries();
  }

  return (
    <div className={`tx-linha ${t.pago ? 'quitado' : ''}`}>
      <span className="tx-icone">{isEntrada ? '💰' : iconeDe(t.categoria)}</span>

      <button className="tx-principal" onClick={() => aoEditar(t)} title="Editar lançamento">
        <strong>{t.descricao}</strong>
        <span className="tx-meta">
          {isEntrada
            ? t.pago ? 'recebido' : 'a receber'
            : <>{t.categoria || 'Outros'}{mostraDia && t.dia_vencimento ? ` · dia ${t.dia_vencimento}` : ''}</>}
          {t.type === 'fixo' && ' · fixo'}
        </span>
      </button>

      <span className="tx-valor" style={{ color: `var(--${cor})` }}>
        {isEntrada ? '+' : '−'}{fmtBRL(Number(t.valor))}
      </span>

      <button className={`status-btn ${t.pago ? 'pago' : 'pendente'}`} onClick={alternar}>
        {t.pago ? (isEntrada ? 'Recebido' : 'Pago') : (isEntrada ? 'A receber' : 'Pendente')}
      </button>

      <button className="icon-btn danger" title="Excluir" onClick={remover}>✕</button>
    </div>
  );
}
