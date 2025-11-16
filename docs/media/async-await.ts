/**
 * Async/Await Support Example
 *
 * Demonstrates using async exec handlers with parseAsync().
 *
 * Usage:
 *   npx tsx examples/async-await.ts deploy
 *   npx tsx examples/async-await.ts deploy --target staging
 *   npx tsx examples/async-await.ts --help
 */

import { NixClap } from "../src/index.ts";

// Simulate an async operation
function someAsyncOperation(): Promise<void> {
  return new Promise(resolve => {
    console.log("Starting deployment...");
    setTimeout(() => {
      console.log("Deployment in progress...");
      resolve();
    }, 1000);
  });
}

const options = {
  target: {
    alias: "t",
    desc: "Deployment target",
    args: "<env string>",
    argDefault: "production"
  }
};

const commands = {
  deploy: {
    desc: "Deploy to specified target",
    exec: async cmd => {
      const meta = cmd.jsonMeta;
      const target = meta.opts.target || "production";
      console.log(`Deploying to ${target}...`);
      await someAsyncOperation();
      console.log("Deployed!");
    }
  }
};

const nc = new NixClap().init2({ options, subCommands: commands });
await nc.parseAsync(); // Use parseAsync for async exec handlers
