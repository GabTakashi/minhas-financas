'use client';
import TxLinha from './TxLinha';
import { GrupoDia, rotuloDia } from '@/lib/dias';
import { fmtBRL } from '@/lib/money';
import { Transaction } from '@/lib/types';

/** Extrato agrupado por dia: cada grupo traz o saldo daquele dia no cabeçalho. */
export default function TxDias({ grupos, aoEditar, vazio }: {
  grupos: GrupoDia[];
  aoEditar: (t: Transaction) => void;
  vazio: string;
}) {
  if (grupos.length === 0) return <div className="empty-row">{vazio}</div>;

  return (
    <>
      {grupos.map(g => (
        <div className="dia-grupo" key={g.dia ?? 'sem-data'}>
          <div className="dia-cabecalho">
            <span className="dia-nome">{g.dia ? rotuloDia(g.dia) : 'Sem data'}</span>
            <span className="dia-regua" />
            <span
              className="dia-saldo"
              style={{ color: g.saldo > 0 ? 'var(--income)' : g.saldo < 0 ? 'var(--expense)' : 'var(--text-3)' }}
              title={`Entradas ${fmtBRL(g.entradas)} · saídas ${fmtBRL(g.saidas)}`}
            >
              {g.saldo > 0 ? '+' : g.saldo < 0 ? '−' : ''}{fmtBRL(Math.abs(g.saldo))}
            </span>
          </div>

          <div className="lista">
            {g.itens.map(t => <TxLinha key={t.id} t={t} aoEditar={aoEditar} />)}
          </div>
        </div>
      ))}
    </>
  );
}
