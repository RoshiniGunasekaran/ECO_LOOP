-- ============================================================================
-- ECOLOOP — MODULE 3: DATABASE DESIGN
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Prerequisite: Module 2 (Supabase project created, auth enabled) must be done.
-- ============================================================================
-- This schema is built directly from src/types.ts + src/data.ts so the
-- frontend components (CustomerModule.tsx, PartnerModule.tsx, etc.) can be
-- wired to real tables later (Module 5+) with minimal type changes.
-- ============================================================================


-- ============================================================================
-- 1. PROFILES  (extends Supabase's built-in auth.users)
-- ============================================================================
-- Supabase already creates+manages auth.users (email, password, session).
-- We never edit that table directly. Instead every signed-up user gets ONE
-- row here holding the fields common to every role.
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_code    text unique,                         -- e.g. 'C-3829' (cosmetic, matches old mock data style)
  role            text not null check (role in ('customer','partner','industry','admin')),
  status          text not null default 'Active' check (status in ('Active','Suspended','Pending Approval')),
  full_name       text not null,
  email           text not null,
  phone           text,
  address         text,
  city            text,
  state           text,
  pincode         text,
  profile_pic_url text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_status on public.profiles(status);


-- ============================================================================
-- 2. ROLE-SPECIFIC PROFILE EXTENSIONS
-- ============================================================================

-- 2a. Customer-only fields (from CustomerItem)
create table if not exists public.customer_profiles (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  wallet_balance  numeric(12,2) not null default 0.00,
  reward_points   integer not null default 0,
  total_earnings  numeric(12,2) not null default 0.00
);

-- 2b. Partner-only fields (from PartnerItem)
create table if not exists public.partner_profiles (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  vehicle_type        text,
  vehicle_number      text,
  driving_license     text,
  aadhaar_number      text,
  is_online           boolean not null default false,
  rating              numeric(2,1) not null default 5.0,
  today_pickups       integer not null default 0,
  completed_pickups   integer not null default 0,
  earnings            numeric(12,2) not null default 0.00,
  distance_traveled   numeric(8,2) not null default 0.00   -- km
);

-- 2c. Industry-only fields (from IndustryItem)
create table if not exists public.industry_profiles (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  company_name        text not null,
  industry_type       text,
  gst_number          text,
  registration_number text,
  contact_person      text,
  waste_received_kg   numeric(12,2) not null default 0.00,
  deliveries_count    integer not null default 0
);


-- ============================================================================
-- 3. PRICING / CATEGORIES  (admin-managed, from PricingRate — Module 22 uses this)
-- ============================================================================
create table if not exists public.pricing_rates (
  id              bigint generated always as identity primary key,
  category        text not null unique,
  price_per_kg    numeric(8,2) not null check (price_per_kg >= 0),
  last_updated    timestamptz not null default now()
);


-- ============================================================================
-- 4. PICKUP REQUESTS  (core logistics table, from PickupRequest)
-- ============================================================================
create table if not exists public.pickup_requests (
  id                      bigint generated always as identity primary key,
  customer_id             uuid not null references public.profiles(id),
  category                text not null,
  subcategory             text,
  condition               text check (condition in ('Excellent','Good','Fair','Poor')),
  estimated_weight        numeric(8,2) not null check (estimated_weight > 0),
  actual_weight           numeric(8,2),
  quantity                integer not null default 1,
  pickup_address          text not null,
  landmark                text,
  preferred_date          date not null,
  preferred_time          text not null,
  notes                   text,
  special_instructions    text,
  status                  text not null default 'Pending'
                          check (status in ('Pending','Assigned','In-Transit','Arrived','Collected','Delivered','Completed','Cancelled')),
  partner_id              uuid references public.profiles(id),
  partner_location_lat    numeric(10,8),
  partner_location_lng    numeric(11,8),
  estimated_amount        numeric(10,2) not null default 0.00,
  final_amount            numeric(10,2),
  payment_status          text not null default 'Unpaid' check (payment_status in ('Unpaid','Pending','Paid','Refunded')),
  invoice_id              text,
  assigned_industry_id    uuid references public.profiles(id),
  created_at              timestamptz not null default now()
);
create index if not exists idx_pickups_customer on public.pickup_requests(customer_id);
create index if not exists idx_pickups_partner on public.pickup_requests(partner_id);
create index if not exists idx_pickups_status on public.pickup_requests(status);
create index if not exists idx_pickups_created on public.pickup_requests(created_at desc);

-- Normalizes PickupRequest.images (string[]) into its own table
create table if not exists public.pickup_images (
  id              bigint generated always as identity primary key,
  pickup_id       bigint not null references public.pickup_requests(id) on delete cascade,
  image_url       text not null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_pickup_images_pickup on public.pickup_images(pickup_id);

-- One-to-one feedback per pickup (from PickupFeedback)
create table if not exists public.pickup_feedback (
  pickup_id           bigint primary key references public.pickup_requests(id) on delete cascade,
  customer_rating     smallint check (customer_rating between 1 and 5),
  customer_comment    text,
  partner_rating      smallint check (partner_rating between 1 and 5),
  partner_comment     text,
  industry_rating     smallint check (industry_rating between 1 and 5),
  industry_comment    text
);


-- ============================================================================
-- 5. DIY PROJECTS  (community gallery, from DIYProject + CommentItem)
-- ============================================================================
create table if not exists public.diy_projects (
  id                      bigint generated always as identity primary key,
  customer_id             uuid not null references public.profiles(id),
  project_name            text not null,
  project_description     text not null,
  materials_used          text[] not null default '{}',
  estimated_cost          numeric(10,2) not null default 0.00,
  benefits                text,
  before_image            text,
  after_image             text,
  status                  text not null default 'Pending' check (status in ('Pending','Approved','Rejected')),
  reward_earned           integer not null default 0,
  likes                   integer not null default 0,
  created_at              timestamptz not null default now()
);
create index if not exists idx_diy_customer on public.diy_projects(customer_id);
create index if not exists idx_diy_status on public.diy_projects(status);

create table if not exists public.diy_project_comments (
  id              bigint generated always as identity primary key,
  project_id      bigint not null references public.diy_projects(id) on delete cascade,
  user_id         uuid references public.profiles(id),
  user_name       text not null,
  comment_text    text not null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_diy_comments_project on public.diy_project_comments(project_id);

-- Recommended addition (not in types.ts yet): tracks WHO liked a project
-- so a user can't inflate the likes counter by clicking repeatedly.
-- Confirm with Roshini before wiring UI to this — flagged in the doc below.
create table if not exists public.diy_project_likes (
  project_id      bigint not null references public.diy_projects(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (project_id, user_id)
);


-- ============================================================================
-- 6. WALLET / TRANSACTIONS  (from Transaction)
-- ============================================================================
create table if not exists public.transactions (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id),
  type            text not null check (type in ('Credit','Withdrawal','Refund','Reward')),
  amount          numeric(12,2) not null,
  points          integer,
  description     text,
  status          text not null default 'Completed' check (status in ('Completed','Pending','Failed')),
  txn_date        timestamptz not null default now()
);
create index if not exists idx_transactions_user on public.transactions(user_id);
create index if not exists idx_transactions_date on public.transactions(txn_date desc);


-- ============================================================================
-- 7. REWARD STORE  (from RewardProduct)
-- ============================================================================
create table if not exists public.reward_products (
  id              bigint generated always as identity primary key,
  name            text not null,
  description     text,
  cost_points     integer not null check (cost_points >= 0),
  image           text,
  category        text check (category in ('Voucher','Merchandise','Tree Planting','Carbon Offset')),
  available       boolean not null default true
);


-- ============================================================================
-- 8. NOTIFICATIONS  (from NotificationItem — user_id nullable = broadcast to all)
-- ============================================================================
create table if not exists public.notifications (
  id              bigint generated always as identity primary key,
  user_id         uuid references public.profiles(id),   -- null = broadcast
  role            text check (role in ('public','customer','partner','industry','admin','all')),
  title           text not null,
  message         text not null,
  type            text not null default 'info' check (type in ('info','success','warning','alert')),
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id);


-- ============================================================================
-- 9. SAVED ADDRESSES  (from SavedAddress)
-- ============================================================================
create table if not exists public.saved_addresses (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  label           text not null,
  address         text not null,
  city            text,
  state           text,
  pincode         text,
  is_default      boolean not null default false
);
create index if not exists idx_saved_addresses_user on public.saved_addresses(user_id);


-- ============================================================================
-- 10. SUPPORT TICKETS  (from SupportTicket + its inline `responses` array)
-- ============================================================================
create table if not exists public.support_tickets (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id),
  user_name       text not null,
  role            text not null check (role in ('public','customer','partner','industry','admin')),
  subject         text not null,
  category        text check (category in ('Payment Issue','Missed Pickup','Damaged Items','App Bug','Other')),
  description     text not null,
  status          text not null default 'Open' check (status in ('Open','In-Progress','Resolved')),
  created_at      timestamptz not null default now()
);
create index if not exists idx_tickets_user on public.support_tickets(user_id);
create index if not exists idx_tickets_status on public.support_tickets(status);

create table if not exists public.support_ticket_responses (
  id              bigint generated always as identity primary key,
  ticket_id       bigint not null references public.support_tickets(id) on delete cascade,
  sender          text not null,
  response_text   text not null,
  responded_at    timestamptz not null default now()
);
create index if not exists idx_ticket_responses_ticket on public.support_ticket_responses(ticket_id);


-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Every table gets RLS turned ON. Without policies below, this means
-- NO ONE (not even logged-in users) can read/write until a policy allows it.
-- This is intentional — Module 2 already introduced RLS; here we apply it.

alter table public.profiles enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.partner_profiles enable row level security;
alter table public.industry_profiles enable row level security;
alter table public.pricing_rates enable row level security;
alter table public.pickup_requests enable row level security;
alter table public.pickup_images enable row level security;
alter table public.pickup_feedback enable row level security;
alter table public.diy_projects enable row level security;
alter table public.diy_project_comments enable row level security;
alter table public.diy_project_likes enable row level security;
alter table public.transactions enable row level security;
alter table public.reward_products enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_addresses enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_responses enable row level security;

-- Helper: fetch the caller's role without infinite-recursing into profiles' own RLS
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- profiles: everyone can read their own row; admins can read all
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.current_user_role() = 'admin');
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.current_user_role() = 'admin');
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- pricing_rates: public read (customers need to see prices), admin write
create policy "pricing_public_read" on public.pricing_rates
  for select using (true);
create policy "pricing_admin_write" on public.pricing_rates
  for insert with check (public.current_user_role() = 'admin');
create policy "pricing_admin_update" on public.pricing_rates
  for update using (public.current_user_role() = 'admin');
create policy "pricing_admin_delete" on public.pricing_rates
  for delete using (public.current_user_role() = 'admin');

-- pickup_requests: customer sees/edits own; partner sees assigned + unassigned pending; admin sees all
create policy "pickups_customer_own" on public.pickup_requests
  for select using (customer_id = auth.uid() or partner_id = auth.uid() or public.current_user_role() = 'admin');
create policy "pickups_customer_insert" on public.pickup_requests
  for insert with check (customer_id = auth.uid());
create policy "pickups_customer_update_own_pending" on public.pickup_requests
  for update using (
    (customer_id = auth.uid() and status = 'Pending')
    or partner_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

-- diy_projects: public can view approved; owner can view/edit their own; admin all
create policy "diy_public_view_approved" on public.diy_projects
  for select using (status = 'Approved' or customer_id = auth.uid() or public.current_user_role() = 'admin');
create policy "diy_owner_insert" on public.diy_projects
  for insert with check (customer_id = auth.uid());
create policy "diy_owner_update" on public.diy_projects
  for update using (customer_id = auth.uid() or public.current_user_role() = 'admin');

-- transactions / notifications / saved_addresses / support_tickets: owner-only + admin
create policy "transactions_owner" on public.transactions
  for select using (user_id = auth.uid() or public.current_user_role() = 'admin');
create policy "notifications_owner_or_broadcast" on public.notifications
  for select using (user_id = auth.uid() or user_id is null or public.current_user_role() = 'admin');
create policy "saved_addresses_owner" on public.saved_addresses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "support_tickets_owner" on public.support_tickets
  for select using (user_id = auth.uid() or public.current_user_role() = 'admin');
create policy "support_tickets_owner_insert" on public.support_tickets
  for insert with check (user_id = auth.uid());


-- ============================================================================
-- 12. NO DUMMY DATA — CLEAN SCHEMA ONLY
-- ============================================================================
-- This schema intentionally seeds NOTHING. No fake customers, no fake
-- pricing rows, nothing. The only rows that will ever exist in these
-- tables are ones created by real signups (Module 4) and real admin
-- actions (Module 22+). This keeps Table Editor honest — if you see a
-- row, it's real.
--
-- Reminder: `src/data.ts` in the frontend (INITIAL_CUSTOMERS, INITIAL_
-- PARTNERS, etc.) is still 100% mock/dummy data used only so the UI has
-- something to render. It is NOT connected to this schema yet — that
-- wiring happens in a later module. When that module starts, `data.ts`
-- and its imports in `DatabaseContext.tsx` get deleted/replaced with
-- real Supabase queries.


-- ============================================================================
-- 13. VERIFY RELATIONSHIPS  (structure-only checks — no data required)
-- ============================================================================
-- These confirm the TABLES and CONSTRAINTS are correct, without needing
-- any dummy rows. Run them after Section 1-11 above.
-- 1) Confirm all 17 tables exist:
-- select table_name from information_schema.tables
--   where table_schema = 'public' order by table_name;
--
-- 2) Confirm every foreign key relationship resolved correctly:
-- select conname, conrelid::regclass as table_name, confrelid::regclass as references_table
--   from pg_constraint where contype = 'f' and connamespace = 'public'::regnamespace
--   order by table_name;
--
-- 3) Confirm RLS is ON for every table (should return 17 rows, all "true"):
-- select relname as table_name, relrowsecurity as rls_enabled
--   from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
--   order by relname;
