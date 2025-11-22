/**
 * Example: Subcommand requirement behavior
 *
 * This example demonstrates what happens when:
 * - There's a top-level command "install"
 * - There's a top-level command "global" with subcommands "add" and "remove"
 * - "global" has no exec and no args - it REQUIRES a subcommand
 * - User types: `prog global install lodash`
 *
 * BEHAVIOR: Since "global" requires a subcommand (has subcommands, no exec, no args),
 * "install" is NOT allowed to bubble up to become a sibling command. Instead:
 * - If allowUnknownCommand is false (default): Error "requires a subcommand"
 * - If allowUnknownCommand is true: "install" becomes an unknown subcommand of "global"
 *
 * This prevents the confusing behavior where `prog global install` would run both
 * "global" and "install" as sibling commands.
 *
 * Usage:
 *   npx tsx examples/subcommand-collision.ts install lodash       # Works
 *   npx tsx examples/subcommand-collision.ts global add lodash    # Works
 *   npx tsx examples/subcommand-collision.ts global install       # Error: requires subcommand
 */

import { NixClap } from "../src/nix-clap.ts";

const nc = new NixClap({
  name: "prog",
  version: "1.0.0"
}).init2({
  subCommands: {
    install: {
      desc: "Install a package locally",
      args: "<package>",
      exec: ({ args }) => {
        console.log(`[install] Installing package locally: ${args.package}`);
      }
    },
    global: {
      desc: "Global package management",
      // No exec, no args - requires a subcommand
      subCommands: {
        add: {
          desc: "Add a package globally",
          args: "<package>",
          exec: ({ args }) => {
            console.log(`[global add] Adding package globally: ${args.package}`);
          }
        },
        remove: {
          desc: "Remove a package globally",
          args: "<package>",
          exec: ({ args }) => {
            console.log(`[global remove] Removing package globally: ${args.package}`);
          }
        }
      }
    }
  }
});

// Run with CLI args
const testArgs = process.argv.slice(2);
if (testArgs.length === 0) {
  console.log("Subcommand Requirement Example");
  console.log("==============================");
  console.log("");
  console.log("Usage:");
  console.log("  npx tsx examples/subcommand-collision.ts install lodash");
  console.log("  npx tsx examples/subcommand-collision.ts global add lodash");
  console.log("  npx tsx examples/subcommand-collision.ts global install  # Error!");
  console.log("");
  console.log("The last command errors because 'global' requires a valid subcommand.");
} else {
  const result = nc.parse(["node", "prog", ...testArgs], 2);
  console.log("\n--- Parsed Structure ---");
  console.log(JSON.stringify(result.command?.jsonMeta, null, 2));
}
