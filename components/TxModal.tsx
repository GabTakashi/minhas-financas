'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { insertTransaction, setTransactionPago, updateTransaction } from '@/lib/actions';
import { CATEGORIAS, iconeDe } from '@/lib/categories';
import { dataDaTx, diasDoMes, hojeISO } from '@/lib/dias';
import { monthName } from '@/lib/months';
import { TipoParcelado, TIPOS } from '@/lib/parcelado';
import { Transaction, TxType } from '@/lib/types';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMonth, useToast } from './Providers';

const ATALHOS = [10, 20, 50, 100, 200];

/** Só dígitos → valor em reais (os 2 últimos dígitos são os centavos). */
const emReais = (digitos: string) => Number(digitos || '0') / 100;
const formata = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function TxModal({ editando, aoFechar, aoAbrirParcelado }: {
  editando: Transaction | null;
  aoFechar: () => void;
  /** troca este modal pelo assistente de parcelado, levando o que já foi digitado */
  aoAbrirParcelado: (tipo: TipoParcelado, nome: string, valor: number, categoria: string, dia: number | null) => void;
}) {
  const { month } = useMonth();
  const qc = useQueryClient();
  const toast = useToast();

  const inicial = editando;

  // A data vive dentro do mês aberto: é ele que define onde o lançamento entra.
  // Sem nada informado, cai no dia de hoje — ou no dia 1 se o mês aberto for outro.
  const primeiroDia = `${month}-01`;
  const ultimoDia = `${month}-${String(diasDoMes(month)).padStart(2, '0')}`;
  const hoje = hojeISO();
  const dataPadrao = hoje >= primeiroDia && hoje <= ultimoDia ? hoje : primeiroDia;

  const [tipo, setTipo] = useState<TxType>(inicial?.type ?? 'variavel');
  const [digitos, setDigitos] = useState(inicial ? String(Math.round(Number(inicial.valor) * 100)) : '');
  const [desc, setDesc] = useState(inicial?.descricao ?? '');
  const [cat, setCat] = useState<string>(inicial?.categoria ?? CATEGORIAS[0]);
  const [data, setData] = useState(inicial ? dataDaTx(inicial) ?? dataPadrao : dataPadrao);
  const [pago, setPago] = useState(inicial?.pago ?? false);
  const [salvando, setSalvando] = useState(false);

  const isEntrada = tipo === 'entrada';
  const valor = emReais(digitos);

  // Esc, trava de rolagem e foco preso vêm do Dialog — não são mais feitos à mão.

  function digitar(bruto: string) {
    const so = bruto.replace(/\D/g, '').slice(0, 11);
    setDigitos(so);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!desc.trim()) { toast('Digite uma descrição'); return; }
    if (valor <= 0) { toast('Informe um valor maior que zero'); return; }
    if (data && (data < primeiroDia || data > ultimoDia)) {
      toast(`Escolha uma data dentro de ${monthName(month)}`);
      return;
    }

    const linha = {
      month, type: tipo, descricao: desc.trim(), valor,
      categoria: isEntrada ? null : cat,
      dia_vencimento: data ? Number(data.slice(8, 10)) : null,
    };
    setSalvando(true);
    try {
      if (editando) {
        await updateTransaction(editando.id, linha);
        // o status é uma action à parte — só chama se mudou
        if (pago !== editando.pago) await setTransactionPago(editando.id, pago);
      } else {
        await insertTransaction(linha);
      }
    } catch {
      toast('Erro ao salvar — tente novamente');
      setSalvando(false);
      return;
    }
    setSalvando(false);
    qc.invalidateQueries();
    toast(editando ? 'Lançamento atualizado' : 'Lançamento adicionado');
    aoFechar();
  }

  return (
    <Dialog open onOpenChange={aberto => !aberto && aoFechar()}>
      <DialogContent className="modal modal-tx" render={<form onSubmit={salvar} />}>
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar lançamento' : 'Novo lançamento'}</DialogTitle>
        </DialogHeader>

        {/* Despesa | Receita */}
        <div className="tipo-abas">
          <button type="button" className={!isEntrada ? 'on despesa' : ''}
            onClick={() => setTipo(t => (t === 'entrada' ? 'variavel' : t))}>Despesa</button>
          <button type="button" className={isEntrada ? 'on receita' : ''}
            onClick={() => setTipo('entrada')}>Receita</button>
        </div>

        <label className="campo-valor">
          <span className="card-label" style={{ marginBottom: 'var(--s-2)' }}>Valor</span>
          <span className={`valor-linha ${isEntrada ? 'receita' : 'despesa'}`}>
            <span className="valor-moeda">R$</span>
            <input
              inputMode="numeric" autoFocus={!editando}
              value={formata(valor)} onChange={e => digitar(e.target.value)}
              aria-label="Valor do lançamento"
            />
          </span>
        </label>

        <div className="atalhos">
          {ATALHOS.map(v => (
            <button type="button" key={v} className="chip" onClick={() => setDigitos(String(v * 100))}>
              R$ {v}
            </button>
          ))}
          {digitos && <button type="button" className="chip" onClick={() => setDigitos('')}>limpar</button>}
        </div>

        <label className="campo">
          <span>Descrição</span>
          <input
            placeholder={isEntrada ? 'Ex.: salário, freela…' : 'Ex.: mercado, aluguel…'}
            value={desc} onChange={e => setDesc(e.target.value)} autoComplete="off"
          />
        </label>

        {!isEntrada && (
          <>
            <div className="campo">
              <span>Tipo de despesa</span>
              <div className="seg" style={{ marginBottom: 0 }}>
                <button type="button" className={tipo === 'variavel' ? 'on' : ''} onClick={() => setTipo('variavel')}>Variável</button>
                <button type="button" className={tipo === 'fixo' ? 'on' : ''} onClick={() => setTipo('fixo')}>Fixo</button>
              </div>
            </div>

            {/* já vem de um parcelado: editar aqui sairia do ar com o cadastro */}
            {editando?.parcelado_id && editando.type === 'fixo' && (
              <div className="aviso-caixa" style={{ marginBottom: 'var(--s-4)' }}>
                🔁 Este lançamento vem de um parcelado. Para mudar valor, parcelas ou prazo,
                edite-o na aba <strong>Parcelados</strong>.
              </div>
            )}

            {/* a quitação também é ligada ao parcelado, mas é um pagamento avulso */}
            {editando?.parcelado_id && editando.type === 'variavel' && (
              <div className="aviso-caixa" style={{ marginBottom: 'var(--s-4)' }}>
                ✅ Esta é a quitação de um parcelado. Se você reabrir esse parcelado na aba
                <strong> Parcelados</strong> (reduzindo as parcelas pagas), este lançamento
                some junto — não precisa apagá-lo à mão.
              </div>
            )}

            {/* fixo com prazo/parcelas tem cadastro próprio, que já calcula a parcela */}
            {tipo === 'fixo' && !editando?.parcelado_id && (
              <div className="campo">
                <span>
                  {editando ? 'Transformar em parcelado' : 'Tem parcelas ou prazo?'}{' '}
                  <span className="card-sub">(opcional)</span>
                </span>
                <div className="tipo-cards">
                  {TIPOS.map(t => (
                    <button type="button" key={t.chave} className="tipo-card"
                      onClick={() => aoAbrirParcelado(t.chave, desc, valor, cat, data ? Number(data.slice(8, 10)) : null)}>
                      <span className="tipo-icone">{t.icone}</span>
                      <strong>{t.nome}</strong>
                      <span className="card-sub">{t.sub}</span>
                    </button>
                  ))}
                </div>
                <p className="card-sub" style={{ marginTop: 'var(--s-2)' }}>
                  {editando
                    ? 'Escolha um tipo para dar prazo e parcelas a este custo fixo — ele passa a ser controlado na aba Parcelados.'
                    : 'Escolhendo um tipo acima, você cadastra o parcelado — o valor da parcela é calculado sozinho e ele entra aqui como custo fixo todo mês.'}
                </p>
              </div>
            )}

            <label className="campo">
              <span>Categoria</span>
              <select value={cat} onChange={e => setCat(e.target.value)}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{iconeDe(c)}  {c}</option>)}
              </select>
            </label>
          </>
        )}

        <label className="campo">
          <span>Data</span>
          <input type="date" value={data} min={primeiroDia} max={ultimoDia}
            onChange={e => setData(e.target.value)} />
          <span className="card-sub campo-dica">
            {data === hoje
              ? 'Hoje. Mude se o lançamento for de outro dia.'
              : `Dentro de ${monthName(month)}.`}
            {tipo === 'fixo' && ' Para custos fixos, é também o dia do vencimento.'}
          </span>
        </label>

        {editando && (
          <label className="campo-check">
            <input type="checkbox" checked={pago} onChange={e => setPago(e.target.checked)} />
            <span>{isEntrada ? 'Já recebido' : 'Já pago'}</span>
          </label>
        )}

        <div className="grupo-actions" style={{ marginTop: 'var(--s-5)' }}>
          <button type="submit" className="btn-primary" disabled={salvando}>
            {salvando ? 'Salvando…' : editando ? 'Salvar' : 'Adicionar'}
          </button>
          <DialogClose render={<button type="button" className="btn-ghost">Cancelar</button>} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
