import { describe, expect, it } from 'vitest';
import { toErrorCode } from './result';
import {
  minutesToTime,
  slotInput,
  subjectInput,
  timeToMinutes,
  updateSlotInput,
} from './schemas/schedule';

const id = () => crypto.randomUUID();
const fields = () => ({
  subjectId: id(),
  teacherId: id(),
  weekday: '2',
  start: '08:30',
  end: '09:30',
  room: ' A1 ',
});
const base = () => ({ classId: id(), ...fields() });

describe('time helpers', () => {
  it('round-trips HH:MM and minutes', () => {
    expect(timeToMinutes('08:30')).toBe(510);
    expect(minutesToTime(510)).toBe('08:30');
    expect(minutesToTime(timeToMinutes('17:05'))).toBe('17:05');
  });
});

describe('slotInput', () => {
  it('parses form strings into minutes and a weekday number', () => {
    const r = slotInput.safeParse(base());
    expect(r.success && r.data).toMatchObject({ weekday: 2, start: 510, end: 570, room: 'A1' });
  });
  it('treats a blank room as none', () => {
    const r = slotInput.safeParse({ ...base(), room: '' });
    expect(r.success && r.data.room).toBeNull();
  });
  it('requires the end after the start, reporting on the end field', () => {
    const r = slotInput.safeParse({ ...base(), start: '10:00', end: '10:00' });
    expect(r.error?.issues[0]).toMatchObject({ path: ['end'], message: 'timeOrder' });
  });
  it.each(['8:30', '24:00', '08:60', 'abc'])('rejects the time %s', (start) => {
    const r = slotInput.safeParse({ ...base(), start });
    expect(r.error?.issues.some((i) => i.message === 'invalidTime')).toBe(true);
  });
  it('keeps lessons between 06:00 and 22:00', () => {
    expect(slotInput.safeParse({ ...base(), start: '05:00', end: '06:30' }).success).toBe(false);
    expect(slotInput.safeParse({ ...base(), start: '21:00', end: '22:30' }).success).toBe(false);
  });
  it.each(['0', '7', 'x'])('rejects weekday %s', (weekday) => {
    expect(slotInput.safeParse({ ...base(), weekday }).success).toBe(false);
  });
  it('updates need an id and no class', () => {
    expect(updateSlotInput.safeParse({ ...fields(), id: id() }).success).toBe(true);
  });
});

describe('subjectInput', () => {
  it('only accepts token colour names', () => {
    expect(subjectInput.safeParse({ name: 'Maths', color: 'info' }).success).toBe(true);
    expect(subjectInput.safeParse({ name: 'Maths', color: '#ff0000' }).success).toBe(false);
  });
});

describe('toErrorCode (timetable)', () => {
  it('tells class and teacher overlaps apart', () => {
    expect(
      toErrorCode({ code: '23P01', message: 'violates "timetable_slots_class_no_overlap"' }),
    ).toBe('slot_class_busy');
    expect(
      toErrorCode({ code: '23P01', message: 'violates "timetable_slots_teacher_no_overlap"' }),
    ).toBe('slot_teacher_busy');
    expect(toErrorCode({ code: '23P01', message: 'something else' })).toBe('conflict');
  });
});
