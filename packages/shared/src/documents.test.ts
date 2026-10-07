import { describe, expect, it } from 'vitest';
import { formatBytes } from './documents';
import {
  documentInput,
  documentLimits,
  documentMime,
  storageFileName,
  validateDocumentFile,
} from './schemas/documents';

describe('documentMime', () => {
  it('trusts an allowed browser type', () => {
    expect(documentMime('x.bin', 'application/pdf')).toBe('application/pdf');
  });
  it('falls back to the extension when the browser gives nothing useful', () => {
    expect(documentMime('Cours.PDF', '')).toBe('application/pdf');
    expect(documentMime('tableau.xlsx', 'application/octet-stream')).toContain('spreadsheetml');
  });
  it('refuses a type that is not on the list, whatever the extension says', () => {
    expect(documentMime('a.pdf', 'text/html')).toBeNull();
    expect(documentMime('virus.exe', '')).toBeNull();
    expect(documentMime('noextension', '')).toBeNull();
  });
});

describe('validateDocumentFile', () => {
  const ok = { name: 'a.pdf', size: 1000, type: 'application/pdf' };
  it('accepts a normal file, including exactly the limit', () => {
    expect(validateDocumentFile(ok)).toBeNull();
    expect(validateDocumentFile({ ...ok, size: documentLimits.maxBytes })).toBeNull();
  });
  it('rejects an empty, an oversized and a wrong-type file with i18n keys', () => {
    expect(validateDocumentFile({ ...ok, size: 0 })).toBe('fileRequired');
    expect(validateDocumentFile({ ...ok, size: documentLimits.maxBytes + 1 })).toBe('fileTooLarge');
    expect(validateDocumentFile({ name: 'a.exe', size: 5, type: '' })).toBe('fileType');
  });
});

describe('storageFileName', () => {
  it('makes an ASCII slug and keeps the extension', () => {
    expect(storageFileName('Règlement intérieur 2026.PDF')).toBe('Reglement-interieur-2026.pdf');
    expect(storageFileName('../../etc/passwd.txt')).toBe('etc-passwd.txt');
  });
  it('survives names with nothing usable in them', () => {
    expect(storageFileName('درس.pdf')).toBe('document.pdf');
    expect(storageFileName('')).toBe('document');
  });
  it('caps very long names', () => {
    expect(storageFileName(`${'a'.repeat(300)}.pdf`).length).toBeLessThanOrEqual(84);
  });
});

describe('documentInput', () => {
  it('reads audience and trims text, blank description becomes null', () => {
    const r = documentInput.safeParse({
      audience: 'teachers',
      title: ' Circulaire ',
      description: ' ',
    });
    expect(r.success && r.data).toMatchObject({
      audience: { audience: 'teachers', classId: null },
      title: 'Circulaire',
      description: null,
    });
  });
  it('requires an audience and a title', () => {
    const r = documentInput.safeParse({ audience: '', title: '' });
    expect(r.error?.issues.map((i) => i.message)).toEqual(['required', 'required']);
  });
});

describe('formatBytes', () => {
  const units = { b: 'o', kb: 'Ko', mb: 'Mo' };
  const nf = new Intl.NumberFormat('fr');
  it('picks the unit', () => {
    expect(formatBytes(512, units, nf)).toBe('512 o');
    expect(formatBytes(2048, units, nf)).toBe('2 Ko');
    expect(formatBytes(1.5 * 1024 * 1024, units, nf)).toContain('Mo');
  });
});
