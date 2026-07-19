-- ============================================================================
-- ECOLOOP — MODULE 7: WALLET (SCHEMA ADDITIONS)
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Prerequisite: Module 3 schema (module3_database_schema.sql) must already be run.
-- ============================================================================
-- WHY THIS FILE EXISTS (unlike Modules 5 and 6, which needed zero schema
-- changes): Module 3's schema never anticipated storing a customer's bank
-- account or UPI ID, and never gave customers any way to *request* money out
-- of their wallet — `transactions` is a read-only ledger from the customer's
-- side (see `transactions_owner`, a SELECT-only policy). So this module adds
-- exactly two new tables:
--
--   1. payout_methods      — one row per user, their linked bank/UPI details.
--   2. withdrawal_requests — a customer-insertable "please pay me out" queue.
--      Nothing in the app can mark one as Paid yet and move the money — that
--      requires an admin approval flow (a later module) that will update the
--      row's status AND insert the matching real `transactions` row. Until
--      that exists, this table is honestly just a request queue.
-- ============================================================================


-- ============================================================================
-- 1. PAYOUT METHODS  (Bank account + UPI details — Module 7 tasks 7.5 / 7.6)
-- ============================================================================
create table if not exists public.payout_methods (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  account_holder_name text,
  bank_name           text,
  account_number      text,
  ifsc_code           text,
  upi_id              text,
  updated_at          timestamptz not null default now()
);

alter table public.payout_methods enable row level security;

create policy "payout_methods_owner" on public.payout_methods
  for all
  using (user_id = auth.uid() or public.current_user_role() = 'admin')
  with check (user_id = auth.uid());


-- ============================================================================
-- 2. WITHDRAWAL REQUESTS  (Module 7 task 7.3)
-- ============================================================================
create table if not exists public.withdrawal_requests (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id),
  amount          numeric(12,2) not null check (amount > 0),
  payout_snapshot jsonb,     -- bank/UPI details copied at request time, in case the customer edits payout_methods later
  status          text not null default 'Pending' check (status in ('Pending','Approved','Rejected','Paid')),
  requested_at    timestamptz not null default now(),
  processed_at    timestamptz
);
create index if not exists idx_withdrawal_requests_user on public.withdrawal_requests(user_id);
create index if not exists idx_withdrawal_requests_status on public.withdrawal_requests(status);

alter table public.withdrawal_requests enable row level security;

-- Customers can see their own requests (admins see all).
create policy "withdrawal_requests_owner_select" on public.withdrawal_requests
  for select using (user_id = auth.uid() or public.current_user_role() = 'admin');

-- Customers can only ever INSERT a new request for themselves, in 'Pending'
-- status, for an amount that does not exceed their current wallet balance.
-- This is enforced here (not just in the UI) so a withdrawal request can
-- never be forged for more money than the wallet actually holds.
create policy "withdrawal_requests_owner_insert" on public.withdrawal_requests
  for insert
  with check (
    user_id = auth.uid()
    and status = 'Pending'
    and amount <= coalesce((select wallet_balance from public.customer_profiles where user_id = auth.uid()), 0)
  );

-- No UPDATE/DELETE policy for customers on purpose — only an admin approval
-- flow (a later module) should be able to move a request out of 'Pending'.
-- Until that module exists, processing a request means an admin (or you,
-- for testing) updates it directly via the Supabase Table Editor, which
-- bypasses RLS by default when using the Dashboard's service-role context.