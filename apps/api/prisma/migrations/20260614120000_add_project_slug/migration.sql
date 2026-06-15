-- Step 1: Add slug column as nullable (no constraint yet)
ALTER TABLE "Project" ADD COLUMN "slug" TEXT;

-- Step 2: Backfill slug for existing rows
-- Slugify: lowercase, replace non-alnum runs with hyphen, strip leading/trailing hyphens.
-- ROW_NUMBER() window partitioned by slugified name ensures unique slugs when two projects
-- share the same name (first gets base slug, subsequent get base-2, base-3, etc.).
-- NOTE: unaccent extension is NOT used (not guaranteed on all hosts).
-- Accented characters become hyphens in SQL; JS slugify handles accents for new rows.
UPDATE "Project" p
SET "slug" = s.final_slug
FROM (
  SELECT
    id,
    CASE
      WHEN rn = 1 THEN base_slug
      ELSE base_slug || '-' || rn
    END AS final_slug
  FROM (
    SELECT
      id,
      COALESCE(
        NULLIF(
          regexp_replace(
            regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'),
            '^-+|-+$', '', 'g'
          ),
          ''
        ),
        'project'
      ) AS base_slug,
      ROW_NUMBER() OVER (
        PARTITION BY
          COALESCE(
            NULLIF(
              regexp_replace(
                regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'),
                '^-+|-+$', '', 'g'
              ),
              ''
            ),
            'project'
          )
        ORDER BY "createdAt"
      ) AS rn
    FROM "Project"
  ) sub
) s
WHERE p.id = s.id;

-- Step 3: Set NOT NULL constraint now that all rows have a slug
ALTER TABLE "Project" ALTER COLUMN "slug" SET NOT NULL;

-- Step 4: Create unique index
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
