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
const contractPath = join(repoRoot, "docs/supabase-contract.md");

const migration = readFileSync(migrationPath, "utf8");
const weekActivityUniquenessMigration = readFileSync(
  weekActivityUniquenessMigrationPath,
  "utf8",
);
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

  it("keeps planned and done separate while leaving missed derived", () => {
    expect(migration).toContain("planned boolean not null default false");
    expect(migration).toContain("done boolean not null default false");
    expect(migration).not.toMatch(/\bmissed\b/);
    expect(contract).toContain("Missed is not stored");
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

  it("includes an idempotent authenticated seed function", () => {
    expect(migration).toContain("public.seed_initial_weekly_list()");
    expect(migration).toContain("current_user_id uuid := auth.uid()");
    expect(migration).toContain("on conflict do nothing");
    expect(contract).toContain("safe to run more than once");
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
