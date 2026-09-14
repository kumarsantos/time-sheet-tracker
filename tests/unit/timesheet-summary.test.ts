import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/app/database', () => ({ db: dbMock }));

import type { DrizzleDB } from '@/app/database';
import { deriveTimesheetStatus, refreshTimesheetSummary } from '@/lib/timesheet-summary';

const dbExecutor = dbMock as unknown as DrizzleDB;

/** Builds the { select().from().innerJoin().where() } promise chain for the mocked db. */
function mockSelectResult(rows: Array<{ total: string | null }>) {
  dbMock.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(rows),
      }),
    }),
  });
}

describe('deriveTimesheetStatus', () => {
  it('marks the week COMPLETED when at or above the target', () => {
    expect(deriveTimesheetStatus('40.00', '40')).toBe('COMPLETED');
    expect(deriveTimesheetStatus('42', '40')).toBe('COMPLETED');
    expect(deriveTimesheetStatus(45, 40)).toBe('COMPLETED');
  });

  it('marks the week INCOMPLETE when below the target', () => {
    expect(deriveTimesheetStatus('39.99', '40')).toBe('INCOMPLETE');
    expect(deriveTimesheetStatus('0', '40')).toBe('INCOMPLETE');
  });

  it('defaults an invalid target to 40 hours', () => {
    expect(deriveTimesheetStatus('40', '')).toBe('COMPLETED');
    expect(deriveTimesheetStatus('40', 'abc')).toBe('COMPLETED');
    expect(deriveTimesheetStatus('39', 'abc')).toBe('INCOMPLETE');
  });
});

describe('refreshTimesheetSummary', () => {
  beforeEach(() => {
    dbMock.select.mockReset();
    dbMock.update.mockReset();
    dbMock.update.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });
  });

  it('persists the derived total and status for a completed week', async () => {
    mockSelectResult([{ total: '42.00' }]);

    const summary = await refreshTimesheetSummary(dbExecutor, 'ts-1', '40');

    expect(summary).toEqual({ totalHoursLogged: '42.00', status: 'COMPLETED' });
    expect(dbMock.update).toHaveBeenCalledWith(expect.anything());
  });

  it('treats a nullable total as zero and persists INCOMPLETE', async () => {
    mockSelectResult([{ total: null }]);

    const summary = await refreshTimesheetSummary(dbExecutor, 'ts-1', '40');

    expect(summary).toEqual({ totalHoursLogged: '0.00', status: 'INCOMPLETE' });
  });
});
