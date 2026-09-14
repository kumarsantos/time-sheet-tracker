import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const API_AUTH_PREFIX = '/api/auth';
const API_PREFIX = '/api';

export const proxy = auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // 1. Allow internal Auth.js API endpoints (e.g., /api/auth/*)
  if (nextUrl.pathname.startsWith(API_AUTH_PREFIX)) {
    return NextResponse.next();
  }

  // 2. API routes speak JSON: unauthenticated callers get a 401 response
  //    (never a page redirect — the route handlers would 401 anyway via
  //    requireUser, so the proxy answers early and stays consistent).
  if (nextUrl.pathname.startsWith(API_PREFIX)) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isRootRoute = nextUrl.pathname === '/';

  // Extract primary org slug from user session
  const orgSlug = req.auth?.user?.orgs?.[0]?.slug;
  const targetTimesheetUrl = orgSlug ? `/${orgSlug}/timesheets` : '/';

  // 3. Handle Logged-In Users
  if (isLoggedIn) {
    // Check if the user is hitting root '/', bare '/timesheets', or bare '/[orgSlug]'
    const isBareTimesheets = nextUrl.pathname === '/timesheets';
    const isSingleSegmentOrg = orgSlug && nextUrl.pathname === `/${orgSlug}`;

    if (isRootRoute || isBareTimesheets || isSingleSegmentOrg) {
      return NextResponse.redirect(new URL(targetTimesheetUrl, nextUrl));
    }

    return NextResponse.next();
  }

  // 4. Handle Logged-Out (Unauthenticated) Users
  // Block ALL routes except strictly '/' (the login page)
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
