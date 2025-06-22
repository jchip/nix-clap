/* eslint-disable quote-props */

import { NixClap } from "../../src";
import { expect, describe, it } from "vitest";
import { OptionNode } from "../../src/option-node";
import { CommandNode } from "../../src/command-node";

describe("parser", () => {
  function verifyNodeCommands(node: CommandNode, commands: string[]): void {
    expect(node.subCmdNodes).toBeDefined();
    for (const cmd of commands) {
      expect(node.subCmdNodes[cmd]).toBeInstanceOf(CommandNode);
    }
  }

  function verifyNodeOptions(node: CommandNode, options: string[]): void {
    expect(node.optNodes).toBeDefined();
    for (const opt of options) {
      expect(node.optNodes[opt], `node should have option ${opt}`).toBeInstanceOf(OptionNode);
    }
  }

  it("should return unknown options as mapped values", () => {
    const nc = new NixClap({
      defaultCommand: "a"
    }).init();
    const { command: node } = nc.parse2(["foo", "--cat=1", "--dog", "2", "--fox"], 1);
    expect(node.errors.map(x => x.message)).toEqual([
      "Encountered unknown CLI option 'cat'.",
      "Encountered unknown CLI option 'dog'.",
      "Encountered unknown CLI argument '2' while parsing for command '~root-command~'",
      "Encountered unknown CLI option 'fox'."
    ]);
    const m = node.jsonMeta;
    expect(m.opts).toEqual({
      cat: true,
      dog: true,
      fox: true
    });
    expect(m.source).toEqual({ cat: "cli", dog: "cli", fox: "cli" });

    verifyNodeOptions(node, ["cat", "dog", "fox"]);
  });

  it("should recognize a sub command and its options", () => {
    const nc = new NixClap({
      defaultCommand: "a"
    }).init(
      {
        foo: {
          alias: "f"
        }
      },
      {
        abc: {
          alias: ["a"],
          args: "[...]",
          subCommands: {
            a1: {
              args: "<v1> <v2>",
              options: {
                x1: {},
                x2: {}
              }
            }
          },
          options: {
            t1: {},
            t2: {}
          }
        }
      }
    );
    const { command: node } = nc.parse2(
      ["foo", "a", "--t1=50", "a1", "--x1", "90", "--t2", "80", "--x2", "--u1"],
      1
    );
    verifyNodeOptions(node, ["u1"]);
    verifyNodeCommands(node, ["abc"]);
    const abc = node.subCmdNodes.abc;
    verifyNodeOptions(abc, ["t1", "t2"]);
    expect(abc.optNodes.t1.argsList).toEqual(["50"]);
    verifyNodeCommands(abc, ["a1"]);
    const a1 = abc.subCmdNodes.a1;
    verifyNodeOptions(a1, ["x1", "x2"]);
    expect(a1.argsMap).toHaveProperty("v1");
    expect(a1.argsMap).toHaveProperty("v2");
    expect(a1.argsMap.v1).toBe("90");
    expect(a1.argsMap.v2).toBe("80");
  });

  it("should end gathering for variadic cmd args ", () => {
    const nc = new NixClap({
      defaultCommand: "a"
    }).init(
      {
        foo: {
          alias: "f"
        }
      },
      {
        abc: {
          alias: ["a"],
          args: "[...]",
          subCommands: {
            a1: {
              args: "<v1...>",
              options: {
                x1: {},
                x2: {}
              }
            }
          },
          options: {
            t1: {},
            t2: { args: "<>" }
          }
        }
      }
    );
    const { command: node } = nc.parse2(
      ["foo", "a", "--t1=50", "a1", "--x1", "90", "--t2", "80", "--x2", "--u1"],
      1
    );
    verifyNodeOptions(node, ["u1"]);
    verifyNodeCommands(node, ["abc"]);
    const abc = node.subCmdNodes.abc;
    verifyNodeOptions(abc, ["t1", "t2"]);
    expect(abc.optNodes.t1.argsList).toEqual(["50"]);
    expect(abc.optNodes.t2.argsList).toEqual(["80"]);
    verifyNodeCommands(abc, ["a1"]);
    const a1 = abc.subCmdNodes.a1;
    verifyNodeOptions(a1, ["x1", "x2"]);
    expect(a1.argsMap).toHaveProperty("v1");
  });

  it("should handle simple command", () => {
    const nc = new NixClap({
      defaultCommand: "a"
    }).init(
      {
        foo: {
          alias: "f"
        }
      },
      {
        a: {
          args: "[ string...]",
          subCommands: {
            a1: {}
          },
          options: {
            t1: {}
          }
        }
      }
    );
    const { command } = nc.parse2(["foo", "a", "-t1", "b", "c", "-t2"], 1);
    const m = command.jsonMeta;
    expect(m.opts).toEqual({
      "1": true,
      "2": true,
      t: true
    });
    expect(m.optsCount).toEqual({
      "1": 1,
      "2": 1,
      t: 2
    });
    expect(m.source).toEqual({
      "1": "cli",
      "2": "cli",
      t: "cli"
    });
  });

  it("should handle special character # in option", () => {
    const nc = new NixClap({
      allowUnknownCommand: true,
      allowUnknownOption: true,
      defaultCommand: "a"
    }).init({
      a: {
        alias: "a"
      }
    });
    const { command: node } = nc.parse2(
      ["node", "cli.js", "--a", "-#", "cmd1", "a", "b", "c", "-.", "cmd2"],
      2
    );
    const m = node.jsonMeta;
    // console.log(JSON.stringify(m, null, 2));
    expect(m.argList).toEqual(["cmd1", "a", "b", "c"]);
    expect(m.opts.a).toBe(true);
    expect(m.subCommands.cmd2).toBeDefined();
  });

  it("should handle boolean options with different CLI syntaxes", () => {
    const nc = new NixClap({
      allowUnknownCommand: true,
      allowUnknownOption: true
    }).init({
      test: {
        args: "< string>"
      },
      flag: {
        args: "< boolean>"
      }
    });

    // Test --option (no value)
    const result1 = nc.parse(["--test", "50", "--flag", "true"], 0);
    expect(result1.command.jsonMeta.opts.test).toBe("50");
    expect(result1.command.jsonMeta.source.test).toBe("cli");
    expect(result1.command.jsonMeta.opts.flag).toBe(true);
    expect(result1.command.jsonMeta.source.flag).toBe("cli");

    // Test --option=value
    const result2 = nc.parse(["--test", "something", "--flag", "blah"], 0);
    expect(result2.command.jsonMeta.opts.test).toBe("something");
    expect(result2.command.jsonMeta.source.test).toBe("cli");
    expect(result2.command.jsonMeta.opts.flag).toBe(true);
    expect(result2.command.jsonMeta.source.flag).toBe("cli");

    // Test multiple boolean options
    const result3 = nc.parse(["node", "cli.js", "--test=50", "--flag=1"], 2);
    expect(result3.command.jsonMeta.opts.test).toBe("50");
    expect(result3.command.jsonMeta.source.test).toBe("cli");
    expect(result3.command.jsonMeta.opts.flag).toBe(true);
    expect(result3.command.jsonMeta.source.flag).toBe("cli");
  });

  it("should properly populate new CommandNode fields", () => {
    const nc = new NixClap({
      allowUnknownCommand: true,
      allowUnknownOption: true
    }).init(
      {
        rootOpt: {
          args: "< string..1,3>", // Array option that takes 1-3 values
          alias: "r"
        }
      },
      {
        cmd1: {
          options: {
            opt1: {
              args: "< string>",
              argDefault: "default1"
            },
            opt2: {
              args: "< string..1,2>", // Array option that takes 1-2 values
              alias: "o2"
            }
          },
          subCommands: {
            subcmd: {
              options: {
                subopt: { args: "< string>" }
              }
            }
          }
        }
      }
    );

    const result = nc.parse(
      [
        "cmd1",
        "--opt1",
        "value1",
        "--opt2",
        "val2a",
        "val2b",
        "--rootOpt",
        "root1",
        "root2",
        "-.",
        "subcmd",
        "--subopt",
        "subvalue"
      ],
      0
    );

    const cmd = result.command;

    // Check source field
    expect(cmd.source).toEqual({
      rootOpt: "cli"
    });

    // Check optsFull field for array values
    expect(cmd.optsFull).toEqual({
      rootOpt: {
        "0": ["root1", "root2"]
      }
    });

    // Check subCommands and their fields
    const cmd1 = cmd.subCmdNodes.cmd1;
    expect(cmd1).toBeDefined();
    expect(cmd1.source).toEqual({
      opt1: "cli",
      opt2: "cli"
    });
    expect(cmd1.optsFull).toEqual({
      opt1: {
        "0": "value1"
      },
      opt2: {
        "0": ["val2a", "val2b"]
      }
    });

    // Check nested subcommand
    const subcmd = cmd1.subCommands.subcmd;
    expect(subcmd).toBeDefined();
    expect(subcmd.source).toEqual({
      subopt: "cli"
    });
    expect(subcmd.optsFull).toEqual({
      subopt: {
        "0": "subvalue"
      }
    });

    // Verify the command hierarchy
    expect(Object.keys(cmd.subCmdNodes)).toEqual(["cmd1"]);
    expect(Object.keys(cmd1.subCmdNodes)).toEqual(["subcmd"]);
  });

  it("should properly track verbatim argv for commands and options", () => {
    const nc = new NixClap({
      allowUnknownCommand: true,
      allowUnknownOption: true
    }).init(
      {}, // root options
      {
        cmd1: {
          args: "[...]", // allow variadic args
          options: {
            "cmd1-foo": {
              alias: "1f",
              args: "< string>"
            },
            "cmd1-bar": {
              alias: "1r",
              args: "< string>"
            },
            "cmd1-boo": {
              alias: "1b",
              args: "< boolean>"
            },
            dev: {
              args: "<..1,Inf>" // array option that takes 1 or more values
            }
          }
        }
      }
    );

    const { command: node } = nc.parse2(
      [
        "cmd1", // command name
        "arg1", // command arg
        "--cmd1-foo", // command option
        "value1", // option value
        "--cmd1-bar", // another command option
        "value2", // option value
        "--1b", // boolean option alias
        "--cx=90",
        "arg2", // command arg
        "--dev", // array option
        "x", // array option value
        "y", // array option value
        "z", // array option value
        "-.", // terminator
        "arg3" // command arg
      ],
      0
    );

    // Check root command's
    expect(node.argv).toEqual(["~root-command~"]);

    // Get cmd1 command node
    const cmd1 = node.subCmdNodes.cmd1;
    expect(cmd1).toBeDefined();

    // Check cmd1's argv - should contain all args and options in order
    expect(cmd1.argv).toEqual([
      "cmd1",
      "arg1",
      "--cmd1-foo",
      "value1",
      "--cmd1-bar",
      "value2",
      "--1b",
      "--cx=90",
      "arg2",
      "--dev",
      "x",
      "y",
      "z",
      "arg3"
    ]);

    // Check option nodes' verbatim argv
    expect(cmd1.optNodes["cmd1-foo"].argv).toEqual(["--cmd1-foo", "value1"]);
    expect(cmd1.optNodes["cmd1-bar"].argv).toEqual(["--cmd1-bar", "value2"]);
    expect(cmd1.optNodes["cmd1-boo"].argv).toEqual(["--1b"]);
    expect(cmd1.optNodes["dev"].argv).toEqual(["--dev", "x", "y", "z"]);
  });
});
