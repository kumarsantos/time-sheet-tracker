import { describe, expect, it } from 'vitest';
import { addWorkApiSchema, addWorkFormSchema } from '@/lib/validations/timesheet';

const baseForm = {
  projectId: 'project-1',
  typeOfWork: 'Development',
  description: 'Implented the dashboard',
  hours: '8',
};

describe('addWorkFormSchema', () => {
  it('accepts a valid payload', () => {
    expect(addWorkFormSchema.safeParse(baseForm).success).toBe(true);
  });

  it('rejects a missing project', () => {
    const { projectId: _projectId, ...rest } = baseForm;
    const result = addWorkFormSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects a missing description', () => {
    const { description: _description, ...rest } = baseForm;
    expect(addWorkFormSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing or empty hours', () => {
    for (const hours of ['', '0', '-1', '25', 'abc']) {
      expect(addWorkFormSchema.safeParse({ ...baseForm, hours }).success).toBe(false);
    }
  });

  it('accepts the hour boundaries 0.5 and 24', () => {
    expect(addWorkFormSchema.safeParse({ ...baseForm, hours: '0.5' }).success).toBe(true);
    expect(addWorkFormSchema.safeParse({ ...baseForm, hours: '24' }).success).toBe(true);
  });

  it('rejects an over-long type of work', () => {
    expect(addWorkFormSchema.safeParse({ ...baseForm, typeOfWork: 'x'.repeat(101) }).success).toBe(
      false,
    );
  });
});

describe('addWorkApiSchema', () => {
  it('coerces a numeric string into a number', () => {
    const result = addWorkApiSchema.safeParse({ ...baseForm, hours: '8' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hours).toBe(8);
    }
  });

  it('accepts a numeric hours value', () => {
    const result = addWorkApiSchema.safeParse({ ...baseForm, hours: 8 });
    expect(result.success).toBe(true);
  });

  it('rejects hours outside the allowed range', () => {
    for (const hours of [0, -5, 24.5, 100]) {
      expect(addWorkApiSchema.safeParse({ ...baseForm, hours }).success).toBe(false);
    }
  });
});
