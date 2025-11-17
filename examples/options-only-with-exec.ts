/**
 * Options Only with Exec Example
 *
 * Demonstrates a CLI that only takes options (no args, no subcommands)
 * with an exec handler. This is useful for tools like linters, formatters,
 * or configuration utilities.
 *
 * Key pattern for options-only CLI:
 * - Don't specify args (or set to empty string) to indicate no positional arguments
 * - Define your options
 * - Define exec handler - it will run automatically even without arguments
 *
 * This allows the CLI to execute with just options, no positional args required.
 *
 * Usage:
 *   nvx tsx examples/options-only-with-exec.ts --port 8080 --host localhost
 *   nvx tsx examples/options-only-with-exec.ts -p 3000 -H 0.0.0.0 --verbose
 *   nvx tsx examples/options-only-with-exec.ts --config ./my-config.json
 *   nvx tsx examples/options-only-with-exec.ts --help
 */

import { NixClap } from "../src/index.ts";

new NixClap({ name: "server-config" })
  .version("1.0.0")
  .usage("$0 [options]")
  .init2({
    desc: "Configure and start a server with various options",

    options: {
      port: {
        alias: "p",
        desc: "Port number to listen on",
        args: "<port number>",
        argDefault: "8080"
      },
      host: {
        alias: "H",
        desc: "Host address to bind to",
        args: "<host string>",
        argDefault: "localhost"
      },
      verbose: {
        alias: "v",
        desc: "Enable verbose logging"
      },
      config: {
        alias: "c",
        desc: "Path to configuration file",
        args: "<path string>"
      },
      ssl: {
        desc: "Enable SSL/TLS"
      },
      certFile: {
        desc: "SSL certificate file path",
        args: "<path string>"
      }
    },

    exec: (cmd) => {
      const meta = cmd.jsonMeta;

      console.log("\n🚀 Server Configuration");
      console.log("======================\n");

      console.log("Settings:");
      console.log(`  Host:    ${meta.opts.host}`);
      console.log(`  Port:    ${meta.opts.port}`);
      console.log(`  Verbose: ${meta.opts.verbose ? "ON" : "OFF"}`);
      console.log(`  SSL:     ${meta.opts.ssl ? "ON" : "OFF"}`);

      if (meta.opts.config) {
        console.log(`  Config:  ${meta.opts.config}`);
      }

      if (meta.opts.ssl && meta.opts.certFile) {
        console.log(`  Cert:    ${meta.opts.certFile}`);
      }

      if (meta.opts.verbose) {
        console.log("\nOption sources:");
        Object.keys(meta.opts).forEach(key => {
          console.log(`  ${key}: ${meta.source[key] || "default"}`);
        });
      }

      console.log("\n✅ Configuration loaded successfully!");
      console.log(`\nServer would start at: http${meta.opts.ssl ? "s" : ""}://${meta.opts.host}:${meta.opts.port}\n`);
    }
  })
  .parse();
