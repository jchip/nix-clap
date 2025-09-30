/**
 * Tests for root command functionality
 */

import { describe, it, expect } from "vitest";
import { NixClap } from "../../src/index.ts";

describe("Root Command", () => {
  it("should execute root command with arguments", () => {
    let executed = false;
    let receivedArgs: any = null;

    const nc = new NixClap({ name: "test", skipExec: true }).init2({
      args: "[input string] [files string..]",
      exec: (cmd) => {
        executed = true;
        receivedArgs = cmd.jsonMeta.args;
      }
    });

    const parsed = nc.parse(["input.txt", "file2.txt"]);
    const count = nc.runExec(parsed);

    expect(executed).toBe(true);
    expect(count).toBe(1);
    expect(receivedArgs.input).toBe("input.txt");
    expect(receivedArgs.files).toEqual(["file2.txt"]);
  });

  it("should execute root command async with arguments", async () => {
    let executed = false;
    let receivedArgs: any = null;

    const nc = new NixClap({ name: "test", skipExec: true }).init2({
      args: "[input string]",
      exec: async (cmd) => {
        executed = true;
        receivedArgs = cmd.jsonMeta.args;
      }
    });

    const parsed = nc.parse(["test.txt"]);
    const count = await nc.runExecAsync(parsed);

    expect(executed).toBe(true);
    expect(count).toBe(1);
    expect(receivedArgs.input).toBe("test.txt");
  });

  it("should not execute root command without arguments", () => {
    let executed = false;

    const nc = new NixClap({ name: "test", skipExec: true })
      .removeDefaultHandlers("no-action") // Remove the handler that calls exit
      .init2({
        args: "[input string]",
        exec: (cmd) => {
          executed = true;
        }
      });

    const parsed = nc.parse([]);
    const count = nc.runExec(parsed);

    expect(executed).toBe(false);
    expect(count).toBe(0);
  });

  it("should prefer sub-command over root command", () => {
    let rootExecuted = false;
    let subExecuted = false;

    const nc = new NixClap({ name: "test", skipExec: true }).init2({
      args: "[input string]",
      exec: (cmd) => {
        rootExecuted = true;
      },
      subCommands: {
        build: {
          desc: "Build command",
          exec: (cmd) => {
            subExecuted = true;
          }
        }
      }
    });

    const parsed = nc.parse(["build"]);
    const count = nc.runExec(parsed);

    expect(rootExecuted).toBe(false);
    expect(subExecuted).toBe(true);
    expect(count).toBe(1);
  });

  it("should configure root command with spec", () => {
    const nc = new NixClap({ name: "test" }).init2({
      args: "<input string>",
      desc: "Process input",
      usage: "test <input>",
      exec: () => {},
      options: {
        verbose: { alias: "v", desc: "Verbose" }
      },
      subCommands: {
        build: {
          desc: "Build",
          exec: () => {}
        }
      }
    });

    const rootCmd = (nc as any)._rootCommand;
    // args is processed into an array, check it exists
    expect(rootCmd.args).toBeDefined();
    expect(rootCmd.args.length).toBeGreaterThan(0);
    expect(rootCmd.desc).toBe("Process input");
    expect(rootCmd.usage).toBe("test <input>");
    expect(rootCmd.exec).toBeDefined();
  });

  it("should work with custom types in root command", () => {
    let receivedArgs: any = null;

    const nc = new NixClap({ name: "test", skipExec: true }).init2({
      args: "<value customType>",
      customTypes: {
        customType: (val) => `processed-${val}`
      },
      exec: (cmd) => {
        receivedArgs = cmd.jsonMeta.args;
      }
    });

    const parsed = nc.parse(["test"]);
    nc.runExec(parsed);

    expect(receivedArgs.value).toBe("processed-test");
  });

  it("should work with argDefault in root command", () => {
    let receivedArgs: any = null;

    const nc = new NixClap({ name: "test", skipExec: true }).init2({
      args: "[value string]",
      argDefault: ["default-value"],
      exec: (cmd) => {
        receivedArgs = cmd.jsonMeta.args;
      }
    });

    const parsed = nc.parse(["something"]);
    nc.runExec(parsed);

    expect(receivedArgs.value).toBe("something");
  });

  it("should integrate with options in root command", () => {
    let receivedData: any = null;

    const nc = new NixClap({ name: "test", skipExec: true }).init2({
      args: "<input string>",
      exec: (cmd) => {
        receivedData = {
          args: cmd.jsonMeta.args,
          opts: cmd.jsonMeta.opts
        };
      },
      options: {
        output: { alias: "o", desc: "Output", args: "<path string>" }
      }
    });

    const parsed = nc.parse(["input.txt", "--output", "out.txt"]);
    nc.runExec(parsed);

    expect(receivedData.args.input).toBe("input.txt");
    expect(receivedData.opts.output).toBeDefined();
  });

  it("should execute root command automatically with parse()", () => {
    let executed = false;

    const nc = new NixClap({ name: "test" }).init2({
      args: "<file string>",
      exec: (cmd) => {
        executed = true;
      }
    });

    nc.parse(["test.txt"]);
    expect(executed).toBe(true);
  });

  it("should execute root command automatically with parseAsync()", async () => {
    let executed = false;

    const nc = new NixClap({ name: "test" }).init2({
      args: "<file string>",
      exec: async (cmd) => {
        executed = true;
      }
    });

    await nc.parseAsync(["test.txt"]);
    expect(executed).toBe(true);
  });

  it("should prefer defaultCommand over root command when no args provided", () => {
    let rootExecuted = false;
    let defaultExecuted = false;

    const nc = new NixClap({
      name: "test",
      skipExec: true,
      defaultCommand: "default"
    }).init2({
      args: "[input string]",
      exec: () => {
        rootExecuted = true;
      },
      subCommands: {
        default: {
          desc: "Default command",
          exec: () => {
            defaultExecuted = true;
          }
        }
      }
    });

    const parsed = nc.parse([]);
    const count = nc.runExec(parsed);

    expect(rootExecuted).toBe(false);
    expect(defaultExecuted).toBe(true);
    expect(count).toBe(1);
  });

  it("should execute root command when args provided even with defaultCommand", () => {
    let rootExecuted = false;
    let defaultExecuted = false;

    const nc = new NixClap({
      name: "test",
      skipExec: true,
      defaultCommand: "default"
    }).init2({
      args: "[input string]",
      exec: () => {
        rootExecuted = true;
      },
      subCommands: {
        default: {
          desc: "Default command",
          exec: () => {
            defaultExecuted = true;
          }
        }
      }
    });

    const parsed = nc.parse(["input.txt"]);
    const count = nc.runExec(parsed);

    expect(rootExecuted).toBe(true);
    expect(defaultExecuted).toBe(false);
    expect(count).toBe(1);
  });

  it("should not execute root command when no args provided with optional args", () => {
    let rootExecuted = false;

    const nc = new NixClap({ name: "test", skipExec: true })
      .removeDefaultHandlers("no-action") // Remove handler that calls exit
      .init2({
        args: "[value string]", // Optional arg
        exec: () => {
          rootExecuted = true;
        }
      });

    const parsed = nc.parse([]);
    const count = nc.runExec(parsed);

    // Root command requires args to be present, even if they're optional
    expect(rootExecuted).toBe(false);
    expect(count).toBe(0);
  });

  it("should handle root command with required args not provided", () => {
    const nc = new NixClap({ name: "test", skipExec: true })
      .removeDefaultHandlers("parse-fail")
      .init2({
        args: "<required string>", // Required arg
        exec: () => {}
      });

    const parsed = nc.parse([]);

    // Should have parse errors for missing required arg
    expect(parsed.errorNodes).toBeDefined();
    expect(parsed.errorNodes.length).toBeGreaterThan(0);
  });

  it("should handle errors in root command exec handler", () => {
    const nc = new NixClap({ name: "test", skipExec: true }).init2({
      args: "[input string]",
      exec: () => {
        throw new Error("Execution failed");
      }
    });

    expect(() => {
      const parsed = nc.parse(["test.txt"]);
      nc.runExec(parsed);
    }).toThrow("Execution failed");
  });

  it("should handle multiple runExec calls idempotently", () => {
    let execCount = 0;

    const nc = new NixClap({ name: "test", skipExec: true }).init2({
      args: "[input string]",
      exec: () => {
        execCount++;
      }
    });

    const parsed = nc.parse(["test.txt"]);

    // First execution
    const count1 = nc.runExec(parsed);
    expect(count1).toBe(1);
    expect(execCount).toBe(1);

    // Second execution - should execute again since we're calling runExec again
    const count2 = nc.runExec(parsed);
    expect(count2).toBe(1);
    expect(execCount).toBe(2);
  });

  it("should handle defensive null checks in _shouldExecuteRootCommand", () => {
    const nc = new NixClap({ name: "test", skipExec: true }).init2({
      args: "[input string]",
      exec: () => {}
    });

    const parsed = nc.parse(["test.txt"]);

    // Test with null command - should not crash
    const result = (nc as any)._shouldExecuteRootCommand(null, 0);
    expect(result).toBe(false);

    // Test with undefined command - should not crash
    const result2 = (nc as any)._shouldExecuteRootCommand(undefined, 0);
    expect(result2).toBe(false);
  });
});