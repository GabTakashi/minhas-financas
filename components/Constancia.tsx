'use client';
import { useState } from 'react';
import { calendarioDoMes, diasNoMes, proximoSelo, SELOS, selosConquistados } from '@/lib/streak';

const DIAS_SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const NOMES_SEMANA = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

function hojeSP(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export default function Constancia({ datas, month }: { datas: string[]; month: string }) {
  const [verSelos, setVerSelos] = useState(false);

  const celulas = calendarioDoMes(datas, month, hojeSP());
  const noMes = diasNoMes(datas, month);
  const total = new Set(datas).size;
  const conquistados = selosConquistados(total);
  const proximo = proximoSelo(total);

  return (
    <div className="card constancia-card">
      <div className="section-header" style={{ marginBottom: 'var(--s-4)' }}>
        <h3>Sua constância</h3>
        <button className="hint-link" onClick={() => setVerSelos(true)}>
          {conquistados.length ? `${conquistados.length} selo(s)` : 'Ver selos'}
        </button>
      </div>

      <div className="cal">
        {DIAS_SEMANA.map((d, i) => (
          <span className="cal-cab" key={i} title={NOMES_SEMANA[i]}>{d}</span>
        ))}
        {celulas.map((c, i) => (
          <span
            key={i}
            className={`cal-dia ${c.dia === null ? 'vazio' : ''} ${c.registrado ? 'ok' : ''} ${c.hoje ? 'hoje' : ''}`}
            title={c.dia ? `dia ${c.dia}${c.registrado ? ' — registrado' : ''}` : undefined}
          />
        ))}
      </div>

      <p className="constancia-resumo">
        <strong>{noMes}</strong> {noMes === 1 ? 'dia registrado' : 'dias registrados'} este mês
        {total > noMes && <span className="card-sub"> · {total} no total</span>}
      </p>

      {proximo && (
        <div className="proximo-selo">
          <span className="selo-icone pendente">🔒</span>
          <div>
            <div>Próximo: <strong>{proximo.selo.nome}</strong></div>
            <div className="card-sub">faltam {proximo.faltam} {proximo.faltam === 1 ? 'dia' : 'dias'}</div>
          </div>
        </div>
      )}

      {verSelos && (
        <div className="modal-fundo" onClick={() => setVerSelos(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Selos de constância">
            <div className="section-header" style={{ marginBottom: 'var(--s-2)' }}>
              <h3>Selos de constância</h3>
              <button className="icon-btn" onClick={() => setVerSelos(false)} aria-label="Fechar">✕</button>
            </div>
            <p className="card-sub" style={{ marginBottom: 'var(--s-4)' }}>
              Você ganha um selo a cada marca de dias registrados. Cada etapa é um nível a mais de clareza sobre seus gastos.
            </p>
            {SELOS.map(s => {
              const feito = total >= s.dias;
              return (
                <div className={`selo-linha ${feito ? 'feito' : ''}`} key={s.nome}>
                  <span className={`selo-icone ${feito ? '' : 'pendente'}`}>{feito ? '🏅' : '🔒'}</span>
                  <div style={{ flex: 1 }}>
                    <div>{s.nome}</div>
                    <div className="card-sub">{s.dias} dias registrados</div>
                  </div>
                  <span className="selo-ordem">{s.ordem}º</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
