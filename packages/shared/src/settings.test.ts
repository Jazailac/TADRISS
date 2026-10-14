import { describe, expect, it } from 'vitest';
import { roleModules, settingsInput, timezones } from './schemas/settings';

const valid = {
  name: 'Groupe scolaire Al Manar',
  defaultLocale: 'fr',
  timezone: 'Africa/Casablanca',
  phone: '',
  address: '',
  city: ' Casablanca ',
};

describe('settingsInput', () => {
  it('trims, and turns blank optional fields into null', () => {
    const r = settingsInput.safeParse(valid);
    expect(r.success && r.data).toMatchObject({ phone: null, address: null, city: 'Casablanca' });
  });
  it('requires a real name and a supported locale and time zone', () => {
    const r = settingsInput.safeParse({
      ...valid,
      name: ' a ',
      defaultLocale: 'de',
      timezone: 'Mars/Base',
    });
    expect(r.error?.issues.map((i) => i.message).sort()).toEqual([
      'nameMin',
      'required',
      'required',
    ]);
  });
  it('rejects a one-character phone number but accepts a short real one', () => {
    expect(settingsInput.safeParse({ ...valid, phone: '1' }).error?.issues[0]?.message).toBe(
      'tooShort',
    );
    expect(settingsInput.safeParse({ ...valid, phone: '0522' }).success).toBe(true);
  });
  it('caps address and city', () => {
    expect(settingsInput.safeParse({ ...valid, address: 'x'.repeat(201) }).success).toBe(false);
    expect(settingsInput.safeParse({ ...valid, city: 'x'.repeat(101) }).success).toBe(false);
  });
  it('offers Morocco’s time zone first', () => {
    expect(timezones[0]).toBe('Africa/Casablanca');
  });
});

describe('roleModules', () => {
  it('keeps role-only modules where they belong', () => {
    expect(roleModules.teacher).toContain('classes');
    expect(roleModules.student).not.toContain('classes');
    expect(roleModules.student).toContain('payments');
    expect(roleModules.teacher).not.toContain('payments');
  });
});
