-- KOL Contacts — CRM table for manually imported KOL data
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/xfytefubrmzramppppmd/sql/new

create table if not exists "KOLContacts" (
  id uuid primary key default gen_random_uuid(),
  "rowNo" integer,
  name text,
  "profileUrl" text not null,
  platform text not null,
  username text not null,
  categories text,
  followers integer,
  tier text,
  "erPercent" double precision,
  "avgViews" integer,
  gmv double precision,
  "scopeQty" integer,
  "scopeOfWork" text,
  "rateIdr" double precision,
  remarks text,
  domisili text,
  contact text,
  status text default 'cold',
  "importedAt" timestamp with time zone default now(),
  "updatedAt" timestamp with time zone default now(),
  unique(platform, username)
);

create index if not exists "idx_kolcontacts_platform" on "KOLContacts" (platform);
create index if not exists "idx_kolcontacts_tier" on "KOLContacts" (tier);
create index if not exists "idx_kolcontacts_followers" on "KOLContacts" (followers);
create index if not exists "idx_kolcontacts_rate" on "KOLContacts" ("rateIdr");
create index if not exists "idx_kolcontacts_categories" on "KOLContacts" (categories);
create index if not exists "idx_kolcontacts_domisili" on "KOLContacts" (domisili);

drop trigger if exists trg_kolcontacts_updated_at on "KOLContacts";
create trigger trg_kolcontacts_updated_at
  before update on "KOLContacts"
  for each row execute function update_updated_at_column();
