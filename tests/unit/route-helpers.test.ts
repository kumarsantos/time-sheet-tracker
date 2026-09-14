import { beforeEach, describe, expect, it, vi } from 'vitest';
import z from 'zod';

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
const dbMock = vi.hoisted(() => ({ select: vi.fn() }));

vi.mock('@/auth', () => authMock);
vi.mock('@/app/database', () => ({ db: dbMock }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

import {
  apiError,
  isError,
  parseBoundedInt,
  readJsonBody,
  requireOrgAccess,
  requireUser,
} from '@/lib/api/route-helpers';

describe('parseBoundedInt', () => {
  it('uses the fallback for missing/invalid values', () => {
    expect(parseBoundedInt(null, 10)).toBe(10);
    expect(parseBoundedInt('', 10)).toBe(10);
    expect(parseBoundedInt('abc', 10)).toBe(10);
    expect(parseBoundedInt('0', 10)).toBe(10);
  });

  it('parses valid integers and clamps to the max', () => {
    expect(parseBoundedInt('5', 10)).toBe(5);
    expect(parseBoundedInt('1000', 10, 100)).toBe(100);
  });
});

describe('apiError', () => {
  it('creates a JSON response with the expected status', () => {
    const res = apiError('Nope', 403);
    expect(isError(res)).toBe(true);
    expect(res.status).toBe(403);
  });
});

describe('requireUser', () => {
  it('returns the session user id when authenticated', async () => {
    authMock.auth.mockResolvedValue({ user: { id: 'user-1', orgs: [] } });
    const result = await requireUser();
    expect(isError(result)).toBe(false);
    if (!isError(result)) {
      expect(result.userId).toBe('user-1');
    }
  });

  it('returns 401 when unauthenticated', async () => {
    authMock.auth.mockResolvedValue({});
    const result = await requireUser();
    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.status).toBe(401);
    }
  });
});

describe('requireOrgAccess', () => {
  it('returns 400 when orgSlug is missing', async () => {
    const result = await requireOrgAccess('user-1', { id: 'user-1', orgs: [] });
    expect(isError(result)).toBe(true);
    if (isError(result)) expect(result.status).toBe(400);
  });

  it('returns 403 when the slug is not in the session claims', async () => {
    const result = await requireOrgAccess('user-1', { id: 'user-1', orgs: [] }, 'nope');
    expect(isError(result)).toBe(true);
    if (isError(result)) expect(result.status).toBe(403);
  });
});

describe('readJsonBody', () => {
  const schema = z.object({ name: z.string().min(1) });

  it('returns 400 for malformed JSON', async () => {
    const request = { json: async () => Promise.reject(new Error('boom')) } as unknown as Request;
    const result = await readJsonBody(request, schema);
    expect(isError(result)).toBe(true);
    if (isError(result)) expect(result.status).toBe(400);
  });

  it('returns 400 with field errors when validation fails', async () => {
    const request = { json: async () => ({ name: '' }) } as unknown as Request;
    const result = await readJsonBody(request, schema, 'Invalid details');
    expect(isError(result)).toBe(true);
    if (isError(result)) {
      const body = await result.json();
      expect(body.error).toBe('Invalid details');
      expect(body.details).toBeDefined();
    }
  });

  it('returns the parsed payload when valid', async () => {
    const request = { json: async () => ({ name: 'ok' }) } as unknown as Request;
    const result = await readJsonBody(request, schema);
    expect(isError(result)).toBe(false);
    if (!isError(result)) expect(result).toEqual({ name: 'ok' });
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});
