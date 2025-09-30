/**
 * With Commands Example
 *
 * Demonstrates commands with arguments and options.
 *
 * Usage:
 *   npx tsx examples/with-commands.ts compile file1.jsx file2.jsx file3.jsx
 *   npx tsx examples/with-commands.ts compile --verbose file1.jsx file2.jsx
 *   npx tsx examples/with-commands.ts compile file1.jsx --verbose
 *   npx tsx examples/with-commands.ts --help
 */

import { NixClap } from "../src/index.ts";

const options = {
  verbose: {
    desc: "enable verbose mode",
    alias: "v",
    args: "<flag boolean>",
    argDefault: "false"
  }
};

const commands = {
  compile: {
    desc: "run compile on the files",
    args: "<files...>",
    exec: cmd => {
      const meta = cmd.jsonMeta;
      console.log("compile", meta.args.files, "verbose", meta.opts.verbose);
    }
  }
};

const nc = new NixClap()
  .version("1.0.0")
  .usage("$0 [options] <command> [options]")
  .init(options, commands);

nc.parse();