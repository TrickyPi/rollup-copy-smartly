import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
import { readFileSync, rm, writeFile } from "node:fs";

const deps = JSON.parse(readFileSync("package.json", "utf-8")).dependencies;

export default defineConfig({
  input: "src/index.ts",
  output: [
    {
      format: "cjs",
      file: "dist/lib/index.js",
      exports: "default",
    },
    {
      format: "es",
      file: "dist/es/index.js",
    },
  ],
  external: [...Object.keys(deps), "path"],
  plugins: [
    typescript(),
    {
      name: "copy .d.ts",
      writeBundle(output, bundle) {
        const noop = () => {};
        rm("dist/lib/index.d.ts", noop);
        rm("dist/es/index.d.ts", noop);
        writeFile("dist/index.d.ts", bundle["index.d.ts"].source, noop);
      },
    },
  ],
});
