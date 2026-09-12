import { fontInter, fontMono } from '@/libs/fonts';
import { constructMetadata } from '@/libs/seo';
import { viewport as appViewport } from '@/libs/viewport';
import './globals.css';

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
      className={`${fontInter.variable} ${fontMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-screen">{children}</body>
    </html>
  );
}
