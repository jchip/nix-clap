/**
 * Default Command Example
 *
 * Demonstrates using a default command that runs when no command is specified.
 *
 * Usage:
 *   npx tsx examples/default-command.ts                # Runs 'build' by default
 *   npx tsx examples/default-command.ts build          # Explicitly runs 'build'
 *   npx tsx examples/default-command.ts test           # Runs 'test' command
 *   npx tsx examples/default-command.ts --help
 */

import { NixClap } from "../src/index.ts";

// Make 'build' the default command
const nc = new NixClap({ defaultCommand: "build" })
  .version("1.0.0")
  .init2({
    subCommands: {
      build: {
        desc: "Build the project",
        exec: (cmd) => {
          console.log("Building the project...");
          console.log("✅ Build complete!");
        }
      },
      test: {
        desc: "Run tests",
        exec: (cmd) => {
          console.log("Running tests...");
          console.log("✅ All tests passed!");
        }
      }
    }
  });

// These are equivalent:
// $ npx tsx examples/default-command.ts
// $ npx tsx examples/default-command.ts build

nc.parse();