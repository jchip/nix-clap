/**
 * CLI with Options
 *
 * Demonstrates parsing options and accessing them.
 *
 * Usage:
 *   npx tsx examples/cli-with-options.ts --name Alice
 *   npx tsx examples/cli-with-options.ts -n Bob
 *   npx tsx examples/cli-with-options.ts --help
 */

import { NixClap } from "../src/index.ts";

const nc = new NixClap()
  .init({
    name: { alias: "n", desc: "Your name", args: "<val string>" }
  });

// Access parsed options
const parsed = nc.parse();
const name = parsed.command.jsonMeta.opts.name;

if (name) {
  console.log(`Hello ${name}!`);
} else {
  console.log("Hello! Use --name to introduce yourself.");
}