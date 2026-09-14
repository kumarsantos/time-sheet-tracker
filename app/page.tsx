import type { Metadata } from 'next';
import LoginScreen from '@/screens/LoginScreen';
import { constructMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = constructMetadata({
  title: 'Sign in',
  description: 'Sign in to your ticktock timesheet workspace.',
  noIndex: true,
});

const Home = () => {
  return <LoginScreen />;
};

export default Home;
