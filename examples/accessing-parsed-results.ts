/**
 * Accessing Parsed Results Example
 *
 * Demonstrates different ways to access parsed data.
 *
 * Usage:
 *   npx tsx examples/accessing-parsed-results.ts compile file1.js file2.js --verbose
 *   npx tsx examples/accessing-parsed-results.ts compile file1.js --verbose --format json
 *   npx tsx examples/accessing-parsed-results.ts --help
 */

import { NixClap } from "../src/index.ts";

const options = {
  verbose: {
    alias: "v",
    desc: "Enable verbose output"
  },
  format: {
    alias: "f",
    desc: "Output format",
    args: "<fmt string>",
    argDefault: "text"
  }
};

const commands = {
  compile: {
    desc: "Compile files",
    args: "<files string..>",
    exec: (cmd) => {
      const meta = cmd.jsonMeta;

      console.log("\n=== Accessing Parsed Data ===\n");

      // Access via jsonMeta (recommended)
      console.log("Options:", meta.opts);        // { verbose: true, format: 'text' }
      console.log("Arguments:", meta.args);      // { files: ['file1.js', 'file2.js'] }
      console.log("Source:", meta.source);       // { verbose: 'cli', format: 'default' }

      console.log("\n=== Detailed Information ===\n");
      console.log("Files to compile:", meta.args.files);
      console.log("Verbose mode:", meta.opts.verbose ? "ON" : "OFF");
      console.log("Output format:", meta.opts.format);
      console.log("Format source:", meta.source.format);
    }
  }
};

const nc = new NixClap().init(options, commands);
const parsed = nc.parse();

// Check for errors
if (parsed.errorNodes && parsed.errorNodes.length > 0) {
  console.error("Parse errors:", parsed.errorNodes.map(n => n.error.message));
}