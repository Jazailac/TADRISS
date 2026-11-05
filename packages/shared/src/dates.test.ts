import { describe, expect, it } from 'vitest';
import { minuteOfDayIn } from './dates';

describe('minuteOfDayIn', () => {
  const at = new Date('2026-11-05T08:30:00Z');

  it('reads the clock in the school’s time zone, not the server’s', () => {
    expect(minuteOfDayIn('UTC', at)).toBe(510);
    expect(minuteOfDayIn('Asia/Tokyo', at)).toBe(17 * 60 + 30);
  });

  it('treats midnight as minute zero', () => {
    expect(minuteOfDayIn('UTC', new Date('2026-11-05T00:00:00Z'))).toBe(0);
  });
});
