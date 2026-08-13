'use client';
import { useQueryClient } from '@tanstack/react-query';
import BudgetGroups from '@/components/BudgetGroups';
import DonutOrcamento from '@/components/DonutOrcamento';
import PageHead from '@/components/PageHead';
import { useMonth, useToast } from '@/components/Providers';
import { useBudgetGroups, useBudgets, useCard, usePurchases, useTransactions } from '@/hooks/useFinance';
import { setBudget } from '@/lib/actions';
import { CATEGORIAS } from '@/lib/categories';
import { faturaDoMes } from '@/lib/invoice';
import { fmtBRL, parseValorBR } from '@/lib/money';
import { distribuicaoPorGrupo, gastosPorCategoria, monthTotals } from '@/lib/totals';

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
    toast(novoLimite === null ? `Limite de ${categoria} removido` : `Limite de ${categoria} salvo`);
  }

  const totalOrcado = budgets.reduce((s, b) => s + Number(b.limite), 0);
  const totalGasto = CATEGORIAS.reduce((s, c) => s + (gastos[c] || 0), 0);

  return (
    <>
      <PageHead title="Orçamento" sub="Reparta a renda em grupos e acompanhe o consumo do mês." />

      <div className="card chart-card" style={{ marginBottom: 'var(--s-5)' }}>
        <h3>Para onde foi o dinheiro</h3>
        <div className="card-sub">tudo que saiu neste mês, repartido entre os grupos</div>
        <DonutOrcamento fatias={distribuicaoPorGrupo(groupsQ.data ?? [], gastos)} />
      </div>

      <BudgetGroups
        groups={groupsQ.data ?? []}
        gastos={gastos}
        entradas={entradas}
        budgets={budgets}
        aoSalvarLimite={setLimite}
      />

      <div className="card orc-total">
        <span>Total do mês</span>
        <span className="orc-total-valor">
          <strong>{fmtBRL(totalGasto)}</strong>
          <span className="card-sub">
            {totalOrcado > 0 ? ` gastos · ${fmtBRL(totalOrcado)} em limites` : ' gastos'}
          </span>
        </span>
      </div>
    </>
  );
}
