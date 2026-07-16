# Module 3 — Database Design

## Workflow source of truth
Following your roadmap doc (React + TypeScript + Tailwind + Supabase, no Spring Boot/Docker/Redis/Kafka/Microservices). `BACKEND_ARCHITECTURE.md` is disregarded — it's an outdated plan and not part of this workflow.

## Step 0 — Delete all dummy data first
Before building the real schema, clear out the dummy/mock data so you're starting clean:
1. In `src/data.ts`, you can leave the file for now (the UI still renders from it until the wiring module), but **do not carry any of its values into Supabase**. The schema below seeds nothing.
2. In Supabase, if you already ran any earlier version of this SQL (or clicked around and created test rows manually), clear it first:
   ```sql
   truncate table
     public.support_ticket_responses, public.support_tickets, public.saved_addresses,
     public.notifications, public.reward_products, public.transactions,
     public.diy_project_likes, public.diy_project_comments, public.diy_projects,
     public.pickup_feedback, public.pickup_images, public.pickup_requests,
     public.pricing_rates, public.industry_profiles, public.partner_profiles,
     public.customer_profiles, public.profiles
   cascade;
   ```
   (Skip this if your Supabase project is brand new / has no tables yet.)
3. Now run the schema below on a clean database.

---

## 1. Module Objective
Design and create the complete Postgres schema in Supabase so every table the frontend will eventually need (customers, partners, industries, pickups, DIY projects, wallet, rewards, notifications, support) exists, is related correctly, and is secured with Row Level Security — before any real auth/CRUD wiring begins (that's Module 4+).

**ER Diagram:** see `module3_erd.svg` — visual map of all 17 tables, color-coded by cluster (identity/profiles, pickup logistics, DIY community, wallet/notifications/support, admin-managed standalone tables), with arrows showing every foreign key direction.

## 2. Frontend Pages Involved
None directly edited in this module. This is backend-only. The tables map to data already consumed by `CustomerModule.tsx`, `DeliveryPartnerModule.tsx`, `IndustryModule.tsx`, `AdminModule.tsx`, and `PublicModule.tsx` (currently reading from `src/data.ts` mock arrays).

## 3. Supabase Tables Created
17 tables — see `module3_database_schema.sql` for full detail:
`profiles`, `customer_profiles`, `partner_profiles`, `industry_profiles`, `pricing_rates`, `pickup_requests`, `pickup_images`, `pickup_feedback`, `diy_projects`, `diy_project_comments`, `diy_project_likes`, `transactions`, `reward_products`, `notifications`, `saved_addresses`, `support_tickets`, `support_ticket_responses`.

## 4. Storage Buckets
None created in this module (that's Module 2, already scoped for images/avatars). This module only adds the `image_url` / `profile_pic_url` **columns** that will later hold those bucket URLs.

## 5. Authentication Rules
Not implemented yet (Module 4). This module only sets the **groundwork**: every table has RLS enabled, and policies reference `auth.uid()` and a `current_user_role()` helper function so they'll work correctly the moment login exists.

## 6. Functional Requirements
- Every entity in `types.ts` has a matching table with matching field names (snake_case) and types.
- Every relationship implied by the mock data (a pickup belongs to a customer, a DIY project has comments, a ticket has responses) is a real foreign key.
- Categories/pricing stay admin-editable (a table, not a fixed enum) since Module 22 lets admins add/edit categories.

## 7. Business Rules
- `estimated_weight` and `price_per_kg` must be positive.
- Ratings are constrained 1–5.
- A pickup can only move through the specific status list your `PickupStatus` type defines — enforced with `CHECK` constraints, not just frontend logic.
- Deleting a user cascades to their own rows (`ON DELETE CASCADE`) but never deletes another user's data.

## 8. Database Operations (CRUD map)
| Table | Create | Read | Update | Delete |
|---|---|---|---|---|
| profiles | on signup (Module 4) | self / admin | self / admin | admin only (soft, via status) |
| pickup_requests | customer | customer/partner/admin | customer (if Pending) / partner / admin | admin only |
| diy_projects | customer | public (if Approved) / owner / admin | owner / admin | owner / admin |
| pricing_rates | admin | public | admin | admin |
| transactions | system (server-side only) | owner / admin | — | — |

## 9. Frontend Integration (for later — not this module)
When you reach the wiring modules, these components will each call Supabase instead of reading `data.ts`:
- `CustomerModule.tsx` → `pickup_requests`, `diy_projects`, `transactions`, `saved_addresses`
- `DeliveryPartnerModule.tsx` → `partner_profiles`, `pickup_requests`
- `IndustryModule.tsx` → `industry_profiles`, `pickup_requests`
- `AdminModule.tsx` → almost every table
- `DatabaseContext.tsx` will eventually replace its `localStorage` caching with live Supabase queries/subscriptions.

## 10. Edge Cases Covered
- **Broadcast notifications**: `notifications.user_id` is nullable — `null` means "everyone."
- **Guest/duplicate likes**: added `diy_project_likes` (not in your original types) so one user can't inflate a like count by clicking repeatedly — flagged below for your confirmation.
- **Orphaned pickups**: if a customer account is deleted, their pickups cascade-delete too (via `ON DELETE CASCADE`) rather than becoming orphaned rows.
- **Unauthorized access**: RLS blocks any read/write that isn't the owner or admin, at the database level — not just hidden in the UI.

## 11. Manual Testing Steps
1. Open Supabase Dashboard → your project → **SQL Editor**.
2. If you have any leftover test rows from earlier, run the `truncate` block in Step 0 first.
3. Paste the entire contents of `module3_database_schema.sql` → click **Run**.
4. Go to **Table Editor** → confirm all 17 tables appear, and every one is **empty** (no dummy rows).
5. Run the verification queries at the bottom of the SQL file (uncomment them one at a time) to confirm:
   - All 17 tables are listed.
   - Every foreign key resolves to the correct parent table.
   - RLS shows `true` for all 17 tables.
6. In **Authentication → Policies**, spot-check 2–3 tables and confirm the policy names listed in section 11 of the SQL file appear.

## 12. Acceptance Criteria
- [ ] All 17 tables exist in Supabase with no SQL errors.
- [ ] Every table is empty — zero dummy/sample rows.
- [ ] Every foreign key relationship resolves (verification query 2 in the SQL file returns rows).
- [ ] RLS is ON for all 17 tables (verification query 3 returns `true` for every row).
- [ ] `src/data.ts` mock data confirmed as frontend-only placeholder, not present anywhere in Supabase.

## 13. Completion Report
- **Files created:** `module3_database_schema.sql`, `MODULE_3_DATABASE_DESIGN.md`, `module3_erd.svg`
- **Tables created:** 17 (list above)
- **Features completed:** Full schema + RLS policies + visual ER diagram, zero dummy data (by design — real data comes later during application testing)
- **Pending work / decisions for you to confirm:**
  1. Do you want `diy_project_likes` (added by me, not in your original `types.ts`) — needed for a real "like" system, or should likes stay a simple counter?
  2. Confirm using Supabase's native `uuid` for user IDs (with a cosmetic `display_code` like `C-3829` alongside it) instead of your mock data's custom string IDs.
- **Next module:** Module 4 — Authentication (email signup/login, session management, role-based protected routes) — this is what will start populating `profiles` with real users, replacing `src/data.ts`'s mock arrays.
