import fs from "fs";
import { resolve as pathResolve } from "path";
import { watch } from "rollup";
import { test, describe, expect, afterAll } from "vitest";

const watcher = watch({
  input: "fixture/src/entry.js",
  output: {
    dir: "dist",
    format: "cjs",
  },
});

afterAll(() => {
  watcher.close();
  // fs.rmdirSync("fixture/src/dist");
});

describe("test", () => {
  test("", () => {
    expect(1).toEqual(1);
  });
});
