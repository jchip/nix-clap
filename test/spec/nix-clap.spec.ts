/*

- all `-` and `--` options can specify arg with `=` or ` `
- single `-`, each char following is an opt, treated as boolean, except the last one, which can have an arg that follows
- unknown options are automatically treated as no args following with ` `
- unknown options following commands are automatically assigned to the command

*/

import { CommandExecFunc, CommandSpec, NixClap } from "../../src";
import { defaultOutput, defaultExit, ParseResult } from "../../src/nix-clap";
import { describe, it, expect, beforeEach } from "vitest";
import { OptionSpec } from "../../src/option-base";
import { CommandNode } from "../../src/command-node";

describe("nix-clap", () => {
  const noop = () => undefined;
  const noOutputExit = { output: noop, exit: noop };
  let invoked: CommandNode | undefined;

  beforeEach(() => {
    invoked = undefined;
  });

  it("should init", () => {
    return new NixClap().init();
  });

  it("should provide default output and exit setup", () => {
    defaultOutput("\ntesting defaultOutput to stdout - you should see this\n");
    let called: number = 0;
    const save = process.exit;
    process.exit = (n => (called = n)) as any;
    defaultExit(100);
    expect(called).toBe(100);
    let o = "";
    const nc = new NixClap({
      version: "100",
      output: (s: string) => {
        o = s;
      }
    }).init();
    nc.showVersion();
    expect(o).toBe("100\n");
    process.exit = save;
  });

  const initParser = (
    cmdExec?: CommandExecFunc | undefined,
    nc?: NixClap,
    handlers?: any,
    extraOpts?: any
  ): NixClap => {
    nc =
      nc ||
      new NixClap({
        ...noOutputExit,
        handlers: Object.assign(
          {
            "parse-fail": false,
            "no-action": false,
            "unknown-command": false,
            "unknown-option": false
          },
          handlers
        )
      });

    return nc.init(
      Object.assign(
        {
          "log-level": {
            alias: "q",
            args: "< string>",
            argDefault: "info",
            desc: "One of: debug,verbose,info,warn,error,fyi,none"
          },
          "str-opt": {
            args: "[]"
          },
          "require-arg-opt": {
            alias: "rao",
            args: "< string>"
          },
          "force-cache": {
            alias: ["f", "fc"],
            args: "< boolean>",
            desc: "Don't check registry if cache exists.",
            argDefault: "true"
          },
          "bar-bool": {
            alias: "b",
            args: "< boolean>"
          },
          foobool: {
            args: "< boolean>"
          },
          "array-opt-require": {
            alias: "a",
            args: "< string..1,Inf>"
          },
          "array-opt-opt": {
            alias: "aoo",
            args: "[ number] [ string..1,Inf]"
          },
          "subtype-array": {
            args: "< number..1,Inf>"
          },
          fooNum: {
            args: "< number>"
          },
          floatNum: {
            args: "< float>"
          },
          customFn: {
            args: "< xfoo>",
            customTypes: {
              xfoo: () => "xfoo-value"
            }
          },
          customRegex: {
            args: "< rxmatch>",
            customTypes: {
              rxmatch: /^test$/i
            }
          },
          customOther: {
            args: "< rxother>",
            customTypes: {
              rxother: () => "oops"
            }
          },
          "bool-2": {
            args: "< boolean>"
          },
          "missing-type": {},
          "bool-3": {
            alias: "x"
          },
          "count-opt": {
            counting: Infinity,
            alias: "c"
          },
          "apply-default": {
            args: "< boolean>",
            argDefault: "test"
          }
        } as Record<string, OptionSpec>,
        extraOpts
      ),
      {
        cmd1: {
          args: "<..>",
          options: {
            "cmd1-foo": {
              alias: "1f",
              args: "< string>",
              argDefault: "boo"
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
              args: "<..1,Inf>"
            }
          }
        },
        cmd2: {},
        cmd3: {
          args: "<id>",
          subCommands: {
            foo: {}
          }
        } as CommandSpec,
        cmd4: {
          alias: "4"
        },
        cmd5: {
          desc: "test command 5",
          alias: ["5", "c5"]
        },
        cmd6: {
          desc: "test command 6 test blah foo test blah foo test blah foo test blah foo",
          args: "<a> [b] [c..]",
          alias: "6"
        },
        cmd7: {
          args: "<a> <b> [c] [d] [e]"
        },
        cmd8: {
          alias: "8",
          args: "<a> <b> [c..]",
          exec: cmdExec,
          options: {
            "cmd8-foo": {
              args: "< string>"
            }
          }
        },
        sum: {
          args: "< number..>"
        }
      }
    );
  };

  const getArgv = line => {
    return line.split(" ").filter(x => x);
  };

  it("should parse single required param for command", () => {
    const nc = initParser().removeAllListeners("parse-fail");
    const { command } = nc.parse2(getArgv("cmd3"));
    expect(command.error.message).contains("Not enough arguments for command 'cmd3'");
    const { command: x } = nc.parse2(getArgv("cmd3 test"));
    expect(Object.keys(x.subCmdNodes).length, "should have only one command").to.equal(1);
    expect(x.subCmdNodes.cmd3.argsList).to.deep.equal(["test"]);
    expect(x.subCmdNodes.cmd3.argsMap).to.deep.equal({ 0: "test", id: "test" });
    expect(x.subCmdNodes.cmd3.name).eq("cmd3");
    expect(x.subCmdNodes.cmd3.alias).eq("cmd3");
    const { command: x2 } = nc.parse2(getArgv("cmd3 test foo"));
    expect(Object.keys(x2.subCmdNodes).length, "should have one commands").to.equal(1);
    expect(x2.subCmdNodes.cmd3.argsList).to.deep.equal(["test"]);
    expect(x2.subCmdNodes.cmd3.argsMap).to.deep.equal({ 0: "test", id: "test" });
    expect(
      Object.keys(x2.subCmdNodes.cmd3.subCmdNodes).length,
      "cmd3 should have one sub command"
    ).to.eq(1);
    expect(x2.subCmdNodes.cmd3.subCmdNodes.foo.jsonMeta).to.deep.eq({
      name: "foo",
      alias: "foo",
      argList: [],
      args: {},
      opts: {},
      optsFull: {},
      optsCount: {},
      source: {},
      verbatim: {},
      subCommands: {}
    });
  });

  it("should parse top level options before command", () => {
    const x = initParser().parse(
      getArgv(
        "--cmd1-foo=1foo --fooNum=900 --floatNum=1.23 --customFn 1 --customRegex test --customOther 1 --no-foobool cmd1 a"
      )
    );
    const m = x.command.jsonMeta;

    expect(m.opts).deep.eq({
      fooNum: 900,
      floatNum: 1.23,
      customFn: "xfoo-value",
      customRegex: "test",
      customOther: "oops",
      foobool: false,
      "log-level": "info",
      "force-cache": true,
      "apply-default": true,
      cmd1Foo: "1foo",
      "cmd1-foo": "1foo",
      logLevel: "info",
      forceCache: true,
      applyDefault: true
    });
    expect(m.source).deep.eq({
      "cmd1-foo": "cli",
      fooNum: "cli",
      floatNum: "cli",
      customFn: "cli",
      customRegex: "cli",
      customOther: "cli",
      foobool: "cli",
      "log-level": "default",
      "force-cache": "default",
      "apply-default": "default",
      cmd1Foo: "cli",
      logLevel: "default",
      forceCache: "default",
      applyDefault: "default"
    });
    const subCommands = Object.values(m.subCommands);

    expect(subCommands.length, "should have one command").to.equal(1);

    expect(subCommands[0]).to.deep.equal({
      name: "cmd1",
      alias: "cmd1",
      argList: ["a"],
      args: {
        "0": ["a"]
      },
      opts: {
        "cmd1-foo": "boo",
        cmd1Foo: "boo"
      },
      optsFull: {
        "cmd1-foo": {
          "0": "boo"
        },
        cmd1Foo: {
          "0": "boo"
        }
      },
      optsCount: {
        "cmd1-foo": 1,
        cmd1Foo: 1
      },
      source: {
        "cmd1-foo": "default",
        cmd1Foo: "default"
      },
      verbatim: {},
      subCommands: {}
    });
  });

  it("should return the default value if custom regex doesn't match", () => {
    const x = initParser().parse(getArgv("--customRegex blah"));
    expect(x.command.getErrorNodes()[0].error.message).contains(
      `argument 'blah' didn't match RegExp requirement for customRegex`
    );
    const m = x.command.jsonMeta;

    expect(m.opts).deep.eq({
      customRegex: "blah",
      "log-level": "info",
      "force-cache": true,
      "apply-default": true,
      logLevel: "info",
      forceCache: true,
      applyDefault: true
    });
    expect(m.source).deep.eq({
      customRegex: "cli",
      "log-level": "default",
      "force-cache": "default",
      "apply-default": "default",
      logLevel: "default",
      forceCache: "default",
      applyDefault: "default"
    });
  });

  it("should throw if regex-unmatch event throws", () => {
    const parsed = initParser(undefined, undefined, {}).parse(getArgv("--customRegex blah"));
    expect(parsed.command.getErrorNodes()[0].error.message).to.equal(
      `argument 'blah' didn't match RegExp requirement for customRegex`
    );
  });

  it("should use default when option RegExp unmatch", () => {
    const nc = new NixClap({ ...noOutputExit }).init({
      regex: {
        args: "[ enum]",
        customTypes: {
          enum: /^test$/
        },
        argDefault: "foo"
      }
    });
    const { command } = nc.parse2(getArgv("--regex boo"));
    const meta = command.jsonMeta;
    expect(meta.opts.regex).eq("foo");
    // expect(parsed.source.regex).to.equal("cli-default");
    // expect(parsed.opts.regex).to.equal("foo");
  });

  it("should return undefined if command RegExp didn't match and no default", () => {
    const nc = new NixClap({ ...noOutputExit }).init(
      {},
      {
        foo: {
          args: "<foo enum>",
          customTypes: {
            enum: /^test$/
          }
        }
      }
    );
    const x = nc.parse(getArgv("foo bleah"));
    const meta = x.command.jsonMeta;
    expect(meta.subCommands.foo.args.foo).eq("bleah");
    expect(x.command.getErrorNodes()[0].error.message).contains(
      `argument 'bleah' didn't match RegExp requirement for foo`
    );
  });

  it("should log error if type coercion function throws", () => {
    const x = new NixClap({ ...noOutputExit })
      .init({
        foo: {
          args: "< bar>",
          customTypes: {
            bar: () => {
              throw new Error("test");
            }
          }
        }
      })
      .parse2(getArgv("--foo x"));
    // console.log(x.jsonMeta, null, 2);
    // expect(parsed.opts.foo).to.equal("bar coercion function threw error");
  });

  it("should count options", () => {
    const nc = initParser();
    const x = nc.parse(getArgv("--count-opt -ccc"));
    expect(x.command.jsonMeta.optsCount["count-opt"]).equal(4);
    const m = x.command.jsonMeta;

    expect(m.opts).deep.eq({
      "count-opt": 4,
      c: 4,
      "log-level": "info",
      "force-cache": true,
      "apply-default": true,
      countOpt: 4,
      logLevel: "info",
      forceCache: true,
      applyDefault: true
    });
    expect(m.source).deep.eq({
      "count-opt": "cli",
      c: "cli",
      "log-level": "default",
      "force-cache": "default",
      "apply-default": "default",
      countOpt: "cli",
      logLevel: "default",
      forceCache: "default",
      applyDefault: "default"
    });
    expect(m.optsCount).deep.eq({
      "count-opt": 4,
      "log-level": 1,
      "force-cache": 1,
      "apply-default": 1,
      countOpt: 4,
      logLevel: 1,
      forceCache: 1,
      applyDefault: 1
    });
  });

  it("should parse a boolean option that's immediately before a command", () => {
    /**
     * User can specify a boolean option in multiple ways: `--opt-flag`, `--opt-flag=true`, `--opt-flag true`
     * If a command follows that, then we need to be able to detect all of them.
     */
    const verify = (p: ParseResult, boolVal: boolean) => {
      const argv = p.command.jsonMeta;
      expect(argv.opts["force-cache"]).to.equal(boolVal);
      expect(argv.source["force-cache"]).to.equal("cli");
      expect(argv.subCommands.cmd2).to.be.ok;
      expect(argv.subCommands.cmd4).to.be.ok;
    };
    verify(initParser().parse(getArgv("-f cmd2 cmd4")), true);
    verify(initParser().parse(getArgv("-f true cmd2 cmd4")), true);
    verify(initParser().parse(getArgv("-f=true cmd2 cmd4")), true);
    verify(initParser().parse(getArgv("-f false cmd2 cmd4")), false);
    verify(initParser().parse(getArgv("-f=false cmd2 cmd4")), false);
    verify(initParser().parse(getArgv("--fc cmd2 cmd4")), true);
    verify(initParser().parse(getArgv("--fc true cmd2 cmd4")), true);
    verify(initParser().parse(getArgv("--fc=true cmd2 cmd4")), true);
    verify(initParser().parse(getArgv("--fc false cmd2 cmd4")), false);
    verify(initParser().parse(getArgv("--fc=false cmd2 cmd4")), false);
    verify(initParser().parse(getArgv("--force-cache cmd2 cmd4")), true);
    verify(initParser().parse(getArgv("--force-cache true cmd2 cmd4")), true);
    verify(initParser().parse(getArgv("--force-cache=true cmd2 cmd4")), true);
    verify(initParser().parse(getArgv("--force-cache false cmd2 cmd4")), false);
    verify(initParser().parse(getArgv("--force-cache=false cmd2 cmd4")), false);
  });

  it("should handle boolean that's part of a single dash option group", () => {
    const { command: x } = initParser().parse2(getArgv("cmd1 a -bnx"));
    expect(x.jsonMeta.opts["bar-bool"]).equal(true);
    const { command: x2 } = initParser().parse2(getArgv("cmd1 a -nxb"));
    expect(x2.jsonMeta.opts["bar-bool"]).equal(true);

    const { command: x3 } = initParser().parse2(getArgv("cmd1 a -nxb -f"));
    expect(x3.jsonMeta.opts["bar-bool"]).equal(true);

    const { command: x4 } = initParser().parse2(getArgv("cmd1 a -nxb cmd2"));
    expect(x4.jsonMeta.opts["bar-bool"]).equal(true);
  });

  it("should take value specified by = to be false for no arg option", () => {
    const line = "cmd1 a --missing-type=no b";
    const x = initParser().parse(getArgv(line), 0);
    const cmd = x.command;
    expect(cmd.jsonMeta.opts["missing-type"]).eq(false);
  });

  it("should take no value specified to be true for no arg option", () => {
    const line = "cmd1 a --missing-type b";
    const x = initParser().parse(getArgv(line), 0);
    const cmd = x.command;
    expect(cmd.jsonMeta.opts["missing-type"]).eq(true);
  });

  it("should take value specified to be true for no arg option", () => {
    const line = "cmd1 a --missing-type=true b";
    const x = initParser().parse(getArgv(line), 0);
    const cmd = x.command;
    expect(cmd.jsonMeta.opts["missing-type"]).eq(true);
  });

  it("should parse command at the beginning", () => {
    const line =
      "cmd1 a --cmd1-bar woo -q v --count-opt -ccc --fooNum=900 --missing-type yes --no-foobool -bnx --bool-2=0 --fc true -a 100 200 -b";
    const x = initParser().parse(getArgv(line), 0);
    expect(x.command.error.message).contains(`Encountered unknown CLI option 'n'`);
    const m = x.command.jsonMeta;

    expect(m.opts).deep.eq({
      "log-level": "v",
      q: "v",
      "count-opt": 4,
      c: 4,
      fooNum: 900,
      "missing-type": true,
      foobool: false,
      "bar-bool": true,
      b: true,
      n: true,
      "bool-3": true,
      x: true,
      "bool-2": false,
      "force-cache": true,
      fc: true,
      "array-opt-require": ["100", "200"],
      a: ["100", "200"],
      "apply-default": true,
      logLevel: "v",
      countOpt: 4,
      missingType: true,
      barBool: true,
      bool3: true,
      bool2: false,
      forceCache: true,
      arrayOptRequire: ["100", "200"],
      applyDefault: true
    });
    expect(m.source).deep.eq({
      "log-level": "cli",
      q: "cli",
      "count-opt": "cli",
      c: "cli",
      fooNum: "cli",
      "missing-type": "cli",
      foobool: "cli",
      "bar-bool": "cli",
      b: "cli",
      n: "cli",
      "bool-3": "cli",
      x: "cli",
      "bool-2": "cli",
      "force-cache": "cli",
      fc: "cli",
      "array-opt-require": "cli",
      a: "cli",
      "apply-default": "default",
      logLevel: "cli",
      countOpt: "cli",
      missingType: "cli",
      barBool: "cli",
      bool3: "cli",
      bool2: "cli",
      forceCache: "cli",
      arrayOptRequire: "cli",
      applyDefault: "default"
    });
  });

  it("should parse option with typed array", () => {
    const nc = initParser();
    function t0() {
      const x = nc.parse(getArgv("--subtype-array 1 2 3 4 5"));
      const m = x.command.jsonMeta;

      expect(m.opts).deep.eq({
        "subtype-array": [1, 2, 3, 4, 5],
        "log-level": "info",
        "force-cache": true,
        "apply-default": true,
        subtypeArray: [1, 2, 3, 4, 5],
        logLevel: "info",
        forceCache: true,
        applyDefault: true
      });
      expect(m.source).deep.eq({
        "subtype-array": "cli",
        "log-level": "default",
        "force-cache": "default",
        "apply-default": "default",
        subtypeArray: "cli",
        logLevel: "default",
        forceCache: "default",
        applyDefault: "default"
      });
    }

    function t1() {
      const x = nc.parse(getArgv("--subtype-array"));
      const m = x.command.jsonMeta;

      expect(m.opts).deep.eq({
        "subtype-array": undefined,
        subtypeArray: undefined,
        "log-level": "info",
        "force-cache": true,
        "apply-default": true,
        logLevel: "info",
        forceCache: true,
        applyDefault: true
      });
      expect(m.source).deep.eq({
        "subtype-array": "cli",
        "log-level": "default",
        "force-cache": "default",
        "apply-default": "default",
        subtypeArray: "cli",
        logLevel: "default",
        forceCache: "default",
        applyDefault: "default"
      });
    }

    t0();
    t1();
  });

  it("should parse command with typed argument", () => {
    const nc = initParser();
    const x = nc.parse(getArgv("sum 1 2 3 4"));
    const m = x.command.jsonMeta;

    expect(m.opts).deep.eq({
      "log-level": "info",
      "force-cache": true,
      "apply-default": true,
      logLevel: "info",
      forceCache: true,
      applyDefault: true
    });
    expect(m.source).deep.eq({
      "log-level": "default",
      "force-cache": "default",
      "apply-default": "default",
      logLevel: "default",
      forceCache: "default",
      applyDefault: "default"
    });
    expect(m.subCommands).deep.eq({
      sum: {
        name: "sum",
        alias: "sum",
        argList: ["1", "2", "3", "4"],
        args: {
          "0": [1, 2, 3, 4]
        },
        opts: {},
        optsFull: {},
        optsCount: {},
        source: {},
        verbatim: {},
        subCommands: {}
      }
    });
  });

  it("should skip exec for skipExec flag", () => {
    let execed = false;
    const nc = initParser(() => (execed = true));
    nc.skipExec();
    nc.parse(getArgv("cmd8 1 2"));
    expect(execed).to.equal(false);
  });

  it("should terminate option arg gathering with --", () => {
    const nc = initParser();
    const { command: x } = nc.parse(getArgv("--str-opt -- cmd2"));
    const m = x.jsonMeta;
    expect(m.opts).deep.equal({
      "str-opt": undefined,
      strOpt: undefined,
      "log-level": "info",
      "force-cache": true,
      "apply-default": true,
      logLevel: "info",
      forceCache: true,
      applyDefault: true
    });
    expect(m.source).deep.eq({
      "str-opt": "cli",
      "log-level": "default",
      "force-cache": "default",
      "apply-default": "default",
      strOpt: "cli",
      logLevel: "default",
      forceCache: "default",
      applyDefault: "default"
    });
    expect(m.subCommands).deep.equal({});

    const parsed = nc.parse(getArgv("--array-opt-require -- d"));
    expect(parsed.command.error.message).to.equal(
      "Not enough arguments for option 'array-opt-require'"
    );
  });

  it("should terminate option array with --", () => {
    const nc = initParser();
    const { command: x } = nc.parse(getArgv("--array-opt-require a b c -- cmd2"));
    const m = x.jsonMeta;

    expect(m.opts).deep.equal({
      "array-opt-require": ["a", "b", "c"],
      "log-level": "info",
      "force-cache": true,
      "apply-default": true,
      arrayOptRequire: ["a", "b", "c"],
      logLevel: "info",
      forceCache: true,
      applyDefault: true
    });
    expect(m.source).deep.eq({
      "array-opt-require": "cli",
      "log-level": "default",
      "force-cache": "default",
      "apply-default": "default",
      arrayOptRequire: "cli",
      logLevel: "default",
      forceCache: "default",
      applyDefault: "default"
    });
    expect(m.subCommands).deep.equal({});
  });

  const testOptArgTerminator = (terminator: string) => {
    const nc = initParser();
    const x = nc.parse(getArgv(`--array-opt-require a b c ${terminator} d`));

    const m = x.command.jsonMeta;

    expect(m.opts).deep.equal({
      "array-opt-require": ["a", "b", "c"],
      "log-level": "info",
      "force-cache": true,
      "apply-default": true,
      arrayOptRequire: ["a", "b", "c"],
      logLevel: "info",
      forceCache: true,
      applyDefault: true
    });
    expect(m.source).deep.eq({
      "array-opt-require": "cli",
      "log-level": "default",
      "force-cache": "default",
      "apply-default": "default",
      arrayOptRequire: "cli",
      logLevel: "default",
      forceCache: "default",
      applyDefault: "default"
    });
    expect(m.argList).to.be.empty;
    expect(m.subCommands).deep.eq({});
    expect(x.command.error.message).contain(`Encountered unknown CLI argument 'd'`);
  };

  it("should terminate option array with -. and parse the remaining args", () => {
    testOptArgTerminator("-.");
  });

  it("should terminate option array with --. and parse the remaining args", () => {
    testOptArgTerminator("--.");
  });

  it("should terminate command args array with another --option that takes array args", () => {
    const nc = initParser();
    const x = nc.parse(getArgv(`cmd1 a b c --dev x y z`));
    const m = x.command.jsonMeta;

    const cmd1 = m.subCommands.cmd1;
    expect(cmd1.argList).deep.equal(["a", "b", "c"]);
    expect(cmd1.opts).deep.equal({ dev: ["x", "y", "z"], "cmd1-foo": "boo", cmd1Foo: "boo" });
    expect(cmd1.source).deep.eq({ dev: "cli", "cmd1-foo": "default", cmd1Foo: "default" });
    expect(m.opts).to.deep.eq({
      "log-level": "info",
      "force-cache": true,
      "apply-default": true,
      logLevel: "info",
      forceCache: true,
      applyDefault: true
    });
    expect(m.source).to.deep.eq({
      "log-level": "default",
      "force-cache": "default",
      "apply-default": "default",
      logLevel: "default",
      forceCache: "default",
      applyDefault: "default"
    });
  });

  it("should accept opt with variadic args that terminates with --. in middle of command args", () => {
    const nc = initParser();
    // the first -. ends --dev, the 2nd -. ends cmd1 args
    const x = nc.parse(getArgv(`cmd1 a --dev x y z -. -. cmd2 cmd3`));
    expect(x.command.error.message).contains("Not enough arguments for command 'cmd3'");
    const m = x.command.jsonMeta;
    const { cmd1, cmd2, cmd3 } = m.subCommands;
    expect(cmd1.argList).deep.equal(["a"]);
    expect(cmd1.opts).to.deep.eq({
      dev: ["x", "y", "z"],
      "cmd1-foo": "boo",
      cmd1Foo: "boo"
    });
    expect(cmd1.source).deep.eq({
      dev: "cli",
      "cmd1-foo": "default",
      cmd1Foo: "default"
    });
    expect(cmd2).to.be.ok;
    expect(cmd3).to.be.ok;
  });

  it("should accept opt in middle of command args", () => {
    const nc = initParser();
    // --1b doesn't accept arg, so the b after it should be an arg for cmd1
    const x = nc.parse(getArgv(`cmd1 a --1b b --1f sss -. cmd2`));
    const m = x.command.jsonMeta;
    const { cmd1, cmd2 } = m.subCommands;

    expect(cmd2).to.be.ok;
    expect(cmd1.argList).deep.equal(["a", "b"]);
    expect(cmd1.opts).deep.eq({
      "cmd1-boo": true,
      "1b": true,
      "cmd1-foo": "sss",
      "1f": "sss",
      cmd1Boo: true,
      cmd1Foo: "sss"
    });
    expect(cmd1.source).deep.eq({
      "cmd1-boo": "cli",
      "1b": "cli",
      "cmd1-foo": "cli",
      "1f": "cli",
      cmd1Boo: "cli",
      cmd1Foo: "cli"
    });
  });

  const testCmdArgTerminator = terminator => {
    const nc = initParser();
    const x = nc.parse(getArgv(`cmd1 a b c ${terminator} d`));
    const cmd = x.command;
    const m = cmd.jsonMeta;

    expect(cmd.error.message).contains("Encountered unknown CLI argument 'd'");

    expect(m.opts).to.deep.eq({
      "log-level": "info",
      "force-cache": true,
      "apply-default": true,
      logLevel: "info",
      forceCache: true,
      applyDefault: true
    });
    expect(m.source).to.deep.eq({
      "log-level": "default",
      "force-cache": "default",
      "apply-default": "default",
      logLevel: "default",
      forceCache: "default",
      applyDefault: "default"
    });

    const cmd1 = m.subCommands.cmd1;
    expect(cmd1.argList).deep.eq(["a", "b", "c"]);
    expect(cmd1.opts).to.deep.eq({
      "cmd1-foo": "boo",
      cmd1Foo: "boo"
    });
    expect(cmd1.source).to.deep.eq({
      "cmd1-foo": "default",
      cmd1Foo: "default"
    });
  };

  it("should terminate command array with -.", () => {
    testCmdArgTerminator("-.");
  });

  it("should terminate command array with --.", () => {
    testCmdArgTerminator("--.");
  });

  it("should terminate all parsing with --", () => {
    const nc = initParser();

    const x1 = nc.parse(getArgv("cmd7 a -- d e f"));

    // cmd7 requires at least 2 args, but -- terminate parsing and it didn't get enough
    expect(x1.command.error.message).contains("Not enough arguments for command 'cmd7'");
    const m = x1.command.jsonMeta;
    expect(x1.command.jsonMeta.subCommands.cmd7.argList).deep.eq(["a"]);

    //

    const x2 = nc.parse(getArgv("cmd7 a b -- d"));
    expect(x2.command.getErrorNodes()).to.be.empty;
    expect(x2.command.jsonMeta.subCommands.cmd7.argList).deep.eq(["a", "b"]);

    //

    const x3 = nc.parse(getArgv("cmd7 a b c -- d"));
    expect(x3.command.getErrorNodes()).to.be.empty;
    expect(x3.command.jsonMeta.subCommands.cmd7.argList).deep.eq(["a", "b", "c"]);
  });

  it("should terminate command array and parsing with --", () => {
    const nc = initParser();
    const x = nc.parse(getArgv("cmd1 -- d --1f=xyz"));
    expect(x.command.getErrorNodes()).to.be.empty;
    expect(x.command.jsonMeta.subCommands.cmd1.argList).deep.eq([]);
    expect(x.command.jsonMeta.subCommands.cmd1.opts).deep.eq({ "cmd1-foo": "boo", cmd1Foo: "boo" });
    expect(x.command.jsonMeta.subCommands.cmd1.source).deep.eq({
      "cmd1-foo": "default",
      cmd1Foo: "default"
    });
  });

  it("should terminate parsing with --", () => {
    const nc = initParser();
    const line =
      "cmd1 a --cmd1-bar woo -q v --count-opt -ccc -. -- --fooNum=900 --missing-type yes --no-foobool -bnxb";
    const p = nc.parse(getArgv(line));
    const x = p.command;
    expect(p.command.getErrorNodes()).to.be.empty;
    expect(p._).deep.eq(["--fooNum=900", "--missing-type", "yes", "--no-foobool", "-bnxb"]);
    expect(p.index).eq(10);
    const m = x.jsonMeta;

    expect(m.opts).deep.eq({
      "log-level": "v",
      q: "v",
      "count-opt": 4,
      c: 4,
      "force-cache": true,
      "apply-default": true,
      logLevel: "v",
      countOpt: 4,
      forceCache: true,
      applyDefault: true
    });
    expect(m.optsCount).deep.eq({
      "log-level": 1,
      "count-opt": 4,
      "force-cache": 1,
      "apply-default": 1,
      logLevel: 1,
      countOpt: 4,
      forceCache: 1,
      applyDefault: 1
    });
    expect(m.source).deep.eq({
      "log-level": "cli",
      q: "cli",
      "count-opt": "cli",
      c: "cli",
      "force-cache": "default",
      "apply-default": "default",
      logLevel: "cli",
      countOpt: "cli",
      forceCache: "default",
      applyDefault: "default"
    });

    expect(m.subCommands).deep.eq({
      cmd1: {
        name: "cmd1",
        alias: "cmd1",
        argList: ["a"],
        args: {
          "0": ["a"]
        },
        opts: {
          "cmd1-bar": "woo",
          "cmd1-foo": "boo",
          cmd1Bar: "woo",
          cmd1Foo: "boo"
        },
        optsFull: {
          "cmd1-bar": {
            "0": "woo"
          },
          "cmd1-foo": {
            "0": "boo"
          },
          cmd1Bar: {
            "0": "woo"
          },
          cmd1Foo: {
            "0": "boo"
          }
        },
        optsCount: {
          "cmd1-bar": 1,
          "cmd1-foo": 1,
          cmd1Bar: 1,
          cmd1Foo: 1
        },
        source: {
          "cmd1-bar": "cli",
          "cmd1-foo": "default",
          cmd1Bar: "cli",
          cmd1Foo: "default"
        },
        verbatim: {},
        subCommands: {}
      }
    });
  });

  it("should handle option missing arg", () => {
    const nc = initParser();
    const p = nc.parse(getArgv("--missing-type --str-opt"));
    const m = p.command.jsonMeta;

    expect(m.opts).deep.eq({
      strOpt: undefined,
      "str-opt": undefined, // no arg specified => undefined
      "missing-type": true,
      "log-level": "info",
      "force-cache": true,
      "apply-default": true,
      missingType: true,
      logLevel: "info",
      forceCache: true,
      applyDefault: true
    });
    expect(m.source).deep.eq({
      "missing-type": "cli",
      "str-opt": "cli",
      "log-level": "default",
      "force-cache": "default",
      "apply-default": "default",
      missingType: "cli",
      strOpt: "cli",
      logLevel: "default",
      forceCache: "default",
      applyDefault: "default"
    });
  });

  it("should set unknown cli argument error", () => {
    let outputed = "";
    const nc = new NixClap({
      name: "test",
      ...noOutputExit,
      output: o => {
        outputed += o;
      }
    }).init({}, {});

    const { command: x } = nc.parse(getArgv("blah"));
    expect(x.error.message).contains("unknown CLI argument 'blah'");
  });

  it("should set unknown cli option error", () => {
    let outputed = "";
    const nc = new NixClap({
      name: "test",
      ...noOutputExit,
      output: o => (outputed += o)
    }).init({}, {});
    const { command: x } = nc.parse2(getArgv("--blah"));
    expect(x.error.message).contains("Encountered unknown CLI option 'blah'");
  });

  it("should fail for unknown option arg type", () => {
    expect(() =>
      new NixClap({ ...noOutputExit }).init({
        foo: {
          args: "< blah>"
        }
      })
    ).to.throw("option foo - unknown type 'blah' for argument '< blah>'");

    expect(() =>
      new NixClap({ ...noOutputExit }).init({
        foo: {
          args: "< blah..1,>"
        }
      })
    ).to.throw("option foo - unknown type 'blah' for argument '< blah..1,>'");
  });

  it("should handle requireArg option missing arg", () => {
    const nc = initParser();
    const { command: x } = nc.parse2(getArgv("--rao"));
    expect(x.error.message).to.contain("Not enough arguments for option 'require-arg-opt'");

    const { command: x2 } = nc.parse2(getArgv("--require-arg-opt"));
    expect(x2.error.message).to.equal("Not enough arguments for option 'require-arg-opt'");
  });

  it("should fail if user didn't specify a required option", () => {
    const nc = initParser(
      undefined,
      undefined,
      { "parse-fail": () => { } },
      {
        requireMe: {
          desc: "must have",
          required: true,
          args: "< string>"
        } as OptionSpec
      }
    );
    const { command: x } = nc.parse2(getArgv("--requireMe yup"));
    expect(x.jsonMeta.opts.requireMe).toBe("yup");
    const { command: x2 } = nc.parse2(getArgv("--str-opt a"));
    expect(x2.error.message).toContain("missing these required options requireMe");
  });

  it("should fail for parseAsync if user didn't specify a required option", async () => {
    const nc = initParser(
      undefined,
      undefined,
      { "parse-fail": () => { } },
      {
        requireMe: {
          desc: "must have",
          required: true,
          args: "< string>"
        } as OptionSpec
      }
    );
    const { command: x } = await nc.parseAsync(getArgv("--requireMe yup"));
    expect(x.jsonMeta.opts.requireMe).toBe("yup");
    const { command: x2 } = await nc.parseAsync(getArgv("--str-opt a"));
    expect(x2.error.message).toContain("missing these required options requireMe");
  });

  it("should handle cmd alias as a string", () => {
    const nc = initParser();
    const { command: x } = nc.parse2(getArgv("4"));
    expect(x.getErrorNodes()).to.be.empty;
    expect(x.jsonMeta.subCommands).deep.eq({
      cmd4: {
        name: "cmd4",
        alias: "4",
        argList: [],
        args: {},
        opts: {},
        optsFull: {},
        optsCount: {},
        source: {},
        verbatim: {},
        subCommands: {}
      }
    });
  });

  it("should handle cmd alias as an array", () => {
    const nc = initParser();
    const { command: x } = nc.parse(getArgv("c5"));
    expect(x.getErrorNodes()).to.be.empty;
    expect(x.jsonMeta.subCommands).to.deep.equal({
      cmd5: {
        name: "cmd5",
        alias: "c5",
        argList: [],
        args: {},
        opts: {},
        optsFull: {},
        optsCount: {},
        source: {},
        verbatim: {},
        subCommands: {}
      }
    });
  });

  it("should handle coercion as string", () => {
    const nc = new NixClap({ ...noOutputExit }).init(
      {
        blah: {
          customTypes: {
            x: "as-string-value"
          },
          args: "<x1 x>"
        }
      },
      {}
    );

    const r = nc.parse(getArgv("--blah 12345.9"));
    const m = r.command.jsonMeta;

    expect(m.opts.blah).eq("as-string-value");
    expect(m.optsFull.blah.x1).eq("as-string-value");
  });

  it("should set error for unknown coercion", () => {
    const nc = new NixClap({ ...noOutputExit }).init(
      {
        blah: {
          customTypes: {
            x: 11234 as any
          },
          args: "<x1 x>"
        }
      },
      {}
    );

    const r = nc.parse(getArgv("--blah 12345.9"));
    expect(r.errorNodes![0].error.message).contains("Unknown custom type handler: number");
  });

  it("should handle type coercion for commands", () => {
    const nc = new NixClap({ ...noOutputExit }).init(
      {},
      {
        foo: {
          args: "<oop m1> <boo m2>",
          customTypes: { m1: value => `for-oop ${value}`, m2: /^wooo$/i }
          // defaultValues: {
          //   m2: "oow"
          // }
        }
      }
    );
    const { command: x } = nc.parse2(getArgv("foo hello wooo"));
    expect(x.getErrorNodes()).to.be.empty;
    const { foo } = x.jsonMeta.subCommands;
    expect(foo.argList).deep.equal(["hello", "wooo"]);
    expect(foo.args.oop).equal("for-oop hello");
    expect(foo.args.boo).equal("wooo");
    const { command: p2 } = nc.parse2(getArgv("foo hello abc"));
    const cmd2 = x.jsonMeta.subCommands.foo;
    expect(p2.getErrorNodes()).not.to.be.empty;
    expect(cmd2.args.boo).to.equal("wooo");
  });

  it("should parse process.argv", () => {
    const nc = initParser();
    process.argv = getArgv("node blah.js cmd1 a --cmd1-bar woo");
    const x = nc.parse();
    const m = x.command.jsonMeta;

    expect(m.subCommands.cmd1).deep.eq({
      name: "cmd1",
      alias: "cmd1",
      argList: ["a"],
      args: {
        "0": ["a"]
      },
      opts: {
        "cmd1-bar": "woo",
        "cmd1-foo": "boo",
        cmd1Bar: "woo",
        cmd1Foo: "boo"
      },
      optsFull: {
        "cmd1-bar": {
          "0": "woo"
        },
        "cmd1-foo": {
          "0": "boo"
        },
        cmd1Bar: {
          "0": "woo"
        },
        cmd1Foo: {
          "0": "boo"
        }
      },
      optsCount: {
        "cmd1-bar": 1,
        "cmd1-foo": 1,
        cmd1Bar: 1,
        cmd1Foo: 1
      },
      source: {
        "cmd1-bar": "cli",
        "cmd1-foo": "default",
        cmd1Bar: "cli",
        cmd1Foo: "default"
      },
      verbatim: {},
      subCommands: {}
    });
  });

  it("should use name passed to construtor", () => {
    const nc = initParser(undefined, new NixClap({ name: "foo-test", ...noOutputExit }));
    process.argv = getArgv("node blah.js cmd1 a --cmd1-bar woo");
    const r = nc.parse();
    const h = nc.makeHelp();
    expect(h[1]).to.equal("Usage: foo-test <command>");
    const h2 = r.command.cmdBase.makeHelp("foo-1");
    expect(h2[0]).contain("foo-1 cmd1");
  });

  it("should add command name to sub command help", () => {
    const nc = new NixClap({ ...noOutputExit, name: "foo" }).init(
      {},
      {
        cmd1: {
          subCommands: {
            cmd2: {}
          }
        }
      }
    );
    const r = nc.parse(["cmd1"]);
    const h = r.command.subCmdNodes.cmd1.cmdBase.makeHelp();
    expect(h[0]).contain("cmd1 cmd2");
  });

  it("should handle unknown options", () => {
    const nc = initParser();
    const p = nc.parse(getArgv("--unknown-opt --no-foo-zoo"));
    const x = p.command;
    const m = x.jsonMeta;

    const errors = x.errors;
    expect(errors).not.empty;

    expect(errors[0].message).contain("Encountered unknown CLI option 'unknown-opt'");
    expect(errors[1].message).contain("Encountered unknown CLI option 'foo-zoo'");

    expect(m.opts).deep.eq({
      "unknown-opt": true,
      "foo-zoo": false,
      "log-level": "info",
      "force-cache": true,
      "apply-default": true,
      unknownOpt: true,
      fooZoo: false,
      logLevel: "info",
      forceCache: true,
      applyDefault: true
    });
    expect(m.source).deep.eq({
      "unknown-opt": "cli",
      "foo-zoo": "cli",
      "log-level": "default",
      "force-cache": "default",
      "apply-default": "default",
      unknownOpt: "cli",
      fooZoo: "cli",
      logLevel: "default",
      forceCache: "default",
      applyDefault: "default"
    });
    expect(m.optsCount).deep.eq({
      "unknown-opt": 1,
      "foo-zoo": 1,
      "log-level": 1,
      "force-cache": 1,
      "apply-default": 1,
      unknownOpt: 1,
      fooZoo: 1,
      logLevel: 1,
      forceCache: 1,
      applyDefault: 1
    });
  });

  it("should handle optional args for command", () => {
    const nc = initParser();

    function t0() {
      const p = nc.parse(getArgv("6"));
      const x = p.command;
      expect(x.errors).not.to.be.empty;
      expect(x.errors[0].message).contains("Not enough arguments for command 'cmd6'");
    }

    function t1() {
      const p = nc.parse(getArgv("cmd6 1"));
      const m = p.command.jsonMeta;
      expect(p.command.errors).to.be.empty;
      expect(m.subCommands.cmd6.argList).to.deep.eq(["1"]);
    }

    function t2() {
      const p = nc.parse(getArgv("cmd6 1 2"));
      expect(p.command.errors).to.be.empty;
      expect(p.command.jsonMeta.subCommands.cmd6.argList).to.deep.eq(["1", "2"]);
    }

    function t3() {
      const p = nc.parse(getArgv("cmd6 1 2 3"));
      expect(p.command.errors).to.be.empty;
      expect(p.command.jsonMeta.subCommands.cmd6.argList).to.deep.eq(["1", "2", "3"]);
    }

    function t4() {
      const p = nc.parse(getArgv("cmd6 1 2 3 4"));
      expect(p.command.errors).to.be.empty;
      expect(p.command.jsonMeta.subCommands.cmd6.argList).to.deep.eq(["1", "2", "3", "4"]);
    }

    t0();
    t1();
    t2();
    t3();
    t4();
  });

  it("should fail if command option conflict with upper level", () => {
    expect(() =>
      new NixClap({ ...noOutputExit }).init(
        {
          blah: {}
        },
        {
          test: {
            options: {
              blah: {}
            }
          }
        }
      )
    ).to.throw("Command test option blah already used by parent command '~root-command~'");

    expect(() =>
      new NixClap({ ...noOutputExit }).init(
        {
          blah: {}
        },
        {
          test: {
            options: {
              blah: {}
            },
            subCommands: {
              test2: {
                options: {
                  blah: {}
                }
              }
            }
          }
        }
      )
    ).to.throw("Command test2 option blah already used by parent command 'test'");
  });

  it("should handle sub command option alias duplicate parent option alias", () => {
    const nc = new NixClap({ ...noOutputExit }).init(
      {
        blah: { alias: "b" }
      },
      {
        test: {
          options: {
            xy: { alias: "b" }
          }
        }
      }
    );
    const { command: p } = nc.parse2(getArgv("-b test -b"));
    const m = p.jsonMeta;

    expect(m.opts).deep.equal({
      blah: true,
      b: true
    });
    expect(m.subCommands.test.opts).deep.equal({
      xy: true,
      b: true
    });

    // expect(() =>
    //   new NixClap({ ...noOutputExit }).init(
    //     {
    //       blah: { alias: "b" }
    //     },
    //     {
    //       test: {
    //         options: {
    //           xy: { alias: "b" }
    //         }
    //       }
    //     }
    //   )
    // ).to.throw("Command test option xy alias b conflicts with top level alias");
  });

  it("should handle sub command option alias duplicate top option", () => {
    const nc = new NixClap({ ...noOutputExit }).init(
      {
        blah: { alias: "b" }
      },
      {
        test: {
          options: {
            xy: { alias: "blah" }
          }
        }
      }
    );

    const { command: p } = nc.parse2(getArgv("-b test --blah"));
    const m = p.jsonMeta;

    expect(m.opts).deep.equal({
      blah: true,
      b: true
    });
    expect(m.subCommands.test.opts).deep.equal({
      xy: true,
      blah: true
    });
  });

  it("should fail if sub command option conflict with top level option", () => {
    expect(() =>
      new NixClap({ ...noOutputExit }).init(
        {
          blah: { alias: "foo" }
        },
        {
          test: {
            options: {
              blah: { alias: "foo" }
            }
          }
        }
      )
    ).to.throw("Command test option blah already used by parent command");
  });

  it("should fail if option alias conflict", () => {
    expect(() =>
      new NixClap({ ...noOutputExit }).init({
        blah: { alias: "foo" },
        plug: { alias: "foo" }
      })
    ).to.throw("Option alias foo already used by option blah");
  });

  it("should fail if command option alias conflict", () => {
    expect(() =>
      new NixClap({ ...noOutputExit }).init(
        {},
        {
          cmd: {
            options: {
              blah: { alias: "foo" },
              plug: { alias: "foo" }
            }
          }
        }
      )
    ).to.throw("Init command cmd failed - Option alias foo already used by option blah");
  });

  it("should fail if command alias conflict", () => {
    expect(() =>
      new NixClap({ ...noOutputExit }).init(
        {},
        {
          cmd: {
            alias: "foo"
          },
          cmd2: {
            alias: "foo"
          }
        }
      )
    ).to.throw("Command cmd2 alias foo already used by command cmd");
  });

  it("should fail if command specify variadic not in last arg", () => {
    expect(() => {
      return new NixClap({ ...noOutputExit }).init(
        {},
        {
          cmd: {
            args: "<..> <blah>"
          }
        }
      );
    }).to.throw("For args specifier of 'cmd', only the last one can be variadic");
  });

  it("should fail if command specify invalid arg", () => {
    expect(() => {
      return new NixClap({ ...noOutputExit }).init(
        {},
        {
          cmd: {
            args: "<woo foo  blah>"
          }
        }
      );
    }).to.throw("command cmd - unknown type 'foo  blah' for argument '<woo foo  blah>'");
  });

  it("should fail if command specify invalid arg type", () => {
    expect(() => {
      return new NixClap({ ...noOutputExit }).init(
        {},
        {
          cmd: {
            args: "<woo foo>"
          }
        }
      );
    }).to.throw("command cmd - unknown type 'foo' for argument '<woo foo>'");
  });

  it("should fail if arg specifier is invalid", () => {
    expect(() => {
      return new NixClap({ ...noOutputExit }).init({
        blah: {
          args: "test"
        }
      });
    }).to.throw("Invalid args specifier 'test");
  });

  it("should fail if sub command got invalid arg", () => {
    const nc = new NixClap({ ...noOutputExit }).init(
      {},
      {
        cmd1: {
          args: "<a> <b>"
        }
      }
    );

    const parsed = nc.parse2(getArgv("cmd1 1 2 3"));
    expect(parsed.errorNodes.length, "error expected").to.equal(1);
    expect(parsed.errorNodes[0].name).to.equal("cmd1");
    expect(parsed.errorNodes[0].error.message).equal(
      `Encountered unknown CLI argument '3' while parsing for command 'cmd1'`
    );
  });

  it("should invoke cmd exec", async () => {
    let execed = false;
    const exec: CommandExecFunc = (cmd: CommandNode, cmdNodes?: CommandNode[]) => {
      execed = true;
    };

    const execAsync: CommandExecFunc = async (cmd: CommandNode, cmdNodes?: CommandNode[]) => {
      execed = true;
    };

    const verify = (result: ParseResult) => {
      expect(execed).toBe(true);
      expect(result.command.jsonMeta.subCommands.cmd8).toEqual({
        name: "cmd8",
        alias: "8",
        argList: ["ax", "b", "1", "2"],
        args: {
          "0": "ax",
          "1": "b",
          "2": ["1", "2"],
          a: "ax",
          b: "b",
          c: ["1", "2"]
        },
        opts: {
          "cmd8-foo": "blah",
          cmd8Foo: "blah"
        },
        optsFull: {
          "cmd8-foo": {
            "0": "blah"
          },
          cmd8Foo: {
            "0": "blah"
          }
        },
        optsCount: {
          "cmd8-foo": 1,
          cmd8Foo: 1
        },
        source: {
          "cmd8-foo": "cli",
          cmd8Foo: "cli"
        },
        verbatim: {},
        subCommands: {}
      });
    };

    const nc = initParser(exec);
    const result1 = nc.parse(getArgv("8 ax b 1 2 --cmd8-foo blah"));
    verify(result1);

    execed = false;
    const result2 = await nc.parseAsync(getArgv("8 ax b 1 2 --cmd8-foo blah"));
    verify(result2);

    execed = false;
    const nc2 = initParser(execAsync);
    const result3 = await nc.parseAsync(getArgv("8 ax b 1 2 --cmd8-foo blah"));
    verify(result3);
  });

  it("should make help text", () => {
    const nc = initParser(
      undefined,
      new NixClap({ name: "test", ...noOutputExit }).version("1.0.0")
    );
    expect(nc.makeHelp()).toEqual([
      "",
      "Usage: test <command>",
      "",
      "Commands:",
      "  cmd1 <..>",
      "  cmd2",
      "  cmd3 <id>",
      "  cmd4                                                              [aliases: 4]",
      "  cmd5                      test command 5                       [aliases: 5 c5]",
      "  cmd6 <a> [b] [c..]",
      "       test command 6 test blah foo test blah foo test blah foo test blah foo",
      "                                                                    [aliases: 6]",
      "  cmd7 <a> <b> [c] [d] [e]",
      "  cmd8 <a> <b> [c..]                                                [aliases: 8]",
      "  sum < number..>",
      "",
      "Options:",
      "  --log-level, -q           One of: debug,verbose,info,warn,error,fyi,none",
      '                                                      [string] [default: "info"]',
      "  --str-opt                                                             [string]",
      "  --require-arg-opt, --rao                                              [string]",
      "  --force-cache, -f, --fc   Don't check registry if cache exists.",
      `                                                     [boolean] [default: "true"]`,
      "  --bar-bool, -b                                                       [boolean]",
      "  --foobool                                                            [boolean]",
      "  --array-opt-require, -a                                            [string ..]",
      "  --array-opt-opt, --aoo                                             [number ..]",
      "  --subtype-array                                                    [number ..]",
      "  --fooNum                                                              [number]",
      "  --floatNum                                                             [float]",
      "  --customFn                                                              [xfoo]",
      "  --customRegex                                                        [rxmatch]",
      "  --customOther                                                        [rxother]",
      "  --bool-2                                                             [boolean]",
      "  --missing-type",
      "  --bool-3, -x",
      "  --count-opt, -c",
      '  --apply-default                                    [boolean] [default: "test"]',
      "  --version, -V, -v         Show version number",
      "  --help, -?, -h            Show help. Add a command to show its help   [string]"
    ]);
  });

  it("should turn off version and help option", () => {
    const nc = new NixClap({ ...noOutputExit }).version("").usage("").help(false).init({}, {});
    const help = nc.makeHelp();
    expect(help).toEqual([""]);
  });

  it("should turn off help through config", () => {
    const nc = new NixClap({ help: false, ...noOutputExit }).version("").usage("").init({}, {});
    const help = nc.makeHelp();
    expect(help).toEqual([""]);
  });

  it("should show help and exit on parse error", () => {
    let exited;
    const outputed: any[] = [];
    const nc = new NixClap({
      name: "test",
      exit: n => (exited = n),
      output: o => outputed.push(o)
    });
    nc.init({
      poo: {},
      foo: {
        args: "< string>"
      }
    });
    const p = nc.parse(getArgv("--foo"));
    const m = p.command.jsonMeta;

    expect(exited).toBe(1);
    expect(outputed).toBeDefined();
    expect(outputed[1].trim()).toBe("Error: Not enough arguments for option 'foo'");
  });

  it("should show help for --help", () => {
    let exited;
    const outputed: any[] = [];
    const nc = new NixClap({
      name: "test",
      exit: n => (exited = n),
      output: o => outputed.push(o)
    });
    nc.init({ foo: { args: "< string>" } });
    const p = nc.parse(getArgv("--help"));

    expect(exited).toBe(0);
    expect(outputed).toBeDefined();
  });

  it("should show help for a command", () => {
    let exited;
    const outputed: any[] = [];
    const nc = new NixClap({
      name: "test",
      exit: n => (exited = n),
      output: o => outputed.push(o)
    });
    nc.init(
      { foo: { args: "< string>" } },
      { cmd1: { desc: "test cmd1", options: { blah: { desc: "test blah" } } } }
    );
    const p = nc.parse(getArgv("--help cmd1"));

    expect(exited).toBe(0);
    expect(outputed).toBeDefined();
    expect(outputed.join("")).toBe(`
Usage: test cmd1

  test cmd1

Options:
  --blah  test blah

`);
  });

  it("should show help for a command if --help follow command", () => {
    let exited;
    const outputed: any[] = [];
    const nc = new NixClap({
      name: "test",
      exit: n => (exited = n),
      output: o => outputed.push(o)
    });
    nc.init(
      { foo: { args: "< string>" } },
      { cmd1: { desc: "test cmd1", options: { blah: { desc: "test blah" } } } }
    );
    const p = nc.parse(getArgv("cmd1 --help"));
    const m = p.command.jsonMeta;

    expect(exited).toBe(0);
    expect(outputed).toBeDefined();
  });

  it("should handle sub commands with exec", () => {
    const nc = new NixClap({ ...noOutputExit }).init(
      {},
      {
        cmd1: {
          subCommands: {
            sub1: {
              desc: "test sub1"
            }
          }
        }
      }
    );

    const { command: x } = nc.parse(getArgv("cmd1 sub1"));
    expect(x.getErrorNodes()).toEqual([]);
    expect(x.jsonMeta.subCommands.cmd1.subCommands.sub1).toEqual({
      name: "sub1",
      alias: "sub1",
      argList: [],
      args: {},
      opts: {},
      optsFull: {},
      optsCount: {},
      source: {},
      verbatim: {},
      subCommands: {}
    });
  });

  const numCommands: Record<string, CommandSpec> = {
    sum: {
      alias: "s",
      desc: "Output sum of numbers",
      exec: noop,
      args: "< number..>"
    },
    sort: {
      alias: "sr",
      desc: "Output sorted numbers",
      exec: noop,
      args: "< number..>",
      options: {
        reverse: {
          alias: "r",
          desc: "Sort in descending order"
        }
      }
    }
  };

  it("should make help for command", () => {
    const nc = new NixClap({ ...noOutputExit })
      .cmdUsage("$0 $1")
      .version("1.0.0")
      .init({}, numCommands);
    let help = nc.makeHelp("s");
    expect(help).to.deep.equal([
      "",
      "Usage:  s",
      "",
      "  Output sum of numbers",
      "Command 's' is alias for 'sum'",
      "Command sum has no options"
    ]);
    help = nc.makeHelp("sum");
    expect(help).to.deep.equal([
      "",
      "Usage:  sum",
      "",
      "  Output sum of numbers",
      "Command sum has no options"
    ]);
    help = nc.makeHelp("sr");
    expect(help).to.deep.equal([
      "",
      "Usage:  sr",
      "",
      "  Output sorted numbers",
      "Command 'sr' is alias for 'sort'",
      "",
      `Options:`,
      "  --reverse, -r  Sort in descending order"
    ]);
    help = nc.makeHelp("sort");
    expect(help).to.deep.equal([
      "",
      "Usage:  sort",
      "",
      "  Output sorted numbers",
      "",
      "Options:",
      "  --reverse, -r  Sort in descending order"
    ]);
    help = nc.makeHelp("blah");
    expect(help).to.deep.equal(["Unknown command: blah"]);
  });

  it("should make help for command with custom usage", () => {
    const nc = new NixClap({ name: "test", ...noOutputExit })
      .cmdUsage("$0 $1")
      .version("1.0.0")
      .init(
        {},
        {
          foo: {
            usage: "$0 $1 bar"
          },
          blah: {
            usage: () => "blah blah"
          }
        }
      );
    let help = nc.makeHelp("foo");
    expect(help).to.deep.equal(["", "Usage: test foo bar", "", "Command foo has no options"]);
    help = nc.makeHelp("blah");
    expect(help).to.deep.equal(["", "Usage: blah blah", "", "Command blah has no options"]);
  });

  it("should make help for version without used alias V and v", () => {
    const nc = new NixClap({ name: "test", ...noOutputExit })
      .cmdUsage("$0 $1")
      .version("1.0.0")
      .init(
        {
          xv: {
            alias: ["v"]
          },
          xv2: {
            alias: ["V"]
          }
        },
        {
          foo: {
            usage: "$0 $1 bar"
          },
          blah: {
            usage: () => "blah blah"
          }
        }
      );
    const help = nc.makeHelp();
    expect(help).to.deep.equal([
      "",
      "Usage: test <command>",
      "",
      "Commands:",
      "  foo",
      "  blah",
      "",
      "Options:",
      "  --xv, -v",
      "  --xv2, -V",
      "  --version       Show version number",
      "  --help, -?, -h  Show help. Add a command to show its help             [string]"
    ]);
  });

  it("should emit no-action event", async () => {
    const nc = new NixClap({ ...noOutputExit })
      .removeDefaultHandlers("*")
      .cmdUsage("$0 $1")
      .version("1.0.0")
      .init({}, numCommands);

    let called = false;
    nc.once("no-action", () => (called = true));
    nc.parse([]);
    expect(called).to.be.true;

    called = false;
    nc.once("no-action", () => (called = true));
    await nc.parseAsync([]);
    expect(called).to.be.true;
  });

  it("should not emit no-action event when there's no command with exec", () => {
    let called;
    const nc = new NixClap({
      ...noOutputExit,
      handlers: {
        "no-action": () => (called = true)
      }
    })
      .removeDefaultHandlers("*")
      .cmdUsage("$0 $1")
      .version("1.0.0")
      .init(
        {},
        {
          foo: {},
          bar: {}
        }
      );
    nc.parse([]);
    expect(called).to.be.undefined;
  });

  it("should show help for no-action event", () => {
    const nc = new NixClap({ ...noOutputExit })
      .cmdUsage("$0 $1")
      .version("1.0.0")
      .init({}, numCommands);
    let showed;
    nc.showHelp = () => (showed = true);
    nc.parse([]);
    expect(showed).to.be.true;
  });

  it("should invoke default command handler with its default options applied", async () => {
    const verify = async (a: boolean) => {
      let cmd: CommandNode | undefined;
      const exec = (cmdX: CommandNode, nodes: CommandNode[]) => (cmd = nodes.at(-1));
      const execAsync = async (cmdX: CommandNode, nodes: CommandNode[]) => (cmd = nodes.at(-1));
      const nc = new NixClap({ ...noOutputExit, defaultCommand: "foo" }).init(
        {},
        {
          foo: {
            args: "[b]",
            exec: a ? execAsync : exec,
            options: { bar: { args: "[ string]", argDefault: "hello" } }
          },
          bar: {}
        }
      );
      let p;
      if (a) {
        p = await nc.parseAsync([]);
      } else {
        p = nc.parse([]);
      }
      expect(cmd).to.be.ok;
      expect(cmd!.name).to.equal("foo");
      expect(cmd!.jsonMeta.opts).deep.eq({
        bar: "hello"
      });
      expect(cmd!.jsonMeta.source).deep.eq({
        bar: "default"
      });
    };

    await verify(false);
    await verify(true);
  });

  it("should set error if defaultCommand didn't match", () => {
    let called = false;
    const nc = new NixClap({ ...noOutputExit, defaultCommand: "foox" }).init(
      {},
      {
        foo: {
          args: "[b]",
          exec: () => (called = true),
          options: { bar: { args: "[ string]", argDefault: ["hello", "world"] }, blah: {} }
        },
        bar: {}
      }
    );

    const parsed = nc.parse(getArgv(""));
    expect(parsed.errorNodes![0].error.message).contain("default command foox not found");
  });

  it("should apply option with default args", () => {
    const nc = new NixClap({ ...noOutputExit, defaultCommand: "foo" }).init(
      {},
      {
        foo: {
          args: "[b]",
          options: { bar: { args: "[ string]", argDefault: ["hello", "world"] }, blah: {} }
        },
        bar: {}
      }
    );

    const parsed = nc.parse(getArgv("foo --blah"));
    const m = parsed.command.jsonMeta;
    const fooCmd = m.subCommands.foo;
    expect(fooCmd).to.deep.equal({
      name: "foo",
      alias: "foo",
      argList: [],
      args: {},
      opts: {
        blah: true,
        bar: "hello"
      },
      optsFull: {
        blah: { 0: true },
        bar: {
          "0": "hello"
        }
      },
      optsCount: {
        blah: 1,
        bar: 1
      },
      source: {
        blah: "cli",
        bar: "default"
      },
      verbatim: {},
      subCommands: {}
    });
  });

  it("should handle options with multiple args", () => {
    const nc = initParser();
    const parsed = nc.parse(getArgv("--array-opt-opt 25 b c"), 0);
    const m = parsed.command.jsonMeta;
    expect(m.opts.arrayOptOpt).to.deep.eq({
      0: 25,
      1: ["b", "c"]
    });
  });

  it("should apply user config after parse", () => {
    const line =
      "cmd1 a --cmd1-bar woo --count-opt --foox12 -ccc --fooNum=900 -a 50 --array-opt-opt";
    const nc = initParser();
    const parsed = nc.parse(getArgv(line), 0);
    parsed.command.applyConfig({
      "str-opt": "str1",
      foox12: "123",
      anything: 999,
      fooNum: 1000,
      "log-level": "warn"
    });
    const m = parsed.command.jsonMeta;

    expect(m.opts).deep.eq({
      "count-opt": 4,
      c: 4,
      fooNum: 900,
      foox12: true,
      "array-opt-require": ["50"],
      "array-opt-opt": {},
      arrayOptOpt: {},
      a: ["50"],
      "force-cache": true,
      "apply-default": true,
      countOpt: 4,
      arrayOptRequire: ["50"],
      logLevel: "info",
      "log-level": "warn",
      "str-opt": "str1",
      forceCache: true,
      applyDefault: true,
      anything: 999
    });

    expect(m.source).deep.eq({
      "count-opt": "cli",
      c: "cli",
      fooNum: "cli",
      foox12: "cli",
      "array-opt-require": "cli",
      "array-opt-opt": "cli",
      arrayOptOpt: "cli",
      a: "cli",
      "force-cache": "default",
      "apply-default": "default",
      countOpt: "cli",
      arrayOptRequire: "cli",
      logLevel: "default",
      "log-level": "user",
      "str-opt": "user",
      forceCache: "default",
      applyDefault: "default",
      anything: "user"
    });
  });

  it("should skip exec if skipExec flag is set", () => {
    let called;
    const commands = {
      cmd1: {
        exec: () => {
          called = true;
        }
      }
    };
    let nc = new NixClap(noOutputExit).init({}, commands);
    let parsed = nc.parse(getArgv("cmd1"));
    expect(parsed).to.be.ok;
    const m = parsed.command.jsonMeta;
    expect(m.subCommands.cmd1).to.be.ok;
    expect(called).to.equal(true);
    called = undefined;
    nc = new NixClap({ skipExec: true, ...noOutputExit }).init({}, commands);
    parsed = nc.parse(getArgv("cmd1"));
    expect(parsed).to.be.ok;
    const m2 = parsed.command.jsonMeta;
    expect(m2.subCommands.cmd1).to.be.ok;
    expect(called).to.equal(undefined);
  });

  it("should skip exec for parseAsync if skipExec flag is set", async () => {
    let called = false;
    const commands = {
      cmd1: {
        exec: async () => {
          called = true;
        }
      }
    };
    let nc = new NixClap(noOutputExit).init({}, commands);
    let parsed = await nc.parseAsync(getArgv("cmd1"));
    expect(parsed).to.be.ok;
    const m = parsed.command.jsonMeta;
    expect(m.subCommands.cmd1).to.be.ok;
    expect(called).to.equal(true);

    called = false;

    nc = new NixClap({ skipExec: true, ...noOutputExit }).init({}, commands);

    parsed = await nc.parseAsync(getArgv("cmd1"));
    expect(parsed).to.be.ok;
    const m2 = parsed.command.jsonMeta;
    expect(m2.subCommands.cmd1).to.be.ok;
    expect(called).to.equal(false);
  });

  it("should skip default exec if skipExecDefault flag is set", async () => {
    const verify = async (a: boolean) => {
      let called;

      const exec = () => {
        called = true;
      };
      const execAsync = async () => {
        called = true;
      };
      const commands = {
        cmd1: {
          exec: a ? execAsync : exec
        }
      };
      let nc = new NixClap({ ...noOutputExit, defaultCommand: "cmd1" }).init({}, commands);

      let parsed;

      if (a) {
        parsed = await nc.parseAsync([]);
      } else {
        parsed = nc.parse([]);
      }

      expect(parsed).to.be.ok;
      // expect(parsed.command).to.be.empty;
      expect(called).to.equal(true);
      called = undefined;
      nc = new NixClap({ skipExecDefault: true, ...noOutputExit, defaultCommand: "cmd1" }).init(
        {},
        commands
      );
      parsed = nc.removeDefaultHandlers("no-action").parse([]);
      expect(parsed).to.be.ok;
      // expect(parsed.command).to.be.empty;
      expect(called).to.equal(undefined);
    };

    await verify(false);
    await verify(true);
  });

  describe("allowUnknownOptions configuration", () => {
    it("should allow unknown options at root level when allowUnknownOptions is true", () => {
      const nc = new NixClap({
        ...noOutputExit,
        allowUnknownOptions: true
      }).init();

      const result = nc.parse(["node", "test.js", "--unknown-opt=value"], 2);
      expect(result.command.error).toBeUndefined();
      expect(result.command.jsonMeta.opts["unknown-opt"]).toBe("value");
    });

    it("should reject unknown options at root level when allowUnknownOptions is false", () => {
      const nc = new NixClap({
        ...noOutputExit,
        allowUnknownOptions: false
      }).init();

      const result = nc.parse(["node", "test.js", "--unknown-opt=value"], 2);
      expect(result.command.getErrorNodes().length).toBe(1);
      expect(result.command.getErrorNodes()[0].error.message).toContain("unknown CLI option");
    });

    it("should allow unknown options in command when command's allowUnknownOptions is true", () => {
      const nc = new NixClap({
        ...noOutputExit,
        allowUnknownOptions: false
      }).init(
        {},
        {
          test: {
            allowUnknownOptions: true
          }
        }
      );

      const result = nc.parse(["node", "test.js", "test", "--unknown-opt=value"], 2);
      expect(result.command.getErrorNodes().length).toBe(0);
      expect(result.command.jsonMeta.subCommands.test.opts["unknown-opt"]).toBe("value");
    });

    it("should reject unknown options in command when command's allowUnknownOptions is false", () => {
      const nc = new NixClap({
        ...noOutputExit,
        allowUnknownOptions: true
      }).init(
        {},
        {
          test: {
            allowUnknownOptions: false
          }
        }
      );

      const result = nc.parse(["node", "test.js", "test", "--unknown-opt", "value"], 2);
      expect(result.command.getErrorNodes().length).toBe(1);
      expect(result.command.getErrorNodes()[0].error.message).toContain("unknown CLI option");
    });

    it("should propagate unknown options to parent command", () => {
      const nc = new NixClap({
        ...noOutputExit,
        allowUnknownOptions: false
      }).init(
        {},
        {
          parent: {
            allowUnknownOptions: true,
            subCommands: {
              child: {}
            }
          }
        }
      );

      const result = nc.parse(["node", "test.js", "parent", "child", "--unknown-opt=value"], 2);
      expect(result.command.error).toBeUndefined();
      expect(result.command.jsonMeta.subCommands.parent.opts["unknown-opt"]).toBe("value");
    });

    it("should override parent command's allowUnknownOptions", () => {
      const nc = new NixClap({
        ...noOutputExit,
        allowUnknownOptions: false
      }).init(
        {},
        {
          parent: {
            allowUnknownOptions: true,
            subCommands: {
              child: {
                allowUnknownOptions: false
              }
            }
          }
        }
      );

      const result = nc.parse(["parent", "child", "--unknown-opt=value"]);
      expect(result.command.getErrorNodes().length).toBe(1);
      expect(result.command.getErrorNodes()[0].error.message).toContain("unknown CLI option");
    });
  });

  describe("help handler", () => {
    it("should show help for a specific command", () => {
      let helpShown = false;
      const nc = new NixClap({
        output: () => {
          helpShown = true;
        },
        exit: () => undefined
      }).init(
        {
          help: { args: "< string>" }
        },
        {
          test: {
            desc: "test command",
            options: {
              foo: { args: "< string>" }
            }
          }
        }
      );

      const result = nc.parse(["node", "test.js", "--help", "test"]);
      expect(helpShown).toBe(true);
    });
  });

  it("should not call exit when noDefaultHandlers is true", () => {
    let exitCalled = false;
    const nc = new NixClap({
      noDefaultHandlers: true,
      exit: () => {
        exitCalled = true;
      }
    }).init({}, {});

    const result = nc.parse(["node", "test.js", "--unknown"]);
    expect(exitCalled).toBe(false);
  });
});
