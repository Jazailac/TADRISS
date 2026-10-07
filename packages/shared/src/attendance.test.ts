import { describe, expect, it } from 'vitest';
import { attendanceRate, countStatuses, emptyCounts } from './attendance';
import { addDays, utcDate, isIsoDate, todayIn, weekdayOf } from './dates';
import { toErrorCode } from './result';
import { submitAttendanceInput } from './schemas/attendance';

describe('dates', () => {
  it('validates real calendar days only', () => {
    expect(isIsoDate('2026-10-07')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-1-7')).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });
  it('computes ISO weekdays without time-zone drift', () => {
    expect(weekdayOf('2026-10-05')).toBe(1); // Monday
    expect(weekdayOf('2026-10-10')).toBe(6); // Saturday
    expect(weekdayOf('2026-10-11')).toBe(7); // Sunday
  });
  it('adds days across month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it("uses the school's calendar day, not UTC's", () => {
    // 23:30 UTC on 6 Oct is already 7 Oct in Casablanca (UTC+1).
    const instant = new Date('2026-10-06T23:30:00Z');
    expect(todayIn('Africa/Casablanca', instant)).toBe('2026-10-07');
    expect(todayIn('UTC', instant)).toBe('2026-10-06');
  });
  it('formats as the same calendar day when rendered in UTC', () => {
    const d = utcDate('2026-10-07');
    expect(new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(d)).toBe('2026-10-07');
    expect(new Intl.DateTimeFormat('en', { timeZone: 'UTC', weekday: 'long' }).format(d)).toBe(
      'Wednesday',
    );
  });
});

describe('attendanceRate', () => {
  it('counts late as attended and excused as neutral', () => {
    expect(attendanceRate({ present: 8, late: 1, absent: 1, excused: 5 })).toBe(90);
  });
  it('is null when nothing counts', () => {
    expect(attendanceRate(emptyCounts())).toBeNull();
    expect(attendanceRate({ present: 0, late: 0, absent: 0, excused: 3 })).toBeNull();
  });
  it('is 0 for a student who was never there', () => {
    expect(attendanceRate({ present: 0, late: 0, absent: 4, excused: 0 })).toBe(0);
  });
});

describe('countStatuses', () => {
  it('tallies each status', () => {
    expect(
      countStatuses([
        { status: 'present' },
        { status: 'late' },
        { status: 'present' },
        { status: 'absent' },
      ]),
    ).toEqual({ present: 2, late: 1, absent: 1, excused: 0 });
  });
});

describe('submitAttendanceInput', () => {
  const id = () => crypto.randomUUID();
  const valid = () => ({
    slotId: id(),
    date: '2026-10-05',
    records: [
      { studentId: id(), status: 'late', note: '  bus  ' },
      { studentId: id(), status: 'present' },
    ],
  });
  it('trims notes and turns blanks into null', () => {
    const r = submitAttendanceInput.safeParse(valid());
    expect(r.success && r.data.records.map((x) => x.note)).toEqual(['bus', null]);
  });
  it('rejects an unknown status and an impossible date', () => {
    const v = valid();
    expect(
      submitAttendanceInput.safeParse({ ...v, records: [{ studentId: id(), status: 'sick' }] })
        .success,
    ).toBe(false);
    expect(submitAttendanceInput.safeParse({ ...v, date: '2026-02-30' }).success).toBe(false);
  });
});

describe('toErrorCode (attendance)', () => {
  it('maps the RPC exceptions', () => {
    expect(toErrorCode({ code: 'P0001', message: 'future_date' })).toBe('future_date');
    expect(toErrorCode({ code: 'P0001', message: 'too_old' })).toBe('too_old');
    expect(toErrorCode({ code: 'P0001', message: 'not_your_lesson' })).toBe('not_your_lesson');
    expect(toErrorCode({ code: 'P0001', message: 'student_not_in_class' })).toBe(
      'student_not_in_class',
    );
    expect(toErrorCode({ code: '22023', message: 'wrong_weekday' })).toBe('wrong_weekday');
    expect(toErrorCode({ code: '22023', message: 'other' })).toBe('validation');
    expect(toErrorCode({ code: 'P0002', message: 'lesson_not_found' })).toBe('not_found');
  });
});
