'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

const S = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const ICONS = {
  home: <svg {...S}><path d="M3 10.2 12 3.5l9 6.7V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M9.2 21v-6.2h5.6V21" /></svg>,
  lista: <svg {...S}><rect x="4" y="3" width="16" height="18" rx="2.5" /><path d="M8.2 8.5h7.6M8.2 12h7.6M8.2 15.5h4.6" /></svg>,
  cartao: <svg {...S}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.8h19" /><path d="M6.5 15h3" /></svg>,
  grafico: <svg {...S}><path d="M12 3a9 9 0 1 0 9 9h-9z" /><path d="M14.5 2.6A9 9 0 0 1 21.4 9.5h-6.9z" /></svg>,
  pulso: <svg {...S}><path d="M2.5 12h4l2.5-6.5 4.5 13 2.5-6.5h5.5" /></svg>,
  ajustes: <svg {...S}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 1-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.47 1z" /></svg>,
};

const PRINCIPAIS = [
  ['/', 'Visão geral', ICONS.home],
  ['/lancamentos', 'Lançamentos', ICONS.lista],
  ['/cartao', 'Cartão', ICONS.cartao],
  ['/orcamento', 'Orçamento', ICONS.grafico],
  ['/desempenho', 'Desempenho', ICONS.pulso],
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const toqueX = useRef<number | null>(null);

  // fecha o menu ao trocar de página
  useEffect(() => { setAberto(false); }, [pathname]);

  // trava o scroll do fundo enquanto o menu está aberto
  useEffect(() => {
    document.body.style.overflow = aberto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [aberto]);

  // arrastar a partir da borda esquerda abre o menu
  useEffect(() => {
    function inicio(e: TouchEvent) {
      toqueX.current = e.touches[0].clientX <= 28 ? e.touches[0].clientX : null;
    }
    function move(e: TouchEvent) {
      if (toqueX.current === null) return;
      if (e.touches[0].clientX - toqueX.current > 45) { setAberto(true); toqueX.current = null; }
    }
    function fim() { toqueX.current = null; }
    document.addEventListener('touchstart', inicio, { passive: true });
    document.addEventListener('touchmove', move, { passive: true });
    document.addEventListener('touchend', fim, { passive: true });
    return () => {
      document.removeEventListener('touchstart', inicio);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', fim);
    };
  }, []);

  const item = ([href, label, icon]: readonly [string, string, React.ReactNode]) => (
    <Link key={href} href={href} className={`nav-item ${pathname === href ? 'active' : ''}`}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
    </Link>
  );

  const atual = [...PRINCIPAIS, ['/config', 'Ajustes'] as const].find(i => i[0] === pathname)?.[1] ?? 'Minhas Finanças';

  return (
    <>
      {/* barra superior — só aparece no celular */}
      <header className="topbar">
        <button className="menu-btn" onClick={() => setAberto(true)} aria-label="Abrir menu" aria-expanded={aberto}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <span className="topbar-title">{atual}</span>
        <span className="topbar-logo"><Logo size={24} /></span>
      </header>

      <div className={`drawer-backdrop ${aberto ? 'on' : ''}`} onClick={() => setAberto(false)} aria-hidden="true" />

      <nav className={`sidebar ${aberto ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-logo"><Logo size={26} /></span>
          <div>Minhas Finanças<small>controle pessoal</small></div>
          <button className="drawer-close" onClick={() => setAberto(false)} aria-label="Fechar menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {PRINCIPAIS.map(item)}
        <div className="spacer" />
        {item(['/config', 'Ajustes', ICONS.ajustes])}
      </nav>
    </>
  );
}
