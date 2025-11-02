#!/usr/bin/env tsx

import { NixClap } from "nix-clap";

/**
 * Demo of NixClap's applyConfig feature
 *
 * This example shows how to apply configuration from external sources
 * (like config files, environment variables, or package.json) after CLI parsing.
 *
 * Configuration hierarchy:
 * 1. CLI arguments (highest priority)
 * 2. User config (medium priority)
 * 3. Defaults (lowest priority)
 */

const nc = new NixClap({
  name: "my-app",
  version: "1.0.0"
}).init({
  verbose: {
    alias: "v",
    desc: "Enable verbose output"
  },
  timeout: {
    alias: "t",
    args: "<timeout number>",
    desc: "Request timeout in milliseconds",
    argDefault: "5000"
  },
  retries: {
    alias: "r",
    args: "<retries number>",
    desc: "Number of retries",
    argDefault: "3"
  },
  output: {
    alias: "o",
    args: "<path string>",
    desc: "Output file path"
  },
  debug: {
    alias: "d",
    desc: "Enable debug mode (not in user config)"
  }
});

// Simulate loading config from a file (e.g., package.json, .rc file, etc.)
const userConfig = {
  verbose: false, // This will be overridden by CLI --verbose
  timeout: 10000, // This will be applied since no CLI value
  retries: 5, // This will be applied since no CLI value
  output: "/tmp/default.log" // This will be applied since no CLI value
  // Note: debug option is NOT in userConfig, so it won't be overridden
};

// Parse CLI arguments
const parsed = nc.parse();

// Apply user configuration
// CLI args take precedence over user config
nc.applyConfig(userConfig, parsed);

console.log("Final configuration:");
console.log("===================");
console.log(`Verbose: ${parsed.command.jsonMeta.opts.verbose}`);
console.log(`Timeout: ${parsed.command.jsonMeta.opts.timeout}ms`);
console.log(`Retries: ${parsed.command.jsonMeta.opts.retries}`);
console.log(`Output: ${parsed.command.jsonMeta.opts.output || "not set"}`);
console.log(`Debug: ${parsed.command.jsonMeta.opts.debug || false}`);

console.log("\nConfiguration sources:");
console.log("=====================");
console.log(`Verbose source: ${parsed.command.jsonMeta.source.verbose}`);
console.log(`Timeout source: ${parsed.command.jsonMeta.source.timeout}`);
console.log(`Retries source: ${parsed.command.jsonMeta.source.retries}`);
console.log(`Output source: ${parsed.command.jsonMeta.source.output || "not set"}`);
console.log(`Debug source: ${parsed.command.jsonMeta.source.debug || "not set"}`);

console.log("\nTry running with different CLI options:");
console.log("  node apply-config.js --verbose --timeout 2000");
console.log("  node apply-config.js --output /tmp/custom.log");
console.log("  node apply-config.js --debug --verbose");
