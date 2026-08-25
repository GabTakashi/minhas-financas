import './globals.css';
import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Urbanist } from 'next/font/google';
import Providers from '@/components/Providers';
import { cn } from '@/lib/utils';

// O shadcn init trouxe a Geist e a apontou para --font-sans. Foi removida: a
// fonte de interface do app é a Urbanist, e manter as duas baixaria uma
// família inteira à toa e faria os componentes do shadcn destoarem do resto.
const urbanist = Urbanist({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--next-font-body' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--next-font-mono' });

export const metadata: Metadata = { title: 'Minhas Finanças' };
// viewportFit cover: deixa o app usar a tela toda no iPhone; as áreas seguras
// (notch / barra inferior) são compensadas no CSS com env(safe-area-inset-*)
export const viewport: Viewport = { themeColor: '#080910', viewportFit: 'cover' };

// aplica o tema salvo antes da primeira pintura, para não piscar a cor errada
const TEMA_SCRIPT = `try{var t=localStorage.getItem('tema');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={cn(urbanist.variable, jetbrainsMono.variable, 'font-sans')}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: TEMA_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
