'use client';
import { useEffect, useRef, useState } from 'react';

const LIMIAR = 72;   // distância necessária para disparar
const MAXIMO = 110;  // até onde o indicador desce
const ATRITO = 0.55; // o dedo anda mais que o indicador (sensação elástica)

/**
 * "Puxar para atualizar" — no app instalado na tela de início não existe a
 * barra do navegador, então este gesto é a única forma de recarregar.
 */
export default function PullToRefresh() {
  const [dist, setDist] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const inicioY = useRef<number | null>(null);
  const distRef = useRef(0);
  const ativoRef = useRef(false);

  useEffect(() => {
    function comeco(e: TouchEvent) {
      if (carregando || window.scrollY > 0 || e.touches.length !== 1) { inicioY.current = null; return; }
      inicioY.current = e.touches[0].clientY;
      ativoRef.current = false;
    }

    function move(e: TouchEvent) {
      if (inicioY.current === null || carregando) return;
      const delta = e.touches[0].clientY - inicioY.current;
      // rolou para cima ou saiu do topo: cancela o gesto
      if (delta <= 0 || window.scrollY > 0) {
        if (ativoRef.current) { ativoRef.current = false; distRef.current = 0; setDist(0); }
        inicioY.current = null;
        return;
      }
      ativoRef.current = true;
      // impede o "rubber band" do iOS enquanto estamos puxando
      if (e.cancelable) e.preventDefault();
      const d = Math.min(MAXIMO, delta * ATRITO);
      distRef.current = d;
      setDist(d);
    }

    function fim() {
      inicioY.current = null;
      if (!ativoRef.current) return;
      ativoRef.current = false;
      if (distRef.current >= LIMIAR) {
        setCarregando(true);
        setDist(LIMIAR);
        // recarrega de fato: além dos dados, pega também uma versão nova do app
        setTimeout(() => window.location.reload(), 400);
      } else {
        distRef.current = 0;
        setDist(0);
      }
    }

    document.addEventListener('touchstart', comeco, { passive: true });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', fim, { passive: true });
    document.addEventListener('touchcancel', fim, { passive: true });
    return () => {
      document.removeEventListener('touchstart', comeco);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', fim);
      document.removeEventListener('touchcancel', fim);
    };
  }, [carregando]);

  const progresso = Math.min(1, dist / LIMIAR);

  return (
    <div
      className={`ptr ${dist > 0 || carregando ? 'on' : ''} ${carregando ? 'girando' : ''}`}
      style={{ transform: `translate(-50%, ${dist}px)`, opacity: progresso }}
      aria-hidden={dist === 0 && !carregando}
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" style={{ transform: `rotate(${progresso * 270}deg)` }}>
        <circle cx="12" cy="12" r="9" stroke="var(--surface-3)" strokeWidth="2.4" />
        <path
          d="M12 3a9 9 0 0 1 9 9" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round"
          strokeDasharray={`${progresso * 42} 100`}
        />
      </svg>
    </div>
  );
}
