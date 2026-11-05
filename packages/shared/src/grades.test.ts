import { describe, expect, it } from 'vitest';
import { toErrorCode } from './result';
import {
  examInput,
  mention,
  normalise20,
  overallAverage,
  parseScore,
  saveGradesInput,
  subjectAverages,
  updateExamInput,
  weightedAverage20,
  type MarkForAverage,
} from './schemas/grades';

const id = () => crypto.randomUUID();

describe('parseScore', () => {
  it.each([
    ['15', 15],
    ['15.5', 15.5],
    ['15,5', 15.5],
    [' 7,25 ', 7.25],
    ['0', 0],
  ])('reads %s', (input, value) => {
    expect(parseScore(input)).toEqual({ ok: true, value });
  });
  it('treats a blank as "no mark yet"', () => {
    expect(parseScore('')).toEqual({ ok: true, value: null });
    expect(parseScore('   ')).toEqual({ ok: true, value: null });
  });
  it.each(['abc', '1.234', '-3', '15,5,5', '1e3', '15 /20', '1000'])('refuses %s', (input) => {
    expect(parseScore(input)).toEqual({ ok: false });
  });
});

describe('averages', () => {
  const m = (
    subjectId: string,
    score: number | null,
    maxScore: number,
    coefficient: number,
    absent = false,
  ): MarkForAverage => ({
    subjectId,
    score,
    maxScore,
    coefficient,
    absent,
  });
  it('normalises every mark to /20', () => {
    expect(normalise20(7, 10)).toBe(14);
    expect(normalise20(15, 20)).toBe(15);
    expect(normalise20(3, 5)).toBe(12);
  });
  it('weights by coefficient: (10×2 + 16×1) / 3', () => {
    expect(weightedAverage20([m('a', 10, 20, 2), m('a', 16, 20, 1)])).toBe(12);
  });
  it('mixes maxima fairly: 7/10 and 14/20 are the same', () => {
    expect(weightedAverage20([m('a', 7, 10, 1), m('a', 14, 20, 1)])).toBe(14);
  });
  it('leaves absent and blank marks out of both the total and the weights', () => {
    expect(
      weightedAverage20([m('a', 10, 20, 1), m('a', null, 20, 5, true), m('a', null, 20, 5)]),
    ).toBe(10);
  });
  it('is null when nothing counts', () => {
    expect(weightedAverage20([])).toBeNull();
    expect(weightedAverage20([m('a', null, 20, 1, true)])).toBeNull();
  });
  it('rounds to two decimals', () => {
    expect(weightedAverage20([m('a', 10, 20, 1), m('a', 11, 20, 1), m('a', 11, 20, 1)])).toBe(
      10.67,
    );
  });
  it('averages per subject, then equally across subjects for the general average', () => {
    const marks = [m('maths', 10, 20, 1), m('maths', 14, 20, 1), m('fr', 18, 20, 1)];
    expect([...subjectAverages(marks)]).toEqual([
      ['maths', 12],
      ['fr', 18],
    ]);
    // Not weighted by the number of exams: (12 + 18) / 2.
    expect(overallAverage(marks)).toBe(15);
  });
  it('skips subjects with no counted mark in the general average', () => {
    expect(overallAverage([m('maths', 12, 20, 1), m('fr', null, 20, 1, true)])).toBe(12);
    expect(overallAverage([])).toBeNull();
  });
});

describe('mention', () => {
  it.each([
    [16, 'tresBien'],
    [15.99, 'bien'],
    [14, 'bien'],
    [12, 'assezBien'],
    [10, 'passable'],
    [9.99, 'insuffisant'],
    [0, 'insuffisant'],
  ])('%s → %s', (avg, expected) => {
    expect(mention(avg)).toBe(expected);
  });
});

describe('examInput', () => {
  const fields = () => ({
    subjectId: id(),
    title: ' Contrôle 1 ',
    examDate: '2026-10-05',
    maxScore: '20',
    coefficient: '1,5',
    term: '2',
  });
  it('parses form strings, including a decimal comma', () => {
    const r = examInput.safeParse({ classId: id(), ...fields() });
    expect(r.success && r.data).toMatchObject({
      title: 'Contrôle 1',
      maxScore: 20,
      coefficient: 1.5,
      term: 2,
    });
  });
  it.each([
    ['maxScore', '0'],
    ['maxScore', '101'],
    ['maxScore', 'x'],
    ['coefficient', '0.4'],
    ['coefficient', '11'],
    ['coefficient', '1.3'],
  ])('rejects %s = %s', (field, value) => {
    expect(examInput.safeParse({ classId: id(), ...fields(), [field]: value }).success).toBe(false);
  });
  it('uses i18n keys for messages', () => {
    const r = examInput.safeParse({ classId: id(), ...fields(), maxScore: '0', coefficient: '11' });
    expect(r.error?.issues.map((i) => i.message).sort()).toEqual([
      'coefficientRange',
      'maxScoreRange',
    ]);
  });
  it('rejects a term other than 1 or 2', () => {
    expect(examInput.safeParse({ classId: id(), ...fields(), term: '3' }).success).toBe(false);
  });
  it('updates have an id and no class', () => {
    expect(updateExamInput.safeParse({ id: id(), ...fields() }).success).toBe(true);
  });
});

describe('saveGradesInput', () => {
  it('trims remarks and nulls blank ones', () => {
    const r = saveGradesInput.safeParse({
      examId: id(),
      grades: [
        { studentId: id(), score: 14, absent: false, remark: '  bien  ' },
        { studentId: id(), score: null, absent: true, remark: '' },
      ],
    });
    expect(r.success && r.data.grades.map((g) => g.remark)).toEqual(['bien', null]);
  });
  it('rejects marks outside 0-100', () => {
    expect(
      saveGradesInput.safeParse({
        examId: id(),
        grades: [{ studentId: id(), score: -1, absent: false }],
      }).success,
    ).toBe(false);
  });
});

describe('toErrorCode (grades)', () => {
  it('maps the trigger and RPC exceptions', () => {
    expect(toErrorCode({ code: 'P0001', message: 'score_out_of_range' })).toBe(
      'score_out_of_range',
    );
    expect(toErrorCode({ code: 'P0001', message: 'not_your_exam' })).toBe('not_your_exam');
    expect(toErrorCode({ code: 'P0002', message: 'exam_not_found' })).toBe('not_found');
  });
});
