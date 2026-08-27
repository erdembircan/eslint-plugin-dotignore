import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// This file lives at <repo>/e2e/global-setup.ts, so its own location (not
// process.cwd(), which vitest may or may not pin to the repo root) is the
// one reliable way to find the repo we're building and packing.
const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * A realistic consumer default: plain JavaScript (not TypeScript -- most
 * consumers won't have a TS config-loading pipeline set up), spreading the
 * plugin's `strict` preset so every rule this suite might exercise is live,
 * mirroring the project's own README quick-start with `strict` in place of
 * `recommended`.
 */
const CONSUMER_ESLINT_CONFIG = `import dotignore from "eslint-plugin-dotignore";

export default [dotignore.configs.strict];
`;

/**
 * `pnpm` and `npm` are `.cmd` shims on Windows; `execFile` can launch a
 * `.cmd` file directly (Windows' CreateProcess resolves it fine given the
 * explicit extension), but can't resolve the *bare*, extension-less name
 * the way a shell's PATH lookup would. Appending `.cmd` on win32 is the
 * standard, documented fix (the same one `cross-spawn` and similar
 * libraries use) -- no `shell: true` needed, which also means no shell
 * quoting/escaping concerns at all, unlike the (rejected) alternative of
 * shelling out with `shell: true` and an args array (Node itself flags
 * that combination as unsafe as of DEP0190). Real ESLint invocations (the
 * actual subject under test) go through a different helper entirely --
 * `node <eslint.js>`, no shell or shim resolution involved (e2e/helpers.ts).
 */
function packageManagerCommand(name: "pnpm" | "npm"): string {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

function runPackageManager(
  command: "pnpm" | "npm",
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(packageManagerCommand(command), args, { cwd });
}

export default async function setup() {
  await runPackageManager("pnpm", ["build"], REPO_ROOT);

  const packDir = await mkdtemp(path.join(tmpdir(), "dotignore-e2e-pack-"));
  const { stdout } = await runPackageManager(
    "pnpm",
    ["pack", "--pack-destination", packDir, "--json"],
    REPO_ROOT,
  );
  const packResult = JSON.parse(stdout) as { filename: string };
  const tarballPath = packResult.filename;

  const consumerDir = await mkdtemp(
    path.join(tmpdir(), "dotignore-e2e-consumer-"),
  );

  await writeFile(
    path.join(consumerDir, "package.json"),
    `${JSON.stringify(
      {
        name: "dotignore-e2e-consumer",
        version: "0.0.0",
        private: true,
        type: "module",
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    path.join(consumerDir, "eslint.config.js"),
    CONSUMER_ESLINT_CONFIG,
  );

  // npm's install produces a plain, flat, fully-copied node_modules with no
  // symlinks -- chosen over `pnpm add` specifically for this scaffold
  // because pnpm's own store/symlink model wants a real project identity
  // (workspace lookup, engines/store resolution) that fights an ad hoc
  // temp directory, and because Windows CI runners have historically been
  // the flakiest place for pnpm's symlinked node_modules (junction
  // creation can need elevated permissions). A plain npm install sidesteps
  // both, at the cost of being slower and less space-efficient -- an
  // acceptable trade for a one-shot throwaway consumer project.
  await runPackageManager(
    "npm",
    ["install", "--no-audit", "--no-fund", "--silent", "eslint", tarballPath],
    consumerDir,
  );

  await execFileAsync("git", ["init", "--quiet"], { cwd: consumerDir });
  await execFileAsync("git", ["config", "user.email", "e2e@example.invalid"], {
    cwd: consumerDir,
  });
  await execFileAsync("git", ["config", "user.name", "E2E Suite"], {
    cwd: consumerDir,
  });
  // Every consumer test writes its own fresh `.gitignore` and expects
  // `git check-ignore` to react to it alone -- an empty initial commit
  // gives `git` a HEAD to operate against without tying any test's
  // behavior to committed content.
  await execFileAsync(
    "git",
    ["commit", "--quiet", "--allow-empty", "-m", "root"],
    { cwd: consumerDir },
  );

  process.env.E2E_CONSUMER_DIR = consumerDir;

  return async function teardown() {
    await rm(consumerDir, { recursive: true, force: true });
    await rm(packDir, { recursive: true, force: true });
  };
}

// Re-exported purely so a test can assert the scaffold's own shape
// (e.g. that the config really is plain JS) without hardcoding the
// constant twice.
export { CONSUMER_ESLINT_CONFIG };
