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
  .init2({
    options: {
      verbose: { alias: "v", desc: "Enable verbose output" }
    },
    subCommands: {
      build: {
        desc: "Build the project",
        exec: (cmd, breadcrumb) => {
          // Access verbose from root command using rootCmd property
          const verbose = cmd.rootCmd.jsonMeta.opts.verbose;
          console.log("Building...");
          console.log("Verbose flag", verbose);
          if (verbose) {
            console.log("Verbose mode enabled");
          }
        }
      }
    }
  });

nc.parse();
