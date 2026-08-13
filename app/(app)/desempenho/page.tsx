'use client';
import PageHead from '@/components/PageHead';
import ScorePainel, { corDaFaixa } from '@/components/ScorePainel';
import { useMonth } from '@/components/Providers';
import {
  useAllMonths, useAllTransactions, useBudgetGroups, useCard, usePurchases,
} from '@/hooks/useFinance';
import { faturaDoMes } from '@/lib/invoice';
import { fmtBRL } from '@/lib/money';
import { shortMonth } from '@/lib/months';
import { calcularIpf, FAIXAS, faixaDoScore } from '@/lib/score';
import { gastosPorCategoria, monthTotals } from '@/lib/totals';

export default function Desempenho() {
  const { month } = useMonth();
  const allMonths = useAllMonths();
  const allTxs = useAllTransactions();
  const cardQ = useCard();
  const purchasesQ = usePurchases();
  const groupsQ = useBudgetGroups();

  const queries = [allMonths, allTxs, cardQ, purchasesQ, groupsQ];
  if (queries.some(q => q.isLoading)) return <p className="empty-row">Carregando…</p>;
  if (queries.some(q => q.isError)) return <p className="empty-row">Erro ao carregar dados — recarregue a página.</p>;

  const card = cardQ.data ?? null;
  const purchases = purchasesQ.data ?? [];
  const txs = allTxs.data ?? [];
  const grupos = groupsQ.data ?? [];

  /** Nota de um mês qualquer: receita e gastos por categoria daquele mês. */
  function ipfDoMes(k: string) {
    const doMes = txs.filter(t => t.month === k);
    const fatura = card ? faturaDoMes(purchases, card, k) : { items: [], total: 0 };
    const entradas = monthTotals(doMes, fatura.total).entradas;
    return calcularIpf(entradas, grupos, gastosPorCategoria(doMes, fatura.items));
  }

  const ipf = ipfDoMes(month);
  const anteriores = (allMonths.data ?? []).map(m => m.month).filter(k => k < month).slice(-11);

  // evolução: até 6 meses, incluindo o atual
  const chaves = [...anteriores.slice(-5), month];
  const evolucao = chaves.map(k => ({ key: k, total: ipfDoMes(k).total }));

  const W = 640, H = 190, padL = 34, padR = 12, padT = 14, padB = 26;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const px = (i: number) => evolucao.length === 1
    ? padL + innerW / 2
    : padL + (i / (evolucao.length - 1)) * innerW;
  const py = (v: number) => padT + innerH - (v / 100) * innerH;

  return (
    <>
      <PageHead title="Desempenho" sub="A regra 50/30/20 aplicada ao seu mês." />

      <p className="card-sub" style={{ maxWidth: '70ch', marginBottom: 'var(--s-4)' }}>
        O IPF é um indicador interno deste app: cada grupo do seu orçamento vale, em pontos, o
        percentual da renda que você reservou para ele. Ele não tem nenhuma relação com score de
        crédito usado por bancos.
      </p>

      <div style={{ marginBottom: 'var(--s-5)' }}>
        <ScorePainel ipf={ipf} />
      </div>

      {ipf.pronto && (
        <>
          <div className="section-header"><h2>Pilares</h2></div>
          <div className="pilar-grid">
            {ipf.pilares.map(p => (
              <div className="card" key={p.chave}>
                <div className="section-header" style={{ marginBottom: 'var(--s-2)' }}>
                  <h3 style={{ fontSize: 15 }}>{p.nome}</h3>
                  <span className="total" style={{ color: corDaFaixa(ipf.total) }}>{p.pontos}/{p.peso}</span>
                </div>
                <p className="card-sub" style={{ marginBottom: 'var(--s-3)' }}>{p.descricao}</p>
                <div className="pilar-trilho" style={{ marginBottom: 'var(--s-2)' }}>
                  <div style={{ width: `${p.peso > 0 ? (p.pontos / p.peso) * 100 : 0}%`, background: corDaFaixa(ipf.total) }} />
                </div>
                <p className="card-sub" style={{ marginBottom: 'var(--s-3)', fontFamily: 'var(--font-mono)' }}>
                  {fmtBRL(p.gasto)} de {fmtBRL(p.alvo)}
                </p>
                <div className="pilar-dica">💡 {p.dica}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 'var(--s-5)' }}>
        <h3>Evolução do IPF</h3>
        <div className="card-sub" style={{ marginBottom: 'var(--s-4)' }}>últimos {evolucao.length} mês(es)</div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Evolução do índice mês a mês">
          {[0, 50, 100].map(v => (
            <g key={v}>
              <line x1={padL} y1={py(v)} x2={W - padR} y2={py(v)} stroke="var(--border-soft)" strokeDasharray="3 4" />
              <text x={padL - 8} y={py(v) + 3.5} textAnchor="end" fontSize={9.5} fill="var(--text-3)" fontFamily="var(--font-mono)">{v}</text>
            </g>
          ))}
          {evolucao.length > 1 && (
            <polyline
              points={evolucao.map((e, i) => `${px(i)},${py(e.total)}`).join(' ')}
              fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
            />
          )}
          {evolucao.map((e, i) => (
            <g key={e.key}>
              <circle cx={px(i)} cy={py(e.total)} r={4} fill={corDaFaixa(e.total)} stroke="var(--surface-1)" strokeWidth={2} />
              <text x={px(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--text-3)">{shortMonth(e.key)}</text>
            </g>
          ))}
        </svg>
      </div>

      <div className="card" style={{ marginTop: 'var(--s-5)' }}>
        <h3>Classificação</h3>
        <div className="card-sub" style={{ marginBottom: 'var(--s-4)' }}>onde seu índice se encaixa hoje</div>
        <div className="faixa-grid">
          {FAIXAS.map(f => (
            <div className={`faixa-item ${faixaDoScore(ipf.total) === f.nome ? 'atual' : ''}`} key={f.nome}>
              <div>{f.nome}</div>
              <div className="card-sub" style={{ fontFamily: 'var(--font-mono)' }}>{f.de}–{f.ate}</div>
            </div>
          ))}
        </div>
      </div>

      {ipf.alertas.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: 'var(--s-6)' }}><h2>Pontos de atenção</h2></div>
          {ipf.alertas.map(a => (
            <div className="card alerta-card" key={a.titulo}>
              <strong>{a.titulo}</strong>
              <p className="card-sub" style={{ marginTop: 4 }}>{a.texto}</p>
            </div>
          ))}
        </>
      )}
    </>
  );
}
