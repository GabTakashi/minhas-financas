import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Outfit } from 'next/font/google';
import Providers from '@/components/Providers';

const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--next-font-display' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--next-font-body' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--next-font-mono' });

export const metadata: Metadata = { title: 'Minhas Finanças' };
export const viewport: Viewport = { themeColor: '#08090F' };

// aplica o tema salvo antes da primeira pintura, para não piscar a cor errada
const TEMA_SCRIPT = `try{var t=localStorage.getItem('tema');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${outfit.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: TEMA_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
