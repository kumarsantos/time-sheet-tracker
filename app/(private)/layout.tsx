import { auth } from '@/auth';
import { Navbar } from '@/components/layout/Navbar';
import { redirect, notFound } from 'next/navigation';

interface PrivateLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug?: string }>;
}

export default async function PrivateLayout({ children, params }: Readonly<PrivateLayoutProps>) {
  const session = await auth();
  if (!session?.user) {
    redirect('/');
  }

  const { orgSlug } = await params;

  if (orgSlug) {
    const hasAccessToOrg = session.user.orgs?.some((org) => org.slug === orgSlug);
    if (!hasAccessToOrg) {
      notFound();
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 antialiased">
      <Navbar user={session.user} />
      <main className="flex w-full flex-1 flex-col">{children}</main>
    </div>
  );
}
