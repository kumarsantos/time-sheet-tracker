import AuthBrandingPanel from '@/components/auth/AuthBrandingPanel';
import LoginForm from '@/components/auth/LoginForm';

const LoginScreen = () => {
  return (
    <main id="main" tabIndex={-1} className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-2">
      {/* Left Column: Auth Form */}
      <section className="flex flex-col items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-xl space-y-6">
          <h1 className="text-xl leading-[125%] font-bold tracking-tight text-gray-900">
            Welcome back
          </h1>
          <LoginForm />
        </div>
      </section>

      {/* Right Column: Branding Panel */}
      <section className="hidden items-center justify-center bg-[#1C64F2] p-12 text-white lg:flex">
        <AuthBrandingPanel />
      </section>
    </main>
  );
};

export default LoginScreen;
