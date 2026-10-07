import { describe, expect, it } from 'vitest';
import {
  announcementInput,
  audienceValue,
  messageInput,
  parseAudience,
  updateAnnouncementInput,
} from './schemas/communication';

const id = () => crypto.randomUUID();

describe('parseAudience', () => {
  it('reads the three school-wide audiences', () => {
    expect(parseAudience('all')).toEqual({ audience: 'all', classId: null });
    expect(parseAudience('teachers')).toEqual({ audience: 'teachers', classId: null });
    expect(parseAudience('students')).toEqual({ audience: 'students', classId: null });
  });
  it('reads a class audience with its id', () => {
    const c = id();
    expect(parseAudience(`class:${c}`)).toEqual({ audience: 'class', classId: c });
  });
  it('refuses anything else, including a class without a real id', () => {
    for (const v of ['', 'class', 'class:', 'class:abc', 'parents', 'ALL'])
      expect(parseAudience(v)).toBeNull();
  });
  it('round-trips with audienceValue', () => {
    const c = id();
    expect(audienceValue('class', c)).toBe(`class:${c}`);
    expect(audienceValue('all', null)).toBe('all');
    expect(parseAudience(audienceValue('class', c))?.classId).toBe(c);
  });
});

describe('announcementInput', () => {
  it('trims and turns the audience value into audience + class', () => {
    const c = id();
    const r = announcementInput.safeParse({
      audience: `class:${c}`,
      title: '  Sortie ',
      body: ' Texte ',
    });
    expect(r.success && r.data).toEqual({
      audience: { audience: 'class', classId: c },
      title: 'Sortie',
      body: 'Texte',
    });
  });
  it('reports i18n keys for a missing audience, title and body', () => {
    const r = announcementInput.safeParse({ audience: '', title: ' ', body: '' });
    expect(r.error?.issues.map((i) => i.message)).toEqual(['required', 'required', 'required']);
  });
  it('caps the title and the body', () => {
    expect(
      announcementInput.safeParse({ audience: 'all', title: 'x'.repeat(151), body: 'a' }).success,
    ).toBe(false);
    expect(
      announcementInput.safeParse({ audience: 'all', title: 'a', body: 'x'.repeat(8001) }).success,
    ).toBe(false);
  });
  it('updates carry an id and no audience', () => {
    expect(updateAnnouncementInput.safeParse({ id: id(), title: 'a', body: 'b' }).success).toBe(
      true,
    );
    expect(updateAnnouncementInput.safeParse({ id: 'nope', title: 'a', body: 'b' }).success).toBe(
      false,
    );
  });
});

describe('messageInput', () => {
  it('needs a recipient and a non-blank body', () => {
    expect(messageInput.safeParse({ recipientId: id(), body: ' Bonjour ' }).data?.body).toBe(
      'Bonjour',
    );
    expect(messageInput.safeParse({ recipientId: id(), body: '   ' }).success).toBe(false);
    expect(messageInput.safeParse({ recipientId: '', body: 'a' }).success).toBe(false);
  });
  it('caps the body', () => {
    expect(messageInput.safeParse({ recipientId: id(), body: 'x'.repeat(4001) }).success).toBe(
      false,
    );
  });
});
