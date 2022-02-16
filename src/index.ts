import { resolve, relative } from "path";
import fse from "fs-extra";
import chokidar from "chokidar";
import { Plugin } from "rollup";
interface Target {
  src: string;
  pattern: RegExp | RegExp[];
  dest: string;
}

function isCopyFile(file: string, pattern: Target["pattern"]) {
  if (Array.isArray(pattern)) {
    let isCopyFile = false;
    for (let item of pattern) {
      if (item.test(file)) {
        isCopyFile = true;
        break;
      }
    }
    return isCopyFile;
  }
  return pattern.test(file);
}

function createWatcher(sources: string) {
  return chokidar.watch(sources, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 50,
    },
  });
}

function initWatcher({ src, pattern, dest }: Target) {
  const watcher = createWatcher(src);
  watcher.on("unlink", handleEevent.bind(null, "unlink"));
  watcher.on("add", handleEevent.bind(null, "add"));
  watcher.on("change", handleEevent.bind(null, "change"));
  function handleEevent(event: "unlink" | "add" | "change", file: string) {
    const absoluteFile = resolve(file);
    if (!isCopyFile(absoluteFile, pattern)) return;
    const destfile = resolve(dest, relative(src, file));
    switch (event) {
      case "unlink":
        fse.rmSync(destfile, { force: true });
        break;
      case "add":
      case "change":
        fse.copySync(absoluteFile, destfile);
        break;
    }
  }
}

function callOnceFactory<T extends Function>(fn: T, count: number) {
  let called = 0;
  return (...args: Parameters<T>) => {
    if (called >= count) return;
    count++;
    return fn(...args);
  };
}

export default function copy({ src, pattern, dest }: Target): Plugin {
  const initWatcherOnce = callOnceFactory<typeof initWatcher>(initWatcher, 1);
  return {
    name: "copy",
    writeBundle() {
      const dir = fse.readdirSync(src);
      dir.forEach((file) => {
        const absoluteFile = resolve(src, file);
        if (isCopyFile(absoluteFile, pattern)) {
          fse.copySync(absoluteFile, resolve(dest, file));
        }
      });
      this.meta.watchMode && initWatcherOnce({ src, pattern, dest });
    },
  };
}
