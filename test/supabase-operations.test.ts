import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const workflowPath = join(repoRoot, ".github/workflows/supabase-migrations.yml");
const statusScriptPath = join(repoRoot, "scripts/supabase-status.sh");
const migrateScriptPath = join(repoRoot, "scripts/supabase-migrate.sh");
const operationsDocPath = join(repoRoot, "docs/supabase-operations.md");

const workflow = readFileSync(workflowPath, "utf8");
const statusScript = readFileSync(statusScriptPath, "utf8");
const migrateScript = readFileSync(migrateScriptPath, "utf8");
const operationsDoc = readFileSync(operationsDocPath, "utf8");

describe("Supabase migration operations", () => {
  it("uses a manual GitHub Actions workflow with dry-run and apply modes", () => {
    expect(workflow).toContain("workflow_dispatch");
    expect(workflow).toContain("- dry-run");
    expect(workflow).toContain("- apply");
    expect(workflow).not.toMatch(/^  push:/m);
    expect(workflow).not.toMatch(/^  pull_request:/m);
  });

  it("documents and checks required Supabase secrets", () => {
    for (const secretName of [
      "SUPABASE_ACCESS_TOKEN",
      "SUPABASE_PROJECT_REF",
      "SUPABASE_DB_PASSWORD",
    ]) {
      expect(workflow).toContain(secretName);
      expect(operationsDoc).toContain(secretName);
    }
  });

  it("provides executable local status and migration scripts", () => {
    expect(statSync(statusScriptPath).mode & 0o111).toBeGreaterThan(0);
    expect(statSync(migrateScriptPath).mode & 0o111).toBeGreaterThan(0);
    expect(statusScript).toContain("supabase migration list");
    expect(migrateScript).toContain("supabase db push");
    expect(migrateScript).toContain("--dry-run");
  });

  it("keeps dashboard SQL edits exceptional and documents seed usage", () => {
    expect(operationsDoc).toContain("Manual SQL paste/edit");
    expect(operationsDoc).toContain("select public.seed_initial_weekly_list();");
    expect(operationsDoc).toContain(
      "Do not run the seed through browser code with a service-role key",
    );
  });
});
