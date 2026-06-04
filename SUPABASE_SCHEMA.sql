-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/xfytefubrmzramppppmd/sql/new

create extension if not exists "pgcrypto";

create table if not exists "ProfileLookup" (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  username text not null,
  "profileUrl" text not null,
  "profilePicture" text,
  bio text,
  followers integer,
  following integer,
  "postCount" integer,
  "avgViews" double precision,
  "avgLikes" double precision,
  "avgComments" double precision,
  "avgShares" double precision,
  "engagementRate" double precision,
  "createdAt" timestamp with time zone default now(),
  "updatedAt" timestamp with time zone default now(),
  "lastSearchedAt" timestamp with time zone default now(),
  unique(platform, username)
);

create index if not exists "idx_profile_lastSearchedAt" on "ProfileLookup" ("lastSearchedAt");
create index if not exists "idx_profile_platform" on "ProfileLookup" (platform);
create index if not exists "idx_profile_followers" on "ProfileLookup" (followers);
create index if not exists "idx_profile_engagementRate" on "ProfileLookup" ("engagementRate");

create table if not exists "ContentMetrics" (
  id uuid primary key default gen_random_uuid(),
  "contentUrl" text not null,
  "contentType" text,
  views integer,
  likes integer,
  comments integer,
  shares integer,
  "postedAt" timestamp with time zone,
  "createdAt" timestamp with time zone default now(),
  "profileLookupId" uuid not null references "ProfileLookup"(id) on delete cascade
);

create index if not exists "idx_content_profileLookupId" on "ContentMetrics" ("profileLookupId");

-- Auto-update updatedAt on row update
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profile_updated_at on "ProfileLookup";
create trigger trg_profile_updated_at
  before update on "ProfileLookup"
  for each row execute function update_updated_at_column();
