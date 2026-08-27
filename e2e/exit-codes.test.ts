import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { consumerDir, runEslint } from "./helpers.js";

describe("exit codes", () => {
  it("exits 0 on a clean, well-formed .gitignore", async () => {
    const clean = "# files\n*.log\n\n# folders\ndist/\nnode_modules/\n";
    await writeFile(path.join(consumerDir(), ".gitignore"), clean);

    const result = await runEslint([".gitignore", "--format", "json"]);

    expect(result.exitCode).toBe(0);
    const [fileResult] = JSON.parse(result.stdout) as Array<{
      messages: unknown[];
    }>;
    expect(fileResult!.messages).toEqual([]);
  });
});
