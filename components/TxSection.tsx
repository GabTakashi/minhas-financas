'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { deleteTransaction, insertTransaction, setTransactionPago, updateTransaction } from '@/lib/actions';
import { CATEGORIAS } from '@/lib/categories';
import { fmtBRL, parseValorBR } from '@/lib/money';
import { Transaction, TxType } from '@/lib/types';
import { useMonth, useToast } from './Providers';

export default function TxSection({ title, type, txs, color }: {
  title: string; type: TxType; txs: Transaction[]; color: 'income' | 'expense';
}) {
  const { month } = useMonth();
  const qc = useQueryClient();
  const toast = useToast();
  const isEntrada = type === 'entrada';
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [desc, setDesc] = useState('');
  const [valor, setValor] = useState('');
  const [cat, setCat] = useState<string>(CATEGORIAS[0]);
  const [dia, setDia] = useState('');

  const total = txs.reduce((s, t) => s + Number(t.valor), 0);

  function startEdit(t: Transaction) {
    setEditing(t);
    setDesc(t.descricao);
    setValor(Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setCat(t.categoria ?? CATEGORIAS[0]);
    setDia(t.dia_vencimento ? String(t.dia_vencimento) : '');
  }

  function reset() {
    setEditing(null); setDesc(''); setValor(''); setCat(CATEGORIAS[0]); setDia('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = parseValorBR(valor);
    if (!desc.trim()) { toast('Digite uma descrição'); return; }
    if (isNaN(v) || v <= 0) { toast('Valor inválido — use por ex. 150,00'); return; }
    const row = {
      month, type, descricao: desc.trim(), valor: v,
      categoria: isEntrada ? null : cat,
      dia_vencimento: !isEntrada && dia ? Number(dia) : null,
    };
    try {
      if (editing) await updateTransaction(editing.id, row);
      else await insertTransaction(row);
    } catch {
      toast('Erro ao salvar — tente novamente');
      return;
    }
    reset();
    qc.invalidateQueries();
    toast(editing ? 'Lançamento atualizado' : 'Lançamento adicionado');
  }

  async function toggle(t: Transaction) {
    await setTransactionPago(t.id, !t.pago);
    qc.invalidateQueries();
  }

  async function remove(t: Transaction) {
    if (!confirm(`Excluir "${t.descricao}"?`)) return;
    await deleteTransaction(t.id);
    if (editing?.id === t.id) reset();
    qc.invalidateQueries();
  }

  return (
    <div className="section">
      <div className="section-header">
        <h2>{title}</h2>
        <span className="total" style={{ color: `var(--${color})` }}>{fmtBRL(total)}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              {!isEntrada && <><th className="hide-mobile">Categoria</th><th className="center hide-mobile">Vencimento</th></>}
              <th className="num">Valor</th>
              <th className="center">Status</th>
              <th className="center" style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {txs.length === 0 && <tr><td colSpan={6} className="empty-row">Nenhum lançamento ainda.</td></tr>}
            {txs.map(t => (
              <tr key={t.id} className={t.pago ? 'paid' : ''}>
                <td>{t.descricao}</td>
                {!isEntrada && <>
                  <td className="hide-mobile"><span className="badge">{t.categoria || 'Outros'}</span></td>
                  <td className="center hide-mobile">{t.dia_vencimento ? `dia ${t.dia_vencimento}` : '—'}</td>
                </>}
                <td className="num">{fmtBRL(Number(t.valor))}</td>
                <td className="center">
                  <button className={`status-btn ${t.pago ? 'pago' : 'pendente'}`} onClick={() => toggle(t)}>
                    {t.pago ? (isEntrada ? 'Recebido' : 'Pago') : (isEntrada ? 'A receber' : 'Pendente')}
                  </button>
                </td>
                <td className="center" style={{ whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" title="Editar" onClick={() => startEdit(t)}>✎</button>
                  <button className="icon-btn danger" title="Excluir" onClick={() => remove(t)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="add-form" onSubmit={submit}>
        <input className="f-desc" placeholder={isEntrada ? 'Descrição (ex.: salário, freela...)' : 'Descrição (ex.: aluguel, mercado...)'} value={desc} onChange={e => setDesc(e.target.value)} autoComplete="off" />
        {!isEntrada && (
          <select className="f-cat" value={cat} onChange={e => setCat(e.target.value)} aria-label="Categoria">
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
        )}
        {!isEntrada && (
          <input className="f-dia" type="number" min={1} max={31} placeholder="Dia venc." value={dia} onChange={e => setDia(e.target.value)} aria-label="Dia do vencimento" />
        )}
        <input className="f-val" placeholder="Valor (R$)" value={valor} onChange={e => setValor(e.target.value)} autoComplete="off" />
        <button type="submit">{editing ? 'Salvar' : 'Adicionar'}</button>
        {editing && <button type="button" className="btn-ghost" onClick={reset}>Cancelar</button>}
      </form>
    </div>
  );
}
