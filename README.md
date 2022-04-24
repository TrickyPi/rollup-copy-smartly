# rollup-copy-smartly

## Features

Smartly copy files if they are changed, created or deleted.

## Getting Started

```console
npm install --save-dev rollup-copy-smartly
```

or

```console
yarn add -D rollup-copy-smartly
```

or

```console
pnpm add -D rollup-copy-smartly
```

## Use

**rollup.config.js**

```js
import copy from "rollup-copy-smartly";
export default {
    ...
    plugins: [
        copy({
            src: "src/",
            pattern: /.html$/,
            dest: "dist/",
        }),
    ],
};
```

## Options

| option  | type                | description                                                                          |
| ------- | ------------------- | ------------------------------------------------------------------------------------ |
| src     | string              | Path to dir which will be watching, it could be absolute path or relative path      |
| pattern | RegExp or RegExp[ ] | Filter specific files                                                                |
| dest    | string or string[ ] | Paths to dir which are output directorys, it could be absolute path or relative path |
