-- ============================================================================
-- ECOLOOP — MODULE 4: AUTHENTICATION TRIGGER
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Prerequisite: Module 3 schema (module3_database_schema.sql) must already be run.
-- ============================================================================
-- WHAT THIS DOES (plain English):
-- The frontend's signUp() call (src/services/authService.ts) creates a row in
-- Supabase's built-in `auth.users` table and attaches "metadata" to it (role,
-- full name, phone, vehicle info, company info, etc.) — but the frontend never
-- inserts into `public.profiles` directly.
--
-- Instead, the moment a new `auth.users` row is created, this trigger fires
-- automatically and:
--   1. Builds a cosmetic display_code like 'C-4821' (role initial + random digits)
--   2. Inserts one row into public.profiles
--   3. Inserts one matching row into customer_profiles / partner_profiles /
--      industry_profiles, depending on the role in the metadata
--
-- This guarantees a user can never end up "half signed up" (an auth.users row
-- with no profile) even if the frontend crashes mid-registration.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
  v_prefix text;
  v_display_code text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'customer');

  v_prefix := case v_role
    when 'partner'  then 'P'
    when 'industry' then 'I'
    when 'admin'    then 'A'
    else 'C'
  end;
  v_display_code := v_prefix || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');

  insert into public.profiles (
    id, display_code, role, status, full_name, email, phone, address, city, state, pincode
  ) values (
    new.id,
    v_display_code,
    v_role,
    case when v_role in ('partner', 'industry') then 'Pending Approval' else 'Active' end,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'company_name', 'New User'),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'pincode'
  );

  if v_role = 'customer' then
    insert into public.customer_profiles (user_id) values (new.id);

  elsif v_role = 'partner' then
    insert into public.partner_profiles (user_id, vehicle_type, vehicle_number, driving_license, aadhaar_number)
    values (
      new.id,
      new.raw_user_meta_data->>'vehicle_type',
      new.raw_user_meta_data->>'vehicle_number',
      new.raw_user_meta_data->>'driving_license',
      new.raw_user_meta_data->>'aadhaar_number'
    );

  elsif v_role = 'industry' then
    insert into public.industry_profiles (user_id, company_name, industry_type, gst_number, registration_number, contact_person)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'company_name', 'Unnamed Company'),
      new.raw_user_meta_data->>'industry_type',
      new.raw_user_meta_data->>'gst_number',
      new.raw_user_meta_data->>'registration_number',
      new.raw_user_meta_data->>'contact_person'
    );
  end if;

  return new;
end;
$$;

-- Fire the function above every time a new user signs up.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- NOTE ON RLS: the function above runs as `security definer`, meaning it can
-- write to public.profiles / customer_profiles / etc. even though the RLS
-- policies from Module 3 would normally block a brand-new, just-signed-up user
-- from inserting rows for themselves via a direct query. This is the standard,
-- recommended Supabase pattern for "create profile on signup".
-- ============================================================================