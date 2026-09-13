import { fontInter, fontMono } from '@/lib/fonts';
import { constructMetadata } from '@/lib/seo';
import { viewport as appViewport } from '@/lib/viewport';
import './globals.css';
import { cn } from '@/lib/utils';

export const metadata = constructMetadata();
export const viewport = appViewport;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn('h-full', 'antialiased', fontInter.variable, fontMono.variable, 'font-sans')}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-screen">{children}</body>
    </html>
  );
}
