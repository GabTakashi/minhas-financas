'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageHead from '@/components/PageHead';
import { useMonth, useToast } from '@/components/Providers';
import { useAllMonths, useAllTransactions } from '@/hooks/useFinance';
import { setMeta as setMetaAction } from '@/lib/actions';
import { analisarPadrao, serieMetas, statusDoMes } from '@/lib/metas';
import { fmtBRL, parseValorBR } from '@/lib/money';
import { monthName, shortMonth } from '@/lib/months';
import { guardadoNoMes, serieDeResumos } from '@/lib/resumo';

export default function Metas() {
  const { month } = useMonth();
  const qc = useQueryClient();
  const toast = useToast();
  const allMonths = useAllMonths();
  const allTxs = useAllTransactions();

  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState('');
  const [salvando, setSalvando] = useState(false);

  if ([allMonths, allTxs].some(q => q.isLoading)) {
    return <p className="empty-row">Carregando…</p>;
  }

  const meses = (allMonths.data ?? []).map(m => m.month).filter(k => k <= month).slice(-6);
  const metaPorMes = Object.fromEntries((allMonths.data ?? []).map(m => [m.month, Number(m.meta)]));
  const resumos = serieDeResumos(allTxs.data ?? [], meses);
  const serie = serieMetas(resumos, metaPorMes);

  const atual = serie.find(p => p.month === month) ?? { month, economia: 0, meta: metaPorMes[month] ?? 0, pct: 0 };
  const meta = atual.meta;
  const economia = atual.economia;
  const status = statusDoMes(economia, meta);
  const padrao = analisarPadrao(serie);
  const guardado = guardadoNoMes((allTxs.data ?? []).filter(t => t.month === month));
  const pctBarra = meta > 0 ? Math.min(100, (economia / meta) * 100) : 0;

  async function salvar() {
    const v = parseValorBR(rascunho);
    if (isNaN(v) || v < 0) { toast('Valor inválido — use por ex. 600,00'); return; }
    setSalvando(true);
    try {
      await setMetaAction(month, v);
    } catch {
      toast('Erro ao salvar');
      setSalvando(false);
      return;
    }
    setSalvando(false);
    qc.invalidateQueries();
    setEditando(false);
    toast('Meta atualizada');
  }

  // gráfico dos últimos meses
  const W = 680, H = 220, padL = 44, padR = 14, padT = 16, padB = 30;
  const iw = W - padL - padR, ih = H - padT - padB;
  const maxV = Math.max(1, ...serie.map(p => Math.max(p.economia, p.meta)));
  const px = (i: number) => serie.length <= 1 ? padL + iw / 2 : padL + (i / (serie.length - 1)) * iw;
  const py = (v: number) => padT + ih - (Math.max(0, v) / maxV) * ih;
  const compacto = (v: number) => v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v));

  return (
    <>
      <PageHead title="Metas" sub="Acompanhe quanto você economiza por mês." />

      {/* ── destaque do mês ── */}
      <div className="card meta-hero">
        <div className="meta-hero-topo">
          <div>
            <span className="card-label">Economia em {monthName(month)}</span>
            <div className="meta-hero-valor">{fmtBRL(economia)}</div>
            <div className="card-sub">
              {meta > 0 ? <>Meta: <strong>{fmtBRL(meta)}</strong> / mês</> : 'sem meta definida'}
              {guardado > 0 && <> · {fmtBRL(guardado)} separado</>}
            </div>
          </div>
          <div className="meta-hero-acoes">
            {status.superou && <span className="selo-ok">Você superou sua meta 🚀</span>}
            <button className="btn-ghost" onClick={() => { setRascunho(meta ? String(meta).replace('.', ',') : ''); setEditando(true); }}>
              {meta > 0 ? 'Editar meta' : 'Definir meta'}
            </button>
          </div>
        </div>

        <div className="meta-hero-barra">
          <div className={status.superou ? 'ok' : ''} style={{ width: `${pctBarra}%` }} />
        </div>
        <div className="meta-hero-rodape">
          <span>{meta > 0 ? `${atual.pct}% da meta` : '—'}</span>
          <span className={status.superou ? 'positivo' : ''}>{status.texto}</span>
        </div>
      </div>

      <div className={`aviso-caixa padrao-${padrao.tom}`} style={{ marginBottom: 'var(--s-5)' }}>
        {padrao.tom === 'bom' ? '📈' : padrao.tom === 'alerta' ? '⚠️' : '—'} {padrao.texto}
      </div>

      {/* ── evolução ── */}
      <div className="card">
        <h3>{serie.length === 1 ? 'Este mês' : `Últimos ${serie.length} meses`}</h3>
        <div className="card-sub" style={{ marginBottom: 'var(--s-4)' }}>economia de cada mês contra a meta</div>

        {serie.length === 0 ? (
          <p className="empty-row">Sem meses registrados ainda.</p>
        ) : (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Economia mês a mês comparada à meta">
              <defs>
                <linearGradient id="meta-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[0, 0.5, 1].map(f => (
                <g key={f}>
                  <line x1={padL} y1={py(maxV * f)} x2={W - padR} y2={py(maxV * f)} stroke="var(--border-soft)" strokeDasharray="3 4" />
                  <text x={padL - 8} y={py(maxV * f) + 3.5} textAnchor="end" fontSize={9.5} fill="var(--text-3)" fontFamily="var(--font-mono)">
                    {compacto(maxV * f)}
                  </text>
                </g>
              ))}

              {/* linha da meta */}
              {meta > 0 && (
                <line x1={padL} y1={py(meta)} x2={W - padR} y2={py(meta)}
                  stroke="var(--income)" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.8} />
              )}

              {serie.length > 1 && (
                <>
                  <path
                    d={`M${serie.map((p, i) => `${px(i)},${py(p.economia)}`).join(' L')} L${px(serie.length - 1)},${padT + ih} L${px(0)},${padT + ih} Z`}
                    fill="url(#meta-area)"
                  />
                  <polyline
                    points={serie.map((p, i) => `${px(i)},${py(p.economia)}`).join(' ')}
                    fill="none" stroke="var(--primary)" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round"
                  />
                </>
              )}

              {serie.map((p, i) => (
                <g key={p.month}>
                  <circle cx={px(i)} cy={py(p.economia)} r={4.5}
                    fill={p.meta > 0 && p.economia >= p.meta ? 'var(--income)' : 'var(--primary)'}
                    stroke="var(--surface-1)" strokeWidth={2} />
                  <text x={px(i)} y={H - 9} textAnchor="middle" fontSize={10}
                    fill={p.month === month ? 'var(--text-1)' : 'var(--text-3)'}>{shortMonth(p.month)}</text>
                </g>
              ))}
            </svg>

            <div className="legend">
              <span><i className="dot" style={{ background: 'var(--primary)' }} />Economia</span>
              <span><i className="dot" style={{ background: 'var(--income)' }} />Meta batida</span>
            </div>
          </>
        )}
      </div>

      {/* ── histórico ── */}
      <div className="section" style={{ marginTop: 'var(--s-5)' }}>
        <div className="section-header"><h2>Mês a mês</h2></div>
        <div className="lista">
          {serie.length === 0 && <div className="empty-row">Nada por aqui ainda.</div>}
          {[...serie].reverse().map(p => {
            const bateu = p.meta > 0 && p.economia >= p.meta;
            return (
              <div className={`tx-linha ${p.month === month ? 'destaque' : ''}`} key={p.month}>
                <span className="tx-icone">{bateu ? '🎯' : p.meta > 0 ? '•' : '—'}</span>
                <div className="tx-principal" style={{ cursor: 'default' }}>
                  <strong>{monthName(p.month)}</strong>
                  <span className="tx-meta">
                    {p.meta > 0 ? `meta ${fmtBRL(p.meta)} · ${p.pct}%` : 'sem meta definida'}
                  </span>
                </div>
                <span className="tx-valor" style={{ color: bateu ? 'var(--income)' : 'var(--text-1)' }}>
                  {fmtBRL(p.economia)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── modal de edição ── */}
      {editando && (
        <div className="modal-fundo" onClick={() => setEditando(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Definir meta">
            <div className="section-header" style={{ marginBottom: 'var(--s-2)' }}>
              <h3>Meta de {monthName(month)}</h3>
              <button className="icon-btn" onClick={() => setEditando(false)} aria-label="Fechar">✕</button>
            </div>
            <p className="card-sub" style={{ marginBottom: 'var(--s-4)' }}>
              Quanto você quer economizar neste mês. Conta o que você separa em Investimentos e
              Reserva de Emergência, mais o que sobra no fim do mês.
            </p>
            <label className="campo">
              <span>Valor (R$ / mês)</span>
              <input autoFocus value={rascunho} onChange={e => setRascunho(e.target.value)}
                placeholder="ex.: 600,00" inputMode="decimal" />
            </label>
            <div className="grupo-actions">
              <button className="btn-primary" disabled={salvando} onClick={salvar}>
                {salvando ? 'Salvando…' : 'Salvar meta'}
              </button>
              <button className="btn-ghost" onClick={() => setEditando(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
