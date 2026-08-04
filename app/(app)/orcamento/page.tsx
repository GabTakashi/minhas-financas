'use client';
import { useQueryClient } from '@tanstack/react-query';
import BudgetGroups from '@/components/BudgetGroups';
import PageHead from '@/components/PageHead';
import { useMonth, useToast } from '@/components/Providers';
import { useBudgetGroups, useBudgets, useCard, usePurchases, useTransactions } from '@/hooks/useFinance';
import { setBudget } from '@/lib/actions';
import { CATEGORIAS } from '@/lib/categories';
import { faturaDoMes } from '@/lib/invoice';
import { fmtBRL, parseValorBR } from '@/lib/money';
import { gastosPorCategoria, monthTotals } from '@/lib/totals';

export default function Orcamento() {
  const { month } = useMonth();
  const qc = useQueryClient();
  const toast = useToast();
  const budgetsQ = useBudgets(month);
  const groupsQ = useBudgetGroups();
  const txsQ = useTransactions(month);
  const cardQ = useCard();
  const purchasesQ = usePurchases();

  if (budgetsQ.isLoading || groupsQ.isLoading || txsQ.isLoading || cardQ.isLoading || purchasesQ.isLoading) {
    return <p className="empty-row">Carregando…</p>;
  }

  const budgets = budgetsQ.data ?? [];
  const fatura = cardQ.data ? faturaDoMes(purchasesQ.data ?? [], cardQ.data, month) : { items: [], total: 0 };
  const gastos = gastosPorCategoria(txsQ.data ?? [], fatura.items);
  const entradas = monthTotals(txsQ.data ?? [], fatura.total).entradas;

  async function setLimite(categoria: string, value: string) {
    const v = parseValorBR(value);
    const existing = budgets.find(b => b.categoria === categoria);
    const novoLimite = !value.trim() || isNaN(v) || v <= 0 ? null : v;
    if (novoLimite === null && !existing) return;
    try {
      await setBudget(month, categoria, novoLimite);
    } catch {
      toast('Erro ao salvar o limite');
      return;
    }
    qc.invalidateQueries();
  }

  const totalOrcado = budgets.reduce((s, b) => s + Number(b.limite), 0);
  const totalGasto = CATEGORIAS.reduce((s, c) => s + (gastos[c] || 0), 0);

  return (
    <>
      <PageHead title="Orçamento" sub="Defina limites por categoria e acompanhe o consumo do mês." />
      <BudgetGroups groups={groupsQ.data ?? []} gastos={gastos} entradas={entradas} />
      <div className="card">
        {CATEGORIAS.map(categoria => {
          const b = budgets.find(x => x.categoria === categoria);
          const limite = b ? Number(b.limite) : 0;
          const gasto = gastos[categoria] || 0;
          const pct = limite > 0 ? Math.min(100, (gasto / limite) * 100) : 0;
          const cls = limite > 0 && gasto > limite ? 'over' : pct >= 80 ? 'warn' : '';
          return (
            <div className="budget-row" key={categoria}>
              <span className="b-cat">{categoria}</span>
              <input
                className="b-limit"
                placeholder="sem limite"
                defaultValue={limite ? limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                onBlur={e => setLimite(categoria, e.target.value)}
                aria-label={`Limite de ${categoria}`}
              />
              <div className="b-bar"><div className={cls} style={{ width: `${pct}%` }} /></div>
              <span className="b-spent">
                {limite > 0
                  ? `${fmtBRL(gasto)} de ${fmtBRL(limite)}${gasto > limite ? ' — estourou!' : ''}`
                  : gasto > 0 ? `${fmtBRL(gasto)} gastos` : '—'}
              </span>
            </div>
          );
        })}
        <div className="budget-row" style={{ borderTop: '1px solid var(--border-soft)', marginTop: 4 }}>
          <span className="b-cat" style={{ fontWeight: 600 }}>Total</span>
          <span className="b-limit" style={{ border: 'none', background: 'none' }} />
          <div className="b-bar" style={{ visibility: 'hidden' }} />
          <span className="b-spent" style={{ fontWeight: 600, color: 'var(--text-1)' }}>
            {fmtBRL(totalGasto)} de {fmtBRL(totalOrcado)}
          </span>
        </div>
      </div>
    </>
  );
}
