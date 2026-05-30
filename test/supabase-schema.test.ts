import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { initialWeeklyListSeed } from "@/lib/seed/initial-list";

const repoRoot = process.cwd();
const migrationPath = join(
  repoRoot,
  "supabase/migrations/20260528223000_initial_schema.sql",
);
const weekActivityUniquenessMigrationPath = join(
  repoRoot,
  "supabase/migrations/20260529040500_week_activity_snapshot_uniqueness.sql",
);
const activityDayCellSkippedMigrationPath = join(
  repoRoot,
  "supabase/migrations/20260530010000_activity_day_cells_skipped.sql",
);
const profileAccessMigrationPath = join(
  repoRoot,
  "supabase/migrations/20260530223000_profile_access_password_auth.sql",
);
const profileOnboardingMigrationPath = join(
  repoRoot,
  "supabase/migrations/20260531003000_profile_onboarding.sql",
);
const contractPath = join(repoRoot, "docs/supabase-contract.md");

const migration = readFileSync(migrationPath, "utf8");
const weekActivityUniquenessMigration = readFileSync(
  weekActivityUniquenessMigrationPath,
  "utf8",
);
const activityDayCellSkippedMigration = readFileSync(
  activityDayCellSkippedMigrationPath,
  "utf8",
);
const profileAccessMigration = readFileSync(profileAccessMigrationPath, "utf8");
const profileOnboardingMigration = readFileSync(profileOnboardingMigrationPath, "utf8");
const contract = readFileSync(contractPath, "utf8");

describe("Supabase schema migration", () => {
  it("defines the core app tables and RLS", () => {
    for (const tableName of [
      "profiles",
      "weeks",
      "categories",
      "activity_templates",
      "week_activities",
      "activity_day_cells",
    ]) {
      expect(migration).toContain(`public.${tableName}`);
      expect(migration).toContain(
        `alter table public.${tableName} enable row level security`,
      );
    }
  });

  it("keeps planned, done, and skipped separate while leaving missed derived", () => {
    expect(migration).toContain("planned boolean not null default false");
    expect(migration).toContain("done boolean not null default false");
    expect(activityDayCellSkippedMigration).toContain(
      "skipped boolean not null default false",
    );
    expect(activityDayCellSkippedMigration).toContain(
      "activity_day_cells_done_not_skipped",
    );
    expect(activityDayCellSkippedMigration).toContain("not (done and skipped)");
    expect(activityDayCellSkippedMigration).toContain(
      "activity_day_cells_skipped_requires_planned",
    );
    expect(activityDayCellSkippedMigration).toContain("not skipped or planned");
    expect(migration).not.toMatch(/\bmissed\b/);
    expect(contract).toContain("Missed is not stored");
    expect(contract).toContain("Skip preserves the original");
    expect(contract).toContain("done = true and skipped = true");
    expect(contract).toContain("skipped = true and planned = false");
  });

  it("protects weekly integrity and historical snapshots", () => {
    expect(migration).toContain("weeks_start_on_monday");
    expect(migration).toContain("activity_day_cells_unique_day");
    expect(weekActivityUniquenessMigration).toContain(
      "week_activities_week_template_unique",
    );
    expect(migration).toContain("category_name text not null");
    expect(migration).toContain("activity_name text not null");
    expect(migration).toContain("target_count integer not null");
    expect(contract).toContain("historical category snapshot");
    expect(contract).toContain("historical activity name snapshot");
  });

  it("deduplicates retry-created snapshots before adding the unique index", () => {
    expect(weekActivityUniquenessMigration).toContain("week_activity_duplicate_map");
    expect(weekActivityUniquenessMigration).toContain("first_value(id) over");
    expect(weekActivityUniquenessMigration).toContain(
      "keeper_cell.planned or duplicate_cell.planned",
    );
    expect(weekActivityUniquenessMigration).toContain(
      "keeper_cell.done or duplicate_cell.done",
    );
    expect(weekActivityUniquenessMigration).toContain(
      "delete from public.week_activities as duplicate_activity",
    );
    expect(weekActivityUniquenessMigration).toContain(
      "week_activities_week_template_unique",
    );
  });

  it("includes an idempotent authenticated seed function", () => {
    expect(migration).toContain("public.seed_initial_weekly_list()");
    expect(migration).toContain("current_user_id uuid := auth.uid()");
    expect(migration).toContain("on conflict do nothing");
    expect(contract).toContain("safe to run more than once");
  });

  it("stores manual user access and forced password-change state on profiles", () => {
    expect(profileAccessMigration).toContain("is_allowed boolean not null default false");
    expect(profileAccessMigration).toContain(
      "must_change_password boolean not null default false",
    );
    expect(profileAccessMigration).toContain(
      "Preserve access for users who already existed",
    );
    expect(profileAccessMigration).toContain("set is_allowed = true");
    expect(profileAccessMigration).toContain(
      "public.clear_own_password_change_required()",
    );
    expect(profileAccessMigration).toContain(
      'drop policy if exists "profiles are private to their user"',
    );
    expect(profileAccessMigration).toContain("for select");
    expect(profileAccessMigration).not.toContain("for all");
    expect(contract).toContain("is_allowed");
    expect(contract).toContain("must_change_password");
  });

  it("stores first-run onboarding completion on profiles", () => {
    expect(profileOnboardingMigration).toContain("onboarding_completed_at");
    expect(profileOnboardingMigration).toContain("mark_own_onboarding_complete");
    expect(profileOnboardingMigration).toContain("is_allowed = true");
    expect(profileOnboardingMigration).toContain("must_change_password = false");
    expect(contract).toContain("onboarding_completed_at");
  });
});

describe("initial weekly list seed", () => {
  it("matches the product-plan seed categories and activities", () => {
    expect(initialWeeklyListSeed).toHaveLength(6);
    expect(initialWeeklyListSeed.flatMap((category) => category.activities)).toHaveLength(
      24,
    );
    expect(initialWeeklyListSeed.map((category) => category.name)).toEqual([
      "Physical Health",
      "Mental Health",
      "Family and Home",
      "Relationship Health",
      "Hobbies",
      "Work",
    ]);
  });

  it("is represented in the SQL seed function", () => {
    for (const category of initialWeeklyListSeed) {
      expect(migration).toContain(`'${category.name}'`);
      for (const activity of category.activities) {
        expect(migration).toContain(`'${activity.name}'`);
        expect(migration).toContain(`, ${activity.target},`);
      }
    }
  });
});
