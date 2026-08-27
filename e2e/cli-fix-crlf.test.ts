import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FIXABLE_ONLY_CRLF, FIXABLE_ONLY_CRLF_FIXED } from "./fixtures.js";
import { consumerDir, runEslint } from "./helpers.js";

describe("CLI --fix (CRLF)", () => {
  it("preserves CRLF byte-for-byte through the fix", async () => {
    const file = path.join(consumerDir(), ".gitignore");
    await writeFile(file, FIXABLE_ONLY_CRLF);

    const fixResult = await runEslint([".gitignore", "--fix"]);
    expect(fixResult.exitCode).toBe(0);

    // Buffer comparison (not a decoded string) is the point here: it's the
    // only way to be sure no "\r\n" silently became "\n" (or vice versa)
    // anywhere in the file, including the blank line the fixer inserts
    // between the two new sections.
    const fixedBytes = await readFile(file);
    expect(
      fixedBytes.equals(Buffer.from(FIXABLE_ONLY_CRLF_FIXED, "utf8")),
    ).toBe(true);
    // Every line terminator survived as "\r\n" -- no bare "\n" snuck in.
    expect(fixedBytes.toString("utf8").split("\r\n").join("")).not.toContain(
      "\n",
    );

    const relint = await runEslint([".gitignore", "--format", "json"]);
    expect(relint.exitCode).toBe(0);
  });
});
