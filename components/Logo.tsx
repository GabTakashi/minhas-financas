'use client';
import { useId } from 'react';

/**
 * Marca do app: três pilares ascendentes com a "linha de crescimento"
 * ligando os topos. Cores do tema (magenta → lavanda).
 */
export default function Logo({ size = 22 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="100" y1="396" x2="412" y2="152" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E45FB0" />
          <stop offset="0.5" stopColor="#A99BF5" />
          <stop offset="1" stopColor="#C0B4FE" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id}-g)`}>
        <rect x="100" y="296" width="72" height="100" rx="36" />
        <rect x="220" y="232" width="72" height="164" rx="36" />
        <rect x="340" y="152" width="72" height="244" rx="36" />
      </g>
      <g fill="#7B6BD6" stroke="#7B6BD6" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M136 296 L256 232 L376 152" fill="none" />
        <circle cx="136" cy="296" r="38" stroke="none" />
        <circle cx="256" cy="232" r="38" stroke="none" />
        <circle cx="376" cy="152" r="38" stroke="none" />
      </g>
    </svg>
  );
}
