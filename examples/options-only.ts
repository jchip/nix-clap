/**
 * Options Only Example
 *
 * Demonstrates parsing options without commands.
 *
 * Usage:
 *   npx tsx examples/options-only.ts --names alice bob charlie
 *   npx tsx examples/options-only.ts -n alice -m bob
 *   npx tsx examples/options-only.ts --help
 */

import { NixClap } from "../src/index.ts";

const options = {
  names: {
    desc: "specify names",
    alias: ["n", "m"],
    args: "<name string..1,Inf>"
  }
};

const nc = new NixClap().version("1.0.0").usage("$0 [options]").init(options);
const parsed = nc.parse();

console.log("names", parsed.command.jsonMeta.opts.names);