import type { Metadata, Viewport } from 'next';
import '@fontsource/hind-siliguri/bengali-400.css';
import '@fontsource/hind-siliguri/bengali-500.css';
import '@fontsource/hind-siliguri/bengali-600.css';
import '@fontsource/hind-siliguri/bengali-700.css';
import '@fontsource/hind-siliguri/latin-400.css';
import '@fontsource/hind-siliguri/latin-500.css';
import '@fontsource/hind-siliguri/latin-600.css';
import '@fontsource/hind-siliguri/latin-700.css';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Providers } from '@/components/Providers';
import { SITE, SITE_NAME } from '@/lib/utils';
import Script from 'next/script';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: `${SITE_NAME} – HSC, BCS ও ভর্তি পরীক্ষার MCQ প্রস্তুতি`, template: `%s | ${SITE_NAME}` },
  description: 'HSC ICT, বিসিএস প্রিলি ও ভর্তি পরীক্ষার চ্যাপ্টারভিত্তিক MCQ, উত্তর ও ব্যাখ্যা, ফ্রি মডেল টেস্ট এবং দুর্বল টপিক বিশ্লেষণ – সবকিছু এক জায়গায়।',
  applicationName: SITE_NAME,
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'bn_BD' },
  alternates: { canonical: '/' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1f55dc' };

// Page ankar age theme + font size boshay, jeno reload-e shada jhilik na dey
const initScript = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('theme')||'system';if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))d.classList.add('dark');var f=localStorage.getItem('fs');if(f==='sm'||f==='lg')d.setAttribute('data-fs',f);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <Script id="init-theme" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">মূল কনটেন্টে যান</a>
          <Header />
          <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}