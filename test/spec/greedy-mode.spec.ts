import { NixClap, CommandSpec, OptionSpec } from "../../src";
import { ParseResult } from "../../src/nix-clap";
import { describe, it, expect } from "vitest";

describe("nix-clap explicit greedy mode with -#", () => {
  const noop = () => undefined;
  const noOutputExit = { output: noop, exit: noop };

  const initParser = (handlers?, extraOpts?, extraCommands?): NixClap => {
    const nc = new NixClap({
      ...noOutputExit,
      handlers: Object.assign(
        {
          "parse-fail": (parsed: ParseResult) => {
            // Silent fail for tests
          },
          "no-action": false,
          "unknown-command": false,
          "unknown-option": false
        },
        handlers
      )
    });

    const options: Record<string, OptionSpec> = Object.assign(
      {
        verbose: {
          alias: "v",
          args: "< boolean>",
          argDefault: false,
          desc: "Enable verbose output"
        },
        option: {
          alias: "o",
          args: "< string>",
          desc: "Regular option"
        },
        flag: {
          alias: "f",
          args: "< boolean>",
          desc: "Boolean flag"
        }
      },
      extraOpts
    );

    const commands: Record<string, CommandSpec> = Object.assign(
      {
        // Simple command with no arguments
        simple: {
          desc: "A simple command with no arguments",
          alias: "s"
        },

        // Command with only required arguments
        required: {
          desc: "Command with required arguments",
          args: "<first> <second>",
          alias: "r"
        },

        // Command with fixed number of arguments
        fixedArgs: {
          desc: "Command with fixed number of arguments",
          args: "<a> <b> <c>", // 3 required args
          alias: "fixed"
        }
      },
      extraCommands
    );

    return nc.init(options, commands);
  };

  // Helper function to parse command line arguments
  const parse = (nc: NixClap, args: string): ParseResult => {
    return nc.parse(args.split(/\s+/));
  };

  // Helper function to check if an object exists in meta.subCommands
  const expectCommandInResult = (meta: any, cmdName: string, exists = true) => {
    if (exists) {
      expect(meta.subCommands[cmdName]).toBeDefined();
    } else {
      expect(meta.subCommands[cmdName]).toBeUndefined();
    }
  };

  it("should explicitly enter greedy mode with -# for a simple command", () => {
    const nc = initParser();

    // Without -#, "simple" takes no arguments, so "arg1" would be treated as a new command
    const withoutGreedy = parse(nc, "simple arg1");
    const metaWithoutGreedy = withoutGreedy.command.jsonMeta;

    // Check that "simple" command exists without greedy mode
    expectCommandInResult(metaWithoutGreedy, "simple");
    expect(metaWithoutGreedy.subCommands.simple.argList).toEqual([]);

    // With -#, simple should enter greedy mode and consume arg1
    const withGreedy = parse(nc, "simple -# arg1");
    const metaWithGreedy = withGreedy.command.jsonMeta;

    // Check that arg1 is now an argument to simple
    expectCommandInResult(metaWithGreedy, "simple");
    expect(metaWithGreedy.subCommands.simple.argList).toEqual(["arg1"]);
  });

  it("should consume additional arguments beyond requirements with -#", () => {
    const nc = initParser();

    // Without -#, required takes exactly 2 arguments
    const withoutGreedy = parse(nc, "required arg1 arg2 extra1");
    const metaWithoutGreedy = withoutGreedy.command.jsonMeta;

    // Check that required takes just its args without greedy mode
    expectCommandInResult(metaWithoutGreedy, "required");
    expect(metaWithoutGreedy.subCommands.required.argList).toEqual(["arg1", "arg2"]);

    // With -#, required should enter greedy mode and consume extra1
    const withGreedy = parse(nc, "required arg1 arg2 -# extra1 extra2");
    const metaWithGreedy = withGreedy.command.jsonMeta;

    // Check that extra1 and extra2 are now arguments to required
    expectCommandInResult(metaWithGreedy, "required");
    expect(metaWithGreedy.subCommands.required.argList).toHaveLength(4);
    expect(metaWithGreedy.subCommands.required.argList).toEqual([
      "arg1",
      "arg2",
      "extra1",
      "extra2"
    ]);
  });

  it("should continue in greedy mode until explicit termination", () => {
    const nc = initParser();

    // Start with greedy mode and then terminate with --.
    const result = parse(nc, "required arg1 arg2 -# extra1 extra2 --. simple");
    const meta = result.command.jsonMeta;

    expectCommandInResult(meta, "required");
    expectCommandInResult(meta, "simple");

    // required command should have all its args plus the extra ones due to -#
    expect(meta.subCommands.required.argList).toEqual(["arg1", "arg2", "extra1", "extra2"]);
    expect(meta.subCommands.simple.argList).toEqual([]);
  });

  it("should also work with -. as terminator after -#", () => {
    const nc = initParser();

    // Start with greedy mode and then terminate with -.
    const result = parse(nc, "required arg1 arg2 -# extra1 extra2 -. simple");
    const meta = result.command.jsonMeta;

    expectCommandInResult(meta, "required");
    expectCommandInResult(meta, "simple");

    // required command should have all its args plus the extra ones due to -#
    expect(meta.subCommands.required.argList).toEqual(["arg1", "arg2", "extra1", "extra2"]);
    expect(meta.subCommands.simple.argList).toEqual([]);
  });

  it("should allow -# to consume command names as arguments", () => {
    const nc = initParser();

    // Without -#, the parser would recognize "simple" as a command
    const withoutGreedy = parse(nc, "required arg1 arg2 simple");
    const metaWithoutGreedy = withoutGreedy.command.jsonMeta;

    // Check that "simple" is treated as a separate command without greedy mode
    expectCommandInResult(metaWithoutGreedy, "required");
    expectCommandInResult(metaWithoutGreedy, "simple", true);

    // With -#, required should enter greedy mode and consume "simple" as an argument
    const withGreedy = parse(nc, "required arg1 arg2 -# simple");
    const metaWithGreedy = withGreedy.command.jsonMeta;

    // Check that "simple" is now an argument to required
    expectCommandInResult(metaWithGreedy, "required");
    expectCommandInResult(metaWithGreedy, "simple", false);
    expect(metaWithGreedy.subCommands.required.argList).toEqual(["arg1", "arg2", "simple"]);
  });

  it("should allow -# to work with options in greedy mode", () => {
    const nc = initParser();

    // Use -# with options mixed in
    const result = parse(nc, "required arg1 arg2 -# --option value extra1 extra2");
    const meta = result.command.jsonMeta;

    // Check that options are processed and arguments are consumed in greedy mode
    expectCommandInResult(meta, "required");
    expect(result.command.opts.option).toBe("value");
    expect(result.command.options.option).toEqual({ "0": "value" });
    expect(meta.subCommands.required.argList).toEqual(["arg1", "arg2", "extra1", "extra2"]);
  });

  it("should apply greedy mode to fixed-argument commands with -#", () => {
    const nc = initParser();

    // Without -#, fixedArgs would only take its required 3 arguments
    const withoutGreedy = parse(nc, "fixedArgs val1 val2 val3 extra1");
    const metaWithoutGreedy = withoutGreedy.command.jsonMeta;

    expectCommandInResult(metaWithoutGreedy, "fixedArgs");
    expect(metaWithoutGreedy.subCommands.fixedArgs.argList).toEqual(["val1", "val2", "val3"]);

    // With -#, fixedArgs should consume additional arguments
    const withGreedy = parse(nc, "fixedArgs val1 val2 val3 -# extra1 extra2");
    const metaWithGreedy = withGreedy.command.jsonMeta;

    expectCommandInResult(metaWithGreedy, "fixedArgs");
    expect(metaWithGreedy.subCommands.fixedArgs.argList).toEqual([
      "val1",
      "val2",
      "val3",
      "extra1",
      "extra2"
    ]);
  });

  it("should support -# at different positions in the command line", () => {
    const nc = initParser();

    // Test -# before any arguments
    const beforeArgs = parse(nc, "required -# arg1 arg2 extra1");
    const metaBeforeArgs = beforeArgs.command.jsonMeta;

    expectCommandInResult(metaBeforeArgs, "required");
    expect(metaBeforeArgs.subCommands.required.argList).toEqual(["arg1", "arg2", "extra1"]);

    // Test -# in the middle of arguments
    const middleArgs = parse(nc, "required arg1 -# arg2 extra1");
    const metaMiddleArgs = middleArgs.command.jsonMeta;

    expectCommandInResult(metaMiddleArgs, "required");
    expect(metaMiddleArgs.subCommands.required.argList).toEqual(["arg1", "arg2", "extra1"]);
  });
});
