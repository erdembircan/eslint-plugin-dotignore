import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** The consumer project scaffolded once in e2e/global-setup.ts, shared
 * read-only-except-for-.gitignore across every test in this suite. */
export function consumerDir(): string {
  const dir = process.env.E2E_CONSUMER_DIR;
  if (!dir) {
    throw new Error(
      "E2E_CONSUMER_DIR is not set -- global-setup.ts didn't run, or ran in a different process than this test.",
    );
  }
  return dir;
}

export interface EslintRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Runs the consumer's own installed ESLint against its own project, driven
 * exactly like a real user's `npx eslint <args>` would be, but invoked by
 * running ESLint's bin script directly under `node` rather than through the
 * platform's `.bin` shim. This is fully portable: on Windows, `.bin/eslint`
 * is a `.cmd`/shell shim that `execFile` can't launch without a shell, but
 * `node_modules/eslint/bin/eslint.js` is a plain JS file that `node` runs
 * identically on every platform -- no shell, no shim, no `.cmd` handling.
 */
export async function runEslint(args: string[]): Promise<EslintRunResult> {
  const dir = consumerDir();
  const eslintBin = path.join(
    dir,
    "node_modules",
    "eslint",
    "bin",
    "eslint.js",
  );

  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [eslintBin, ...args],
      { cwd: dir },
    );
    return { exitCode: 0, stdout, stderr };
  } catch (error) {
    // ESLint's CLI exits non-zero when it finds lint errors (1) or crashes
    // (2) -- `execFile` treats any non-zero exit as a rejected promise, but
    // that's the expected, informative shape for most of these tests, not
    // a real failure. `error.code` is the process exit code; stdout/stderr
    // are still captured on the error object.
    const execError = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
    };
    if (typeof execError.code === "number") {
      return {
        exitCode: execError.code,
        stdout: execError.stdout ?? "",
        stderr: execError.stderr ?? "",
      };
    }
    throw error;
  }
}

export interface GitCheckIgnoreResult {
  ignored: boolean;
}

/** Runs `git check-ignore` for a single path in the consumer project,
 * returning whether git considers it ignored. Exit code 0 means ignored,
 * 1 means not ignored -- both are normal outcomes, not failures. */
export async function gitCheckIgnore(
  relativePath: string,
): Promise<GitCheckIgnoreResult> {
  const dir = consumerDir();
  try {
    await execFileAsync("git", ["check-ignore", "--quiet", relativePath], {
      cwd: dir,
    });
    return { ignored: true };
  } catch (error) {
    const execError = error as { code?: number };
    if (execError.code === 1) {
      return { ignored: false };
    }
    throw error;
  }
}
