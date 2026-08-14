'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { saveBudgetGroups } from '@/lib/actions';
import { CATEGORIAS, iconeDe } from '@/lib/categories';
import { fmtBRL } from '@/lib/money';
import { ehGrupoDePoupanca } from '@/lib/score';
import { budgetGroupTotals } from '@/lib/totals';
import { Budget, BudgetGroup } from '@/lib/types';
import { useToast } from './Providers';

const PADRAO = [
  { nome: 'Essenciais', percentual: '50' },
  { nome: 'Não essenciais', percentual: '30' },
  { nome: 'Investimentos', percentual: '20' },
];

interface EditGroup { nome: string; percentual: string }

/**
 * Cor da barra. Em grupo de gasto, passar do limite é ruim; em grupo de
 * poupança é o contrário — chegar ao alvo é o que fecha em verde.
 */
function tomDaBarra(gasto: number, limite: number, poupanca = false): string {
  if (limite <= 0) return '';
  if (poupanca) return gasto >= limite ? 'ok' : 'meta';
  if (gasto > limite) return 'over';
  return (gasto / limite) * 100 >= 80 ? 'warn' : '';
}

/**
 * Uma categoria dentro do grupo. O limite fica discreto: aparece como texto e
 * só vira campo ao clicar no lápis.
 */
function CategoriaLinha({ categoria, gasto, limite, aoSalvar }: {
  categoria: string;
  gasto: number;
  limite: number;
  aoSalvar: (categoria: string, valor: string) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState('');
  const [salvando, setSalvando] = useState(false);

  const pct = limite > 0 ? Math.min(100, (gasto / limite) * 100) : 0;

  function abrir() {
    setRascunho(limite > 0 ? limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
    setEditando(true);
  }

  async function confirmar() {
    setSalvando(true);
    await aoSalvar(categoria, rascunho);
    setSalvando(false);
    setEditando(false);
  }

  return (
    <div className="orc-linha">
      <span className="orc-icone">{iconeDe(categoria)}</span>
      <span className="orc-nome">{categoria}</span>

      {editando ? (
        <span className="orc-editor">
          <input
            autoFocus inputMode="decimal" value={rascunho} placeholder="sem limite"
            onChange={e => setRascunho(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); confirmar(); }
              if (e.key === 'Escape') setEditando(false);
            }}
            aria-label={`Limite de ${categoria}`}
          />
          <button className="icon-btn" onClick={confirmar} disabled={salvando} title="Salvar limite">✓</button>
          <button className="icon-btn" onClick={() => setEditando(false)} title="Cancelar">✕</button>
        </span>
      ) : (
        <>
          <span className="orc-valores">
            <strong>{fmtBRL(gasto)}</strong>
            <span className="card-sub">{limite > 0 ? ` de ${fmtBRL(limite)}` : ' · sem limite'}</span>
          </span>
          <button
            className="icon-btn orc-lapis" onClick={abrir}
            title={limite > 0 ? 'Editar limite' : 'Definir limite'}
            aria-label={`${limite > 0 ? 'Editar' : 'Definir'} limite de ${categoria}`}
          >
            ✎
          </button>
        </>
      )}

      <div className="orc-trilho">
        <div className={tomDaBarra(gasto, limite)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function BudgetGroups({ groups, gastos, entradas, budgets, aoSalvarLimite }: {
  groups: BudgetGroup[];
  gastos: Record<string, number>;
  entradas: number;
  budgets: Budget[];
  aoSalvarLimite: (categoria: string, valor: string) => Promise<void>;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const [nomes, setNomes] = useState<EditGroup[]>([]);
  // categoria -> índice em `nomes`; -1 = sem grupo
  const [catGrupo, setCatGrupo] = useState<Record<string, number>>({});
  const [salvando, setSalvando] = useState(false);
  const [abertos, setAbertos] = useState<string[]>([]);

  function abrirEdicao() {
    setNomes(groups.length ? groups.map(g => ({ nome: g.nome, percentual: String(g.percentual) })) : PADRAO);
    // toda categoria precisa de grupo; as soltas já entram no primeiro
    const cg: Record<string, number> = {};
    for (const c of CATEGORIAS) {
      const i = groups.findIndex(g => g.categorias.includes(c));
      cg[c] = i === -1 ? 0 : i;
    }
    setCatGrupo(cg);
    setEditando(true);
  }

  function addGrupo() {
    setNomes(ns => [...ns, { nome: '', percentual: '0' }]);
  }

  function removeGrupo(i: number) {
    setNomes(ns => ns.filter((_, idx) => idx !== i));
    // as categorias do grupo removido caem no primeiro — nenhuma fica solta
    setCatGrupo(cg => {
      const novo: Record<string, number> = {};
      for (const c in cg) novo[c] = cg[c] === i ? 0 : cg[c] > i ? cg[c] - 1 : cg[c];
      return novo;
    });
  }

  const totalPct = nomes.reduce((s, n) => s + (Number(n.percentual) || 0), 0);

  async function salvar() {
    if (nomes.some(n => !n.nome.trim())) { toast('Dê um nome para todos os grupos'); return; }
    if (nomes.length === 0) { toast('Crie pelo menos um grupo'); return; }
    const orfas = CATEGORIAS.filter(c => catGrupo[c] == null || catGrupo[c] < 0);
    if (orfas.length > 0) { toast(`Escolha um grupo para: ${orfas.join(', ')}`); return; }
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
    const limiteDe = (c: string) => Number(budgets.find(b => b.categoria === c)?.limite ?? 0);
    const alternar = (nome: string) =>
      setAbertos(a => a.includes(nome) ? a.filter(x => x !== nome) : [...a, nome]);

    return (
      <>
        <div className="section-header">
          <h2>Grupos de orçamento</h2>
          <button className="btn-ghost" onClick={abrirEdicao}>{groups.length ? 'Editar grupos' : 'Criar grupos'}</button>
        </div>

        {totais.length === 0 && (
          <div className="card" style={{ marginBottom: 'var(--s-4)' }}>
            <p className="card-sub">
              Divida seu orçamento em grupos (ex.: 50% Essenciais, 30% Não essenciais, 20% Investimentos)
              e acompanhe quanto já gastou de cada um. É essa divisão que dá a nota da Visão geral.
            </p>
          </div>
        )}

        {entradas === 0 && totais.length > 0 && (
          <div className="aviso-caixa" style={{ marginBottom: 'var(--s-4)' }}>
            Registre uma entrada no mês para calcular quanto cada grupo pode gastar.
          </div>
        )}

        {totais.map(t => {
          const aberto = abertos.includes(t.nome);
          const pct = t.orcado > 0 ? Math.min(100, (t.gasto / t.orcado) * 100) : 0;
          const poupanca = ehGrupoDePoupanca(t);
          const idCorpo = `grupo-${t.nome.replace(/\s+/g, '-')}`;
          return (
            <div className={`card orc-grupo ${aberto ? 'aberto' : ''}`} key={t.nome}>
              <button
                className="orc-grupo-topo" onClick={() => alternar(t.nome)}
                aria-expanded={aberto} aria-controls={idCorpo}
              >
                <span className="orc-seta" aria-hidden="true">›</span>
                <span className="orc-grupo-nome">
                  {t.nome} <span className="card-sub">
                    {poupanca ? `guardar ${t.percentual}%` : `até ${t.percentual}%`} da renda
                  </span>
                </span>
                <span className="orc-grupo-valores">
                  <strong>{fmtBRL(t.gasto)}</strong>
                  <span className="card-sub">{entradas > 0 ? ` de ${fmtBRL(t.orcado)}` : ' gastos'}</span>
                </span>
              </button>

              <div className="orc-grupo-barra">
                <div className={tomDaBarra(t.gasto, t.orcado, poupanca)} style={{ width: `${pct}%` }} />
              </div>
              <div className="orc-grupo-rodape">
                <span>{t.categorias.length} categoria(s)</span>
                <span>
                  {t.orcado <= 0 ? '—'
                    : poupanca
                      ? t.gasto >= t.orcado ? 'meta batida ✓' : `faltam ${fmtBRL(t.orcado - t.gasto)}`
                      : t.gasto > t.orcado ? `estourou ${fmtBRL(t.gasto - t.orcado)}` : `restam ${fmtBRL(t.orcado - t.gasto)}`}
                </span>
              </div>

              {aberto && (
                <div className="orc-grupo-corpo" id={idCorpo}>
                  {t.categorias.length === 0 && (
                    <p className="card-sub">Nenhuma categoria neste grupo — use “Editar grupos”.</p>
                  )}
                  {t.categorias.map(c => (
                    <CategoriaLinha
                      key={c} categoria={c} gasto={gastos[c] || 0}
                      limite={limiteDe(c)} aoSalvar={aoSalvarLimite}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

      </>
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

      <h3 style={{ marginBottom: 4, fontSize: 14 }}>Categorias</h3>
      <p className="card-sub" style={{ marginBottom: 10 }}>
        Toda categoria precisa de um grupo — é isso que faz a regra 50/30/20 fechar em 100% dos gastos.
      </p>
      {CATEGORIAS.map(c => (
        <div className="grupo-row" key={c}>
          <span className="g-cat-nome">{c}</span>
          <select
            className="g-cat-select"
            value={catGrupo[c] ?? 0}
            onChange={e => setCatGrupo(cg => ({ ...cg, [c]: Number(e.target.value) }))}
            aria-label={`Grupo de ${c}`}
          >
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
