import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FIXABLE_ONLY_LF, FIXABLE_ONLY_LF_FIXED } from "./fixtures.js";
import { consumerDir, runEslint } from "./helpers.js";

describe("CLI --fix (LF)", () => {
  it("converges to the exact expected bytes and a clean re-lint", async () => {
    const file = path.join(consumerDir(), ".gitignore");
    await writeFile(file, FIXABLE_ONLY_LF);

    const fixResult = await runEslint([".gitignore", "--fix"]);
    expect(fixResult.exitCode).toBe(0);

    const fixed = await readFile(file, "utf8");
    expect(fixed).toBe(FIXABLE_ONLY_LF_FIXED);

    const relint = await runEslint([".gitignore", "--format", "json"]);
    expect(relint.exitCode).toBe(0);
    const [fileResult] = JSON.parse(relint.stdout) as Array<{
      messages: unknown[];
    }>;
    expect(fileResult!.messages).toEqual([]);
  });
});
