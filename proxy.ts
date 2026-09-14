import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const API_AUTH_PREFIX = '/api/auth';

export const proxy = auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // 1. Allow internal Auth.js API endpoints (e.g., /api/auth/*)
  if (nextUrl.pathname.startsWith(API_AUTH_PREFIX)) {
    return NextResponse.next();
  }

  const isRootRoute = nextUrl.pathname === '/';
  const isExactDashboard = nextUrl.pathname === '/dashboard';

  // 2. Handle Logged-In Users
  if (isLoggedIn) {
    const orgSlug = req.auth?.user?.orgs?.[0]?.slug;
    const targetDashboardUrl = orgSlug ? `/dashboard/${orgSlug}` : '/dashboard';

    // If user is logged in and hits '/' or '/dashboard', redirect to '/dashboard/[orgSlug]'
    if (isRootRoute || isExactDashboard) {
      return NextResponse.redirect(new URL(targetDashboardUrl, nextUrl));
    }

    return NextResponse.next();
  }

  // 3. Handle Logged-Out Users
  // Allow access ONLY to '/' (the login page). Redirect all other routes back to '/'
  if (!isRootRoute) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }

    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return NextResponse.redirect(new URL(`/?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  }

  return NextResponse.next();
});

export default proxy;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
