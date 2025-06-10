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
});
