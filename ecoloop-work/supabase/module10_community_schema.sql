-- ============================================================================
-- ECOLOOP — MODULE 10: COMMUNITY (SCHEMA ADDITIONS)
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Prerequisite: module3_database_schema.sql, Rls_gap_fix.sql, and
--               module9_diy_schema.sql must already be run.
-- ============================================================================
-- WHAT ALREADY EXISTED (from Module 3, unused for real reads/writes until now):
--   - public.diy_project_comments — real table, RLS ENABLED, but had NO
--     policies at all (default-deny). Module 9 explicitly left this alone
--     and flagged it as "Module 10's job" (see module9_diy_schema.sql).
--   - public.diy_project_likes — same situation: real table, RLS enabled,
--     zero policies, flagged for Module 10.
--   - public.diy_projects — already has a real `likes` counter column and
--     a public-read policy for Approved rows (`diy_public_view_approved`,
--     Module 3), but has no way to resolve WHO posted a project into a
--     display-safe name (the `profiles` table is locked to
--     "own row or admin" — Module 3's `profiles_select_own_or_admin` — so
--     a customer browsing the Community feed cannot join to another
--     customer's `profiles.full_name` directly).
--
-- WHY THIS FILE EXISTS: Module 10's 8 tasks (Community feed, Search,
-- Filter, Like, Comment, Share, Save, Report) need:
--   1. A safe, denormalized author name on `diy_projects` — same pattern
--      Module 3 already used for `diy_project_comments.user_name` — so the
--      feed never needs to read another customer's `profiles` row.
--   2. Real RLS policies on `diy_project_comments` (Comment) and
--      `diy_project_likes` (Like), scoped to "Approved projects only."
--   3. A trigger that keeps `diy_projects.likes` in sync with real
--      like/unlike actions (it's been a static counter since Module 3;
--      nothing has ever written to it for real).
--   4. Two new tables Module 3 never anticipated: `diy_project_saves`
--      (Save/bookmark, task 10.7 — private per-user, like a watchlist)
--      and `diy_project_reports` (Report, task 10.8 — feeds a future
--      Module 23-style admin moderation queue; owner-write / owner-or-
--      admin-read only, matching the `support_tickets` pattern).
--   "Share" (task 10.6) needs no schema change — it's a client-side
--   Web Share API / copy-link action on data the feed already has.
--   "Search" and "Filter" (tasks 10.2/10.3) also need no schema change —
--   they run client-side over the feed already returned by task 10.1.
-- ============================================================================


-- ============================================================================
-- 1. diy_projects — add a denormalized, display-safe author name
-- ============================================================================
alter table public.diy_projects
  add column if not exists customer_display_name text;

-- One-time backfill for any pre-existing rows (there should be none on a
-- freshly-seeded project per Module 3's "no dummy data" rule, but this is
-- safe/idempotent either way).
update public.diy_projects dp
set customer_display_name = coalesce(p.display_code, p.full_name)
from public.profiles p
where p.id = dp.customer_id
  and dp.customer_display_name is null;

-- From now on, every new DIY submission (Module 9's createDiyProject)
-- automatically gets its author's display-safe name stamped on at insert
-- time — Module 9's diyService.ts needed NO code changes for this.
create or replace function public.diy_set_customer_display_name()
returns trigger
language plpgsql
security definer
as $$
begin
  select coalesce(p.display_code, p.full_name)
    into new.customer_display_name
  from public.profiles p
  where p.id = new.customer_id;
  return new;
end;
$$;

drop trigger if exists trg_diy_set_customer_display_name on public.diy_projects;
create trigger trg_diy_set_customer_display_name
  before insert on public.diy_projects
  for each row execute function public.diy_set_customer_display_name();


-- ============================================================================
-- 2. diy_project_likes — RLS policies (task 10.4 — Like) + counter sync
-- ============================================================================
-- A customer may only see THEIR OWN like rows (needed so the feed can show
-- "have I already liked this?"), never the full list of who-liked-what for
-- other users. The total count is read from `diy_projects.likes` instead
-- (kept in sync by the trigger below), so no policy needs to expose all
-- rows to everyone just to show a number.
create policy "diy_likes_select_own_or_admin" on public.diy_project_likes
  for select using (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy "diy_likes_insert_own_on_approved" on public.diy_project_likes
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.diy_projects dp
      where dp.id = project_id and dp.status = 'Approved'
    )
  );

create policy "diy_likes_delete_own" on public.diy_project_likes
  for delete using (user_id = auth.uid());

-- Keeps diy_projects.likes (Module 3's static counter column) accurate
-- against real like/unlike actions instead of the old mock's
-- "+1 forever, never -1, resets on refresh" behavior.
create or replace function public.diy_likes_sync()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    update public.diy_projects set likes = likes + 1 where id = new.project_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.diy_projects set likes = greatest(likes - 1, 0) where id = old.project_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_diy_likes_sync on public.diy_project_likes;
create trigger trg_diy_likes_sync
  after insert or delete on public.diy_project_likes
  for each row execute function public.diy_likes_sync();


-- ============================================================================
-- 3. diy_project_comments — RLS policies (task 10.5 — Comment)
-- ============================================================================
-- Anyone who can already see the project (public if Approved, owner, or
-- admin — same rule as `diy_public_view_approved`) can read its comments.
create policy "diy_comments_select_visible_project" on public.diy_project_comments
  for select using (
    exists (
      select 1 from public.diy_projects dp
      where dp.id = project_id
        and (dp.status = 'Approved' or dp.customer_id = auth.uid() or public.current_user_role() = 'admin')
    )
  );

-- A customer may only post a comment as themselves, and only on a project
-- that's actually live in the Community feed (Approved) — matches the
-- "comment/like an Approved project" rule used throughout this file.
create policy "diy_comments_insert_own_on_approved" on public.diy_project_comments
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.diy_projects dp
      where dp.id = project_id and dp.status = 'Approved'
    )
  );

-- A customer can remove their own comment; admin can moderate any comment.
create policy "diy_comments_delete_own_or_admin" on public.diy_project_comments
  for delete using (user_id = auth.uid() or public.current_user_role() = 'admin');


-- ============================================================================
-- 4. NEW TABLE — diy_project_saves (task 10.7 — Save/bookmark)
-- ============================================================================
-- Purely personal — "projects I bookmarked to revisit" — never shown to
-- anyone but the saver, so a single owner-only "for all" policy is enough
-- (same shape as Module 3's `saved_addresses_owner`).
create table if not exists public.diy_project_saves (
  project_id      bigint not null references public.diy_projects(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists idx_diy_saves_user on public.diy_project_saves(user_id);

alter table public.diy_project_saves enable row level security;

create policy "diy_saves_owner_all" on public.diy_project_saves
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ============================================================================
-- 5. NEW TABLE — diy_project_reports (task 10.8 — Report)
-- ============================================================================
-- Same shape as Module 3's `support_tickets`: a customer can create their
-- own report and see only their own reports; a full admin moderation
-- queue (approve/dismiss) is out of scope here — that's a future
-- Module 23-style admin screen, this just makes sure reports are captured
-- safely and durably.
create table if not exists public.diy_project_reports (
  id              bigint generated always as identity primary key,
  project_id      bigint not null references public.diy_projects(id) on delete cascade,
  reporter_id     uuid not null references public.profiles(id) on delete cascade,
  reason          text not null check (reason in ('Inappropriate Content','Spam','Misleading Information','Copyright Issue','Other')),
  details         text,
  status          text not null default 'Open' check (status in ('Open','Reviewed','Dismissed')),
  created_at      timestamptz not null default now()
);
create index if not exists idx_diy_reports_project on public.diy_project_reports(project_id);
create index if not exists idx_diy_reports_reporter on public.diy_project_reports(reporter_id);

alter table public.diy_project_reports enable row level security;

create policy "diy_reports_insert_own" on public.diy_project_reports
  for insert with check (reporter_id = auth.uid());

create policy "diy_reports_select_own_or_admin" on public.diy_project_reports
  for select using (reporter_id = auth.uid() or public.current_user_role() = 'admin');


-- ============================================================================
-- 6. VERIFY  (structure-only checks — no data required)
-- ============================================================================
-- 1) Confirm the 2 new tables + new column exist:
-- select column_name from information_schema.columns
--   where table_name = 'diy_projects' and column_name = 'customer_display_name';
-- select table_name from information_schema.tables
--   where table_name in ('diy_project_saves','diy_project_reports');
--
-- 2) Confirm RLS is ON for the 2 new tables + still on for the fixed ones:
-- select relname as table_name, relrowsecurity as rls_enabled
--   from pg_class where relnamespace = 'public'::regnamespace
--   and relname in ('diy_project_saves','diy_project_reports','diy_project_comments','diy_project_likes');
--
-- 3) Confirm both triggers exist:
-- select tgname from pg_trigger
--   where tgname in ('trg_diy_set_customer_display_name','trg_diy_likes_sync');
