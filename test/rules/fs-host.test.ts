import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  lstatSync: vi.fn(),
  readdirSync: vi.fn(),
}));

describe("realFsHost", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("kind", () => {
    it("returns 'dir' for a directory", async () => {
      const fs = await import("node:fs");
      vi.mocked(fs.lstatSync).mockReturnValue({
        isSymbolicLink: () => false,
        isDirectory: () => true,
        isFile: () => false,
      } as ReturnType<typeof fs.lstatSync>);

      const { realFsHost } = await import("../../src/rules/fs-host.js");
      expect(realFsHost.kind("/some/dir")).toBe("dir");
    });

    it("returns 'file' for a regular file", async () => {
      const fs = await import("node:fs");
      vi.mocked(fs.lstatSync).mockReturnValue({
        isSymbolicLink: () => false,
        isDirectory: () => false,
        isFile: () => true,
      } as ReturnType<typeof fs.lstatSync>);

      const { realFsHost } = await import("../../src/rules/fs-host.js");
      expect(realFsHost.kind("/some/file")).toBe("file");
    });

    it("returns 'symlink' for a symbolic link, checked before dir/file", async () => {
      const fs = await import("node:fs");
      vi.mocked(fs.lstatSync).mockReturnValue({
        isSymbolicLink: () => true,
        isDirectory: () => true,
        isFile: () => false,
      } as ReturnType<typeof fs.lstatSync>);

      const { realFsHost } = await import("../../src/rules/fs-host.js");
      expect(realFsHost.kind("/some/link")).toBe("symlink");
    });

    it("returns 'missing' for a path that is none of dir/file/symlink", async () => {
      const fs = await import("node:fs");
      vi.mocked(fs.lstatSync).mockReturnValue({
        isSymbolicLink: () => false,
        isDirectory: () => false,
        isFile: () => false,
      } as ReturnType<typeof fs.lstatSync>);

      const { realFsHost } = await import("../../src/rules/fs-host.js");
      expect(realFsHost.kind("/some/socket")).toBe("missing");
    });

    it("returns 'missing' when lstatSync throws", async () => {
      const fs = await import("node:fs");
      vi.mocked(fs.lstatSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });

      const { realFsHost } = await import("../../src/rules/fs-host.js");
      expect(realFsHost.kind("/does/not/exist")).toBe("missing");
    });
  });

  describe("readdir", () => {
    it("returns the entry list for a readable directory", async () => {
      const fs = await import("node:fs");
      vi.mocked(fs.readdirSync).mockReturnValue([
        "a",
        "b",
      ] as unknown as ReturnType<typeof fs.readdirSync>);

      const { realFsHost } = await import("../../src/rules/fs-host.js");
      expect(realFsHost.readdir("/some/dir")).toEqual(["a", "b"]);
    });

    it("returns null when readdirSync throws", async () => {
      const fs = await import("node:fs");
      vi.mocked(fs.readdirSync).mockImplementation(() => {
        throw new Error("ENOTDIR");
      });

      const { realFsHost } = await import("../../src/rules/fs-host.js");
      expect(realFsHost.readdir("/not/a/dir")).toBeNull();
    });
  });
});
