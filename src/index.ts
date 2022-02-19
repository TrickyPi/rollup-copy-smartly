import { resolve, relative } from "path";
import fse, { Dirent } from "fs-extra";
import chokidar, { FSWatcher } from "chokidar";
import { Plugin } from "rollup";

interface NormalizedTarget {
  src: string;
  pattern: RegExp[];
  dest: string[];
}
interface CopyTarget {
  src: string;
  pattern: RegExp | RegExp[];
  dest: string | string[];
}

function isCopyFile(file: string, pattern: NormalizedTarget["pattern"]) {
  let isCopyFile = false;
  for (let item of pattern) {
    if (item.test(file)) {
      isCopyFile = true;
      break;
    }
  }
  return isCopyFile;
}

function createWatcher(sources: string) {
  return chokidar.watch(sources, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 50,
    },
  });
}

function initWatcher({ src, pattern, dest }: NormalizedTarget) {
  const watcher = createWatcher(src);
  watcher.on("unlink", handleEevent.bind(null, "unlink"));
  watcher.on("add", handleEevent.bind(null, "add"));
  watcher.on("change", handleEevent.bind(null, "change"));
  function handleEevent(event: "unlink" | "add" | "change", file: string) {
    const absoluteFile = resolve(file);
    if (!isCopyFile(absoluteFile, pattern)) return;
    dest.forEach((destItem) => {
      const destfile = resolve(destItem, relative(src, file));
      switch (event) {
        case "unlink":
          fse.rmSync(destfile, { force: true });
          break;
        case "add":
        case "change":
          fse.copyFileSync(absoluteFile, destfile);
          break;
      }
    });
  }
  return watcher;
}

function getFile(dir: string) {
  function readdir(dir: string): [Dirent, string][] {
    return fse.readdirSync(dir, { withFileTypes: true }).map((item) => {
      return [item, resolve(dir, item.name)];
    });
  }
  let files = [];
  const stack = readdir(dir);
  while (stack.length) {
    const [item, absolutePath] = stack.shift()!;
    if (item!.isDirectory()) {
      stack.push(...readdir(absolutePath));
    } else {
      files.push(absolutePath);
    }
  }
  return files;
}

function normalize({ src, pattern, dest }: CopyTarget) {
  return {
    src,
    pattern: toArray(pattern) as RegExp[],
    dest: toArray(dest) as string[],
  };
}

function toArray<T>(value: T) {
  return Array.isArray(value) ? value : [value];
}

let watcher: FSWatcher | null = null;

export default function copy(copyTarget: CopyTarget): Plugin {
  const { src, pattern, dest } = normalize(copyTarget);
  return {
    name: "copy",
    writeBundle() {
      getFile(src).forEach((file) => {
        if (isCopyFile(file, pattern)) {
          dest.forEach((destItem) => {
            fse.copyFileSync(file, resolve(destItem, relative(src, file)));
          });
        }
      });
      if (this.meta.watchMode && !watcher) {
        watcher = initWatcher({ src, pattern, dest });
      }
    },
    closeWatcher() {
      if (watcher) {
        watcher.close();
        watcher = null;
      }
    },
  };
}
