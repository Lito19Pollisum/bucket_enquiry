-- Run once in Supabase > SQL Editor. Gives every enquiry a unique, server-assigned reference.
create table if not exists public.ref_counters (day text primary key, n int not null default 0);
alter table public.ref_counters enable row level security;

create unique index if not exists enquiries_enquiry_ref_uniq on public.enquiries (ref) where kind = 'enquiry';

create or replace function public.next_enquiry_ref() returns text language plpgsql security definer set search_path = public as $$
declare d text := to_char(now() at time zone 'Asia/Singapore', 'YYYYMMDD'); k int;
begin
  insert into public.ref_counters (day, n)
  values (d, (select coalesce(max(substring(ref from 14 for 3)::int), 0) + 1 from public.enquiries where kind = 'enquiry' and ref ~ ('^ENQ-' || d || '-[0-9]{3}$')))
  on conflict (day) do update set n = public.ref_counters.n + 1
  returning n into k;
  return 'ENQ-' || d || '-' || lpad(k::text, 3, '0');
end $$;
revoke execute on function public.next_enquiry_ref() from public, anon, authenticated;
grant execute on function public.next_enquiry_ref() to service_role;
