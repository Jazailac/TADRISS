import { describe, expect, it } from 'vitest';
import { invitationState, sanitizeSearch } from './people';
import { inviteInput, setPasswordInput } from './schemas/people';

describe('sanitizeSearch', () => {
  it('keeps names in any script', () => {
    expect(sanitizeSearch('  Amal   Ben Ali ')).toBe('Amal Ben Ali');
    expect(sanitizeSearch('أحمد التازي')).toBe('أحمد التازي');
    expect(sanitizeSearch("O'Brien-Éloïse")).toBe("O'Brien-Éloïse");
  });
  it('removes PostgREST filter syntax and ILIKE wildcards', () => {
    expect(sanitizeSearch('a,email.eq.x)')).toBe('a email.eq.x');
    expect(sanitizeSearch('100%_(x)')).toBe('100 x');
    expect(sanitizeSearch('a*b\\c')).toBe('a b c');
  });
  it('caps the length', () => {
    expect(sanitizeSearch('a'.repeat(500))).toHaveLength(80);
  });
});

describe('invitationState', () => {
  const now = new Date('2026-10-07T12:00:00Z');
  it('derives expired from a pending invitation past its expiry', () => {
    expect(invitationState({ status: 'pending', expires_at: '2026-10-08T00:00:00Z' }, now)).toBe(
      'pending',
    );
    expect(invitationState({ status: 'pending', expires_at: '2026-10-07T12:00:00Z' }, now)).toBe(
      'expired',
    );
  });
  it('never revives closed invitations', () => {
    expect(invitationState({ status: 'accepted', expires_at: '2020-01-01T00:00:00Z' }, now)).toBe(
      'accepted',
    );
    expect(invitationState({ status: 'revoked', expires_at: '2030-01-01T00:00:00Z' }, now)).toBe(
      'revoked',
    );
  });
});

describe('inviteInput', () => {
  const valid = { firstName: 'Amal', lastName: 'Tazi', email: ' Amal@Ecole.MA ', role: 'teacher' };
  it('trims and lowercases the email', () => {
    const r = inviteInput.safeParse(valid);
    expect(r.success && r.data.email).toBe('amal@ecole.ma');
  });
  it('refuses to invite admins', () => {
    expect(inviteInput.safeParse({ ...valid, role: 'institution_admin' }).success).toBe(false);
  });
  it('uses i18n keys as messages', () => {
    const r = inviteInput.safeParse({ ...valid, email: 'nope', firstName: 'A' });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message).sort()).toEqual(['email', 'nameMin']);
  });
});

describe('setPasswordInput', () => {
  it('requires matching confirmation', () => {
    const r = setPasswordInput.safeParse({ password: 'longenough1', confirm: 'different1' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ path: ['confirm'], message: 'passwordMismatch' });
  });
  it('accepts a matching 8+ character password', () => {
    expect(
      setPasswordInput.safeParse({ password: 'longenough1', confirm: 'longenough1' }).success,
    ).toBe(true);
  });
});
