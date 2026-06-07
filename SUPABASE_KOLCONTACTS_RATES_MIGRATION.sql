-- KOLContacts: add rates[] array + primaryRate (denormalized for sort/filter)
-- Safe to run multiple times. Does NOT drop the old flat columns yet.
-- Drop them in a follow-up migration once app code is fully on rates[].
--
-- IMPORTANT: Table is "KOLContacts" (CamelCase). All identifiers quoted with
-- double quotes to preserve case — unquoted identifiers fold to lowercase
-- in PostgreSQL, which won't match the actual table/column names.

-- 1. Add the new columns (no-op if they exist)
ALTER TABLE "KOLContacts" ADD COLUMN IF NOT EXISTS rates jsonb;
ALTER TABLE "KOLContacts" ADD COLUMN IF NOT EXISTS "primaryRate" integer;

-- 2. Backfill rates[] from existing flat fields into a single-entry array
--    Only fills if at least one of the three flat fields was populated
--    AND rates is currently null (don't overwrite manual edits)
UPDATE "KOLContacts"
SET rates = jsonb_build_array(jsonb_build_object(
  'scope', COALESCE(NULLIF("scopeOfWork", ''), ''),
  'qty',   COALESCE("scopeQty", 1),
  'rate',  COALESCE("rateIdr", 0)
))
WHERE rates IS NULL
  AND (
    "scopeOfWork" IS NOT NULL
    OR "scopeQty" IS NOT NULL
    OR "rateIdr" IS NOT NULL
  );

-- 3. Backfill primaryRate from rates[0].rate (or from old rateIdr if no rates yet)
UPDATE "KOLContacts"
SET "primaryRate" = COALESCE(
  (rates->0->>'rate')::int,
  "rateIdr"
)
WHERE "primaryRate" IS NULL
  AND (
    (rates IS NOT NULL AND jsonb_array_length(rates) > 0)
    OR "rateIdr" IS NOT NULL
  );

-- 4. Index for sorting/filtering by primary rate
CREATE INDEX IF NOT EXISTS idx_kolcontacts_primary_rate
  ON "KOLContacts" ("primaryRate")
  WHERE "primaryRate" IS NOT NULL;
