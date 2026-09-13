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
      <body className="bg-background text-foreground min-h-screen">{children}</body>
    </html>
  );
}
