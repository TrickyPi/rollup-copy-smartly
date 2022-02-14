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

//copy from https://github.com/rollup/rollup/blob/master/test/watch/index.js#L37
interface SequenceFunction {
  (event?: RollupWatcherEvent): void;
}
type SequenceEvents = (RollupWatcherEvent["code"] | SequenceFunction)[];
async function sequence(
  watcher: RollupWatcher,
  events: SequenceEvents,
  timeout = 300
) {
  function wait(timeout = 100) {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, timeout);
    });
  }
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
          .then(() => wait(timeout)) // gah, this appears to be necessary to fix random errors
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
  return wait(100);
}

const rollConfig: RollupOptions = {
  input: "__tests__/fixture/src/entry.js",
  output: {
    dir: "__tests__/fixture/dist/",
    format: "cjs",
  },
};

describe("test", async () => {
  afterEach(() => {
    fse.rmSync(resolve("__tests__/fixture/dist"), {
      force: true,
      recursive: true,
    });
  });
  test("update file", async () => {
    const file = resolve("__tests__/fixture/src/template.html");
    const dest = resolve("__tests__/fixture/dist/template.html");
    fse.writeFileSync(file, "");
    const copyPlugin = copy({
      targets: [
        {
          file: file,
          dest: dest,
        },
      ],
    });
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
      "START",
      "BUNDLE_START",
      "BUNDLE_END",
      "END",
      () => {
        const file = fse.readFileSync(dest, "utf-8");
        expect(file).toEqual("div");
      },
    ]);
    fse.rmSync(file);
  });
  test("rollup build", async () => {
    const file = resolve("__tests__/fixture/src/template.html");
    const dest = resolve("__tests__/fixture/dist/template.html");
    fse.writeFileSync(file, "build");
    const copyPlugin = copy({
      targets: [
        {
          file: file,
          dest: dest,
        },
      ],
    });
    const { input, output: outputOption } = rollConfig;
    const inputOptions = {
      input,
      plugins: [copyPlugin],
    };
    const bundle = await rollup(inputOptions);
    await bundle.write(outputOption as OutputOptions);
    await bundle.close();
    expect(fse.readFileSync(dest, "utf-8")).toEqual("build");
    fse.rmSync(file);
  });
});
