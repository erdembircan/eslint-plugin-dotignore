import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    parser: "src/parser/index.ts",
  },
  format: "esm",
  dts: true,
  sourcemap: false,
  clean: true,
  outDir: "dist",
  fixedExtension: false,
});
