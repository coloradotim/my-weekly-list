import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const devScriptPath = join(repoRoot, "scripts/dev.sh");
const gitignorePath = join(repoRoot, ".gitignore");

const devScript = readFileSync(devScriptPath, "utf8");
const gitignore = readFileSync(gitignorePath, "utf8");

describe("dev server helper", () => {
  it("is executable and supports server lifecycle commands", () => {
    expect(statSync(devScriptPath).mode & 0o111).toBeGreaterThan(0);

    for (const command of ["start", "stop", "restart", "status", "logs"]) {
      expect(devScript).toContain(`${command})`);
    }
    expect(devScript).toContain("open|connect)");
  });

  it("runs next dev with configurable host and port", () => {
    expect(devScript).toContain('DEV_HOST="${DEV_HOST:-127.0.0.1}"');
    expect(devScript).toContain('DEV_PORT="${DEV_PORT:-3000}"');
    expect(devScript).toContain(
      'npm run dev -- --hostname "$DEV_HOST" --port "$DEV_PORT"',
    );
  });

  it("keeps local PID and log files out of git", () => {
    expect(gitignore).toContain(".dev/");
  });
});
