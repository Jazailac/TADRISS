import type { Module } from './workflow-preview';

/**
 * What the landing preview shows for a kind of school and a viewer. Every value here is fictitious
 * sample data; the rules (which role sees which module, how marks are scaled) follow the product.
 */
export const schoolTypes = ['primary', 'college', 'lycee', 'support'] as const;
export type SchoolType = (typeof schoolTypes)[number];
export const viewers = ['admin', 'teacher', 'parent', 'student'] as const;
export type Viewer = (typeof viewers)[number];
export const allModules: Module[] = ['attendance', 'grades', 'schedule', 'finance'];

export const kindOf = (type: SchoolType) => (type === 'support' ? 'centre' : 'school');

/** Teachers never see fees; everyone else sees every module. */
export function modulesFor(viewer: Viewer): Module[] {
  return viewer === 'teacher' ? allModules.filter((m) => m !== 'finance') : allModules;
}

/** What a school of this type usually starts with, until the visitor picks for themselves. */
export function defaultModules(type: SchoolType): Module[] {
  return type === 'support'
    ? ['attendance', 'schedule', 'finance']
    : ['attendance', 'grades', 'schedule'];
}

/** Moroccan primary schools mark out of 10, collège and lycée out of 20. */
export const gradeScale = (type: SchoolType) => (type === 'primary' ? 10 : 20);

const fee: Record<SchoolType, number> = {
  primary: 140000,
  college: 160000,
  lycee: 180000,
  support: 45000,
};
export const monthlyFee = (type: SchoolType) => fee[type];

/** Three sample marks, on the type's scale. */
export const sampleMarks = (type: SchoolType) =>
  gradeScale(type) === 10 ? [8, 7.5, 9] : [16, 14.5, 18];

export type StatKey =
  | 'attendance'
  | 'students'
  | 'collectedToday'
  | 'lessonsToday'
  | 'rollCalls'
  | 'classes'
  | 'groups'
  | 'average'
  | 'due'
  | 'nextLesson'
  | 'homework';

export type StatValue =
  | { kind: 'percent'; value: number }
  | { kind: 'count'; value: number }
  | { kind: 'money'; centimes: number }
  | { kind: 'mark'; value: number; outOf: number }
  | { kind: 'time'; hour: number };

export interface Stat {
  key: StatKey;
  value: StatValue;
}

const pick = <T>(type: SchoolType, values: Record<SchoolType, T>) => values[type];

/** The three figures across the bottom of the preview, as this viewer would see them. */
export function statsFor(type: SchoolType, viewer: Viewer): [Stat, Stat, Stat] {
  const average: Stat = {
    key: 'average',
    value: {
      kind: 'mark',
      value: pick(type, { primary: 8.6, college: 15.2, lycee: 14.8, support: 13.5 }),
      outOf: gradeScale(type),
    },
  };
  switch (viewer) {
    case 'admin':
      return [
        {
          key: 'attendance',
          value: {
            kind: 'percent',
            value: pick(type, { primary: 0.97, college: 0.95, lycee: 0.93, support: 0.91 }),
          },
        },
        {
          key: 'students',
          value: {
            kind: 'count',
            value: pick(type, { primary: 240, college: 310, lycee: 420, support: 86 }),
          },
        },
        {
          key: 'collectedToday',
          value: { kind: 'money', centimes: monthlyFee(type) * (type === 'support' ? 6 : 4) },
        },
      ];
    case 'teacher':
      return [
        {
          key: 'lessonsToday',
          value: {
            kind: 'count',
            value: pick(type, { primary: 5, college: 4, lycee: 3, support: 3 }),
          },
        },
        { key: 'rollCalls', value: { kind: 'count', value: 1 } },
        {
          key: type === 'support' ? 'groups' : 'classes',
          value: {
            kind: 'count',
            value: pick(type, { primary: 1, college: 6, lycee: 5, support: 4 }),
          },
        },
      ];
    case 'parent':
      return [
        { key: 'attendance', value: { kind: 'percent', value: 0.98 } },
        average,
        { key: 'due', value: { kind: 'money', centimes: monthlyFee(type) } },
      ];
    case 'student':
      return [
        {
          key: 'nextLesson',
          value: { kind: 'time', hour: type === 'support' ? 18 : 10 },
        },
        average,
        {
          key: 'homework',
          value: {
            kind: 'count',
            value: pick(type, { primary: 3, college: 2, lycee: 2, support: 1 }),
          },
        },
      ];
  }
}

/** Sample lesson times: centres teach after school and on Saturday mornings. */
export function lessonTimes(type: SchoolType): Date[] {
  return type === 'support'
    ? [Date.UTC(2026, 9, 5, 17), Date.UTC(2026, 9, 7, 18, 30), Date.UTC(2026, 9, 10, 10)].map(
        (t) => new Date(t),
      )
    : [0, 1, 2].map((i) => new Date(Date.UTC(2026, 9, 5 + i, 8 + i)));
}

/** Reads `?type=support&role=parent`, so a link can open the preview on a given visitor. */
export function parseStudioQuery(search: string): { type?: SchoolType; viewer?: Viewer } {
  const params = new URLSearchParams(search);
  const type = schoolTypes.find((t) => t === params.get('type'));
  const viewer = viewers.find((v) => v === params.get('role'));
  return { ...(type ? { type } : {}), ...(viewer ? { viewer } : {}) };
}
