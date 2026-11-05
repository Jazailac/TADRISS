import { z } from 'zod';
import type { TadrissClient } from './client';
import type { Relationship } from './guardians';
import { sanitizeSearch } from './people';
import { err, ok, toErrorCode, type Result } from './result';
import { currentSchoolYear } from './schemas/classes';

export type StudentFile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  isActive: boolean;
  /** Added by the school, but has not accepted the invitation yet. */
  invited: boolean;
  classes: { id: string; name: string; level: string | null; enrolledOn: string }[];
  parents: { id: string; name: string; email: string | null; relationship: Relationship }[];
};

/** Who a student is: their active classes and linked parents (administration; RLS scopes it). */
export async function getStudentFile(
  client: TadrissClient,
  studentId: string,
): Promise<Result<StudentFile>> {
  if (!z.uuid().safeParse(studentId).success) return err('not_found');
  const [person, enrolments, links] = await Promise.all([
    client
      .from('profiles')
      .select('id, first_name, last_name, email, is_active, role')
      .eq('id', studentId)
      .is('deleted_at', null)
      .maybeSingle(),
    client
      .from('enrolments')
      .select(
        'enrolled_on, class:classes!enrolments_class_id_institution_id_fkey(id, name, level, deleted_at)',
      )
      .eq('student_id', studentId)
      .eq('status', 'active')
      .eq('school_year', currentSchoolYear())
      .order('enrolled_on', { ascending: false }),
    client.from('guardianships').select('parent_id, relationship').eq('student_id', studentId),
  ]);
  if (person.error) return err(toErrorCode(person.error));
  if (!person.data || person.data.role !== 'student') return err('not_found');
  if (enrolments.error) return err(toErrorCode(enrolments.error));
  if (links.error) return err(toErrorCode(links.error));

  const parentIds = links.data.map((link) => link.parent_id);
  const parents =
    parentIds.length > 0
      ? await client.from('profiles').select('id, first_name, last_name, email').in('id', parentIds)
      : { data: [], error: null };
  if (parents.error) return err(toErrorCode(parents.error));
  const email = person.data.email;
  const invitation = email
    ? await client
        .from('invitations')
        .select('id')
        .eq('status', 'pending')
        .eq('email', email)
        .limit(1)
    : { data: [], error: null };
  if (invitation.error) return err(toErrorCode(invitation.error));
  const relationshipOf = new Map(links.data.map((link) => [link.parent_id, link.relationship]));

  return ok({
    id: person.data.id,
    firstName: person.data.first_name,
    lastName: person.data.last_name,
    email: person.data.email,
    isActive: person.data.is_active,
    invited: invitation.data.length > 0,
    // An archived class keeps its enrolments as history, but is not a current class.
    classes: enrolments.data
      .filter((e) => e.class.deleted_at === null)
      .map((e) => ({
        id: e.class.id,
        name: e.class.name,
        level: e.class.level,
        enrolledOn: e.enrolled_on,
      })),
    parents: parents.data.map((p) => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      email: p.email,
      relationship: (relationshipOf.get(p.id) ?? 'parent') as Relationship,
    })),
  });
}

export type PersonHit = {
  id: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'parent';
};

/** Search words: every word must match, so "Imane Alaoui" finds her whichever order is typed. */
export function searchWords(q: string): string[] {
  return sanitizeSearch(q).split(' ').filter(Boolean);
}

/** The school's people matching a typed name or email (administration; RLS scopes it). */
export async function searchPeople(
  client: TadrissClient,
  q: string,
  limit = 6,
): Promise<Result<PersonHit[]>> {
  const words = searchWords(q);
  if (words.join('').length < 2) return ok([]);
  let query = client
    .from('profiles')
    .select('id, first_name, last_name, role')
    .in('role', ['student', 'teacher', 'parent'])
    .is('deleted_at', null)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .limit(limit);
  for (const word of words) {
    const term = `%${word}%`;
    query = query.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`);
  }
  const { data, error } = await query;
  if (error) return err(toErrorCode(error));
  return ok(
    data.map((p) => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      role: p.role as PersonHit['role'],
    })),
  );
}
