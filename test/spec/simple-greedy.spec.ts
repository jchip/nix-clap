import { NixClap, CommandSpec, OptionSpec } from "../../src";
import { ParseResult } from "../../src/nix-clap";
import { expect, describe, it } from "vitest";

describe("simple nix-clap greedy mode test", () => {
  const noop = () => undefined;
  const noOutputExit = { output: noop, exit: noop };

  const initParser = (): NixClap => {
    const nc = new NixClap({
      ...noOutputExit,
      handlers: {
        "parse-fail": (parsed: ParseResult) => {
          // Silent fail for tests
        },
        "no-action": noop,
        "unknown-command": noop,
        "unknown-option": noop
      }
    });

    const options: Record<string, OptionSpec> = {
      verbose: {
        alias: "v",
        args: "< boolean>",
        argDefault: "false",
        desc: "Enable verbose output"
      }
    };

    const commands: Record<string, CommandSpec> = {
      simple: {
        desc: "A simple command with no arguments",
        alias: "s"
      },
      required: {
        desc: "Command with required arguments",
        args: "<first> <second>",
        alias: "r"
      }
    };

    return nc.init(options, commands);
  };

  // Helper function to parse command line arguments
  const parse = (nc: NixClap, args: string): ParseResult => {
    return nc.parse(args.split(/\s+/));
  };

  it("should demonstrate greedy mode with -#", () => {
    const nc = initParser();

    // Parse a command with -#
    const result = parse(nc, "required arg1 arg2 -# extra1 extra2");

    // Output the actual result for inspection
    console.log(JSON.stringify(result.command.jsonMeta, null, 2));

    // Check that required command exists
    expect(result.command.jsonMeta.subCommands.required).toBeDefined();

    // Log the actual argList to see what's happening
    console.log("required.argList:", result.command.jsonMeta.subCommands.required.argList);
  });
});
