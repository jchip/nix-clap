/**
 * Example: Default command should not apply to --help or --version
 *
 * This example demonstrates that when a defaultCommand is configured:
 * - `prog` or `prog --verbose` will run the default command (install)
 * - `prog --help` should show help for the ROOT command (all commands)
 * - `prog --version` should show the version
 *
 * The default command should NOT intercept --help or --version, otherwise
 * the user would only see help for the default command, not the full program.
 *
 * Usage:
 *   npx tsx examples/default-command-help.ts              # Runs install (default)
 *   npx tsx examples/default-command-help.ts --verbose    # Runs install with verbose
 *   npx tsx examples/default-command-help.ts --help       # Shows ROOT help (all commands)
 *   npx tsx examples/default-command-help.ts --version    # Shows version
 *   npx tsx examples/default-command-help.ts run script   # Runs the run command
 */

import { NixClap } from "../src/nix-clap.ts";

const nc = new NixClap({
  name: "prog",
  version: "1.0.0",
  defaultCommand: "install",
  unknownCommandFallback: "run"
}).init(
  {
    verbose: {
      alias: "V", // Note: using 'V' to not conflict with version's 'v'
      desc: "Enable verbose output"
    }
  },
  {
    install: {
      desc: "Install packages (default command)",
      options: {
        "force-install": {
          alias: "fi",
          desc: "Force install even if no files changed"
        }
      },
      exec: ({ opts }) => {
        console.log("[install] Running install command");
        if (opts.verbose) console.log("[install] Verbose mode enabled");
        if (opts["force-install"]) console.log("[install] Force install enabled");
      }
    },
    run: {
      desc: "Run a script",
      args: "[script string..]",
      exec: ({ args }) => {
        console.log(`[run] Running script: ${args.script?.join(" ") || "(none)"}`);
      }
    },
    global: {
      desc: "Manage global packages",
      subCommands: {
        install: {
          desc: "Install a package globally",
          args: "<package>",
          exec: ({ args }) => {
            console.log(`[global install] Installing globally: ${args.package}`);
          }
        }
      }
    }
  }
);

// Run with CLI args
const testArgs = process.argv.slice(2);
if (testArgs.length === 0) {
  console.log("Default Command Help Example");
  console.log("============================");
  console.log("");
  console.log("This example shows that --help and --version show root info,");
  console.log("not the default command's info.");
  console.log("");
  console.log("Try these commands:");
  console.log("  npx tsx examples/default-command-help.ts              # Runs install");
  console.log("  npx tsx examples/default-command-help.ts --verbose    # Runs install with verbose");
  console.log("  npx tsx examples/default-command-help.ts --help       # Shows ROOT help");
  console.log("  npx tsx examples/default-command-help.ts --version    # Shows version");
  console.log("  npx tsx examples/default-command-help.ts run myscript # Runs the run command");
  console.log("  npx tsx examples/default-command-help.ts myscript     # Falls back to run command");
  console.log("");
  // Run the default command
  nc.parse(["node", "prog"], 2);
} else {
  nc.parse(["node", "prog", ...testArgs], 2);
}
