/* eslint-disable quote-props */

import { NixClap } from "../../src";
import { expect } from "chai";
import { OptionNode } from "../../src/option-node";
import { CommandNode } from "../../src/command-node";

describe("parser", function () {
  this.timeout(300000);

  function verifyNodeCommands(node: CommandNode, commands: string[]): void {
    expect(node.cmdNodes).to.be.ok;
    for (const cmd of commands) {
      expect(node.cmdNodes[cmd]).to.be.an.instanceOf(CommandNode);
    }
  }

  function verifyNodeOptions(node: CommandNode, options: string[]): void {
    expect(node.optNodes).to.be.ok;
    for (const opt of options) {
      expect(node.optNodes[opt], `node should have option ${opt}`).to.be.an.instanceOf(OptionNode);
    }
  }

  it("should return unknown options as mapped values", () => {
    const nc = new NixClap({
      defaultCommand: "a"
    }).init();
    const { command: node } = nc.parse2(["foo", "--cat=1", "--dog", "2", "--fox"], 1);
    expect(node.errors.map(x => x.message)).deep.eq([
      "Encountered unknown CLI option 'cat'.",
      "Encountered unknown CLI option 'dog'.",
      "Encountered unknown CLI argument '2'.",
      "Encountered unknown CLI option 'fox'."
    ]);
    const m = node.jsonMeta;
    expect(m.opts).deep.eq({
      cat: true,
      dog: true,
      fox: true
    });
    expect(m.source).deep.eq({ cat: "cli", dog: "cli", fox: "cli" });

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
    const abc = node.cmdNodes.abc;
    verifyNodeOptions(abc, ["t1", "t2"]);
    expect(abc.optNodes.t1.argsList).deep.equal(["50"]);
    verifyNodeCommands(abc, ["a1"]);
    const a1 = abc.cmdNodes.a1;
    verifyNodeOptions(a1, ["x1", "x2"]);
    expect(a1.argsMap).contains.keys("v1", "v2");
    expect(a1.argsMap.v1).deep.equal("90");
    expect(a1.argsMap.v2).deep.equal("80");
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
    const abc = node.cmdNodes.abc;
    verifyNodeOptions(abc, ["t1", "t2"]);
    expect(abc.optNodes.t1.argsList).deep.equal(["50"]);
    expect(abc.optNodes.t2.argsList).deep.equal(["80"]);
    verifyNodeCommands(abc, ["a1"]);
    const a1 = abc.cmdNodes.a1;
    verifyNodeOptions(a1, ["x1", "x2"]);
    expect(a1.argsMap).to.contain.keys("v1");
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
    expect(m.opts).deep.eq({
      "1": true,
      "2": true,
      t: true
    });
    expect(m.optsCount).deep.eq({
      "1": 1,
      "2": 1,
      t: 2
    });
    expect(m.source).deep.eq({
      "1": "cli",
      "2": "cli",
      t: "cli"
    });
  });
});
