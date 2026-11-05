import { describe, expect, it } from 'vitest';
import type { TadrissClient } from './client';
import { getStudentFile, searchPeople, searchWords } from './students';

describe('searchWords', () => {
  it('splits a typed name into words', () => {
    expect(searchWords('  Imane   Alaoui ')).toEqual(['Imane', 'Alaoui']);
  });

  it('keeps Arabic names and removes filter syntax', () => {
    expect(searchWords('إيمان,(علوي)')).toEqual(['إيمان', 'علوي']);
  });
});

// These paths must answer before any query runs, so a client that throws proves it.
const noClient = new Proxy(
  {},
  {
    get() {
      throw new Error('no query expected');
    },
  },
) as TadrissClient;

describe('searchPeople', () => {
  it('does not query for fewer than two characters', async () => {
    expect(await searchPeople(noClient, ' a ')).toEqual({ ok: true, data: [] });
  });
});

describe('getStudentFile', () => {
  it('treats a malformed id as not found instead of a database error', async () => {
    expect(await getStudentFile(noClient, 'not-a-uuid')).toEqual({ ok: false, error: 'not_found' });
  });
});
