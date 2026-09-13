'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type LoginFormData, loginSchema } from '@/lib/validations/auth';

const INITIAL_LOGIN_FORM_VALUES: LoginFormData = {
  email: '',
  password: '',
  rememberMe: false,
};

export default function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: INITIAL_LOGIN_FORM_VALUES,
  });

  const onSubmit = (data: LoginFormData) => {
    startTransition(async () => {
      try {
        const result = await signIn('credentials', {
          email: data.email,
          password: data.password,
          rememberMe: data.rememberMe,
          redirect: false,
        });
        // 1. Guard against failed credentials
        if (result?.error) {
          const errorMessage = 'Invalid email or password.';
          toast.error(errorMessage);
          return;
        }
        // 2. Success flow: Notify and redirect
        toast.success('Signed in successfully');
        router.push('/dashboard');
        router.refresh();
      } catch {
        const fallbackError = 'An unexpected server error occurred. Please try again.';
        toast.error(fallbackError);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6" noValidate>
      {/* Email Field */}
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-gray-900">
          Email
        </label>
        <input
          {...register('email')}
          id="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          disabled={isPending}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition outline-none focus:border-[#1D61E8] focus:ring-2 focus:ring-[#1D61E8]/20 disabled:opacity-50"
        />
        {errors.email && <p className="text-xs font-medium text-red-500">{errors.email.message}</p>}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-gray-900">
          Password
        </label>
        <input
          {...register('password')}
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••"
          disabled={isPending}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition outline-none focus:border-[#1D61E8] focus:ring-2 focus:ring-[#1D61E8]/20 disabled:opacity-50"
        />
        {errors.password && (
          <p className="text-xs font-medium text-red-500">{errors.password.message}</p>
        )}
      </div>

      {/* Remember Me Checkbox */}
      <div className="flex items-center space-x-3 pt-1">
        <input
          {...register('rememberMe')}
          id="rememberMe"
          type="checkbox"
          disabled={isPending}
          className="h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 bg-white transition checked:border-[#1D61E8] checked:bg-[#1D61E8] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat focus:ring-2 focus:ring-[#1D61E8]/20 focus:outline-none disabled:opacity-50"
        />
        <label
          htmlFor="rememberMe"
          className="cursor-pointer text-sm font-medium text-gray-600 select-none"
        >
          Remember me
        </label>
      </div>

      {/* Sign In Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-[#1A56DB] py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:ring-2 focus:ring-[#1D61E8] focus:ring-offset-2 focus:outline-none active:scale-[0.99] disabled:opacity-60"
      >
        {isPending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
