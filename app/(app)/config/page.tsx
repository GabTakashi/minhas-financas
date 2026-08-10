'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { signOut } from 'next-auth/react';
import PageHead from '@/components/PageHead';
import { useToast } from '@/components/Providers';
import { exportAll, importLegacy, setMetaPct } from '@/lib/actions';
import { useMetaPct } from '@/hooks/useFinance';
import { todayKey } from '@/lib/months';

export default function Config() {
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [tema, setTema] = useState<'auto' | 'light' | 'dark'>('auto');
  const metaPctQ = useMetaPct();
  const [pct, setPct] = useState('');
  const [salvandoPct, setSalvandoPct] = useState(false);

  // preenche o campo assim que a preferência chega do banco
  useEffect(() => {
    if (metaPctQ.data != null && pct === '') setPct(String(metaPctQ.data));
  }, [metaPctQ.data, pct]);

  async function salvarPct() {
    const v = Number(pct);
    if (!Number.isFinite(v) || v < 0 || v > 100) { toast('Informe um valor entre 0 e 100'); return; }
    setSalvandoPct(true);
    try {
      await setMetaPct(v);
    } catch {
      toast('Erro ao salvar');
      setSalvandoPct(false);
      return;
    }
    setSalvandoPct(false);
    qc.invalidateQueries();
    toast('Meta de poupança atualizada');
  }

  useEffect(() => {
    const t = localStorage.getItem('tema');
    if (t === 'light' || t === 'dark') setTema(t);
  }, []);

  function aplicarTema(t: 'auto' | 'light' | 'dark') {
    setTema(t);
    if (t === 'auto') {
      localStorage.removeItem('tema');
      delete document.documentElement.dataset.theme;
    } else {
      localStorage.setItem('tema', t);
      document.documentElement.dataset.theme = t;
    }
  }

  async function exportar() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `financas-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Backup exportado');
  }

  async function importarLegado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let data: { months?: Record<string, never> };
    try {
      data = JSON.parse(await file.text());
    } catch {
      toast('Arquivo inválido');
      return;
    }
    if (!data.months || typeof data.months !== 'object') { toast('Arquivo inválido'); return; }
    if (!confirm('Importar backup do app antigo? Meses que já existem aqui serão pulados.')) return;

    setImportando(true);
    try {
      const r = await importLegacy(data);
      if (!r.ok) { toast(r.erro ?? 'Erro durante a importação'); return; }
      qc.invalidateQueries();
      toast(`Importado: ${r.nMeses} mês(es), ${r.nTx} lançamento(s)`);
    } catch {
      toast('Erro durante a importação — verifique e tente de novo');
    } finally {
      setImportando(false);
    }
  }

  return (
    <>
      <PageHead title="Ajustes" sub="Aparência, backup, importação e conta." withMonthNav={false} />
      <div className="card" style={{ maxWidth: 560, marginBottom: 16 }}>
        <h3 style={{ marginBottom: 4 }}>Aparência</h3>
        <div className="card-sub" style={{ marginBottom: 14 }}>
          No automático, o app segue o tema do seu aparelho.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {([['light', 'Claro'], ['dark', 'Escuro'], ['auto', 'Automático']] as const).map(([valor, rotulo]) => (
            <button
              key={valor}
              className="btn-ghost"
              onClick={() => aplicarTema(valor)}
              style={tema === valor ? { borderColor: 'var(--border-focus)', background: 'var(--primary-soft)', color: 'var(--primary)', fontWeight: 600 } : undefined}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{ maxWidth: 560, marginBottom: 16 }}>
        <h3 style={{ marginBottom: 4 }}>Meta de poupança</h3>
        <div className="card-sub" style={{ marginBottom: 14 }}>
          Quanto da sua renda você quer poupar por mês. É esse alvo que dá a nota cheia
          no pilar <strong>Poupança</strong> do seu Desempenho.
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="number" min={0} max={100} value={pct}
            onChange={e => setPct(e.target.value)}
            aria-label="Meta de poupança em porcentagem"
            style={{
              width: 100, background: 'var(--surface-2)', border: '1px solid var(--border-medium)',
              color: 'var(--text-1)', borderRadius: 'var(--r-sm)', padding: '10px 12px',
              fontFamily: 'var(--font-mono)', fontSize: 14,
            }}
          />
          <span className="card-sub">% da renda</span>
          <button className="btn-primary" onClick={salvarPct} disabled={salvandoPct}>
            {salvandoPct ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560, marginBottom: 16 }}>
        <h3 style={{ marginBottom: 4 }}>Backup</h3>
        <div className="card-sub" style={{ marginBottom: 14 }}>Baixe uma cópia de todos os seus dados em JSON.</div>
        <button className="btn-ghost" onClick={exportar}>Exportar backup</button>
      </div>
      <div className="card" style={{ maxWidth: 560, marginBottom: 16 }}>
        <h3 style={{ marginBottom: 4 }}>Importar do app antigo</h3>
        <div className="card-sub" style={{ marginBottom: 14 }}>
          Use o arquivo exportado pelo app antigo (financas-backup-*.json). Meses já existentes são pulados.
        </div>
        <button className="btn-ghost" disabled={importando} onClick={() => fileRef.current?.click()}>
          {importando ? 'Importando…' : 'Escolher arquivo'}
        </button>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={importarLegado} />
      </div>
      <div className="card" style={{ maxWidth: 560 }}>
        <h3 style={{ marginBottom: 4 }}>Conta</h3>
        <div className="card-sub" style={{ marginBottom: 14 }}>Sair desta conta neste aparelho.</div>
        <button className="btn-ghost" onClick={() => signOut({ callbackUrl: '/login' })}>Sair</button>
      </div>
    </>
  );
}
