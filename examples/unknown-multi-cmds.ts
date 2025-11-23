/**
 * Unknown Multi Commands Example
 *
 * Demonstrates handling multiple unknown commands (like task runners).
 *
 * Usage:
 *   npx tsx examples/unknown-multi-cmds.ts task1 task2 task3
 */

import { NixClap } from "../src/index.ts";

const nc = new NixClap({
  allowUnknownCommand: true,
  allowUnknownOption: true
});

const r = nc.init2({}).parse(["task1", "task2", "task3"], 0);

console.log("Unknown commands:", Object.keys(r.command.subCmdNodes));

for (const [name, node] of Object.entries(r.command.subCmdNodes)) {
  console.log(`  ${name}:`, node.verbatimList);
}
