import { describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({
  auth: <T>(fn: (req: T) => Promise<unknown> | unknown) => fn,
}));

import { proxy } from '@/proxy';

type User = { orgs?: Array<{ slug: string }> };

interface FakeReq {
  auth: { user?: User } | null;
  nextUrl: URL;
}

function makeReq(auth: { user?: User } | null, path: string): FakeReq {
  return { auth, nextUrl: new URL(`http://localhost${path}`) };
}

const handler = proxy as unknown as (req: FakeReq) => Promise<Response>;

describe('proxy authorization boundary', () => {
  it('returns JSON 401 for unauthenticated API requests', async () => {
    const res = await handler(makeReq(null, '/api/timesheets?limit=10'));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('lets Auth.js endpoints through without a session', async () => {
    const res = await handler(makeReq(null, '/api/auth/session'));
    expect(res.status).toBe(200);
  });

  it('lets authenticated API requests through', async () => {
    const res = await handler(
      makeReq({ user: { orgs: [{ slug: 'acme-analytics' }] } }, '/api/timesheets'),
    );
    expect(res.status).toBe(200);
  });

  it('redirects unauthenticated page requests to the login page', async () => {
    const res = await handler(makeReq(null, '/acme-analytics/timesheets?status=COMPLETED'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'http://localhost/?callbackUrl=' +
        encodeURIComponent('/acme-analytics/timesheets?status=COMPLETED'),
    );
  });

  it('redirects an authenticated root visit to the org timesheets page', async () => {
    const res = await handler(makeReq({ user: { orgs: [{ slug: 'acme-analytics' }] } }, '/'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/acme-analytics/timesheets');
  });

  it('leaves the login page reachable for logged-out users', async () => {
    const res = await handler(makeReq(null, '/'));
    expect(res.status).toBe(200);
  });
});
