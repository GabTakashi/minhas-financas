'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useMonth, useToast } from '@/components/Providers';
import PageHead from '@/components/PageHead';
import EvolutionChart from '@/components/EvolutionChart';
import Constancia from '@/components/Constancia';
import FaixaReceita from '@/components/FaixaReceita';
import ScorePainel from '@/components/ScorePainel';
import {
  useAllMonths, useAllTransactions, useBudgetGroups, useBudgets, useDiasRegistrados,
  useMonthRow, useTransactions,
} from '@/hooks/useFinance';
import { iniciarMes as iniciarMesAction } from '@/lib/actions';
import { fmtBRL } from '@/lib/money';
import { monthName } from '@/lib/months';
import { CATEGORIAS_POUPANCA, guardadoNoMes, resumoDoMes } from '@/lib/resumo';
import { calcularIpf } from '@/lib/score';
import { gastosPorCategoria, gastosPorCategoriaRealizado, monthTotals, monthTotalsRealizado } from '@/lib/totals';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Home() {
  const { month } = useMonth();
  const qc = useQueryClient();
  const toast = useToast();
  const monthRow = useMonthRow(month);
  const txsQ = useTransactions(month);
  const allMonths = useAllMonths();
  const allTxs = useAllTransactions();
  const budgetsQ = useBudgets(month);
  const groupsQ = useBudgetGroups();
  const diasQ = useDiasRegistrados();
  const [modo, setModo] = useState<'previsto' | 'realizado'>('previsto');

  const queries = [monthRow, txsQ, allMonths, allTxs, budgetsQ, groupsQ, diasQ];
  if (queries.some(x => x.isLoading)) return <p className="empty-row">Carregando…</p>;
  if (queries.some(x => x.isError)) return <p className="empty-row">Erro ao carregar dados — verifique sua conexão e recarregue.</p>;

  const txs = txsQ.data ?? [];
  const tPrevisto = monthTotals(txs);
  const tRealizado = monthTotalsRealizado(txs);
  const meta = Number(monthRow.data?.meta ?? 0);

  async function iniciarMes() {
    try {
      const { copiados } = await iniciarMesAction(month);
      qc.invalidateQueries();
      if (copiados) toast(`${copiados} custos fixos copiados do mês anterior`);
    } catch {
      toast('Erro ao iniciar o mês');
    }
  }

  if (!monthRow.data) {
    return (
      <>
        <PageHead title={`${greeting()}!`} sub="Acompanhe a evolução das suas finanças." />
        <div className="new-month">
          <p>O mês de <strong>{monthName(month)}</strong> ainda não foi iniciado.</p>
          <button onClick={iniciarMes}>Iniciar mês</button>
        </div>
      </>
    );
  }

  const pend = txs
    .filter(x => x.type !== 'entrada' && !x.pago)
    .map(x => ({ desc: x.descricao, tipo: x.type === 'fixo' ? 'Fixo' : 'Variável', dia: x.dia_vencimento, valor: Number(x.valor) }))
    .sort((a, b) => (a.dia || 99) - (b.dia || 99));

  const gastos = modo === 'previsto' ? gastosPorCategoria(txs) : gastosPorCategoriaRealizado(txs);
  const cats = Object.entries(gastos).sort((a, b) => b[1] - a[1]);
  // o maior gasto ocupa a barra inteira e os demais escalam contra ele
  const maxCat = cats.length ? cats[0][1] : 1;

  const evoKeys = (allMonths.data ?? []).map(m => m.month).filter(k => k <= month).slice(-12);
  const evo = evoKeys.map(k => {
    const txsDoMes = (allTxs.data ?? []).filter(x => x.month === k);
    const tt = modo === 'previsto' ? monthTotals(txsDoMes) : monthTotalsRealizado(txsDoMes);
    return { key: k, entradas: tt.entradas, saidas: tt.saidas, saldo: tt.saldo };
  });

  // Nota do mês pela regra 50/30/20 — sempre no previsto, para não oscilar
  // quando o usuário alterna entre Previsto e Realizado.
  const resumo = resumoDoMes(txs, month);
  const ipf = calcularIpf(tPrevisto.entradas, groupsQ.data ?? [], gastosPorCategoria(txs));

  // economia do mês = o que você separou (Investimentos/Reserva) + o que sobrou.
  // Realizado no número grande, igual aos outros cards do painel.
  const guardado = guardadoNoMes(txs, true);
  const economia = resumo.poupado;
  const metaPct = meta > 0 ? Math.max(0, Math.min(100, (economia / meta) * 100)) : 0;
  const metaOk = meta > 0 && economia >= meta;
  const totalOrcado = (budgetsQ.data ?? []).reduce((s, b) => s + Number(b.limite), 0);
  const totalGasto = Object.values(gastos).reduce((s, v) => s + v, 0);

  return (
    <>
      <PageHead title={`${greeting()}!`} sub="Acompanhe a evolução das suas finanças." />

      <div className="summary">
        <div className="card highlight">
          <div className="label">Saldo do mês</div>
          <div className="value">{fmtBRL(tRealizado.saldo)}</div>
          <div className="sub">previsto: {fmtBRL(tPrevisto.saldo)} · entradas − saídas</div>
        </div>
        <div className="card">
          <div className="label">Entradas</div>
          <div className="value green">{fmtBRL(tRealizado.entradas)}</div>
          <div className="sub">
            previsto: {fmtBRL(tPrevisto.entradas)}<br />
            {txs.filter(x => x.type === 'entrada').length} lançamento(s)
          </div>
        </div>
        <div className="card">
          <div className="label">Saídas</div>
          <div className="value red">{fmtBRL(tRealizado.saidas)}</div>
          <div className="sub">
            previsto: {fmtBRL(tPrevisto.saidas)}<br />
            {pend.length} conta(s) pendente(s)
          </div>
        </div>
        <Link href="/metas" className="card meta-card">
          <div className="label">Economia do mês</div>
          <div className="value" style={{ color: metaOk ? 'var(--income)' : undefined }}>{fmtBRL(economia)}</div>
          <div className="sub" title={`Contam como economia: ${CATEGORIAS_POUPANCA.join(', ')} — e o que sobra no fim do mês.`}>
            previsto: {fmtBRL(resumo.poupadoPrevisto)}<br />
            {guardado > 0
              ? <>{fmtBRL(guardado)} separado + {fmtBRL(economia - guardado)} que sobrou</>
              : 'o que sobrou (nada separado ainda)'}
          </div>
          <div className="meta-bar"><div className={meta > 0 && !metaOk ? 'fail' : ''} style={{ width: `${meta > 0 ? metaPct : 0}%` }} /></div>
          <div className="sub">
            {meta > 0
              ? (metaOk ? 'meta atingida ✓' : `faltam ${fmtBRL(Math.max(0, meta - economia))}`)
              : 'definir meta →'}
          </div>
        </Link>
      </div>

      <FaixaReceita receita={tPrevisto.entradas} despesas={tPrevisto.saidas} />

      <div className="painel-duplo">
        <ScorePainel ipf={ipf} compacto />
        <Constancia datas={diasQ.data ?? []} month={month} />
      </div>

      <div className="seg">
        {(['previsto', 'realizado'] as const).map(m => (
          <button key={m} className={modo === m ? 'on' : ''} onClick={() => setModo(m)}>
            {m === 'previsto' ? 'Previsto' : 'Realizado'}
          </button>
        ))}
      </div>

      <div className="charts">
        <div className="card chart-card">
          <h3>Evolução mês a mês</h3>
          <div className="card-sub">entradas, saídas e saldo dos últimos meses · {modo === 'previsto' ? 'inclui pendentes' : 'só o que já foi pago'}</div>
          <EvolutionChart data={evo} />
          <div className="legend">
            <span><i className="dot" style={{ background: 'var(--income)' }} />Entradas</span>
            <span><i className="dot" style={{ background: 'var(--expense)' }} />Saídas</span>
            <span><i className="dot" style={{ background: 'var(--primary)' }} />Saldo</span>
          </div>
        </div>
        <div className="card chart-card">
          <h3>Gastos por categoria</h3>
          <div className="card-sub">lançamentos + parcelas do cartão · {modo === 'previsto' ? 'inclui pendentes' : 'só o que já foi pago'}</div>
          {cats.length === 0 && <div className="empty-row">Cadastre gastos para ver a divisão por categoria.</div>}
          {cats.map(([cat, val]) => (
            <div className="cat-row" key={cat}>
              <span className="cat-name">{cat}</span>
              <div className="cat-bar-wrap"><div className="cat-bar" style={{ width: `${(val / maxCat) * 100}%` }} /></div>
              <span className="cat-val">{fmtBRL(val)}</span>
            </div>
          ))}
          {totalOrcado > 0 && (
            <div className="cat-row" style={{ marginTop: 14, borderTop: '1px solid var(--border-soft)', paddingTop: 12 }}>
              <span className="cat-name" style={{ color: 'var(--text-1)', fontWeight: 600 }}>Orçamento</span>
              <div style={{ flex: 1 }} />
              <span className="cat-val" style={{ width: 'auto' }}>{fmtBRL(totalGasto)} de {fmtBRL(totalOrcado)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="card pending-card" style={{ marginBottom: 20 }}>
        <h3>Fixos vs Variáveis</h3>
        <div className="card-sub">
          {tPrevisto.saidas === 0
            ? 'composição das saídas previstas do mês (inclui pendentes)'
            : tPrevisto.fixos === tPrevisto.variaveis
              ? 'fixos e variáveis empatados neste mês · inclui pendentes'
              : `seu maior gasto previsto do mês é com custos ${tPrevisto.fixos > tPrevisto.variaveis ? 'fixos' : 'variáveis'} · inclui pendentes`}
        </div>
        {tPrevisto.saidas === 0 ? (
          <div className="empty-row" style={{ padding: '8px 0' }}>Sem saídas neste mês.</div>
        ) : (
          ([
            ['Gastos fixos', tPrevisto.fixos, 'var(--primary-deep)'],
            ['Gastos variáveis', tPrevisto.variaveis, 'var(--accent)'],
          ] as [string, number, string][]).map(([nome, valor, cor]) => (
            <div className="cat-row wide" key={nome}>
              <span className="cat-name">{nome}</span>
              <div className="cat-bar-wrap" style={{ height: 12 }}>
                <div className="cat-bar" style={{ width: `${(valor / Math.max(1, tPrevisto.fixos, tPrevisto.variaveis)) * 100}%`, background: cor }} />
              </div>
              <span className="cat-val">
                {fmtBRL(valor)} ({Math.round((valor / tPrevisto.saidas) * 100)}%)
              </span>
            </div>
          ))
        )}
      </div>

      <div className="card pending-card">
        <h3>Contas pendentes do mês</h3>
        <div className="card-sub">ordenadas pelo dia de vencimento</div>
        {pend.length === 0 ? (
          <div className="celebra">
            <span className="celebra-selo" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 12.5 10 18 20 6.5" />
              </svg>
            </span>
            <strong>Tudo pago neste mês</strong>
            <span className="card-sub">Nenhuma conta em aberto — siga assim 🎉</span>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ background: 'none', paddingLeft: 0 }}>Descrição</th>
                <th className="hide-mobile" style={{ background: 'none' }}>Tipo</th>
                <th className="center" style={{ background: 'none' }}>Vencimento</th>
                <th className="num" style={{ background: 'none', paddingRight: 0 }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {pend.map((p, i) => (
                <tr key={i}>
                  <td style={{ paddingLeft: 0 }}>{p.desc}</td>
                  <td className="hide-mobile"><span className="badge">{p.tipo}</span></td>
                  <td className="center">{p.dia ? `dia ${p.dia}` : '—'}</td>
                  <td className="num" style={{ paddingRight: 0 }}>{fmtBRL(p.valor)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ fontWeight: 600, paddingLeft: 0 }}>Total pendente</td>
                <td className="hide-mobile" /><td />
                <td className="num" style={{ fontWeight: 700, paddingRight: 0, color: 'var(--warning)' }}>
                  {fmtBRL(pend.reduce((s, p) => s + p.valor, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
