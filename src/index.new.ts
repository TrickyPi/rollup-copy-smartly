import fse from "fs-extra";
import chokidar, { watch } from "chokidar";
import { Plugin } from "rollup";
interface Target {
  src: string;
  pattern: RegExp[] | RegExp;
  dest: string;
}

function createWatcher(sources: string) {
  return chokidar.watch(sources, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 50,
      pollInterval: 10,
    },
  });
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

function initWatcher({ src, pattern, dest }: Target) {
  const watcher = createWatcher(src);
  watcher.on("unlink", handleEevent.bind(null, "unlink"));
  watcher.on("add", handleEevent.bind(null, "add"));
  watcher.on("change", handleEevent.bind(null, "change"));
  function handleEevent(event: "unlink" | "add" | "change", file: string) {
    if (!isCopyFile(file, pattern)) return;
    switch (event) {
      case "unlink":
        delDirectly(file);
        break;
      case "add":
      case "change":
        copyDirectly(file);
        break;
    }
  }
  function copyDirectly(file: string) {}
  function delDirectly(file: string) {}
}

export default function copy({ src, pattern, dest }: Target): Plugin {
  const isWatch = false;
  if (!isWatch) {
    return {
      name: "copy",
      writeBundle() {
        const dir = fse.readdirSync(src);
        dir.forEach((file) => {
          if (isCopyFile(file, pattern)) {
            fse.copyFileSync(file, dest);
          }
        });
      },
    };
  }
  //create a watcher
  initWatcher({ src, pattern, dest });
  return {
    name: "copy",
  };
}
