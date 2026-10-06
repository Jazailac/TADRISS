import { describe, expect, it } from 'vitest';
import { fieldErrors, loginInput, signupInput } from './auth';

const validSignup = {
  institutionName: 'Groupe scolaire Al Manar',
  firstName: 'Salma',
  lastName: 'Benali',
  email: 'direction@almanar.ma',
  password: 'correct-horse',
};

describe('loginInput', () => {
  it('accepts and trims a valid login', () => {
    expect(loginInput.parse({ email: '  a@b.ma ', password: 'x' }).email).toBe('a@b.ma');
  });
  it('reports i18n keys, not prose', () => {
    const r = loginInput.safeParse({ email: '', password: '' });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(fieldErrors(r.error)).toEqual({ email: 'required', password: 'required' });
  });
  it('rejects a malformed email', () => {
    const r = loginInput.safeParse({ email: 'not-an-email', password: 'x' });
    if (!r.success) expect(fieldErrors(r.error).email).toBe('email');
    else throw new Error('should fail');
  });
});

describe('signupInput', () => {
  it('accepts a valid signup', () => {
    expect(signupInput.safeParse(validSignup).success).toBe(true);
  });
  it.each([
    ['password', 'short', 'passwordMin'],
    ['firstName', 'S', 'nameMin'],
    ['institutionName', '   ', 'required'],
    ['password', 'x'.repeat(73), 'tooLong'],
  ])('%s=%j → %s', (field, value, key) => {
    const r = signupInput.safeParse({ ...validSignup, [field]: value });
    if (r.success) throw new Error('should fail');
    expect(fieldErrors(r.error)[field]).toBe(key);
  });
});
