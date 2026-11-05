import { inviteInput, type InviteInput } from './schemas/people';

export const maxImportRows = 200;

export type ImportRow = {
  /** 1-based line in the file (the header is line 1). */
  line: number;
  values: { firstName: string; lastName: string; email: string; role: string };
  /** The parsed invitation, or why the row cannot be used. */
  result: { ok: true; data: InviteInput } | { ok: false; error: 'validation' | 'duplicate' };
};

export type ImportParse =
  { ok: true; rows: ImportRow[] } | { ok: false; error: 'empty' | 'columns' | 'tooMany' };

const roleAliases: Record<string, string> = {
  teacher: 'teacher',
  enseignant: 'teacher',
  enseignante: 'teacher',
  prof: 'teacher',
  professeur: 'teacher',
  student: 'student',
  eleve: 'student',
  élève: 'student',
  parent: 'parent',
  tuteur: 'parent',
};

const columnAliases: Record<string, 'firstName' | 'lastName' | 'email' | 'role'> = {
  first_name: 'firstName',
  firstname: 'firstName',
  prenom: 'firstName',
  prénom: 'firstName',
  last_name: 'lastName',
  lastname: 'lastName',
  nom: 'lastName',
  email: 'email',
  'e-mail': 'email',
  mail: 'email',
  role: 'role',
  rôle: 'role',
};

/** One CSV record per line; `,` or `;` (Excel in French exports `;`), double quotes for cells with a separator. */
function splitLine(line: string, sep: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line.charAt(i);
    if (quoted) {
      if (ch === '"' && line.charAt(i + 1) === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      cells.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

/**
 * Reads a people list (columns: prénom/first_name, nom/last_name, email, rôle/role) into invitations.
 * Every row is validated with the same schema as the single invite form; repeated emails are flagged.
 */
export function parseMembersCsv(text: string): ImportParse {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l, i) => ({ l, line: i + 1 }))
    .filter((x) => x.l.trim() !== '');
  const head = lines[0];
  if (!head || lines.length < 2) return { ok: false, error: 'empty' };

  const sep = head.l.split(';').length > head.l.split(',').length ? ';' : ',';
  const index: Partial<Record<'firstName' | 'lastName' | 'email' | 'role', number>> = {};
  splitLine(head.l, sep).forEach((h, i) => {
    const key = columnAliases[h.trim().toLowerCase()];
    if (key && index[key] === undefined) index[key] = i;
  });
  const { firstName: fi, lastName: li, email: ei, role: ri } = index;
  if (fi === undefined || li === undefined || ei === undefined || ri === undefined)
    return { ok: false, error: 'columns' };
  if (lines.length - 1 > maxImportRows) return { ok: false, error: 'tooMany' };

  const seen = new Set<string>();
  const rows = lines.slice(1).map(({ l, line }): ImportRow => {
    const cells = splitLine(l, sep);
    const raw = {
      firstName: cells[fi] ?? '',
      lastName: cells[li] ?? '',
      email: cells[ei] ?? '',
      role: cells[ri] ?? '',
    };
    const role = roleAliases[raw.role.toLowerCase()] ?? raw.role.toLowerCase();
    const parsed = inviteInput.safeParse({ ...raw, role });
    if (!parsed.success) return { line, values: raw, result: { ok: false, error: 'validation' } };
    if (seen.has(parsed.data.email))
      return { line, values: raw, result: { ok: false, error: 'duplicate' } };
    seen.add(parsed.data.email);
    return { line, values: raw, result: { ok: true, data: parsed.data } };
  });
  return { ok: true, rows };
}
