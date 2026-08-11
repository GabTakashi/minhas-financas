'use client';
import { useState } from 'react';
import PageHead from '@/components/PageHead';
import ParceladoWizard, { OrigemFixo } from '@/components/ParceladoWizard';
import TxModal from '@/components/TxModal';
import TxSection from '@/components/TxSection';
import { TipoParcelado } from '@/lib/parcelado';
import { useMonth } from '@/components/Providers';
import { useMonthRow, useTransactions } from '@/hooks/useFinance';
import { filtrarOrdenar, Ordem } from '@/lib/filtros';
import { fmtBRL } from '@/lib/money';
import { monthName } from '@/lib/months';
import { Transaction } from '@/lib/types';

type Aba = 'todos' | 'receita' | 'despesa';

const ORDENS: { chave: Ordem; rotulo: string }[] = [
  { chave: 'data', rotulo: 'Data' },
  { chave: 'valor', rotulo: 'Valor' },
  { chave: 'nome', rotulo: 'Nome' },
];

export default function Lancamentos() {
  const { month } = useMonth();
  const monthRow = useMonthRow(month);
  const txsQ = useTransactions(month);

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Transaction | null>(null);
  const [wizard, setWizard] = useState<{ tipo: TipoParcelado; nome: string; origem: OrigemFixo | null } | null>(null);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<Aba>('todos');
  const [ordem, setOrdem] = useState<Ordem>('data');
  const [desc, setDesc] = useState(false);

  if (monthRow.isLoading || txsQ.isLoading) return <p className="empty-row">Carregando…</p>;

  const txs = txsQ.data ?? [];
  const filtrados = filtrarOrdenar(txs, { busca, ordem, desc });
  const buscando = busca.trim().length > 0;

  const entradas = filtrados.filter(t => t.type === 'entrada');
  const fixos = filtrados.filter(t => t.type === 'fixo');
  const variaveis = filtrados.filter(t => t.type === 'variavel');

  const mostraReceita = aba === 'todos' || aba === 'receita';
  const mostraDespesa = aba === 'todos' || aba === 'despesa';

  const totalEntradas = entradas.reduce((s, t) => s + Number(t.valor), 0);
  const totalSaidas = [...fixos, ...variaveis].reduce((s, t) => s + Number(t.valor), 0);

  function abrirNovo() { setEditando(null); setModalAberto(true); }
  function abrirEdicao(t: Transaction) { setEditando(t); setModalAberto(true); }

  const vazio = buscando ? 'Nenhum lançamento encontrado para esta busca.' : 'Nenhum lançamento ainda.';

  return (
    <>
      <PageHead title="Lançamentos" sub="Registre e acompanhe suas entradas e gastos." />

      {!monthRow.data ? (
        <div className="new-month">
          <p>O mês de <strong>{monthName(month)}</strong> ainda não foi iniciado. Inicie-o na Visão geral.</p>
        </div>
      ) : (
        <>
          <div className="barra-acoes">
            <div className="campo-busca">
              <span aria-hidden="true">🔍</span>
              <input
                placeholder="Buscar por descrição ou categoria…"
                value={busca} onChange={e => setBusca(e.target.value)}
                aria-label="Buscar lançamentos"
              />
              {buscando && <button className="icon-btn" onClick={() => setBusca('')} aria-label="Limpar busca">✕</button>}
            </div>
            <button className="btn-primary" onClick={abrirNovo}>+ Novo lançamento</button>
          </div>

          <div className="filtros-linha">
            <div className="seg" style={{ marginBottom: 0 }}>
              {(['todos', 'receita', 'despesa'] as Aba[]).map(a => (
                <button key={a} className={aba === a ? 'on' : ''} onClick={() => setAba(a)}>
                  {a === 'todos' ? 'Todos' : a === 'receita' ? 'Receitas' : 'Despesas'}
                </button>
              ))}
            </div>

            <div className="ordena">
              <span className="card-sub">Ordenar:</span>
              {ORDENS.map(o => (
                <button
                  key={o.chave}
                  className={`chip ${ordem === o.chave ? 'on' : ''}`}
                  onClick={() => { ordem === o.chave ? setDesc(d => !d) : (setOrdem(o.chave), setDesc(false)); }}
                  title={ordem === o.chave ? 'Clique para inverter' : `Ordenar por ${o.rotulo.toLowerCase()}`}
                >
                  {o.rotulo}{ordem === o.chave ? (desc ? ' ↓' : ' ↑') : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="resumo-filtro">
            <span>{filtrados.length} {filtrados.length === 1 ? 'lançamento' : 'lançamentos'}{buscando ? ' encontrados' : ''}</span>
            <span>
              <span style={{ color: 'var(--income)' }}>+{fmtBRL(totalEntradas)}</span>
              {'  '}
              <span style={{ color: 'var(--expense)' }}>−{fmtBRL(totalSaidas)}</span>
            </span>
          </div>

          {mostraReceita && (
            <TxSection title="Entradas" type="entrada" color="income" txs={entradas} aoEditar={abrirEdicao} vazio={vazio} />
          )}
          {mostraDespesa && (
            <>
              <TxSection title="Custos fixos" type="fixo" color="expense" txs={fixos} aoEditar={abrirEdicao} vazio={vazio} />
              <TxSection title="Custos variáveis" type="variavel" color="expense" txs={variaveis} aoEditar={abrirEdicao} vazio={vazio} />
            </>
          )}

          {/* botão flutuante no celular — lançar tem que estar sempre a um toque */}
          <button className="fab" onClick={abrirNovo} aria-label="Novo lançamento">+</button>
        </>
      )}

      {modalAberto && (
        <TxModal
          editando={editando}
          aoFechar={() => setModalAberto(false)}
          aoAbrirParcelado={(tipo, nome, valor, categoria, dia) => {
            // editando um fixo existente: o assistente converte em vez de criar do zero
            const origem: OrigemFixo | null = editando
              ? { txId: editando.id, nome: editando.descricao, valor: Number(editando.valor), categoria, dia }
              : null;
            setModalAberto(false);
            setWizard({ tipo, nome: origem ? origem.nome : nome, origem });
          }}
        />
      )}
      {wizard && (
        <ParceladoWizard
          tipoInicial={wizard.tipo}
          nomeInicial={wizard.nome}
          origem={wizard.origem}
          aoFechar={() => setWizard(null)}
        />
      )}
    </>
  );
}
