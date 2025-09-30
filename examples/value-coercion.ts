/**
 * Value Coercion Example
 *
 * Demonstrates custom value coercion using functions, RegExp, and constants.
 *
 * Usage:
 *   npx tsx examples/value-coercion.ts process --custom-fn hello --custom-regex test --custom-value anything
 *   npx tsx examples/value-coercion.ts process --custom-fn world
 *   npx tsx examples/value-coercion.ts convert abc def
 *   npx tsx examples/value-coercion.ts --help
 */

import { NixClap } from "../src/index.ts";

const commands = {
  process: {
    desc: "Process with custom options",
    options: {
      customFn: {
        args: "<val fnval>",
        desc: "Custom function coercion (returns first char)",
        customTypes: {
          fnval: value => value.substring(0, 1)
        }
      },
      customRegex: {
        args: "<val rx>",
        desc: "Custom RegExp coercion (must be 'test')",
        customTypes: {
          rx: /^test$/i
        }
      },
      customValue: {
        args: "<val foo>",
        desc: "Custom constant coercion (always returns 'bar')",
        customTypes: {
          foo: "bar"  // Always returns "bar"
        }
      }
    },
    exec: (cmd) => {
      const meta = cmd.jsonMeta;
      console.log("\n=== Custom Value Coercion ===\n");
      console.log("customFn result:", meta.opts.customFn);      // First char only
      console.log("customRegex result:", meta.opts.customRegex); // 'test' or undefined
      console.log("customValue result:", meta.opts.customValue); // Always 'bar'
    }
  },
  convert: {
    desc: "Convert with custom argument types",
    args: "<value1 type1> <value2 type2>",
    customTypes: {
      type1: value => `test-${value}`,
      type2: /^test$/i
    },
    exec: (cmd) => {
      const meta = cmd.jsonMeta;
      console.log("\n=== Command Argument Coercion ===\n");
      console.log("value1:", meta.args.value1); // Prefixed with 'test-'
      console.log("value2:", meta.args.value2); // Validated with regex
    }
  }
};

const nc = new NixClap()
  .version("1.0.0")
  .init({}, commands);

nc.parse();