'use server';

import {
  classInput,
  createClass,
  enrolStudents,
  err,
  fieldErrors,
  listEnrolableStudents,
  isSchoolYear,
  setClassArchived,
  setClassTeachers,
  updateClass,
  updateClassInput,
  withdrawStudent,
  type EnrolableStudent,
  type Result,
} from '@tadriss/shared';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { FormState } from '@/lib/form-state';
import { requireAdmin } from '@/lib/require-admin';

const echo = (fd: FormData, names: string[]) =>
  Object.fromEntries(
    names.map((n) => {
      const v = fd.get(n);
      return [n, typeof v === 'string' ? v : ''];
    }),
  );

const refresh = () => {
  revalidatePath('/[locale]/dashboard/classes', 'page');
  revalidatePath('/[locale]/dashboard/classes/[id]', 'page');
  revalidatePath('/[locale]/teacher/classes', 'page');
  revalidatePath('/[locale]/teacher/classes/[id]', 'page');
  revalidatePath('/[locale]/dashboard', 'page');
};

export async function createClassAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd, ['name', 'level', 'schoolYear', 'capacity']);
  const parsed = classInput.safeParse({
    name: fd.get('name'),
    level: fd.get('level'),
    schoolYear: fd.get('schoolYear'),
    capacity: fd.get('capacity'),
  });
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error, values };
  const res = await createClass(auth.data.supabase, auth.data.institutionId, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  // The new id lets the dialog open the class straight away.
  return { done: true, values: { id: res.data.id } };
}

export async function updateClassAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd, ['name', 'level', 'capacity']);
  const parsed = updateClassInput.safeParse({
    id: fd.get('id'),
    name: fd.get('name'),
    level: fd.get('level'),
    capacity: fd.get('capacity'),
  });
  if (!parsed.success) return { error: 'validation', fields: fieldErrors(parsed.error), values };

  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error, values };
  const res = await updateClass(auth.data.supabase, parsed.data);
  if (!res.ok) return { error: res.error, values };
  refresh();
  return { done: true };
}

const idInput = z.uuid();

export async function archiveClassAction(id: string, archived: boolean): Promise<Result<null>> {
  if (!idInput.safeParse(id).success) return err('validation');
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const res = await setClassArchived(auth.data.supabase, id, archived);
  if (res.ok) refresh();
  return res;
}

const idsInput = z.array(z.uuid()).max(200);

export async function enrolStudentsAction(
  classId: string,
  studentIds: string[],
): Promise<Result<{ enrolled: number; skipped: number }>> {
  if (!idInput.safeParse(classId).success || !idsInput.safeParse(studentIds).success)
    return err('validation');
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const res = await enrolStudents(auth.data.supabase, classId, studentIds);
  if (res.ok) refresh();
  return res;
}

export async function withdrawStudentAction(enrolmentId: string): Promise<Result<null>> {
  if (!idInput.safeParse(enrolmentId).success) return err('validation');
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const res = await withdrawStudent(auth.data.supabase, enrolmentId);
  if (res.ok) refresh();
  return res;
}

export async function setTeachersAction(
  classId: string,
  teacherIds: string[],
): Promise<Result<null>> {
  if (!idInput.safeParse(classId).success || !idsInput.safeParse(teacherIds).success)
    return err('validation');
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const res = await setClassTeachers(auth.data.supabase, classId, teacherIds);
  if (res.ok) refresh();
  return res;
}

/** Candidate list for the "add students" dialog (read-only, admin only). */
export async function searchEnrolableAction(
  schoolYear: string,
  q: string,
): Promise<Result<EnrolableStudent[]>> {
  if (!isSchoolYear(schoolYear)) return err('validation');
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  return listEnrolableStudents(auth.data.supabase, { schoolYear, q: q.slice(0, 80), limit: 50 });
}
