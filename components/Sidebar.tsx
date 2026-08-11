'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Logo from './Logo';

const S = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const ICONS = {
  home: <svg {...S}><rect x="3" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" /></svg>,
  lista: <svg {...S}><path d="M4 8h13l-3-3M20 16H7l3 3" /></svg>,
  cartao: <svg {...S}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.8h19" /><path d="M6.5 15h3" /></svg>,
  grafico: <svg {...S}><path d="M12 3a9 9 0 1 0 9 9h-9z" /><path d="M14.5 2.6A9 9 0 0 1 21.4 9.5h-6.9z" /></svg>,
  pulso: <svg {...S}><path d="M2.5 12h4l2.5-6.5 4.5 13 2.5-6.5h5.5" /></svg>,
  repetir: <svg {...S}><path d="M3 11.5a8 8 0 0 1 13.7-5.6L21 10" /><path d="M21 4.5V10h-5.5" /><path d="M21 12.5a8 8 0 0 1-13.7 5.6L3 14" /><path d="M3 19.5V14h5.5" /></svg>,
  ajustes: <svg {...S}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 1-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.47 1z" /></svg>,
  mais: <svg {...S}><circle cx="5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="19" cy="12" r="1.4" fill="currentColor" /></svg>,
  sair: <svg {...S}><path d="M15 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2" /><path d="M20 12H10m10 0-3.2-3.2M20 12l-3.2 3.2" /></svg>,
};

/** Menu completo — usado na lateral do computador. */
const PRINCIPAIS = [
  ['/', 'Visão geral', ICONS.home],
  ['/lancamentos', 'Lançamentos', ICONS.lista],
  ['/cartao', 'Cartão', ICONS.cartao],
  ['/parcelados', 'Parcelados', ICONS.repetir],
  ['/orcamento', 'Orçamento', ICONS.grafico],
  ['/desempenho', 'Desempenho', ICONS.pulso],
] as const;

/** Barra inferior do celular: os 4 atalhos mais usados + "Mais". */
const ABAS = [
  ['/', 'Painel', ICONS.home],
  ['/lancamentos', 'Extrato', ICONS.lista],
  ['/orcamento', 'Orçamento', ICONS.grafico],
] as const;

/** O que fica na folha "Mais". */
const EXTRAS = [
  ['/cartao', 'Cartão', ICONS.cartao],
  ['/parcelados', 'Parcelados', ICONS.repetir],
  ['/desempenho', 'Desempenho', ICONS.pulso],
  ['/config', 'Ajustes', ICONS.ajustes],
] as const;

const TITULOS: Record<string, string> = {
  '/': 'Visão geral', '/lancamentos': 'Lançamentos', '/cartao': 'Cartão',
  '/parcelados': 'Parcelados', '/orcamento': 'Orçamento',
  '/desempenho': 'Desempenho', '/config': 'Ajustes',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mais, setMais] = useState(false);

  useEffect(() => { setMais(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mais ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mais]);

  const item = ([href, label, icon]: readonly [string, string, React.ReactNode]) => (
    <Link key={href} href={href} className={`nav-item ${pathname === href ? 'active' : ''}`}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
    </Link>
  );

  // "Mais" fica aceso quando a tela atual não está entre as abas fixas
  const emExtras = EXTRAS.some(e => e[0] === pathname);

  return (
    <>
      {/* ── lateral (computador) ── */}
      <nav className="sidebar">
        <div className="brand">
          <span className="brand-logo"><Logo size={26} /></span>
          <div>Minhas Finanças<small>controle pessoal</small></div>
        </div>
        {PRINCIPAIS.map(item)}
        <div className="spacer" />
        {item(['/config', 'Ajustes', ICONS.ajustes])}
      </nav>

      {/* ── topo (celular) ── */}
      <header className="topbar">
        <span className="topbar-logo"><Logo size={24} /></span>
        <span className="topbar-title">{TITULOS[pathname] ?? 'Minhas Finanças'}</span>
      </header>

      {/* ── barra inferior (celular) ── */}
      <nav className="tabbar" aria-label="Navegação principal">
        {ABAS.slice(0, 2).map(([href, label, icon]) => (
          <Link key={href} href={href} className={`tab ${pathname === href ? 'on' : ''}`}>
            {icon}<span>{label}</span>
          </Link>
        ))}

        <button className="tab-fab" onClick={() => router.push('/lancamentos?novo=1')} aria-label="Novo lançamento">+</button>

        {ABAS.slice(2).map(([href, label, icon]) => (
          <Link key={href} href={href} className={`tab ${pathname === href ? 'on' : ''}`}>
            {icon}<span>{label}</span>
          </Link>
        ))}
        <button className={`tab ${mais || emExtras ? 'on' : ''}`} onClick={() => setMais(true)}>
          {ICONS.mais}<span>Mais</span>
        </button>
      </nav>

      {/* ── folha "Mais" ── */}
      {mais && (
        <div className="folha-fundo" onClick={() => setMais(false)}>
          <div className="folha" onClick={e => e.stopPropagation()} role="dialog" aria-label="Mais opções">
            <div className="folha-alca" />
            {EXTRAS.map(([href, label, icon]) => (
              <Link key={href} href={href} className={`folha-item ${pathname === href ? 'on' : ''}`}>
                {icon}<span>{label}</span>
              </Link>
            ))}
            <button className="folha-item sair" onClick={() => signOut({ callbackUrl: '/login' })}>
              {ICONS.sair}<span>Sair</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
