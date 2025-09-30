/**
 * TypeScript Usage Example
 *
 * Demonstrates type-safe usage of NixClap with TypeScript using init2().
 *
 * Usage:
 *   npx tsx examples/typescript-usage.ts input.txt file2.txt
 *   npx tsx examples/typescript-usage.ts build --verbose
 *   npx tsx examples/typescript-usage.ts --help
 */

import { NixClap, CommandSpec, ParseResult } from "../src/index.ts";

// Define the root command spec with full type safety
const rootCommandSpec: CommandSpec = {
  desc: "Process files with TypeScript type safety",
  args: "[input string] [files string..]",
  options: {
    verbose: {
      alias: "v",
      desc: "Enable verbose output",
      args: "<flag boolean>"
    }
  },
  exec: (cmd) => {
    const meta = cmd.jsonMeta;
    console.log("\n=== Root Command (TypeScript) ===\n");
    console.log("Input:", meta.args.input); // Type-safe access
    console.log("Additional files:", meta.args.files);
    console.log("Verbose:", meta.opts.verbose);
  },
  subCommands: {
    build: {
      desc: "Build the project",
      exec: (cmd) => {
        // cmd is typed as CommandNode
        const meta = cmd.jsonMeta;
        console.log("\n=== Build Command ===\n");
        console.log("Building with verbose:", meta.opts.verbose); // Type-safe access
        console.log("✅ Build complete!");
      }
    }
  }
};

const nc = new NixClap().version("1.0.0").init2(rootCommandSpec);
const parsed: ParseResult = nc.parse();

console.log("\n=== Parse Result ===\n");
console.log("Command name:", parsed.command.name);
console.log("Has errors:", (parsed.errorNodes?.length ?? 0) > 0);