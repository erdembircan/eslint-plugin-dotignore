import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MESSY_LF, MESSY_LF_EXPECTED_RULE_IDS } from "./fixtures.js";
import { consumerDir, runEslint } from "./helpers.js";

interface LintMessage {
  ruleId: string;
}
interface LintResult {
  messages: LintMessage[];
  errorCount: number;
}

describe("CLI findings", () => {
  it("flags the expected set of rules on a messy LF .gitignore and exits 1", async () => {
    await writeFile(path.join(consumerDir(), ".gitignore"), MESSY_LF);

    const result = await runEslint([".gitignore", "--format", "json"]);

    expect(result.exitCode).toBe(1);
    const [fileResult] = JSON.parse(result.stdout) as LintResult[];
    const ruleIds = [
      ...new Set(fileResult!.messages.map((m) => m.ruleId)),
    ].sort();
    expect(ruleIds).toEqual(MESSY_LF_EXPECTED_RULE_IDS);
    expect(fileResult!.errorCount).toBe(9);
  });
});
