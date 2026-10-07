import { describe, expect, it } from 'vitest';
import { homeworkBucket } from './homework';
import { homeworkInput, updateHomeworkInput } from './schemas/homework';

const id = () => crypto.randomUUID();
const fields = () => ({
  subjectId: id(),
  title: '  Exercices 1 à 5  ',
  description: '',
  dueDate: '2026-10-09',
});
const valid = () => ({ classId: id(), ...fields() });

describe('homeworkInput', () => {
  it('trims the title and turns a blank description into null', () => {
    const r = homeworkInput.safeParse(valid());
    expect(r.success && r.data).toMatchObject({ title: 'Exercices 1 à 5', description: null });
  });
  it('keeps a real description', () => {
    const r = homeworkInput.safeParse({ ...valid(), description: ' une page ' });
    expect(r.success && r.data.description).toBe('une page');
  });
  it('rejects an empty title and an impossible date with i18n keys', () => {
    const r = homeworkInput.safeParse({ ...valid(), title: '  ', dueDate: '2026-02-30' });
    expect(r.error?.issues.map((i) => i.message).sort()).toEqual(['invalidDate', 'required']);
  });
  it('caps the title and the description', () => {
    expect(homeworkInput.safeParse({ ...valid(), title: 'x'.repeat(151) }).success).toBe(false);
    expect(homeworkInput.safeParse({ ...valid(), description: 'x'.repeat(4001) }).success).toBe(
      false,
    );
  });
  it('updates have an id and no class', () => {
    expect(updateHomeworkInput.safeParse({ ...fields(), id: id() }).success).toBe(true);
  });
});

describe('homeworkBucket', () => {
  const today = '2026-10-07';
  it('puts finished work in "done" whatever its date', () => {
    expect(homeworkBucket({ dueDate: '2026-09-01', doneCount: 1 }, today)).toBe('done');
    expect(homeworkBucket({ dueDate: '2026-12-01', doneCount: 1 }, today)).toBe('done');
  });
  it('is upcoming up to and including the due date, overdue after', () => {
    expect(homeworkBucket({ dueDate: '2026-10-07', doneCount: 0 }, today)).toBe('upcoming');
    expect(homeworkBucket({ dueDate: '2026-10-06', doneCount: 0 }, today)).toBe('overdue');
    expect(homeworkBucket({ dueDate: '2026-10-08', doneCount: 0 }, today)).toBe('upcoming');
  });
});
