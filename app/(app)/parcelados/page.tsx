'use client';
import Link from 'next/link';
import PageHead from '@/components/PageHead';
import { useMonth } from '@/components/Providers';
import { useCard, usePaidInvoices, usePurchases, useTransactions } from '@/hooks/useFinance';
import { iconeDe } from '@/lib/categories';
import { fmtBRL } from '@/lib/money';
import { monthName } from '@/lib/months';
import { ordenarParcelados, progressoParcelados } from '@/lib/parcelados';

export default function Parcelados() {
  const { month } = useMonth();
  const cardQ = useCard();
  const purchasesQ = usePurchases();
  const paidQ = usePaidInvoices();
  const txsQ = useTransactions(month);

  const queries = [cardQ, purchasesQ, paidQ, txsQ];
  if (queries.some(q => q.isLoading)) return <p className="empty-row">Carregando…</p>;

  const card = cardQ.data ?? null;
  const pagos = (paidQ.data ?? []).filter(p => p.pago).map(p => p.month);
  const parcelados = card
    ? ordenarParcelados(progressoParcelados(purchasesQ.data ?? [], card, pagos, month))
    : [];
  const ativos = parcelados.filter(p => !p.quitado);
  const quitados = parcelados.filter(p => p.quitado);

  const fixos = (txsQ.data ?? []).filter(t => t.type === 'fixo');
  const totalFixos = fixos.reduce((s, t) => s + Number(t.valor), 0);
  const totalRestante = ativos.reduce((s, p) => s + p.restante, 0);
  const comprometidoMes = ativos.reduce((s, p) => s + p.valorParcela, 0);

  return (
    <>
      <PageHead title="Parcelados" sub="Seus compromissos que se repetem: parcelas do cartão e custos fixos." />

      <div className="summary" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="card highlight">
          <div className="label">Ainda a pagar</div>
          <div className="value">{fmtBRL(totalRestante)}</div>
          <div className="sub">{ativos.length} parcelamento(s) em aberto</div>
        </div>
        <div className="card">
          <div className="label">Parcelas por mês</div>
          <div className="value red">{fmtBRL(comprometidoMes)}</div>
          <div className="sub">soma das parcelas ativas</div>
        </div>
        <div className="card">
          <div className="label">Custos fixos do mês</div>
          <div className="value red">{fmtBRL(totalFixos)}</div>
          <div className="sub">{fixos.length} lançamento(s) recorrente(s)</div>
        </div>
      </div>

      {/* ── Parcelas do cartão ── */}
      <div className="section">
        <div className="section-header">
          <h2>Parcelamentos no cartão</h2>
          {card && <Link href="/cartao" className="hint-link">+ Nova compra parcelada</Link>}
        </div>

        {!card && (
          <div className="card">
            <p className="card-sub">
              Você ainda não configurou um cartão. <Link href="/cartao" className="hint-link">Configure em Cartão</Link> para
              acompanhar compras parceladas aqui.
            </p>
          </div>
        )}

        {card && ativos.length === 0 && quitados.length === 0 && (
          <div className="card"><p className="card-sub">Nenhuma compra parcelada cadastrada ainda.</p></div>
        )}

        {[...ativos, ...quitados].map(p => {
          const pct = (p.pagas / p.parcelas) * 100;
          return (
            <div className={`card parcelado ${p.quitado ? 'quitado' : ''}`} key={p.id}>
              <div className="parcelado-topo">
                <span className="tx-icone">{iconeDe(p.categoria)}</span>
                <div className="parcelado-nome">
                  <strong>{p.descricao}</strong>
                  <span className="card-sub">
                    {p.categoria} · {fmtBRL(p.valorParcela)} × {p.parcelas}
                  </span>
                </div>
                <div className="parcelado-valores">
                  <span className="tx-valor" style={{ color: p.quitado ? 'var(--income)' : 'var(--expense)' }}>
                    {p.quitado ? 'quitado' : fmtBRL(p.restante)}
                  </span>
                  <span className="card-sub">{p.quitado ? `${p.parcelas} parcelas` : 'ainda falta'}</span>
                </div>
              </div>

              <div className="parcelado-barra">
                <div style={{ width: `${pct}%`, background: p.quitado ? 'var(--income)' : 'var(--primary)' }} />
              </div>
              <div className="parcelado-rodape">
                <span>{p.pagas} de {p.parcelas} pagas</span>
                <span>{monthName(p.primeiroMes)} → {monthName(p.ultimoMes)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Custos fixos (espelho dos lançamentos) ── */}
      <div className="section">
        <div className="section-header">
          <h2>Custos fixos recorrentes</h2>
          <Link href="/lancamentos" className="hint-link">Editar em Lançamentos</Link>
        </div>
        <p className="card-sub" style={{ marginBottom: 'var(--s-3)' }}>
          Estes são os mesmos lançamentos fixos de {monthName(month)} — eles continuam lá, e são copiados
          automaticamente quando um mês novo começa.
        </p>

        <div className="lista">
          {fixos.length === 0 && <div className="empty-row">Nenhum custo fixo neste mês.</div>}
          {fixos.map(t => (
            <div className={`tx-linha ${t.pago ? 'quitado' : ''}`} key={t.id}>
              <span className="tx-icone">{iconeDe(t.categoria)}</span>
              <div className="tx-principal" style={{ cursor: 'default' }}>
                <strong>{t.descricao}</strong>
                <span className="tx-meta">
                  {t.categoria || 'Outros'}{t.dia_vencimento ? ` · todo dia ${t.dia_vencimento}` : ''} · mensal
                </span>
              </div>
              <span className="tx-valor" style={{ color: 'var(--expense)' }}>−{fmtBRL(Number(t.valor))}</span>
              <span className={`status-tag ${t.pago ? 'ok' : ''}`}>{t.pago ? 'Pago' : 'Pendente'}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
