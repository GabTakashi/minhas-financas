'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import PageHead from '@/components/PageHead';
import ParceladoWizard from '@/components/ParceladoWizard';
import { useMonth, useToast } from '@/components/Providers';
import { useCard, usePaidInvoices, useParcelados, usePurchases, useTransactions } from '@/hooks/useFinance';
import { deleteParcelado } from '@/lib/actions';
import { iconeDe } from '@/lib/categories';
import { fmtBRL } from '@/lib/money';
import { monthName } from '@/lib/months';
import {
  mesFinal, Parcelado, parcelaDoMes, quitado, saldoRestante, semPrazo, TIPOS, vigenteEm,
} from '@/lib/parcelado';
import { ordenarParcelados, progressoParcelados } from '@/lib/parcelados';

export default function Parcelados() {
  const { month } = useMonth();
  const qc = useQueryClient();
  const toast = useToast();
  const cardQ = useCard();
  const purchasesQ = usePurchases();
  const paidQ = usePaidInvoices();
  const txsQ = useTransactions(month);
  const parceladosQ = useParcelados();

  const [wizard, setWizard] = useState(false);
  const [editando, setEditando] = useState<Parcelado | null>(null);

  if ([cardQ, purchasesQ, paidQ, txsQ, parceladosQ].some(q => q.isLoading)) {
    return <p className="empty-row">Carregando…</p>;
  }

  const card = cardQ.data ?? null;
  const pagos = (paidQ.data ?? []).filter(p => p.pago).map(p => p.month);
  const lista = parceladosQ.data ?? [];
  const ativos = lista.filter(p => !quitado(p));
  const encerrados = lista.filter(p => quitado(p));

  const comprasCartao = card
    ? ordenarParcelados(progressoParcelados(purchasesQ.data ?? [], card, pagos, month))
    : [];

  const fixosSoltos = (txsQ.data ?? []).filter(t => t.type === 'fixo' && !t.parcelado_id);
  const totalFixosSoltos = fixosSoltos.reduce((s, t) => s + Number(t.valor), 0);

  const restanteTotal = ativos.reduce((s, p) => s + (saldoRestante(p) ?? 0), 0);
  const mensalTotal = ativos
    .filter(p => vigenteEm(p, month))
    .reduce((s, p) => s + Number(p.valor_parcela), 0);

  function abrirNovo() { setEditando(null); setWizard(true); }
  function abrirEdicao(p: Parcelado) { setEditando(p); setWizard(true); }

  async function remover(p: Parcelado) {
    if (!confirm(`Excluir "${p.nome}"? Os lançamentos já pagos são mantidos; os pendentes são removidos.`)) return;
    try {
      await deleteParcelado(p.id);
    } catch {
      toast('Erro ao excluir');
      return;
    }
    qc.invalidateQueries();
    toast('Parcelado excluído');
  }

  return (
    <>
      <PageHead title="Parcelados" sub="Compromissos que se repetem: parcelamentos, financiamentos e recorrentes." />

      <div className="summary" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="card highlight">
          <div className="label">Ainda a pagar</div>
          <div className="value">{fmtBRL(restanteTotal)}</div>
          <div className="sub">{ativos.length} em aberto</div>
        </div>
        <div className="card">
          <div className="label">Peso em {monthName(month)}</div>
          <div className="value red">{fmtBRL(mensalTotal)}</div>
          <div className="sub">parcelas que vencem neste mês</div>
        </div>
        <div className="card">
          <div className="label">Outros custos fixos</div>
          <div className="value red">{fmtBRL(totalFixosSoltos)}</div>
          <div className="sub">{fixosSoltos.length} lançados à mão</div>
        </div>
      </div>

      <div className="barra-acoes" style={{ justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={abrirNovo}>+ Novo parcelado</button>
      </div>

      {/* ── Parcelados cadastrados ── */}
      <div className="section">
        <div className="section-header"><h2>Seus parcelados</h2></div>

        {lista.length === 0 && (
          <div className="card">
            <p className="card-sub">
              Nenhum parcelado ainda. Cadastre um parcelamento, financiamento ou gasto recorrente —
              ele vira automaticamente um custo fixo nos seus lançamentos, mês a mês.
            </p>
          </div>
        )}

        {[...ativos, ...encerrados].map(p => {
          const total = p.parcelas ?? 0;
          const pct = total ? (p.parcelas_pagas / total) * 100 : 0;
          const fim = mesFinal(p);
          const idx = parcelaDoMes(p, month);
          const fechado = quitado(p);
          const tipoInfo = TIPOS.find(t => t.chave === p.tipo)!;
          return (
            <div className={`card parcelado ${fechado ? 'quitado' : ''}`} key={p.id}>
              <div className="parcelado-topo">
                <span className="tx-icone">{iconeDe(p.categoria)}</span>
                <div className="parcelado-nome">
                  <strong>{p.nome}</strong>
                  <span className="card-sub">
                    <span className="badge" style={{ marginRight: 6 }}>{tipoInfo.icone} {tipoInfo.nome}</span>
                    {p.categoria} · {fmtBRL(Number(p.valor_parcela))}{semPrazo(p.tipo) ? '/mês' : ` × ${total}`}
                  </span>
                </div>
                <div className="parcelado-valores">
                  <span className="tx-valor" style={{ color: fechado ? 'var(--income)' : 'var(--expense)' }}>
                    {semPrazo(p.tipo) ? 'sem prazo' : fechado ? 'quitado' : fmtBRL(saldoRestante(p) ?? 0)}
                  </span>
                  <span className="card-sub">{semPrazo(p.tipo) ? 'recorrente' : fechado ? 'concluído' : 'ainda falta'}</span>
                </div>
              </div>

              {!semPrazo(p.tipo) && (
                <>
                  <div className="parcelado-barra">
                    <div style={{ width: `${pct}%`, background: fechado ? 'var(--income)' : 'var(--primary)' }} />
                  </div>
                  <div className="parcelado-rodape">
                    <span>{p.parcelas_pagas} de {total} pagas{idx ? ` · ${idx}ª vence neste mês` : ''}</span>
                    <span>{monthName(p.primeiro_vencimento.slice(0, 7))} → {fim ? monthName(fim) : '—'}</span>
                  </div>
                </>
              )}
              {semPrazo(p.tipo) && (
                <div className="parcelado-rodape">
                  <span>todo dia {p.dia_vencimento}</span>
                  <span>desde {monthName(p.primeiro_vencimento.slice(0, 7))}</span>
                </div>
              )}

              <div className="grupo-actions" style={{ marginTop: 'var(--s-3)' }}>
                <button className="btn-ghost" onClick={() => abrirEdicao(p)}>Editar</button>
                <button className="btn-ghost" onClick={() => remover(p)}>Excluir</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Compras parceladas no cartão (fatura) ── */}
      {comprasCartao.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2>Compras parceladas no cartão</h2>
            <Link href="/cartao" className="hint-link">Ver fatura</Link>
          </div>
          <p className="card-sub" style={{ marginBottom: 'var(--s-3)' }}>
            Estas vêm das compras do cartão e entram na fatura, não como custo fixo.
          </p>
          {comprasCartao.map(p => (
            <div className={`card parcelado ${p.quitado ? 'quitado' : ''}`} key={p.id}>
              <div className="parcelado-topo">
                <span className="tx-icone">{iconeDe(p.categoria)}</span>
                <div className="parcelado-nome">
                  <strong>{p.descricao}</strong>
                  <span className="card-sub">{p.categoria} · {fmtBRL(p.valorParcela)} × {p.parcelas}</span>
                </div>
                <div className="parcelado-valores">
                  <span className="tx-valor" style={{ color: p.quitado ? 'var(--income)' : 'var(--expense)' }}>
                    {p.quitado ? 'quitado' : fmtBRL(p.restante)}
                  </span>
                  <span className="card-sub">{p.quitado ? 'concluído' : 'ainda falta'}</span>
                </div>
              </div>
              <div className="parcelado-barra">
                <div style={{ width: `${(p.pagas / p.parcelas) * 100}%`, background: p.quitado ? 'var(--income)' : 'var(--primary)' }} />
              </div>
              <div className="parcelado-rodape">
                <span>{p.pagas} de {p.parcelas} pagas</span>
                <span>{monthName(p.primeiroMes)} → {monthName(p.ultimoMes)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Fixos lançados à mão ── */}
      <div className="section">
        <div className="section-header">
          <h2>Outros custos fixos</h2>
          <Link href="/lancamentos" className="hint-link">Editar em Lançamentos</Link>
        </div>
        <p className="card-sub" style={{ marginBottom: 'var(--s-3)' }}>
          Fixos de {monthName(month)} que você lançou direto, sem prazo definido.
        </p>
        <div className="lista">
          {fixosSoltos.length === 0 && <div className="empty-row">Nenhum custo fixo avulso neste mês.</div>}
          {fixosSoltos.map(t => (
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

      <button className="fab" onClick={abrirNovo} aria-label="Novo parcelado">+</button>

      {wizard && <ParceladoWizard editando={editando} aoFechar={() => setWizard(false)} />}
    </>
  );
}
