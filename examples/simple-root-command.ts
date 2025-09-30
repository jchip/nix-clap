/**
 * Simple Root Command
 *
 * Demonstrates using init2() for a simple CLI that processes files.
 * Root command only executes when arguments are provided.
 *
 * Usage:
 *   npx tsx examples/simple-root-command.ts file.txt
 *   npx tsx examples/simple-root-command.ts file1.txt file2.txt
 *   npx tsx examples/simple-root-command.ts --help
 */

import { NixClap } from "../src/index.ts";

new NixClap({ name: "process" })
  .init2({
    args: "<files string..>",
    exec: (cmd) => {
      const files = cmd.jsonMeta.args.files;
      console.log(`Processing ${files.length} file(s):`);
      files.forEach(f => console.log(`  - ${f}`));
    }
  })
  .parse();