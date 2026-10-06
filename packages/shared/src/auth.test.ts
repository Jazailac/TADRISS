import { describe, expect, it } from 'vitest';
import { areaFor, authErrorCode, homePath, readClaims, roles } from './auth';

describe('readClaims', () => {
  it('reads role and institution from hook claims', () => {
    expect(
      readClaims({
        sub: 'u1',
        user_role: 'teacher',
        institution_id: '10000000-0000-4000-8000-000000000001',
      }),
    ).toEqual({
      userId: 'u1',
      role: 'teacher',
      institutionId: '10000000-0000-4000-8000-000000000001',
    });
  });
  it('treats missing claims as no role (deactivated / unprovisioned)', () => {
    expect(readClaims({ sub: 'u1' })).toEqual({ userId: 'u1', role: null, institutionId: null });
  });
  it('rejects unknown roles instead of trusting them', () => {
    expect(readClaims({ sub: 'u1', user_role: 'owner' })).toBeNull();
  });
  it('rejects garbage', () => {
    expect(readClaims(null)).toBeNull();
  });
});

describe('areaFor', () => {
  it.each([
    ['/dashboard', 'institution_admin'],
    ['/dashboard/students', 'institution_admin'],
    ['/teacher', 'teacher'],
    ['/student/grades', 'student'],
    ['/admin', 'super_admin'],
    ['/', null],
    ['/login', null],
    ['/dashboards', null],
    ['/teachers', null],
  ] as const)('%s → %s', (path, role) => {
    expect(areaFor(path)).toBe(role);
  });

  it('every role has a protected home', () => {
    for (const r of roles) expect(areaFor(homePath[r])).toBe(r);
  });
});

describe('authErrorCode', () => {
  it.each([
    [{ code: 'invalid_credentials' }, 'invalid_credentials'],
    [{ code: 'email_exists' }, 'email_taken'],
    [{ code: 'user_already_exists' }, 'email_taken'],
    [{ code: 'email_not_confirmed' }, 'email_not_confirmed'],
    [{ code: 'weak_password' }, 'validation'],
    [{ code: 'something_new', status: 429 }, 'rate_limited'],
    [{ code: 'something_new' }, 'unknown'],
  ] as const)('%j → %s', (e, expected) => {
    expect(authErrorCode(e)).toBe(expected);
  });
});
