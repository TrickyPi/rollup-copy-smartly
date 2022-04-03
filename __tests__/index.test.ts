import fse from "fs-extra";
import { resolve } from "path";
import {
  watch,
  rollup,
  RollupOptions,
  RollupWatcher,
  RollupWatcherEvent,
  OutputOptions,
} from "rollup";
import { test, describe, expect, afterEach } from "vitest";
import copy from "../src/index";

interface SequenceFunction {
  (event?: RollupWatcherEvent): void;
}

type SequenceEvents = (RollupWatcherEvent["code"] | SequenceFunction)[];

function wait(timeout = 333) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

async function sequence(
  watcher: RollupWatcher,
  events: SequenceEvents,
  timeout = 333
) {
  await new Promise<void>((fulfil, reject) => {
    function go(event?: RollupWatcherEvent) {
      const next = events.shift();
      if (!next) {
        watcher.close();
        fulfil();
      } else if (typeof next === "string") {
        watcher.once("event", (event) => {
          if (event.code !== next) {
            watcher.close();
            if (event.code === "ERROR") console.log(event.error);
            reject(new Error(`Expected ${next} event, got ${event.code}`));
          } else {
            go(event);
          }
        });
      } else {
        Promise.resolve()
          .then(() => wait(timeout))
          .then(() => next(event))
          .then(() => go())
          .catch((error) => {
            watcher.close();
            reject(error);
          });
      }
    }
    go();
  });
  return wait(timeout);
}

const rollConfig: RollupOptions = {
  input: "__tests__/fixture/src/entry.js",
  output: {
    dir: "__tests__/fixture/dist/",
    format: "cjs",
  },
};

describe("test", async () => {
  const copyPlugin = copy({
    src: "__tests__/fixture/src",
    pattern: /\.html$/,
    dest: "__tests__/fixture/dist",
  });
  const file = resolve("__tests__/fixture/src/template.html");
  const destFile = resolve("__tests__/fixture/dist/template.html");

  afterEach(() => {
    fse.rmSync(resolve("__tests__/fixture/dist"), {
      force: true,
      recursive: true,
    });
    fse.rmSync(file, { force: true });
  });

  test("rollup build", async () => {
    fse.writeFileSync(file, "build");
    const { input, output: outputOption } = rollConfig;
    const inputOptions = {
      input,
      plugins: [copyPlugin],
    };
    const bundle = await rollup(inputOptions);
    await bundle.write(outputOption as OutputOptions);
    await bundle.close();
    await wait(333);
    expect(fse.readFileSync(destFile, "utf-8")).toEqual("build");
  });
  test("update file", async () => {
    fse.writeFileSync(file, "");
    rollConfig.plugins = [copyPlugin];
    const watcher = watch(rollConfig);
    await sequence(watcher, [
      "START",
      "BUNDLE_START",
      "BUNDLE_END",
      "END",
      () => {
        fse.writeFileSync(file, "div");
      },
      () => {
        const content = fse.readFileSync(destFile, "utf-8");
        expect(content).toEqual("div");
      },
    ]);
  });
  test("delete file", async () => {
    fse.writeFileSync(file, "div");
    rollConfig.plugins = [copyPlugin];
    const watcher = watch(rollConfig);
    await sequence(watcher, [
      "START",
      "BUNDLE_START",
      "BUNDLE_END",
      "END",
      () => {
        expect(fse.existsSync(destFile)).toBe(true);
        fse.rmSync(file);
      },
      () => {
        expect(fse.existsSync(destFile)).toBe(false);
      },
    ]);
  });
  test("add file", async () => {
    rollConfig.plugins = [copyPlugin];
    const watcher = watch(rollConfig);
    await sequence(watcher, [
      "START",
      "BUNDLE_START",
      "BUNDLE_END",
      "END",
      () => {
        fse.writeFileSync(file, "div");
      },
      () => {
        const content = fse.readFileSync(destFile, "utf-8");
        expect(content).toEqual("div");
      },
    ]);
  });
});
