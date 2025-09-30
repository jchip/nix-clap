"use strict";

import { NixClap } from "../src/index.ts";

/*
 * Example demonstrating root command usage with arguments using init2().
 *
 * This example shows a file processor that can be invoked directly without
 * sub-commands, while still supporting traditional sub-commands for specific operations.
 *
 * Usage examples:
 *   # Root command (direct file processing)
 *   npx tsx examples/root-command.ts input.txt
 *   npx tsx examples/root-command.ts input.txt --output output.txt
 *   npx tsx examples/root-command.ts input.txt -o output.txt --verbose
 *   npx tsx examples/root-command.ts input.txt file2.txt file3.txt
 *
 *   # Sub-commands (specific operations)
 *   npx tsx examples/root-command.ts convert input.txt output.txt
 *   npx tsx examples/root-command.ts validate data.json schema.json
 *   npx tsx examples/root-command.ts analyze file1.txt file2.txt --verbose
 *   npx tsx examples/root-command.ts analyze
 *
 *   # Help
 *   npx tsx examples/root-command.ts --help
 */

const nc = new NixClap({
  name: "file-processor",
  allowUnknownOption: false
})
  .version("1.0.0")
  .usage("$0 [options] <input-file> [additional-files...]")
  .init2({
    desc: "Process files with various options and formats",
    args: "[inputFile string] [additionalFiles string..]",

    // Root-level options (shared across all commands)
    options: {
      output: {
        alias: "o",
        desc: "Output file path",
        args: "<path string>"
      },
      verbose: {
        alias: "v",
        desc: "Enable verbose output"
      },
      format: {
        alias: "f",
        desc: "Output format",
        args: "<fmt>",
        argDefault: "text",
        customTypes: {
          fmt: /^(text|json|xml)$/
        }
      }
    },

    // Root command execution handler
    exec: (cmd) => {
      const meta = cmd.jsonMeta;
      const inputFile = meta.args.inputFile;
      const additionalFiles = meta.args.additionalFiles || [];
      const outputFile = meta.opts.output || inputFile.replace(/\.[^.]+$/, ".out$&");
      const format = meta.optsFull.format?.fmt || "text";
      const verbose = meta.opts.verbose || false;

      // Display processing information
      console.log("\n📁 File Processor");
      console.log("==================\n");

      if (verbose) {
        console.log("Configuration:");
        console.log(`  Input file:   ${inputFile}`);
        if (additionalFiles.length > 0) {
          console.log(`  Additional:   ${additionalFiles.join(", ")}`);
        }
        console.log(`  Output file:  ${outputFile}`);
        console.log(`  Format:       ${format}`);
        console.log(`  Verbose:      ${verbose}`);
        console.log(`\nOption sources:`);
        console.log(`  output:  ${meta.source.output || "default (generated)"}`);
        console.log(`  format:  ${meta.source.format || "default"}`);
        console.log(`  verbose: ${meta.source.verbose || "default"}`);
        console.log();
      }

      // Simulate file processing
      console.log(`✓ Reading from: ${inputFile}`);
      if (additionalFiles.length > 0) {
        additionalFiles.forEach(f => console.log(`✓ Reading from: ${f}`));
      }
      console.log(`✓ Writing to:   ${outputFile}`);
      console.log(`✓ Format:       ${format}`);

      if (verbose) {
        console.log("\n[Verbose] Processing steps:");
        console.log("  1. Reading input file(s)...");
        console.log("  2. Parsing content...");
        console.log("  3. Transforming data...");
        console.log("  4. Writing output file...");
      }

      console.log("\n✅ Processing complete!\n");

      // Display the full parsed structure in verbose mode
      if (verbose) {
        console.log("Full parsed structure:");
        console.log("======================");
        console.log(JSON.stringify(meta, null, 2));
        console.log();
      }
    },

    // Sub-commands still work normally
    subCommands: {
      convert: {
        desc: "Convert file format",
        args: "<input string> <output string>",
        exec: (cmd) => {
          const meta = cmd.jsonMeta;
          console.log("\n🔄 Converting Files");
          console.log("===================\n");
          console.log(`Input:  ${meta.args.input}`);
          console.log(`Output: ${meta.args.output}`);
          console.log(`Format: ${meta.opts.format?.fmt || "text"}`);
          console.log("\n✅ Conversion complete!\n");
        }
      },

      validate: {
        desc: "Validate file integrity",
        args: "<file string> [schema string]",
        exec: (cmd) => {
          const meta = cmd.jsonMeta;
          console.log("\n✓ Validating File");
          console.log("==================\n");
          console.log(`File:   ${meta.args.file}`);
          if (meta.args.schema) {
            console.log(`Schema: ${meta.args.schema}`);
          }
          console.log(`Format: ${meta.opts.format?.fmt || "text"}`);
          console.log("\n✅ Validation passed!\n");
        }
      },

      analyze: {
        desc: "Analyze file statistics",
        args: "[files string..]",
        exec: (cmd) => {
          const meta = cmd.jsonMeta;
          const files = meta.args.files || [];
          console.log("\n📊 File Analysis");
          console.log("=================\n");
          if (files.length === 0) {
            console.log("No files specified. Analyzing current directory...");
          } else {
            console.log(`Analyzing ${files.length} file(s):`);
            files.forEach(f => console.log(`  - ${f}`));
          }
          console.log(`\nVerbose mode: ${meta.opts.verbose ? "ON" : "OFF"}`);
          console.log("\n✅ Analysis complete!\n");
        }
      }
    }
  });

// Parse and execute
nc.parse();