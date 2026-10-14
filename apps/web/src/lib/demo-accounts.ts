/** The seeded Al Manar accounts the public demo may sign in as: fixed here, never taken from the request. */
export const demoAccounts = {
  admin: 'direction@almanar.test',
  teacher: 'prof1@almanar.test',
  student: 'eleve01@almanar.test',
  parent: 'parent02@almanar.test',
} as const;
export type DemoKey = keyof typeof demoAccounts;
