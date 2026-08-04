'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageHead from '@/components/PageHead';
import { useMonth, useToast } from '@/components/Providers';
import { useCard, usePaidInvoices, usePurchases } from '@/hooks/useFinance';
import { deletePurchase, insertCard, insertPurchase, setInvoicePaid } from '@/lib/actions';
import { CATEGORIAS } from '@/lib/categories';
import { faturaDoMes, limiteUtilizado } from '@/lib/invoice';
import { fmtBRL, parseValorBR } from '@/lib/money';
import { monthName, todayKey } from '@/lib/months';

export default function Cartao() {
  const { month } = useMonth();
  const qc = useQueryClient();
  const toast = useToast();
  const cardQ = useCard();
  const purchasesQ = usePurchases();
  const paidQ = usePaidInvoices();

  // formulário de configuração do cartão
  const [nome, setNome] = useState('');
  const [fech, setFech] = useState('');
  const [venc, setVenc] = useState('');
  const [limite, setLimite] = useState('');
  // formulário de compra
  const [desc, setDesc] = useState('');
  const [valor, setValor] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [cat, setCat] = useState<string>(CATEGORIAS[0]);

  if (cardQ.isLoading || purchasesQ.isLoading || paidQ.isLoading) return <p className="empty-row">Carregando…</p>;

  const card = cardQ.data;

  async function salvarCartao(e: React.FormEvent) {
    e.preventDefault();
    const f = Number(fech), v = Number(venc);
    const lim = limite ? parseValorBR(limite) : null;
    if (!nome.trim()) { toast('Digite o nome do cartão'); return; }
    if (!f || f < 1 || f > 28 || !v || v < 1 || v > 28) { toast('Fechamento e vencimento devem ser dias entre 1 e 28'); return; }
    if (limite && (isNaN(lim!) || lim! <= 0)) { toast('Limite inválido'); return; }
    try {
      await insertCard({ nome: nome.trim(), dia_fechamento: f, dia_vencimento: v, limite: lim });
    } catch {
      toast('Erro ao salvar o cartão');
      return;
    }
    qc.invalidateQueries();
    toast('Cartão configurado');
  }

  if (!card) {
    return (
      <>
        <PageHead title="Cartão" sub="Configure seu cartão de crédito." withMonthNav={false} />
        <div className="card" style={{ maxWidth: 560 }}>
          <h3 style={{ marginBottom: 12 }}>Novo cartão</h3>
          <form className="add-form" onSubmit={salvarCartao}>
            <input className="f-desc" placeholder="Nome (ex.: Nubank)" value={nome} onChange={e => setNome(e.target.value)} />
            <input className="f-dia" type="number" min={1} max={28} placeholder="Dia fech." title="Dia do fechamento" value={fech} onChange={e => setFech(e.target.value)} />
            <input className="f-dia" type="number" min={1} max={28} placeholder="Dia venc." title="Dia do vencimento" value={venc} onChange={e => setVenc(e.target.value)} />
            <input className="f-val" placeholder="Limite (R$)" value={limite} onChange={e => setLimite(e.target.value)} />
            <button type="submit">Salvar</button>
          </form>
          <div className="card-sub" style={{ marginTop: 12 }}>
            Compras feitas até o dia do fechamento entram na fatura aberta; depois disso, na fatura seguinte.
          </div>
        </div>
      </>
    );
  }

  const purchases = purchasesQ.data ?? [];
  const paidMonths = (paidQ.data ?? []).filter(p => p.pago).map(p => p.month);
  const fatura = faturaDoMes(purchases, card, month);
  const faturaPaga = paidMonths.includes(month);
  const usado = limiteUtilizado(purchases, card, paidMonths, todayKey());

  async function addCompra(e: React.FormEvent) {
    e.preventDefault();
    const v = parseValorBR(valor);
    const n = Number(parcelas);
    if (!desc.trim()) { toast('Digite uma descrição'); return; }
    if (isNaN(v) || v <= 0) { toast('Valor inválido — use por ex. 150,00'); return; }
    if (!n || n < 1 || n > 48) { toast('Número de parcelas inválido'); return; }
    if (!data) { toast('Escolha a data da compra'); return; }
    try {
      await insertPurchase({ card_id: card!.id, descricao: desc.trim(), valor_total: v, parcelas: n, data_compra: data, categoria: cat });
    } catch {
      toast('Erro ao salvar a compra');
      return;
    }
    setDesc(''); setValor(''); setParcelas('1');
    qc.invalidateQueries();
    toast('Compra adicionada');
  }

  async function removeCompra(id: string, descricao: string) {
    if (!confirm(`Excluir a compra "${descricao}" e todas as suas parcelas?`)) return;
    await deletePurchase(id);
    qc.invalidateQueries();
  }

  async function togglePagamento() {
    try {
      await setInvoicePaid(card!.id, month, !faturaPaga);
    } catch {
      toast('Erro ao registrar o pagamento');
      return;
    }
    qc.invalidateQueries();
  }

  return (
    <>
      <PageHead title={card.nome} sub="Compras, parcelas e fatura do mês." />
      <div className="summary" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card highlight">
          <div className="label">Fatura de {monthName(month)}</div>
          <div className="value">{fmtBRL(fatura.total)}</div>
          <div className="sub">vence dia {card.dia_vencimento} · fecha dia {card.dia_fechamento}</div>
        </div>
        <div className="card">
          <div className="label">Status da fatura</div>
          <div style={{ marginTop: 10 }}>
            <button className={`status-btn ${faturaPaga ? 'pago' : 'pendente'}`} onClick={togglePagamento}>
              {faturaPaga ? 'Paga ✓' : 'Marcar como paga'}
            </button>
          </div>
          <div className="sub">{fatura.items.length} item(ns) nesta fatura</div>
        </div>
        <div className="card">
          <div className="label">Limite utilizado</div>
          <div className="value">{fmtBRL(usado)}</div>
          <div className="sub">{card.limite ? `de ${fmtBRL(Number(card.limite))} (${Math.round((usado / Number(card.limite)) * 100)}%)` : 'parcelas a vencer'}</div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Fatura de {monthName(month)}</h2>
          <span className="total" style={{ color: 'var(--expense)' }}>{fmtBRL(fatura.total)}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th className="hide-mobile">Categoria</th>
                <th className="center">Parcela</th>
                <th className="num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {fatura.items.length === 0 && <tr><td colSpan={4} className="empty-row">Nenhuma parcela nesta fatura.</td></tr>}
              {fatura.items.map((i, idx) => (
                <tr key={`${i.purchaseId}-${idx}`}>
                  <td>{i.descricao}</td>
                  <td className="hide-mobile"><span className="badge">{i.categoria}</span></td>
                  <td className="center">{i.parcelas > 1 ? `${i.parcela}/${i.parcelas}` : 'à vista'}</td>
                  <td className="num">{fmtBRL(i.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Compras cadastradas</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th className="hide-mobile">Categoria</th>
                <th className="center">Data</th>
                <th className="center">Parcelas</th>
                <th className="num">Total</th>
                <th className="center" style={{ width: 50 }} />
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 && <tr><td colSpan={6} className="empty-row">Nenhuma compra ainda.</td></tr>}
              {purchases.map(p => (
                <tr key={p.id}>
                  <td>{p.descricao}</td>
                  <td className="hide-mobile"><span className="badge">{p.categoria}</span></td>
                  <td className="center">{p.data_compra.split('-').reverse().join('/')}</td>
                  <td className="center">{p.parcelas}x</td>
                  <td className="num">{fmtBRL(Number(p.valor_total))}</td>
                  <td className="center">
                    <button className="icon-btn danger" title="Excluir" onClick={() => removeCompra(p.id, p.descricao)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="add-form" onSubmit={addCompra}>
          <input className="f-desc" placeholder="Descrição (ex.: geladeira, mercado...)" value={desc} onChange={e => setDesc(e.target.value)} autoComplete="off" />
          <select className="f-cat" value={cat} onChange={e => setCat(e.target.value)} aria-label="Categoria">
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
          <input className="f-val" placeholder="Valor total (R$)" value={valor} onChange={e => setValor(e.target.value)} autoComplete="off" />
          <input className="f-dia" type="number" min={1} max={48} placeholder="Parcelas" title="Número de parcelas" value={parcelas} onChange={e => setParcelas(e.target.value)} />
          <input className="f-dia" style={{ width: 150 }} type="date" value={data} onChange={e => setData(e.target.value)} aria-label="Data da compra" />
          <button type="submit">Adicionar</button>
        </form>
      </div>
    </>
  );
}
