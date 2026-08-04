'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { saveBudgetGroups } from '@/lib/actions';
import { CATEGORIAS } from '@/lib/categories';
import { fmtBRL } from '@/lib/money';
import { budgetGroupTotals } from '@/lib/totals';
import { BudgetGroup } from '@/lib/types';
import { useToast } from './Providers';

const PADRAO = [
  { nome: 'Essenciais', percentual: '50' },
  { nome: 'Não essenciais', percentual: '30' },
  { nome: 'Investimentos', percentual: '20' },
];

interface EditGroup { nome: string; percentual: string }

export default function BudgetGroups({ groups, gastos, entradas }: {
  groups: BudgetGroup[]; gastos: Record<string, number>; entradas: number;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const [nomes, setNomes] = useState<EditGroup[]>([]);
  // categoria -> índice em `nomes`; -1 = sem grupo
  const [catGrupo, setCatGrupo] = useState<Record<string, number>>({});
  const [salvando, setSalvando] = useState(false);

  function abrirEdicao() {
    setNomes(groups.length ? groups.map(g => ({ nome: g.nome, percentual: String(g.percentual) })) : PADRAO);
    const cg: Record<string, number> = {};
    for (const c of CATEGORIAS) cg[c] = groups.findIndex(g => g.categorias.includes(c));
    setCatGrupo(cg);
    setEditando(true);
  }

  function addGrupo() {
    setNomes(ns => [...ns, { nome: '', percentual: '0' }]);
  }

  function removeGrupo(i: number) {
    setNomes(ns => ns.filter((_, idx) => idx !== i));
    setCatGrupo(cg => {
      const novo: Record<string, number> = {};
      for (const c in cg) novo[c] = cg[c] === i ? -1 : cg[c] > i ? cg[c] - 1 : cg[c];
      return novo;
    });
  }

  const totalPct = nomes.reduce((s, n) => s + (Number(n.percentual) || 0), 0);

  async function salvar() {
    if (nomes.some(n => !n.nome.trim())) { toast('Dê um nome para todos os grupos'); return; }
    const payload = nomes.map((n, i) => ({
      nome: n.nome.trim(),
      percentual: Number(n.percentual) || 0,
      categorias: CATEGORIAS.filter(c => catGrupo[c] === i),
    }));
    setSalvando(true);
    try {
      await saveBudgetGroups(payload);
    } catch {
      toast('Erro ao salvar — tente novamente');
      setSalvando(false);
      return;
    }
    setSalvando(false);
    qc.invalidateQueries();
    setEditando(false);
    toast('Grupos salvos');
  }

  if (!editando) {
    const totais = budgetGroupTotals(groups, gastos, entradas);
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-header" style={{ marginBottom: totais.length ? 8 : 0 }}>
          <h2>Grupos de orçamento</h2>
          <button className="btn-ghost" onClick={abrirEdicao}>{groups.length ? 'Editar grupos' : 'Criar grupos'}</button>
        </div>
        {totais.length === 0 && (
          <p className="empty-row" style={{ padding: '8px 0' }}>
            Divida seu orçamento em grupos (ex.: 50% Essenciais, 30% Não essenciais, 20% Investimentos) e acompanhe quanto já gastou de cada um.
          </p>
        )}
        {totais.map(t => {
          const pct = t.orcado > 0 ? Math.min(100, (t.gasto / t.orcado) * 100) : 0;
          const cls = t.orcado > 0 && t.gasto > t.orcado ? 'over' : pct >= 80 ? 'warn' : '';
          return (
            <div className="budget-row" key={t.nome}>
              <span className="b-cat">{t.nome} <small style={{ color: 'var(--text-3)' }}>({t.percentual}%)</small></span>
              <div className="b-bar"><div className={cls} style={{ width: `${pct}%` }} /></div>
              <span className="b-spent">
                {entradas > 0
                  ? `${fmtBRL(t.gasto)} de ${fmtBRL(t.orcado)}${t.gasto > t.orcado ? ' — estourou!' : ''}`
                  : `${fmtBRL(t.gasto)} gastos`}
              </span>
            </div>
          );
        })}
        {entradas === 0 && totais.length > 0 && (
          <p className="card-sub" style={{ marginTop: 8 }}>Registre uma entrada no mês para calcular os valores orçados.</p>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="section-header" style={{ marginBottom: 14 }}>
        <h2>Editar grupos de orçamento</h2>
        <span className="total" style={{ color: totalPct === 100 ? 'var(--income)' : 'var(--warning)' }}>Total: {totalPct}%</span>
      </div>

      {nomes.map((n, i) => (
        <div className="grupo-row" key={i}>
          <input
            className="g-nome"
            placeholder="Nome do grupo"
            value={n.nome}
            onChange={e => setNomes(ns => ns.map((x, idx) => idx === i ? { ...x, nome: e.target.value } : x))}
            autoComplete="off"
          />
          <input
            className="g-pct"
            type="number"
            min={0}
            max={100}
            value={n.percentual}
            onChange={e => setNomes(ns => ns.map((x, idx) => idx === i ? { ...x, percentual: e.target.value } : x))}
            aria-label={`Percentual de ${n.nome || 'grupo'}`}
          />
          <button type="button" className="icon-btn danger" title="Remover grupo" onClick={() => removeGrupo(i)}>✕</button>
        </div>
      ))}
      <button type="button" className="btn-ghost" onClick={addGrupo} style={{ marginTop: 4, marginBottom: 22 }}>+ Novo grupo</button>

      <h3 style={{ marginBottom: 10, fontSize: 14 }}>Categorias</h3>
      {CATEGORIAS.map(c => (
        <div className="grupo-row" key={c}>
          <span className="g-cat-nome">{c}</span>
          <select
            className="g-cat-select"
            value={catGrupo[c] ?? -1}
            onChange={e => setCatGrupo(cg => ({ ...cg, [c]: Number(e.target.value) }))}
            aria-label={`Grupo de ${c}`}
          >
            <option value={-1}>Sem grupo</option>
            {nomes.map((n, i) => <option key={i} value={i}>{n.nome || `Grupo ${i + 1}`}</option>)}
          </select>
        </div>
      ))}

      <div className="grupo-actions">
        <button type="button" className="btn-primary" disabled={salvando} onClick={salvar}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setEditando(false)}>Cancelar</button>
      </div>
    </div>
  );
}
