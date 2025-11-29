/**
 * Boolean Flag Default True Example
 *
 * Demonstrates setting a boolean flag's default value to `true`.
 * Both required `< boolean>` and optional `[boolean]` syntax work.
 * When the flag is not provided, it defaults to true.
 * Use --no-cache or --cache=false to set it to false.
 *
 * Usage:
 *   nvx tsx examples/boolean-default-true.ts
 *   nvx tsx examples/boolean-default-true.ts --no-cache
 *   nvx tsx examples/boolean-default-true.ts --no-feature
 *   nvx tsx examples/boolean-default-true.ts --cache=false
 *   nvx tsx examples/boolean-default-true.ts --help
 */

import { NixClap } from "../src/index.ts";

const nc = new NixClap().init2({
  options: {
    cache: {
      alias: "c",
      desc: "Enable caching - required boolean syntax",
      args: "< boolean>",
      argDefault: "true"
    },
    feature: {
      alias: "f",
      desc: "Enable feature - optional boolean syntax",
      args: "[flag boolean]",
      argDefault: "true"
    }
  }
});

const parsed = nc.parse();
const meta = parsed.command.jsonMeta;

console.log("\n=== Boolean Default True Demo ===\n");
console.log("Options:", meta.opts);
console.log("Source:", meta.source);
console.log("\n--cache   '< boolean>' with argDefault 'true':", meta.opts.cache, `(${meta.source.cache})`);
console.log("--feature '[flag boolean]' with argDefault 'true':", meta.opts.feature, `(${meta.source.feature})`);
