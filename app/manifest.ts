import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Minhas Finanças',
    short_name: 'Finanças',
    description: 'Controle de finanças pessoais',
    start_url: '/',
    display: 'standalone',
    background_color: '#080910',
    theme_color: '#080910',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
