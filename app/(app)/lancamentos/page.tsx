'use client';
import PageHead from '@/components/PageHead';
import TxSection from '@/components/TxSection';
import { useMonth } from '@/components/Providers';
import { useMonthRow, useTransactions } from '@/hooks/useFinance';
import { monthName } from '@/lib/months';

export default function Lancamentos() {
  const { month } = useMonth();
  const monthRow = useMonthRow(month);
  const txsQ = useTransactions(month);

  if (monthRow.isLoading || txsQ.isLoading) return <p className="empty-row">Carregando…</p>;

  const txs = txsQ.data ?? [];
  return (
    <>
      <PageHead title="Lançamentos" sub="Cadastre suas entradas e gastos do mês." />
      {!monthRow.data ? (
        <div className="new-month">
          <p>O mês de <strong>{monthName(month)}</strong> ainda não foi iniciado. Inicie-o na Visão geral.</p>
        </div>
      ) : (
        <>
          <TxSection title="Entradas" type="entrada" color="income" txs={txs.filter(t => t.type === 'entrada')} />
          <TxSection title="Custos fixos" type="fixo" color="expense" txs={txs.filter(t => t.type === 'fixo')} />
          <TxSection title="Custos variáveis" type="variavel" color="expense" txs={txs.filter(t => t.type === 'variavel')} />
        </>
      )}
    </>
  );
}
