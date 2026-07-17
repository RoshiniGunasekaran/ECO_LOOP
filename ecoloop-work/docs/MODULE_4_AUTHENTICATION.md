# MODULE 4 — AUTHENTICATION

## 1. Module Objective
Give every real person on EcoLoop (Customer, Delivery Partner, Industry, Admin) a
real, secure identity — sign up, log in, log out, recover a forgotten password,
verify their email, stay logged in across refreshes, and only see the module
their role is allowed to see. This replaces the Module 1 prototype's fake
`useState` role-switching with a real Supabase Auth session.

## 2. Frontend Pages / Screens
- Public site → Login tab (`PublicModule.tsx`)
- Public site → Register tab, 3 role sub-forms (`PublicModule.tsx`)
- Public site → Forgot Password (`ForgotPasswordForm.tsx`)
- Per-role login gate shown by `RoleSwitcher` (`ModuleLogin.tsx`)
- Reset Password screen, opened from the emailed link (`ResetPasswordForm.tsx`)
- Verify Email notice, shown after signup / on unverified login (`VerifyEmailNotice.tsx`)

## 3. Supabase Tables Used
- `auth.users` (built-in) — created by `supabase.auth.signUp`
- `public.profiles` — auto-created by the `handle_new_user()` trigger
- `public.customer_profiles` / `partner_profiles` / `industry_profiles` — auto-created by the same trigger, matching the signed-up role

## 4. Storage Buckets
None required for Module 4. The partner "Driving License Copy" upload field is
present in the UI but its actual file upload is deferred to Module 26
(External Services) — a note in the form makes this explicit.

## 5. Authentication Rules
- Anyone can sign up as `customer`, `partner`, or `industry` (never `admin` — admin accounts must be created directly in Supabase).
- `partner` and `industry` accounts are created with `status = 'Pending Approval'` and require Module 20 (User Management → Approve/Reject) before they can transact — Module 4 only handles identity, not business approval.
- `customer` accounts are `Active` immediately (pending email verification if enabled).
- A logged-in role can only open its own module; `admin` can open every module (`canAccessModule` in `permissions.ts`).

## 6. Functional Requirements (mapped to the 10 roadmap tasks)
| Task | Requirement | Status |
|---|---|---|
| 4.1 | Email Signup | ✅ `authService.signUp`, wired into all 3 registration forms |
| 4.2 | Email Login | ✅ `authService.signIn`, wired into `ModuleLogin` + public login tab |
| 4.3 | Logout | ✅ `authService.signOut`, wired into `App.tsx` `handleLogout` |
| 4.4 | Forgot Password | ✅ `ForgotPasswordForm.tsx` |
| 4.5 | Reset Password | ✅ `ResetPasswordForm.tsx`, triggered by `PASSWORD_RECOVERY` auth event |
| 4.6 | Email Verification | ✅ `VerifyEmailNotice.tsx` + resend action |
| 4.7 | Session Management | ✅ `AuthContext.tsx` — `getSession()` on load + `onAuthStateChange` listener |
| 4.8 | Protected Routes | ✅ `ProtectedRoute.tsx` wraps every role module in `App.tsx` |
| 4.9 | Role Management | ✅ `role` resolved live from `profiles.role` via `AuthContext` |
| 4.10 | Role Permissions | ✅ `permissions.ts` — `hasPermission()` / `canAccessModule()` |

## 7. Business Rules
- Passwords must be ≥ 6 characters (Supabase's own minimum) and the two password fields must match before a signup/reset request is even sent.
- A signup with an email that already exists returns a clear "already registered" message instead of a generic failure.
- A login attempt on an unverified email routes the user to the Verify Email screen instead of a raw error.

## 8. Database Operations
- **Create**: `auth.users` row (via `signUp`) → trigger creates `profiles` + role-specific profile row.
- **Read**: `profiles` row fetched by id on every session load/change (`fetchProfile`).
- **Update**: password (`updateUser`), via Reset Password flow.
- **Delete**: not part of Module 4 (account deletion is Module 11, Task "Account deletion").

## 9. Frontend Integration
`src/services/authService.ts` is the only file that calls `supabase.auth.*`.
`src/context/AuthContext.tsx` is the only file that calls `authService` and
exposes `useAuth()` to the rest of the app. Every screen (`ModuleLogin`,
`PublicModule`, `ForgotPasswordForm`, `ResetPasswordForm`,
`VerifyEmailNotice`) consumes `useAuth()` — none of them talk to Supabase directly.

## 10. Edge Cases Handled
- Empty email/password on submit → inline validation error, no network call.
- Duplicate signup email → friendly "already exists" message.
- Wrong password / unknown email → friendly "incorrect email or password".
- Password reset link opened while already logged in → still routes to `ResetPasswordForm` via the `PASSWORD_RECOVERY` event.
- Refreshing the page mid-session → `initializing` flag in `AuthContext` prevents a flash of the login screen before the real session is confirmed.
- Switching role via the dev `RoleSwitcher` to a module you're not authorized for → `ProtectedRoute` shows that role's real login form instead of the content.

## 11. Manual Testing Steps
1. Run `supabase/module4_auth_trigger.sql` in the Supabase SQL Editor (after Module 3's schema).
2. In Supabase Dashboard → Authentication → Providers, confirm **Email** is enabled.
3. `npm run dev`, go to the public site → Register → sign up as a Customer with a real-ish email + password ≥ 6 chars.
4. Confirm a new row appears in `profiles` and `customer_profiles` in the Supabase table editor.
5. If "Confirm email" is ON in Supabase Auth settings: check the inbox (or Supabase's dashboard email logs in local/dev), click the link, then log in. If OFF: log in immediately.
6. Log in via the public Login tab — confirm you land in the Customer module.
7. Click "Forgot Password?", request a reset, open the link, set a new password, confirm you can log in with it.
8. Log out — confirm you're returned to the public site and reloading the page does **not** silently re-log you in.
9. Try opening the Partner or Admin module via the `RoleSwitcher` while logged in as Customer — confirm you see that role's login form, not the Customer data.

## 12. Acceptance Criteria
- [ ] A brand-new visitor can register as Customer, Partner, or Industry and a matching row appears in Supabase.
- [ ] A registered user can log in and is routed to the correct module for their role.
- [ ] A user can log out and the session is actually cleared (refresh does not restore it).
- [ ] Forgot Password sends a real reset email and the link lets the user set a new password.
- [ ] Refreshing the browser while logged in keeps the user logged in.
- [ ] A logged-in Customer cannot view Partner/Industry/Admin module content.

## 13. Completion Report

**Files created**
- `src/services/authService.ts`
- `src/utils/permissions.ts`
- `src/context/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/components/ForgotPasswordForm.tsx`
- `src/components/ResetPasswordForm.tsx`
- `src/components/VerifyEmailNotice.tsx`
- `supabase/module4_auth_trigger.sql`
- `docs/MODULE_4_AUTHENTICATION.md` (this file)

**Files modified**
- `src/types.ts` (added `Profile`, `SignUpPayload`, `AuthResult`)
- `src/main.tsx` (wrapped app in `<AuthProvider>`)
- `src/App.tsx` (real session-based routing + `ProtectedRoute` + password-recovery screen)
- `src/components/ModuleLogin.tsx` (real `signIn`, forgot-password/verify-email sub-views)
- `src/components/PublicModule.tsx` (real `signIn`/`signUp`, all registration fields wired to state, added missing partner/industry password fields)

**Tables used:** `profiles`, `customer_profiles`, `partner_profiles`, `industry_profiles` (all from Module 3 — no schema changes, only the new trigger).

**Features completed:** all 10 Module 4 tasks (4.1–4.10) per the table in section 6.

**Pending / explicitly out of scope for Module 4:**
- Actual file upload for the partner's driving license copy (Module 26 — External Services).
- Approve/Reject workflow for pending Partner/Industry accounts (Module 20 — User Management).
- Editable profile fields, avatar upload, change-password-while-logged-in (Module 11 — Customer Profile / Module 15 — Partner Profile).

**Next module:** Module 5 — Customer Dashboard.