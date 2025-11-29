/**
 * Example: allowDuplicateOption - Sub-command with same option name as parent
 *
 * This demonstrates that sub-commands can have the same option name as their
 * parent command when `allowDuplicateOption: true` is set. The option is
 * resolved at the current command level, so sub-command options shadow
 * parent options.
 *
 * Usage:
 *   nvx tsx examples/allow-duplicate-option.ts --verbose build --verbose
 *   nvx tsx examples/allow-duplicate-option.ts -v build -v
 *   nvx tsx examples/allow-duplicate-option.ts --verbose=2 build --verbose=debug
 */

import { NixClap } from "../src/nix-clap.ts";

const nc = new NixClap({
  name: "prog",
  version: "1.0.0",
  // Enable duplicate option names between parent and sub-commands
  allowDuplicateOption: true
}).init(
  {
    // Root-level --verbose is a boolean flag
    verbose: {
      alias: "v",
      desc: "Enable verbose output (boolean)",
      // no args = boolean option
    }
  },
  {
    build: {
      desc: "Build the project",
      options: {
        // Sub-command --verbose takes a level argument
        verbose: {
          alias: "v",
          desc: "Verbosity level (e.g., 1, 2, debug, trace)",
          args: "<level>"
        }
      },
      exec: ({ opts, rootCmd }) => {
        console.log("[build] Root verbose:", rootCmd.opts.verbose ?? "(not set)");
        console.log("[build] Build verbose level:", opts.verbose ?? "(not set)");
      }
    },
    test: {
      desc: "Run tests",
      options: {
        // Another sub-command with same option but different behavior
        verbose: {
          alias: "v",
          desc: "Show verbose test output",
          // boolean like root
        }
      },
      exec: ({ opts, rootCmd }) => {
        console.log("[test] Root verbose:", rootCmd.opts.verbose ?? "(not set)");
        console.log("[test] Test verbose:", opts.verbose ?? "(not set)");
      }
    }
  }
);

const testArgs = process.argv.slice(2);
if (testArgs.length === 0) {
  console.log("allowDuplicateOption Example");
  console.log("============================");
  console.log("");
  console.log("With `allowDuplicateOption: true`, sub-commands can have the same");
  console.log("option name as parent commands. Options are resolved at the current");
  console.log("command level, so sub-command options shadow parent options.");
  console.log("");
  console.log("Examples:");
  console.log("  nvx tsx examples/allow-duplicate-option.ts --verbose build --verbose=debug");
  console.log("    → Root verbose: true, Build verbose: debug");
  console.log("");
  console.log("  nvx tsx examples/allow-duplicate-option.ts build --verbose=2");
  console.log("    → Root verbose: (not set), Build verbose: 2");
  console.log("");
  console.log("  nvx tsx examples/allow-duplicate-option.ts -v test -v");
  console.log("    → Root verbose: true, Test verbose: true");
  console.log("");
  nc.parse(["node", "prog", "--help"], 2);
} else {
  nc.parse(["node", "prog", ...testArgs], 2);
}
