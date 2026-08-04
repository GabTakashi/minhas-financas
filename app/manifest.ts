import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Minhas Finanças',
    short_name: 'Finanças',
    description: 'Controle de finanças pessoais',
    start_url: '/',
    display: 'standalone',
    background_color: '#08090F',
    theme_color: '#08090F',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
