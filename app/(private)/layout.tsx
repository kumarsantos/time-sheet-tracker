import { Navbar } from '@/components/layout/Navbar';

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="flex w-full flex-1 flex-col">{children}</main>
    </div>
  );
}
