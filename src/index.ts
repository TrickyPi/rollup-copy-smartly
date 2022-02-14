import fse from "fs-extra";
import { Plugin, ChangeEvent } from "rollup";

export interface Options {
  targets: Target[];
}

export interface Target {
  file: string;
  dest: string;
}

export default function copy({ targets }: Options): Plugin {
  //use glob to complete file path
  const changedFilesMap = new Map<string, ChangeEvent>(
    targets.map(({ file }) => [file, "create"])
  );
  const targetsMap = new Map(
    targets.map((item) => {
      const { file } = item;
      return [file, item];
    })
  );
  return {
    name: "copy",
    async buildStart() {
      targets.forEach(({ file }) => {
        this.addWatchFile(file);
      });
    },
    watchChange(id, e) {
      changedFilesMap.set(id, e.event);
    },
    async writeBundle() {
      changedFilesMap.forEach((event, file) => {
        const { dest } = targetsMap.get(file)!;
        switch (event) {
          case "delete":
            fse.rmSync(dest, { force: true });
            break;
          case "update":
          case "create":
            fse.ensureFileSync(dest);
            fse.appendFileSync(dest, fse.readFileSync(file));
            break;
        }
      });
      changedFilesMap.clear();
    },
  };
}
