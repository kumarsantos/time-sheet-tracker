import { Toaster } from 'sonner';
import { fontInter } from '@/lib/fonts';
import { constructMetadata } from '@/lib/seo';
import { viewport as appViewport } from '@/lib/viewport';
import './globals.css';

export const metadata = constructMetadata();
export const viewport = appViewport;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${fontInter.variable}`} suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-gray-900 focus:shadow-md"
        >
          Skip to main content
        </a>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
