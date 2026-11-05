import { describe, expect, it } from 'vitest';
import {
  defaultModules,
  gradeScale,
  modulesFor,
  parseStudioQuery,
  sampleMarks,
  schoolTypes,
  statsFor,
  viewers,
} from './studio-profile';

describe('landing studio profile', () => {
  it('never shows fees to a teacher', () => {
    expect(modulesFor('teacher')).not.toContain('finance');
    expect(modulesFor('parent')).toContain('finance');
  });

  it('starts a centre on fees and a school on grades', () => {
    expect(defaultModules('support')).toEqual(['attendance', 'schedule', 'finance']);
    expect(defaultModules('lycee')).toContain('grades');
  });

  it('marks primary out of 10 and keeps every sample mark on its scale', () => {
    expect(gradeScale('primary')).toBe(10);
    for (const type of schoolTypes) {
      for (const mark of sampleMarks(type)) expect(mark).toBeLessThanOrEqual(gradeScale(type));
    }
  });

  it('gives every visitor three figures, with groups instead of classes in a centre', () => {
    for (const type of schoolTypes)
      for (const v of viewers) expect(statsFor(type, v)).toHaveLength(3);
    expect(statsFor('support', 'teacher').map((s) => s.key)).toContain('groups');
    expect(statsFor('lycee', 'teacher').map((s) => s.key)).toContain('classes');
  });

  it('reads a shared link and ignores values it does not know', () => {
    expect(parseStudioQuery('?type=support&role=parent')).toEqual({
      type: 'support',
      viewer: 'parent',
    });
    expect(parseStudioQuery('?type=university&role=super_admin')).toEqual({});
    expect(parseStudioQuery('')).toEqual({});
  });
});
