/**
 * Quick Start Example
 *
 * Demonstrates basic usage of NixClap with a simple command and option.
 *
 * Usage:
 *   npx tsx examples/quick-start.ts build
 *   npx tsx examples/quick-start.ts build --verbose
 *   npx tsx examples/quick-start.ts --help
 */

import { NixClap } from "../src/index.ts";

const nc = new NixClap()
  .version("1.0.0")
  .usage("$0 <command> [options]")
  .init(
    // Options
    { verbose: { alias: "v", desc: "Enable verbose output" } },
    // Commands
    { build: { desc: "Build the project", exec: (cmd) => console.log("Building...") } }
  );

nc.parse();