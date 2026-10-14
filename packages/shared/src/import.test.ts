import { describe, expect, it } from 'vitest';
import { parseMembersCsv } from './import';

describe('parseMembersCsv', () => {
  it('reads French headers, ; separators and role words', () => {
    const r = parseMembersCsv(
      'prénom;nom;email;rôle\nSara;Alami;SARA@x.ma;élève\nOmar;Idrissi;o@x.ma;parent',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]?.result).toEqual({
      ok: true,
      data: { firstName: 'Sara', lastName: 'Alami', email: 'sara@x.ma', role: 'student' },
    });
    expect(r.rows[1]?.line).toBe(3);
  });
  it('flags bad rows and repeated emails without dropping them', () => {
    const r = parseMembersCsv(
      'first_name,last_name,email,role\nA,B,not-an-email,student\nSara,Alami,s@x.ma,student\nSara,Alami,S@x.ma,student\nX,Y,y@x.ma,principal',
    );
    if (!r.ok) throw new Error('parse');
    expect(r.rows.map((x) => (x.result.ok ? 'ok' : x.result.error))).toEqual([
      'validation',
      'ok',
      'duplicate',
      'validation',
    ]);
  });
  it('supports quoted cells and a BOM', () => {
    const r = parseMembersCsv('\uFEFFfirst_name,last_name,email,role\n"Ben, Ali",Amrani,b@x.ma,teacher');
    if (!r.ok) throw new Error('parse');
    expect(r.rows[0]?.values.firstName).toBe('Ben, Ali');
  });
  it('refuses a file without the needed columns or rows', () => {
    expect(parseMembersCsv('')).toEqual({ ok: false, error: 'empty' });
    expect(parseMembersCsv('a,b\n1,2')).toEqual({ ok: false, error: 'columns' });
  });
});
