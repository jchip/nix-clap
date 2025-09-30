/**
 * CLI with Command Arguments
 *
 * Demonstrates commands that accept arguments.
 *
 * Usage:
 *   npx tsx examples/cli-command-args.ts copy file.txt backup.txt
 *   npx tsx examples/cli-command-args.ts copy source.js dest.js
 *   npx tsx examples/cli-command-args.ts --help
 */

import { NixClap } from "../src/index.ts";

new NixClap().init({}, {
  copy: {
    desc: "Copy files",
    args: "<source string> <dest string>",
    exec: (cmd) => {
      const { source, dest } = cmd.jsonMeta.args;
      console.log(`Copying ${source} to ${dest}`);
    }
  }
}).parse();