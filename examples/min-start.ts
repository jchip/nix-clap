/**
 * Minimal Start Example
 *
 * Demonstrates the absolute minimum code needed to use NixClap.
 * Parses any CLI options and shows how to access them.
 *
 * Note that options must use flag=value form, because for unknown
 * options there's no way for the parser to know if it should look
 * for more arguments.
 *
 * Usage:
 *   npx tsx examples/min-start.ts --name=Alice --age=30
 *   npx tsx examples/min-start.ts --help
 */

import { NixClap } from "../src/index.ts";

const parsed = new NixClap().init2().parse();

console.log("Parsed options:", parsed.command.jsonMeta.opts);
console.log("Remaining arguments:", parsed._);
