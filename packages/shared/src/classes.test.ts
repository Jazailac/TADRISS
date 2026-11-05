import { describe, expect, it } from 'vitest';
import { toErrorCode } from './result';
import {
  classInput,
  currentSchoolYear,
  isSchoolYear,
  schoolYearOptions,
  updateClassInput,
} from './schemas/classes';

describe('school years', () => {
  it('starts a new year in September', () => {
    expect(currentSchoolYear(new Date(2026, 7, 31))).toBe('2025-2026'); // 31 Aug
    expect(currentSchoolYear(new Date(2026, 8, 1))).toBe('2026-2027'); // 1 Sep
    expect(currentSchoolYear(new Date(2027, 0, 15))).toBe('2026-2027');
  });
  it('offers previous, current and next', () => {
    expect(schoolYearOptions(new Date(2026, 9, 7))).toEqual([
      '2025-2026',
      '2026-2027',
      '2027-2028',
    ]);
  });
  it('accepts only consecutive years', () => {
    expect(isSchoolYear('2026-2027')).toBe(true);
    expect(isSchoolYear('2026-2028')).toBe(false);
    expect(isSchoolYear('2026')).toBe(false);
    expect(isSchoolYear(undefined)).toBe(false);
  });
});

describe('classInput', () => {
  const base = { name: ' 6ème A ', level: '', schoolYear: '2026-2027', capacity: '' };
  it('trims, and turns blank optional fields into null', () => {
    const r = classInput.safeParse(base);
    expect(r.success && r.data).toEqual({
      name: '6ème A',
      level: null,
      schoolYear: '2026-2027',
      capacity: null,
    });
  });
  it('parses capacity from a form string', () => {
    const r = classInput.safeParse({ ...base, capacity: '30' });
    expect(r.success && r.data.capacity).toBe(30);
  });
  it.each(['0', '201', '2.5', 'abc'])('rejects capacity %s with a key', (capacity) => {
    const r = classInput.safeParse({ ...base, capacity });
    expect(r.error?.issues[0]?.message).toBe('capacityRange');
  });
  it('rejects a blank name and a bad year with i18n keys', () => {
    const r = classInput.safeParse({ ...base, name: '  ', schoolYear: '2026-2030' });
    expect(r.error?.issues.map((i) => i.message).sort()).toEqual(['invalidYear', 'required']);
  });
  it('has no school year on update (it is immutable)', () => {
    const r = updateClassInput.safeParse({ ...base, id: crypto.randomUUID(), schoolYear: 'x' });
    expect(r.success && 'schoolYear' in r.data).toBe(false);
  });
});

describe('toErrorCode (class rules)', () => {
  it('maps trigger exceptions by message', () => {
    expect(toErrorCode({ code: 'P0001', message: 'class_full' })).toBe('class_full');
    expect(toErrorCode({ code: 'P0001', message: 'class_archived' })).toBe('class_archived');
    expect(toErrorCode({ code: 'P0001', message: 'something else' })).toBe('unknown');
    expect(toErrorCode({ code: 'P0002', message: 'class_not_found' })).toBe('not_found');
  });
});
