// layout.tsx - VERSÃO MELHORADA
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/components/AuthProvider'
import { Suspense } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { OfflineStatus } from '@/components/OfflineStatus'
import { InstallPWA } from '@/components/InstallPWA'

// Otimização da fonte
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Melhora performance
  preload: true,
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: {
    default: 'Sistema de Estudos PMDF',
    template: '%s | Estudos PMDF'
  },
  description: 'Prepare-se para o CFP da PMDF com questões organizadas, estatísticas detalhadas e acompanhamento de progresso.',
  keywords: ['PMDF', 'CFP', 'concurso', 'questões', 'estudos', 'polícia militar'],
  authors: [{ name: 'Sistema de Estudos PMDF' }],
  creator: 'Sistema de Estudos PMDF',
  publisher: 'Sistema de Estudos PMDF',
  
  manifest: '/manifest.json',
  
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Estudos PMDF',
    startupImage: [
      {
        url: '/icon-512x512.png',
        media: '(device-width: 768px) and (device-height: 1024px)'
      }
    ]
  },
  
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false
  },
  
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://estudos-pmdf.vercel.app',
    siteName: 'Sistema de Estudos PMDF',
    title: 'Sistema de Estudos PMDF - Prepare-se para o CFP',
    description: 'Prepare-se para o CFP da PMDF com questões organizadas, estatísticas detalhadas e acompanhamento de progresso.',
    images: [
      {
        url: '/og-image.png', // Você precisa criar esta imagem
        width: 1200,
        height: 630,
        alt: 'Sistema de Estudos PMDF'
      }
    ]
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'Sistema de Estudos PMDF',
    description: 'Prepare-se para o CFP da PMDF com questões organizadas e acompanhamento de progresso.',
    images: ['/og-image.png']
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  verification: {
    // google: 'seu-codigo-google-search-console',
    // other: 'outros-verificadores'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Permitir zoom para acessibilidade
  userScalable: true, // Melhor para acessibilidade
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  colorScheme: 'light dark'
}

// Script otimizado para tema
const themeScript = `
  (function() {
    try {
      const theme = localStorage.getItem('theme');
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (theme === 'dark' || (!theme && systemDark)) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.style.colorScheme = 'light';
      }
    } catch (e) {
      console.warn('Erro ao aplicar tema:', e);
    }
  })();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html 
      lang="pt-BR" 
      suppressHydrationWarning 
      className={`h-full ${inter.variable}`}
    >
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Estudos PMDF" />
        <meta name="application-name" content="Estudos PMDF" />
        
        {/* Prevenção de detecção automática */}
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
        
        {/* Microsoft */}
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="msapplication-navbutton-color" content="#2563eb" />
        
        {/* Icons - Ordem otimizada */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="mask-icon" href="/icon-512x512.png" color="#2563eb" />
        
        {/* Preload crítico */}
        <link rel="preload" href="/icon-192x192.png" as="image" type="image/png" />
        
        {/* DNS Prefetch para recursos externos */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* Script de tema otimizado */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      
      <body className={`${inter.className} min-h-full bg-gray-50 dark:bg-gray-900 transition-colors`}>
        <ErrorBoundary>
          <ThemeProvider 
            attribute="class" 
            defaultTheme="system" 
            enableSystem
            disableTransitionOnChange={false}
          >
            <AuthProvider>
              <div className="flex min-h-full flex-col">
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                }>
                  {children}
                </Suspense>
              </div>
              
              {/* Componentes globais */}
              <OfflineStatus />
              <InstallPWA />
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
        
        {/* Service Worker Registration */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('SW registered: ', registration);
                  })
                  .catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
              });
            }
          `
        }} />
      </body>
    </html>
  )
}