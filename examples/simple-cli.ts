/**
 * Simple CLI with Commands
 *
 * Basic example showing commands with exec handlers.
 *
 * Usage:
 *   npx tsx examples/simple-cli.ts build
 *   npx tsx examples/simple-cli.ts test
 *   npx tsx examples/simple-cli.ts --help
 *   npx tsx examples/simple-cli.ts --version
 */

import { NixClap } from "../src/index.ts";

new NixClap()
  .version("1.0.0")
  .init({}, {
    build: {
      desc: "Build the project",
      exec: () => console.log("Building...")
    },
    test: {
      desc: "Run tests",
      exec: () => console.log("Testing...")
    }
  })
  .parse();