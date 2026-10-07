import type { Role } from '@tadriss/shared';

/** The URL area a communication page is mounted in; it follows the viewer's role. */
export type Area = 'dashboard' | 'teacher' | 'student';

export const areaOf = (role: Role): Area | null =>
  role === 'institution_admin'
    ? 'dashboard'
    : role === 'teacher'
      ? 'teacher'
      : role === 'student'
        ? 'student'
        : null;

export const areaBase = (area: Area) => `/${area}`;
