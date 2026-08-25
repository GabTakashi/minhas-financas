'use client';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { converterEmParcelado, saveParcelado } from '@/lib/actions';
import { CATEGORIAS, iconeDe } from '@/lib/categories';
import { fmtBRL } from '@/lib/money';
import {
  calendario, Parcelado, semPrazo, TipoParcelado, TIPOS, valorDaParcela,
} from '@/lib/parcelado';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from './Providers';

const ETAPAS = ['Tipo', 'Valores', 'Datas', 'Revisar'];

const hojeISO = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const emReais = (d: string) => Number(d || '0') / 100;
const formata = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Dados de um custo fixo que está sendo transformado em parcelado. */
export interface OrigemFixo {
  txId: string;
  nome: string;
  valor: number;
  categoria: string | null;
  dia: number | null;
}

export default function ParceladoWizard({ editando, tipoInicial, nomeInicial, origem, aoFechar }: {
  editando?: Parcelado | null;
  tipoInicial?: TipoParcelado;
  nomeInicial?: string;
  origem?: OrigemFixo | null;
  aoFechar: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [etapa, setEtapa] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState(editando?.nome ?? origem?.nome ?? nomeInicial ?? '');
  const [tipo, setTipo] = useState<TipoParcelado>(editando?.tipo ?? tipoInicial ?? 'parcelamento');
  const [categoria, setCategoria] = useState(editando?.categoria ?? origem?.categoria ?? CATEGORIAS[0]);
  const [digitos, setDigitos] = useState(() => {
    // vindo de um fixo, o valor conhecido é o da mensalidade, não o total
    const base = editando ? (editando.valor_total ?? editando.valor_parcela) : (origem?.valor ?? 0);
    return base ? String(Math.round(base * 100)) : '';
  });
  const [parcelas, setParcelas] = useState(editando?.parcelas ?? 12);
  const [pagas, setPagas] = useState(editando?.parcelas_pagas ?? 0);
  const [venc, setVenc] = useState(() => {
    if (editando) return editando.primeiro_vencimento;
    if (origem?.dia) {
      const hoje = hojeISO();
      return `${hoje.slice(0, 7)}-${String(origem.dia).padStart(2, '0')}`;
    }
    return hojeISO();
  });

  const recorrente = semPrazo(tipo);
  const valorDigitado = emReais(digitos);
  // em recorrente o valor digitado JÁ é a mensalidade; nos demais é o total
  const valorParcela = recorrente ? valorDigitado : (parcelas > 0 ? valorDaParcela(valorDigitado, parcelas) : 0);
  const diaVenc = Number(venc.slice(8, 10)) || 1;

  const previa = useMemo(() => valorParcela > 0 ? calendario({
    tipo, parcelas: recorrente ? null : parcelas, primeiro_vencimento: venc,
    dia_vencimento: diaVenc, valor_parcela: valorParcela,
    valor_total: recorrente ? null : valorDigitado,
  }, 12) : [], [tipo, parcelas, venc, diaVenc, valorParcela, valorDigitado, recorrente]);

  // Esc, trava de rolagem e foco preso vêm do Dialog.

  const podeAvancar =
    etapa === 0 ? nome.trim().length > 0
    : etapa === 1 ? valorParcela > 0 && (recorrente || parcelas >= 1)
    : true;

  async function salvar() {
    const dados = {
      nome: nome.trim(), tipo, categoria,
      valor_total: recorrente ? null : valorDigitado,
      parcelas: recorrente ? null : parcelas,
      valor_parcela: valorParcela,
      parcelas_pagas: recorrente ? 0 : Math.min(pagas, parcelas),
      primeiro_vencimento: venc,
      dia_vencimento: diaVenc,
    };
    setSalvando(true);
    try {
      if (origem) await converterEmParcelado(origem.txId, dados);
      else await saveParcelado(dados, editando?.id);
    } catch {
      toast('Erro ao salvar — tente novamente');
      setSalvando(false);
      return;
    }
    setSalvando(false);
    qc.invalidateQueries();
    toast(origem ? 'Convertido em parcelado' : editando ? 'Parcelado atualizado' : 'Parcelado cadastrado');
    aoFechar();
  }

  return (
    <Dialog open onOpenChange={aberto => !aberto && aoFechar()}>
      <DialogContent className="modal modal-wizard">
        <DialogHeader>
          <DialogTitle>
            {origem ? 'Transformar em parcelado' : editando ? 'Editar parcelado' : 'Cadastrar novo parcelado'}
          </DialogTitle>
        </DialogHeader>

        <div className="card-label" style={{ marginBottom: 4 }}>Etapa {etapa + 1} de 4</div>
        <h2 className="wizard-titulo">
          {['O que é esse parcelado?', 'Quanto custa?', 'Quando vence?', 'Tudo certo?'][etapa]}
        </h2>

        <div className="wizard-passos">
          {ETAPAS.map((e, i) => (
            <span key={e} className={i === etapa ? 'atual' : i < etapa ? 'feito' : ''}>{e}</span>
          ))}
        </div>
        <div className="wizard-trilho"><div style={{ width: `${((etapa + 1) / 4) * 100}%` }} /></div>

        <div className="wizard-corpo">
          {/* ── 1. Tipo ── */}
          {etapa === 0 && (
            <>
              {origem && (
                <div className="aviso-caixa" style={{ marginBottom: 'var(--s-4)' }}>
                  🔄 O custo fixo <strong>{origem.nome}</strong> ({fmtBRL(origem.valor)}/mês) vai virar um parcelado.
                  O lançamento deste mês é substituído pelo novo, mantendo o status de pago.
                </div>
              )}
              <label className="campo">
                <span>Como você quer chamar?</span>
                <input value={nome} onChange={e => setNome(e.target.value)} autoFocus
                  placeholder="Ex.: iPhone 15, financiamento do carro…" autoComplete="off" />
              </label>

              <div className="campo">
                <span>Qual o tipo?</span>
                <div className="tipo-cards">
                  {TIPOS.map(t => (
                    <button type="button" key={t.chave}
                      className={`tipo-card ${tipo === t.chave ? 'on' : ''}`}
                      onClick={() => setTipo(t.chave)}>
                      <span className="tipo-icone">{t.icone}</span>
                      <strong>{t.nome}</strong>
                      <span className="card-sub">{t.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="campo">
                <span>Categoria</span>
                <select value={categoria} onChange={e => setCategoria(e.target.value)}>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{iconeDe(c)}  {c}</option>)}
                </select>
              </label>
            </>
          )}

          {/* ── 2. Valores ── */}
          {etapa === 1 && (
            <>
              <label className="campo-valor" style={{ marginBottom: 'var(--s-5)' }}>
                <span className="card-label" style={{ marginBottom: 'var(--s-2)' }}>
                  {recorrente ? 'Valor por mês' : 'Valor total do parcelado'}
                </span>
                <span className="valor-linha despesa">
                  <span className="valor-moeda">R$</span>
                  <input inputMode="numeric" autoFocus value={formata(valorDigitado)}
                    onChange={e => setDigitos(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    aria-label="Valor" />
                </span>
                <span className="card-sub" style={{ display: 'block', marginTop: 'var(--s-2)' }}>
                  {recorrente ? 'Quanto você paga por mês' : 'Digite o valor completo'}
                </span>
              </label>

              {origem && !recorrente && (
                <div className="aviso-caixa" style={{ marginBottom: 'var(--s-4)' }}>
                  ⚠️ Você lançava <strong>{fmtBRL(origem.valor)}</strong> por mês. Como parcelamento,
                  o campo acima é o valor <strong>total</strong> — ajuste se precisar.
                </div>
              )}

              {!recorrente && (
                <>
                  <div className="wizard-duplo">
                    <div className="passo-caixa">
                      <span className="card-label">Parcelas</span>
                      <div className="contador">
                        <button type="button" onClick={() => setParcelas(n => Math.max(1, n - 1))} aria-label="Menos uma parcela">−</button>
                        <strong>{parcelas}</strong>
                        <button type="button" onClick={() => setParcelas(n => Math.min(480, n + 1))} aria-label="Mais uma parcela">+</button>
                      </div>
                    </div>
                    <div className="passo-caixa">
                      <span className="card-label">Por parcela <span className="marca-auto">auto</span></span>
                      <strong className="valor-auto">{valorParcela > 0 ? fmtBRL(valorParcela) : '—'}</strong>
                    </div>
                  </div>

                  <div className="passo-caixa" style={{ marginTop: 'var(--s-3)' }}>
                    <div className="section-header" style={{ marginBottom: 'var(--s-2)' }}>
                      <span className="card-label" style={{ margin: 0 }}>Já pagou alguma?</span>
                      <span className="card-sub" style={{ fontFamily: 'var(--font-mono)' }}>{pagas} / {parcelas}</span>
                    </div>
                    <div className="parcelado-barra" style={{ marginBottom: 'var(--s-3)' }}>
                      <div style={{ width: `${(pagas / parcelas) * 100}%`, background: 'var(--primary)' }} />
                    </div>
                    <div className="contador">
                      <button type="button" onClick={() => setPagas(n => Math.max(0, n - 1))} aria-label="Menos uma paga">−</button>
                      <strong>{pagas}</strong>
                      <button type="button" onClick={() => setPagas(n => Math.min(parcelas, n + 1))} aria-label="Mais uma paga">+</button>
                      <span className="card-sub" style={{ marginLeft: 'auto' }}>restam {parcelas - pagas}</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── 3. Datas ── */}
          {etapa === 2 && (
            <>
              <label className="campo">
                <span>Quando é o 1º pagamento?</span>
                <input type="date" value={venc} onChange={e => setVenc(e.target.value || hojeISO())} />
              </label>
              <div className="aviso-caixa">
                🗓️ A 1ª parcela vence em <strong>{previa[0]?.iso.split('-').reverse().join('/')}</strong>.
                {' '}As demais vencem todo dia <strong>{diaVenc}</strong> dos meses seguintes.
              </div>

              <div className="campo" style={{ marginTop: 'var(--s-4)' }}>
                <span>Calendário de vencimentos</span>
                <div className="calendario-parcelas">
                  {previa.slice(0, 8).map(v => (
                    <div className={`parcela-cartao ${v.indice === 1 ? 'primeira' : ''}`} key={v.indice}>
                      <span className="card-sub">#{v.indice}</span>
                      <strong>{v.iso.slice(8, 10)}</strong>
                      <span className="card-sub">{v.mes.split('-').reverse().join('/')}</span>
                      <span className="card-sub">{fmtBRL(v.valor)}</span>
                    </div>
                  ))}
                  {previa.length > 8 && (
                    <div className="parcela-cartao mais"><span className="card-sub">+{previa.length - 8}</span></div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── 4. Revisar ── */}
          {etapa === 3 && (
            <>
              <div className="impacto">
                <span className="card-label">Impacto mensal</span>
                <strong>{fmtBRL(valorParcela)}</strong>
                <span className="card-sub">entra como custo fixo nos seus lançamentos</span>
              </div>

              <div className="revisao">
                {([
                  ['Nome', nome.trim() || '—'],
                  ['Tipo', TIPOS.find(t => t.chave === tipo)!.nome],
                  ['Categoria', `${iconeDe(categoria)} ${categoria}`],
                  ...(recorrente
                    ? [['Valor mensal', fmtBRL(valorParcela)] as [string, string]]
                    : [
                        ['Valor total', fmtBRL(valorDigitado)] as [string, string],
                        ['Parcelas', `${parcelas}x de ${fmtBRL(valorParcela)}`] as [string, string],
                        ['Já pagas', `${pagas} de ${parcelas}`] as [string, string],
                        ['Falta pagar', fmtBRL(Math.max(0, valorDigitado - pagas * valorParcela))] as [string, string],
                      ]),
                  ['1º vencimento', previa[0]?.iso.split('-').reverse().join('/') ?? '—'],
                  ...(recorrente ? [] : [['Última parcela', previa.length
                    ? calendario({ tipo, parcelas, primeiro_vencimento: venc, dia_vencimento: diaVenc, valor_parcela: valorParcela, valor_total: valorDigitado }, parcelas).at(-1)!.iso.split('-').reverse().join('/')
                    : '—'] as [string, string]]),
                ] as [string, string][]).map(([k, v]) => (
                  <div className="revisao-linha" key={k}><span>{k}</span><strong>{v}</strong></div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="wizard-rodape">
          {etapa > 0
            ? <button className="btn-ghost" onClick={() => setEtapa(e => e - 1)}>Voltar</button>
            : <button className="btn-ghost" onClick={aoFechar}>Cancelar</button>}
          {etapa < 3
            ? <button className="btn-primary" disabled={!podeAvancar} onClick={() => setEtapa(e => e + 1)}>Continuar →</button>
            : <button className="btn-primary" disabled={salvando} onClick={salvar}>
                {salvando ? 'Salvando…' : origem ? 'Transformar em parcelado' : editando ? 'Salvar alterações' : 'Cadastrar parcelado'}
              </button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
