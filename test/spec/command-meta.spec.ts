import { describe, it, expect } from "vitest";
import { NixClap } from "../../src/nix-clap";
import { CommandMeta } from "../../src/command-meta";

describe("CommandMeta", () => {
  const noOutputExit = {
    output: () => undefined,
    exit: () => undefined
  };

  it("should properly initialize and populate all CommandMeta properties", () => {
    const nc = new NixClap({ ...noOutputExit }).init(
      {
        strOpt: { args: "< string>" },
        numOpt: { args: "< number>" },
        boolOpt: { args: "< boolean>" },
        arrayOpt: { args: "< string..1,Inf>" }
      },
      {
        cmd1: {
          desc: "test command",
          alias: ["c1", "command1"],
          options: {
            cmdOpt: { args: "< string>" }
          }
        }
      }
    );

    const result = nc.parse([
      "node",
      "test.js",
      "cmd1",
      "--str-opt",
      "value",
      "--num-opt",
      "42",
      "--bool-opt",
      "true",
      "--array-opt",
      "a",
      "b",
      "c",
      "--cmd-opt",
      "cmdValue",
      "arg1",
      "arg2"
    ]);

    const meta = result.command.jsonMeta;
    expect(meta.opts).toEqual({
      "str-opt": true,
      strOpt: true,
      "num-opt": true,
      numOpt: true,
      "bool-opt": true,
      boolOpt: true,
      "cmd-opt": true,
      cmdOpt: true,
      "array-opt": true,
      arrayOpt: true
    });
    expect(meta.subCommands.cmd1).toBeDefined();

    const cmdMeta = meta.subCommands.cmd1;
    expect(cmdMeta.name).toBe("cmd1");
    expect(cmdMeta.alias).toBe("cmd1");
    expect(cmdMeta.opts).toEqual({});
    expect(cmdMeta.optsCount).toEqual({});
    expect(cmdMeta.optsFull).toEqual({});
    expect(cmdMeta.args).toEqual({});
    expect(cmdMeta.argList).toEqual([]);
    expect(cmdMeta.source).toEqual({});
    expect(cmdMeta.verbatim).toEqual({});
    expect(cmdMeta.subCommands).toEqual({});
  });

  it("should handle nested subcommands with metadata", () => {
    const nc = new NixClap({ ...noOutputExit }).init(
      {},
      {
        parent: {
          desc: "parent command",
          subCommands: {
            child: {
              desc: "child command",
              subCommands: {
                grandchild: {
                  desc: "grandchild command",
                  options: {
                    "gc-opt": { args: "< string>" }
                  }
                }
              }
            }
          }
        }
      }
    );

    const result = nc.parse(
      ["node", "test.js", "parent", "child", "grandchild", "--gc-opt", "value"],
      2
    );

    const meta = result.command.jsonMeta;
    expect(meta.subCommands.parent).toBeDefined();
    expect(meta.subCommands.parent.subCommands.child).toBeDefined();
    expect(meta.subCommands.parent.subCommands.child.subCommands.grandchild).toBeDefined();

    const gcMeta = meta.subCommands.parent.subCommands.child.subCommands.grandchild;
    expect(gcMeta.name).toBe("grandchild");
    expect(gcMeta.opts["gc-opt"]).toBe("value");
    expect(gcMeta.source["gc-opt"]).toBe("cli");
  });

  it("should handle unknown commands", () => {
    const nc = new NixClap({
      ...noOutputExit,
      allowUnknownCommand: true
    }).init({}, {});
    const result = nc.parse(["node", "test.js", "unknown"], 2);

    const meta = result.command.jsonMeta;
    expect(meta.subCommands.unknown).toBeDefined();
    expect(meta.subCommands.unknown.name).toBe("unknown");
    expect(meta.subCommands.unknown.alias).toBe("unknown");
    expect(meta.subCommands.unknown.opts).toEqual({});
    expect(meta.subCommands.unknown.optsCount).toEqual({});
    expect(meta.subCommands.unknown.optsFull).toEqual({});
    expect(meta.subCommands.unknown.args).toEqual({});
    expect(meta.subCommands.unknown.argList).toEqual([]);
    expect(meta.subCommands.unknown.source).toEqual({});
    expect(meta.subCommands.unknown.verbatim).toEqual({});
    expect(meta.subCommands.unknown.subCommands).toEqual({});
  });

  it("should handle camelCase conversion for long options", () => {
    const nc = new NixClap({ ...noOutputExit }).init(
      {
        "kebab-case-opt": { args: "< string>" }
      },
      {}
    );

    const result = nc.parse(["node", "test.js", "--kebab-case-opt", "value"], 2);

    const meta = result.command.jsonMeta;
    expect(meta.opts).toEqual({
      "kebab-case-opt": "value",
      kebabCaseOpt: "value"
    });
    expect(meta.source).toEqual({
      "kebab-case-opt": "cli",
      kebabCaseOpt: "cli"
    });
  });

  it("should track option sources", () => {
    const nc = new NixClap({ ...noOutputExit }).init(
      {
        opt1: { args: "< string>", argDefault: "default" },
        opt2: { args: "< string>" }
      },
      {}
    );

    const result = nc.parse(["--opt1", "cliValue"]);

    const meta = result.command.jsonMeta;
    expect(meta.opts).toEqual({
      opt1: "cliValue",
      opt2: undefined
    });
    expect(meta.source).toEqual({
      opt1: "cli"
    });
  });

  describe("allowUnknownCommand configuration", () => {
    it("should add unknown command to subCmdNodes with allowUnknownOptions true", () => {
      const nc = new NixClap({
        ...noOutputExit,
        allowUnknownCommand: true,
        allowUnknownOptions: true
      }).init({}, {});

      const result = nc.parse(["node", "test.js", "unknown", "--foo", "bar"], 2);
      expect(result.command.subCmdNodes.unknown).toBeDefined();
      expect(result.command.subCmdNodes.unknown.name).toBe("unknown");
      expect(result.command.subCmdNodes.unknown.optNodes.foo).toBeDefined();
    });
  });
});
