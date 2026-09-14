import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// const PUBLIC_ROUTES = ['/'];
// // Note: Array.prototype.includes() does NOT match wildcards like '/dashboard/*'.
// // Use path matching helpers or RegExp instead (see fix below).
// const AUTH_ROUTES = ['/dashboard/*'];
const API_AUTH_PREFIX = '/api/auth';

// 1. Assign the Auth.js handler to a named function export
export const proxy = auth((req) => {
  const { nextUrl } = req;
  // const isLoggedIn = !!req.auth;

  const isApiAuthRoute = nextUrl.pathname.startsWith(API_AUTH_PREFIX);
  //   const isPublicRoute = PUBLIC_ROUTES.includes(nextUrl.pathname);
  //   const isAuthRoute = AUTH_ROUTES.includes(nextUrl.pathname);

  //   // Allow internal Auth.js routes
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  //   // Redirect authenticated users away from auth pages (login/register)
  //   if (isAuthRoute) {
  //     if (isLoggedIn) {
  //       return NextResponse.redirect(new URL('/dashboard', nextUrl));
  //     }
  //     return NextResponse.next();
  //   }

  //   // Protect private routes
  //   if (!isLoggedIn && !isPublicRoute) {
  //     let callbackUrl = nextUrl.pathname;
  //     if (nextUrl.search) {
  //       callbackUrl += nextUrl.search;
  //     }

  //     const encodedCallbackUrl = encodeURIComponent(callbackUrl);
  //     return NextResponse.redirect(new URL(`/?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  //   }

  return NextResponse.next();
});

// 2. Default export required by Next.js middleware loader
export default proxy;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
