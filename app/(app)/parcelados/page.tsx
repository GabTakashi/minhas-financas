'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import PageHead from '@/components/PageHead';
import ParceladoWizard from '@/components/ParceladoWizard';
import ProjecaoDivida from '@/components/ProjecaoDivida';
import {
 Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useMonth, useToast } from '@/components/Providers';
import { useParcelados, useTransactions } from '@/hooks/useFinance';
import { deleteParcelado, pagarParcela, quitarParcelado } from '@/lib/actions';
import { iconeDe } from '@/lib/categories';
import { fmtBRL } from '@/lib/money';
import { monthName, shortMonth } from '@/lib/months';
import {
  mesFinal, Parcelado, parcelaDoMes, projecaoDivida, quitado, saldoRestante, semPrazo, TIPOS, vigenteEm,
} from '@/lib/parcelado';

/** '2027-10' → 'out/27' — cabe numa métrica sem quebrar linha. */
const mesCurto = (k: string) => `${shortMonth(k)}/${k.slice(2, 4)}`;

export default function Parcelados() {
  const { month } = useMonth();
  const qc = useQueryClient();
  const toast = useToast();
  const txsQ = useTransactions(month);
  const parceladosQ = useParcelados();

  const [wizard, setWizard] = useState(false);
  const [editando, setEditando] = useState<Parcelado | null>(null);
  const [pagando, setPagando] = useState<string | null>(null);
  const [quitando, setQuitando] = useState<Parcelado | null>(null);
  const [lancarQuitacao, setLancarQuitacao] = useState(true);
  const [quitandoAgora, setQuitandoAgora] = useState(false);

  if ([txsQ, parceladosQ].some(q => q.isLoading)) {
    return <p className="empty-row">Carregando…</p>;
  }

  const lista = parceladosQ.data ?? [];
  const ativos = lista.filter(p => !quitado(p));
  const encerrados = lista.filter(p => quitado(p));
  const txs = txsQ.data ?? [];

  const fixosSoltos = txs.filter(t => t.type === 'fixo' && !t.parcelado_id);
  const totalFixosSoltos = fixosSoltos.reduce((s, t) => s + Number(t.valor), 0);

  // lançamento da parcela deste mês — diz se ela já foi paga. Só o 'fixo': um
  // parcelado quitado também tem um 'variavel' de quitação ligado a ele.
  const txDoParcelado = new Map(
    txs.filter(t => t.parcelado_id && t.type === 'fixo').map(t => [t.parcelado_id!, t]),
  );

  const restanteTotal = ativos.reduce((s, p) => s + (saldoRestante(p) ?? 0), 0);
  const mensalTotal = ativos
    .filter(p => vigenteEm(p, month))
    .reduce((s, p) => s + Number(p.valor_parcela), 0);
  const contratadoTotal = ativos.reduce((s, p) => {
    if (semPrazo(p.tipo) || !p.parcelas) return s;
    return s + (p.valor_total ?? p.valor_parcela * p.parcelas);
  }, 0);
  const jaPago = Math.max(0, contratadoTotal - restanteTotal);
  const pctPago = contratadoTotal > 0 ? (jaPago / contratadoTotal) * 100 : 0;

  const renda = txs.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.valor), 0);
  const comprometimento = renda > 0 ? (mensalTotal / renda) * 100 : null;
  const tomComprometimento =
    comprometimento === null ? '' : comprometimento > 30 ? 'expense' : comprometimento > 15 ? 'warning' : 'income';

  const projecao = projecaoDivida(ativos, month);

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

  async function pagar(p: Parcelado) {
    setPagando(p.id);
    try {
      await pagarParcela(p.id, month);
    } catch {
      toast('Erro ao registrar a parcela');
      setPagando(null);
      return;
    }
    setPagando(null);
    qc.invalidateQueries();
    toast(`Parcela de ${shortMonth(month)} paga`);
  }

  function abrirQuitacao(p: Parcelado) {
    setQuitando(p);
    setLancarQuitacao(true);
  }

  async function confirmarQuitacao() {
    if (!quitando) return;
    setQuitandoAgora(true);
    try {
      await quitarParcelado(quitando.id, month, lancarQuitacao);
    } catch {
      toast('Erro ao quitar');
      setQuitandoAgora(false);
      return;
    }
    setQuitandoAgora(false);
    setQuitando(null);
    qc.invalidateQueries();
    toast('Parcelado quitado 🎉');
  }

  return (
    <>
      <PageHead title="Parcelados" sub="Compromissos que se repetem: parcelamentos, financiamentos e recorrentes." />

      {/* ── faixa: o quanto ainda se deve ── */}
      <div className="card highlight faixa faixa-hero">
        <div className="faixa-topo">
          <div>
            <span className="card-label">Restante</span>
            <span className="faixa-valor">
              <small>R$</small>{fmtBRL(restanteTotal).replace('R$', '').trim()}
            </span>
            <div className="card-sub" style={{ marginTop: 'var(--s-2)' }}>
              {ativos.length === 0
                ? 'nenhum parcelado em aberto'
                : `${ativos.length} em aberto${encerrados.length ? ` · ${encerrados.length} já quitado${encerrados.length > 1 ? 's' : ''}` : ''}`}
            </div>
          </div>

          <div className="faixa-metricas">
            <div>
              <span className="card-label">Impacto mensal</span>
              <strong className="faixa-num expense"><small>R$</small>{fmtBRL(mensalTotal).replace('R$', '').trim()}</strong>
              <span className="card-sub">parcelas de {shortMonth(month)}</span>
            </div>
            <div>
              <span className="card-label">Da sua renda</span>
              <strong className={`faixa-num ${tomComprometimento}`}>
                {comprometimento === null ? '—' : <>{Math.round(comprometimento)}<small>%</small></>}
              </strong>
              <span className="card-sub">{comprometimento === null ? 'sem receita no mês' : 'comprometido'}</span>
            </div>
            <div>
              <span className="card-label">Livre em</span>
              <strong className="faixa-num primary">
                {projecao.mesQuitacao ? mesCurto(projecao.mesQuitacao) : restanteTotal > 0 ? '3+ anos' : '—'}
              </strong>
              <span className="card-sub">{projecao.mesQuitacao ? 'última parcela' : 'sem dívida a prazo'}</span>
            </div>
          </div>
        </div>

        <div
          className="faixa-barra divida" role="img"
          aria-label={`${Math.round(pctPago)}% do total contratado já foi pago`}
        >
          <div style={{ width: `${pctPago}%` }} />
        </div>
        <div className="faixa-legenda">
          <span>{fmtBRL(jaPago)} pagos de {fmtBRL(contratadoTotal)}</span>
          <span>{Math.round(pctPago)}% quitado</span>
        </div>
      </div>

      {/* ── projeção da dívida ── */}
      {projecao.pontos.length > 1 && (
        <div className="card chart-card" style={{ marginBottom: 'var(--s-5)' }}>
          <h3>Projeção da dívida</h3>
          <div className="card-sub">
            Quanto ainda falta, mês a mês, seguindo o plano atual.
            {projecao.truncado && ' Mostrando só os próximos 3 anos.'}
          </div>
          <ProjecaoDivida pontos={projecao.pontos} mesQuitacao={projecao.mesQuitacao} />
        </div>
      )}

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
          const tx = txDoParcelado.get(p.id);
          // no parcelado com prazo quem manda é o contador (é ele que define o saldo);
          // no recorrente, que não tem contador com significado, vale o lançamento
          const pagoNoMes = idx === null ? false
            : semPrazo(p.tipo) ? !!tx?.pago
              : p.parcelas_pagas >= idx;
          const podePagar = !fechado && idx !== null && !pagoNoMes;
          const podeQuitar = !fechado && !semPrazo(p.tipo) && (saldoRestante(p) ?? 0) > 0;
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

              <div className="grupo-actions parcelado-acoes">
                {podePagar && (
                  <button className="btn-primary" onClick={() => pagar(p)} disabled={pagando === p.id}>
                    {pagando === p.id ? 'Registrando…' : 'Pagar parcela'}
                  </button>
                )}
                {!fechado && idx !== null && pagoNoMes && (
                  <span className="status-tag ok">Parcela de {shortMonth(month)} paga</span>
                )}
                {podeQuitar && <button className="btn-ghost" onClick={() => abrirQuitacao(p)}>Quitar parcelado</button>}
                <span className="parcelado-acoes-fim">
                  <button className="btn-ghost" onClick={() => abrirEdicao(p)}>Editar</button>
                  <button className="btn-ghost" onClick={() => remover(p)}>Excluir</button>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Fixos lançados à mão ── */}
      <div className="section">
        <div className="section-header">
          <h2>Outros custos fixos</h2>
          <Link href="/lancamentos" className="hint-link">Editar em Lançamentos</Link>
        </div>
        <p className="card-sub" style={{ marginBottom: 'var(--s-3)' }}>
          Fixos de {monthName(month)} que você lançou direto, sem prazo definido
          {totalFixosSoltos > 0 && <> — <strong>{fmtBRL(totalFixosSoltos)}</strong> por mês</>}.
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

      {/* ── quitação antecipada ── */}
      {/* Primeiro modal convertido para o Dialog do shadcn: foco preso dentro
          dele, Esc, devolução do foco ao fechar e trava de rolagem vêm prontos,
          em vez de reimplementados à mão. */}
      <Dialog open={!!quitando} onOpenChange={aberto => !aberto && setQuitando(null)}>
        <DialogContent className="modal">
          {quitando && (
            <>
              <DialogHeader>
                <DialogTitle>Quitar {quitando.nome}</DialogTitle>
                <DialogDescription>
                  Fecha o parcelado de uma vez. As parcelas que ainda não foram pagas somem dos
                  seus lançamentos; o que já estava pago fica no histórico.
                </DialogDescription>
              </DialogHeader>

              <div className="quitar-valor">
                <span className="card-label">Saldo a quitar</span>
                <strong className="faixa-num expense">{fmtBRL(saldoRestante(quitando) ?? 0)}</strong>
                <span className="card-sub">
                  {quitando.parcelas! - quitando.parcelas_pagas === 1
                    ? '1 parcela restante'
                    : `${quitando.parcelas! - quitando.parcelas_pagas} parcelas restantes`}
                </span>
              </div>

              <label className="campo-check" style={{ marginTop: 'var(--s-4)' }}>
                <input type="checkbox" checked={lancarQuitacao} onChange={e => setLancarQuitacao(e.target.checked)} />
                <span>Lançar como gasto pago em {monthName(month)}</span>
              </label>
              <p className="card-sub" style={{ marginTop: 'var(--s-2)' }}>
                {lancarQuitacao
                  ? 'Entra como despesa variável deste mês — o dinheiro saiu de verdade.'
                  : 'Nada é lançado. Use se você já registrou esse pagamento de outra forma.'}
              </p>

              <div className="grupo-actions" style={{ marginTop: 'var(--s-5)' }}>
                <button className="btn-primary" disabled={quitandoAgora} onClick={confirmarQuitacao}>
                  {quitandoAgora ? 'Quitando…' : 'Confirmar quitação'}
                </button>
                <DialogClose render={<button className="btn-ghost">Cancelar</button>} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
