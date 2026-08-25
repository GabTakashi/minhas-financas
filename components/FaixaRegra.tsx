'use client';
import Link from 'next/link';
import { fmtBRL } from '@/lib/money';
import { Pilar } from '@/lib/score';

/**
 * A faixa do painel: o mês repartido em proporção real, logo abaixo da régua
 * 50/30/20 desenhada na mesma escala.
 *
 * São duas trilhas empilhadas de propósito. A primeira versão marcava o alvo
 * com traços verticais por cima do bloco real, mas eles cortavam o bloco em
 * pedaços e pareciam divisórias de grupo. Com as trilhas separadas, a leitura
 * é só comparar onde cada cor termina em cima e embaixo.
 */
export default function FaixaRegra({ pilares, renda }: {
  pilares: Pilar[];
  renda: number;
}) {
  if (renda <= 0 || pilares.length === 0) return null;

  const gastoTotal = pilares.reduce((s, p) => s + p.gasto, 0);
  const sobra = Math.max(0, renda - gastoTotal);
  const pctDe = (v: number) => (v / renda) * 100;
  const somaPesos = pilares.reduce((s, p) => s + p.peso, 0) || 100;

  return (
    <section className="regra" aria-label="Distribuição da renda do mês comparada à regra 50/30/20">
      <div className="regra-cabecalho">
        <span className="card-label">Onde o mês foi</span>
        <span className="regra-cabecalho-nota">régua {pilares.map(p => p.peso).join('/')}</span>
      </div>

      {/* régua: o alvo, na mesma escala */}
      <div className="regra-trilho alvo" aria-hidden="true">
        {pilares.map((p, i) => (
          <div key={p.chave} className={`regra-bloco s${i + 1}`} style={{ width: `${(p.peso / somaPesos) * 100}%` }} />
        ))}
      </div>

      {/* real: o que de fato aconteceu */}
      <div className="regra-trilho real">
        {pilares.map((p, i) => {
          const largura = pctDe(p.gasto);
          if (largura <= 0) return null;
          const estourou = p.tipo === 'teto' && p.fatia * 100 > p.peso;
          return (
            <div
              key={p.chave}
              className={`regra-bloco s${i + 1} ${estourou ? 'estourou' : ''}`}
              style={{ width: `${largura}%` }}
              title={`${p.nome}: ${fmtBRL(p.gasto)} — ${Math.round(p.fatia * 100)}% da renda (régua: ${p.peso}%)`}
            />
          );
        })}
        {sobra > 0 && (
          <div className="regra-bloco sobra" style={{ width: `${pctDe(sobra)}%` }} title={`Ainda não gasto: ${fmtBRL(sobra)}`} />
        )}
      </div>

      <ul className="regra-legenda">
        {pilares.map((p, i) => {
          const real = Math.round(p.fatia * 100);
          const estourou = p.tipo === 'teto' && real > p.peso;
          const faltou = p.tipo === 'meta' && real < p.peso;
          return (
            <li key={p.chave}>
              <i className={`regra-ponto s${i + 1}`} aria-hidden="true" />
              <span className="regra-nome">{p.nome}</span>
              <span className="regra-valor">{fmtBRL(p.gasto)}</span>
              <span className={`regra-delta ${estourou || faltou ? 'fora' : 'dentro'}`}>
                {real}%<span className="regra-alvo"> de {p.peso}%</span>
              </span>
            </li>
          );
        })}
        {sobra > 0 && (
          <li className="regra-sobra-item">
            <i className="regra-ponto sobra" aria-hidden="true" />
            <span className="regra-nome">Ainda não gasto</span>
            <span className="regra-valor">{fmtBRL(sobra)}</span>
            <span className="regra-delta dentro">{Math.round(pctDe(sobra))}%</span>
          </li>
        )}
      </ul>

      <Link href="/orcamento" className="hint-link regra-link">Ajustar os grupos →</Link>
    </section>
  );
}
