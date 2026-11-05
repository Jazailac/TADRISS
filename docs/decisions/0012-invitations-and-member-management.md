# 0012 — Invitations and member management

- Status: Accepted
- Date: 2026-10-07

## Context

Phase 2 lets an institution admin bring teachers and students into the school. Constraints:

- Rule 5: no `SECURITY DEFINER` in `public`. Multi-step writes run as the caller, under RLS.
- Rule 6: the service role is only for documented, `server-only` flows.
- Email is only deliverable through Supabase Auth, so the invitee's account must be created by Auth.
- Local config has `enable_confirmations = false`, so a public `signUp` can claim any `user_metadata`.
  Metadata alone must never grant access to a school.

## Decision

1. **Two-step invite.** The server action inserts an `invitations` row as the admin (RLS: admin of that
   institution only), then calls `auth.admin.inviteUserByEmail` with the service-role client
   (`deliverInvitation` in `@tadriss/shared`). If sending fails, the row is revoked so a retry is not blocked.
2. **The trust boundary is `auth.users.invited_at`.** Only the admin invite endpoint sets it; public sign-up
   cannot. `private.handle_new_user` provisions the profile from an invitation only when `invited_at` is set,
   the invitation id matches, the address matches, it is `pending` and not expired. Otherwise it raises
   (invite) or creates nothing (a forged `accept_invitation` intent on public sign-up gets no profile, so no
   claims, so no access).
3. **Provisioning happens at invite time, acceptance at first sign-in.** The profile exists as soon as the
   invite is sent. A trigger on `auth.users.last_sign_in_at` flips the invitation to `accepted` when the
   invitee first clicks the link. The people list shows such members as "Invited" until then.
4. **Link handling.** Admin-sent invites can't use PKCE (the invitee's browser has no code verifier). The
   email template links to `/auth/confirm?token_hash=…&type=invite`, verified server-side with `verifyOtp`,
   then `/set-password`. The template is trilingual (`supabase/templates/invite.html`) and builds the link from
   `{{ .RedirectTo }}`, so it points at whichever app URL sent the invite.
5. **Revoke = delete the never-signed-in auth user** (cascades the profile) so the address can be invited again.
   `discardInvitedUser` refuses if the user has signed in or was not invited.
6. **Member management via column grants + policies, not RPCs.** Admins get `UPDATE(is_active)` plus a policy
   limited to `teacher`/`student` rows other than themselves; names are editable under the same policy. Role and
   institution remain immutable from the client. Column grants can't tell rows apart, so a
   `BEFORE UPDATE OF is_active` trigger stops anyone changing their own activation (pgTAP caught this).
7. **Deactivation is immediate in the UI, bounded in the API.** Claims disappear at the next token refresh
   (≤ `jwt_expiry`), but `getMyProfile` also checks `is_active`, so the viewer is cut off on the next request.
8. **`profiles.email`** is a lowercase copy of `auth.users.email`, kept in sync by trigger, because clients
   cannot read `auth.users`.

## Consequences

- Production needs `enable_confirmations = true` and a real SMTP provider; local `email_sent` was raised to 100
  so e2e can send many invites.
- Inviting an address that already has an account anywhere returns `email_taken` (Auth reports it, and we
  deliberately don't reveal which school).
- Admin and super_admin accounts are never created by invitation.
- No SECURITY DEFINER was added to `public`. The two definer functions live in `private` and are not
  executable by clients.
