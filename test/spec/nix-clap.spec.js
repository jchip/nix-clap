"use strict";

/*

- all `-` and `--` options can specify arg with `=` or ` `
- single `-`, each char following is an opt, treated as boolean, except the last one, which can have an arg that follows
- unknown options are automatically treated as no args following with ` `
- unknown options following commands are automatically assigned to the command

*/

const NixClap = require("../../lib/nix-clap");

describe("nix-clap", function() {
  it("should init", () => {
    return new NixClap().init();
  });

  const initParser = (cmdExec, nc, handlers) => {
    nc =
      nc ||
      new NixClap({
        exit: () => undefined,
        output: () => undefined,
        handlers: Object.assign(
          {
            "no-action": false,
            "unknown-command": false,
            "unknown-option": false
          },
          handlers
        )
      });

    nc.removeDefaultHandlers("no-action", "parse-fail", "unknown-command", "unknown-option");
    return nc.init(
      {
        "log-level": {
          alias: "q",
          type: "string",
          desc: "One of: debug,verbose,info,warn,error,fyi,none",
          default: "info"
        },
        "str-opt": {
          type: "string"
        },
        "require-arg-opt": {
          alias: "rao",
          type: "string",
          requireArg: true
        },
        "force-cache": {
          alias: ["f", "fc"],
          type: "boolean",
          desc: "Don't check registry if cache exists.",
          default: true
        },
        "bar-bool": {
          alias: "b",
          type: "boolean"
        },
        foobool: {
          type: "boolean"
        },
        "array-opt-require": {
          alias: "a",
          type: "array",
          requireArg: true
        },
        "subtype-array": {
          type: "number array"
        },
        fooNum: {
          type: "number"
        },
        floatNum: {
          type: "float"
        },
        customFn: {
          type: "xfoo",
          xfoo: () => "xfoo"
        },
        customRegex: {
          type: "rxmatch",
          rxmatch: /^test$/i
        },
        customOther: {
          type: "rxother",
          rxother: "oops"
        },
        "bool-2": {
          type: "boolean"
        },
        "missing-type": {},
        "bool-3": {
          alias: "x"
        },
        "count-opt": {
          type: "count",
          alias: "c"
        },
        "apply-default": {
          type: "boolean",
          default: "test"
        },
        "empty-allow-cmd": {
          type: "boolean",
          allowCmd: []
        },
        "has-allow-cmd": {
          alias: "hac",
          type: "boolean",
          allowCmd: ["cmd1", "cmd4"]
        }
      },
      {
        cmd1: {
          args: "<..>",
          options: {
            "cmd1-foo": {
              alias: "1f",
              type: "string",
              default: "boo"
            },
            "cmd1-bar": {
              type: "string"
            }
          }
        },
        cmd2: {},
        cmd3: {
          args: "<id>"
        },
        cmd4: {
          alias: "4"
        },
        cmd5: {
          desc: () => "test command 5",
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
              type: "string"
            }
          }
        },
        sum: {
          args: "<number _..>"
        }
      }
    );
  };

  const getArgv = line => {
    return line.split(" ");
  };

  it("should parse single required param for command", () => {
    const nc = initParser().removeAllListeners("parse-fail");
    const parsed = nc.parse(getArgv("cmd3"));
    expect(parsed.error.message).to.equal("Not enough arguments for command cmd3");
    const x = nc.parse(getArgv("cmd3 test"));
    expect(x.commands.length, "should have only one command").to.equal(1);
    expect(x.commands[0]).to.deep.equal({
      name: "cmd3",
      long: "cmd3",
      unknown: false,
      args: {
        id: "test"
      },
      argList: ["test"],
      opts: {},
      source: {},
      verbatim: {}
    });
    const x2 = nc.parse(getArgv("cmd3 test foo"));
    expect(x2.commands.length, "should have two commands").to.equal(2);
    expect(x2.commands).to.deep.equal([
      {
        name: "cmd3",
        long: "cmd3",
        unknown: false,
        args: {
          id: "test"
        },
        argList: ["test"],
        opts: {},
        source: {},
        verbatim: {}
      },
      {
        name: "foo",
        long: "foo",
        unknown: true,
        args: {},
        argList: [],
        opts: {},
        source: {},
        verbatim: {}
      }
    ]);
  });

  it("should parse top level options before command", () => {
    const x = initParser().parse(
      getArgv(
        "--fooNum=900 --floatNum=1.23 --customFn 1 --customRegex test --customOther 1 --no-foobool cmd1 a"
      )
    );
    expect(x.source).to.deep.equal({
      applyDefault: "default",
      forceCache: "default",
      logLevel: "default",
      fooNum: "cli",
      floatNum: "cli",
      foobool: "cli",
      customFn: "cli",
      customRegex: "cli",
      customOther: "cli"
    });
    expect(x.opts).to.deep.equal({
      fooNum: 900,
      floatNum: 1.23,
      foobool: false,
      logLevel: "info",
      forceCache: true,
      applyDefault: "test",
      customFn: "xfoo",
      customRegex: "test",
      customOther: "oops"
    });
    expect(x.commands.length, "should have one command").to.equal(1);
    expect(x.commands[0]).to.deep.equal({
      name: "cmd1",
      long: "cmd1",
      unknown: false,
      args: {},
      argList: ["a"],
      opts: {
        cmd1Foo: "boo"
      },
      source: { cmd1Foo: "default" },
      verbatim: {}
    });
  });

  it("should return undefined if custom regex doesn't match", () => {
    const parsed = initParser().parse(getArgv("--customRegex blah a"));
    expect(parsed.source.customRegex).to.equal("cli");
    expect(parsed.opts.customRegex).to.equal(undefined);
  });

  it("should count options", () => {
    const nc = initParser();
    let x = nc.parse(getArgv("--count-opt -ccc"));
    expect(x.opts).to.deep.equal({
      countOpt: 4,
      logLevel: "info",
      forceCache: true,
      applyDefault: "test"
    });
    x = nc.parse(getArgv("-cccc"));
    expect(x.opts).to.deep.equal({
      countOpt: 4,
      logLevel: "info",
      forceCache: true,
      applyDefault: "test"
    });
  });

  it("should parse command at beginning", () => {
    const line =
      "cmd1 a --cmd1-bar woo -q v --count-opt -ccc --fooNum=900 --missing-type yes --no-foobool -bnxb --bool-2=0 --fc 1 -a 100 200 -b";
    const x = initParser().parse(getArgv(line), 0);
    expect(x.source).to.deep.equal({
      applyDefault: "default",
      logLevel: "cli",
      countOpt: "cli",
      fooNum: "cli",
      missingType: "cli",
      foobool: "cli",
      barBool: "cli",
      bool3: "cli",
      bool2: "cli",
      forceCache: "cli",
      arrayOptRequire: "cli"
    });
    expect(x.opts).to.deep.equal({
      logLevel: "v",
      countOpt: 4,
      fooNum: 900,
      missingType: true,
      foobool: false,
      barBool: true,
      bool3: true,
      bool2: false,
      forceCache: true,
      applyDefault: "test",
      arrayOptRequire: ["100", "200"]
    });
  });

  it("should parse option with typed array", () => {
    const nc = initParser();
    let x = nc.parse(getArgv("--subtype-array 1 2 3 4 5"));
    expect(x).to.deep.equal({
      source: {
        subtypeArray: "cli",
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [],
      opts: {
        subtypeArray: [1, 2, 3, 4, 5],
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {
        subtypeArray: ["1", "2", "3", "4", "5"]
      },
      index: 6
    });
    x = nc.parse(getArgv("--subtype-array"));
    expect(x).to.deep.equal({
      source: {
        subtypeArray: "cli",
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [],
      opts: {
        subtypeArray: undefined,
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {},
      index: 1
    });
  });

  it("should parse command with typed argument", () => {
    const nc = initParser();
    const x = nc.parse(getArgv("sum 1 2 3 4"));
    expect(x).to.deep.equal({
      source: {
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [
        {
          name: "sum",
          long: "sum",
          unknown: false,
          args: {
            _: [1, 2, 3, 4]
          },
          argList: ["1", "2", "3", "4"],
          opts: {},
          source: {},
          verbatim: {}
        }
      ],
      opts: {
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {},
      index: 5
    });
  });

  it("should terminate option arg gathering with --", () => {
    const nc = initParser();
    const x = nc.parse(getArgv("--str-opt -- d"));
    expect(x).to.deep.equal({
      source: {
        strOpt: "cli",
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [],
      opts: {
        logLevel: "info",
        forceCache: true,
        applyDefault: "test",
        strOpt: undefined
      },
      verbatim: {},
      index: 1
    });

    const parsed = nc.parse(getArgv("--array-opt-require -- d"));
    expect(parsed.error.message).to.equal("option array-opt-require requires argument");
  });

  it("should terminate option array with --", () => {
    const nc = initParser();
    const x = nc.parse(getArgv("--array-opt-require a b c -- d"));
    expect(x).to.deep.equal({
      source: {
        arrayOptRequire: "cli",
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [
        {
          name: "d",
          long: "d",
          unknown: true,
          args: {},
          argList: [],
          opts: {},
          source: {},
          verbatim: {}
        }
      ],
      opts: {
        arrayOptRequire: ["a", "b", "c"],
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {
        arrayOptRequire: ["a", "b", "c"]
      },
      index: 6
    });
  });

  it("should terminate option array with -- and then parsing with --", () => {
    const nc = initParser();
    const x = nc.parse(getArgv("--array-opt-require a b c -- -- d"));
    expect(x).to.deep.equal({
      source: {
        arrayOptRequire: "cli",
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [],
      opts: {
        arrayOptRequire: ["a", "b", "c"],
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {
        arrayOptRequire: ["a", "b", "c"]
      },
      index: 5
    });
  });

  it("should terminate command array with --", () => {
    const nc = initParser();
    const x = nc.parse(getArgv("cmd1 a b c -- d"));
    expect(x).to.deep.equal({
      source: {
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [
        {
          name: "cmd1",
          long: "cmd1",
          unknown: false,
          args: {},
          argList: ["a", "b", "c"],
          opts: {
            cmd1Foo: "boo"
          },
          source: { cmd1Foo: "default" },
          verbatim: {}
        },
        {
          name: "d",
          long: "d",
          unknown: true,
          args: {},
          argList: [],
          opts: {},
          source: {},
          verbatim: {}
        }
      ],
      opts: {
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {},
      index: 6
    });
  });

  it("should terminate command arg gathering with --", () => {
    const nc = initParser();
    let parsed = nc.parse(getArgv("cmd7 a -- d e f"));
    expect(parsed.error.message).to.equal("Not enough arguments for command cmd7");
    parsed = nc.parse(getArgv("cmd7 a b -- d"));
    expect(parsed).to.deep.equal({
      source: {
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [
        {
          name: "cmd7",
          long: "cmd7",
          unknown: false,
          args: {
            a: "a",
            b: "b"
          },
          argList: ["a", "b"],
          opts: {},
          source: {},
          verbatim: {}
        }
      ],
      opts: {
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {},
      index: 3
    });
    parsed = nc.parse(getArgv("cmd7 a b c -- d"));

    expect(parsed).to.deep.equal({
      source: {
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [
        {
          name: "cmd7",
          long: "cmd7",
          unknown: false,
          args: {
            a: "a",
            b: "b",
            c: "c"
          },
          argList: ["a", "b", "c"],
          opts: {},
          source: {},
          verbatim: {}
        }
      ],
      opts: {
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {},
      index: 4
    });
  });

  it("should terminate command array with -- and then parsing with --", () => {
    const nc = initParser();
    const x = nc.parse(getArgv("cmd1 a b c -- -- d"));
    expect(x).to.deep.equal({
      source: {
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [
        {
          name: "cmd1",
          long: "cmd1",
          unknown: false,
          args: {},
          argList: ["a", "b", "c"],
          opts: {
            cmd1Foo: "boo"
          },
          source: { cmd1Foo: "default" },
          verbatim: {}
        }
      ],
      opts: {
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {},
      index: 5
    });
  });

  it("should terminate parsing with --", () => {
    const nc = initParser();
    const line =
      "cmd1 a --cmd1-bar woo -q v --count-opt -ccc -- --fooNum=900 --missing-type yes --no-foobool -bnxb";
    const x = nc.parse(getArgv(line));
    expect(x).to.deep.equal({
      source: {
        logLevel: "cli",
        countOpt: "cli",
        applyDefault: "default",
        forceCache: "default"
      },
      commands: [
        {
          name: "cmd1",
          long: "cmd1",
          unknown: false,
          args: {},
          argList: ["a"],
          opts: {
            cmd1Bar: "woo",
            cmd1Foo: "boo"
          },
          source: {
            cmd1Bar: "cli",
            cmd1Foo: "default"
          },
          verbatim: {
            cmd1Bar: ["woo"]
          }
        }
      ],
      opts: {
        logLevel: "v",
        countOpt: 4,
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {
        logLevel: ["v"]
      },
      index: 8
    });
  });

  it("should handle option missing arg", () => {
    const nc = initParser();
    const x = nc.parse(getArgv("--missing-type --str-opt"));
    expect(x).to.deep.equal({
      source: {
        missingType: "cli",
        strOpt: "cli",
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [],
      opts: {
        missingType: true,
        strOpt: undefined,
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {},
      index: 2
    });
  });

  it("should emit unknown-command event", () => {
    let outputed = "";
    let exited;
    const nc = new NixClap({
      name: "test",
      exit: () => (exited = true),
      output: o => (outputed += o)
    }).init({}, {});

    nc.parse(getArgv("blah"));
    expect(exited).to.equal(true);
    expect(outputed).contains("Error: Unknown command blah");

    exited = undefined;
    outputed = "";
    nc.removeAllListeners("unknown-command");
    let unknown;
    nc.once("unknown-command", ctx => {
      unknown = ctx;
      throw new Error(`Unknown command ${ctx.name}`);
    });
    nc.parse(getArgv("blah"));
    expect(unknown.name).to.equal("blah");
    expect(exited).to.equal(true);
    expect(outputed).contains("Error: Unknown command blah");
  });

  it("should emit unknown-option event", () => {
    let outputed = "";
    let exited;
    const nc = new NixClap({
      name: "test",
      exit: () => (exited = true),
      output: o => (outputed += o)
    }).init({}, {});
    nc.parse(getArgv("--blah"));
    expect(exited).to.equal(true);
    expect(outputed).contains("Error: Unknown option blah");

    exited = undefined;
    outputed = "";
    nc.removeAllListeners("unknown-option");
    let unknown;
    nc.on("unknown-option", name => {
      unknown = name;
      throw new Error(`Unknown option ${name}`);
    });
    nc.parse(getArgv("--blah"));
    expect(unknown).to.equal("blah");
    expect(outputed).contains("Error: Unknown option blah");
  });

  it("should fail for unknown option arg type", () => {
    expect(() =>
      new NixClap().init({
        foo: {
          type: "blah"
        }
      })
    ).to.throw("Unknown argument type blah for option foo");

    expect(() =>
      new NixClap().init({
        foo: {
          type: "blah array"
        }
      })
    ).to.throw("Unknown array argument type blah for option foo");

    expect(() =>
      new NixClap().init({
        foo: {
          type: []
        }
      })
    ).to.throw("Option foo argument type must be a string");
  });

  it("should handle requireArg option missing arg", () => {
    const nc = initParser();
    expect(nc.parse(getArgv("--rao")).error.message).to.equal("option rao requires argument");
    expect(nc.parse(getArgv("--require-arg-opt")).error.message).to.equal(
      "option require-arg-opt requires argument"
    );
  });

  it("should handle empty allowCmd", () => {
    const line = "cmd1 x --empty-allow-cmd";
    const x = initParser().parse(getArgv(line));
    expect(x.opts).to.deep.equal({
      emptyAllowCmd: true,
      logLevel: "info",
      forceCache: true,
      applyDefault: "test"
    });
  });

  it("should handle allowCmd", () => {
    const nc = initParser();
    expect(nc.parse(getArgv("cmd2 x --hac")).error.message).to.equal(
      "option hac must follow one of these commands cmd1, cmd4"
    );
    expect(nc.parse(getArgv("--has-allow-cmd")).error.message).to.equal(
      "option has-allow-cmd must follow one of these commands cmd1, cmd4"
    );
    const parsed = nc.parse(getArgv("cmd4 --hac"));
    expect(parsed).to.deep.equal({
      source: {
        hasAllowCmd: "cli",
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [
        {
          name: "cmd4",
          long: "cmd4",
          unknown: false,
          args: {},
          argList: [],
          opts: {},
          source: {},
          verbatim: {}
        }
      ],
      opts: {
        hasAllowCmd: true,
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {},
      index: 2
    });
  });

  it("should handle cmd alias as a string", () => {
    const nc = initParser();
    const x = nc.parse(getArgv("4"));
    expect(x.commands).to.deep.equal([
      {
        name: "4",
        long: "cmd4",
        unknown: false,
        args: {},
        argList: [],
        opts: {},
        source: {},
        verbatim: {}
      }
    ]);
  });

  it("should handle cmd alias as an array", () => {
    const nc = initParser();
    const x = nc.parse(getArgv("c5"));
    expect(x.commands).to.deep.equal([
      {
        name: "c5",
        long: "cmd5",
        unknown: false,
        args: {},
        argList: [],
        opts: {},
        source: {},
        verbatim: {}
      }
    ]);
  });

  it("should handle type coercion for commands", () => {
    const nc = new NixClap().init(
      {},
      {
        foo: {
          args: "<m1 oop> <m2 boo>",
          m1: value => `for-oop ${value}`,
          m2: /^wooo$/i
        }
      }
    );
    const parsed = nc.parse(getArgv("foo hello wooo"));
    const cmd = parsed.commands[0];
    expect(cmd.args.oop).to.equal("for-oop hello");
    expect(cmd.args.boo).to.equal("wooo");
    expect(cmd.argList).to.deep.equal(["hello", "wooo"]);
  });

  it("should parse process.argv", () => {
    const nc = initParser();
    process.argv = getArgv("node blah.js cmd1 a --cmd1-bar woo");
    const x = nc.parse();
    expect(x).to.deep.equal({
      source: {
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [
        {
          name: "cmd1",
          long: "cmd1",
          unknown: false,
          args: {},
          argList: ["a"],
          opts: {
            cmd1Bar: "woo",
            cmd1Foo: "boo"
          },
          source: {
            cmd1Bar: "cli",
            cmd1Foo: "default"
          },
          verbatim: {
            cmd1Bar: ["woo"]
          }
        }
      ],
      opts: {
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {},
      index: 6
    });
    const h = nc.makeHelp();
    expect(h[1]).to.equal("Usage: blah");
  });

  it("should use name passed to construtor", () => {
    const nc = initParser(null, new NixClap({ name: "foo" }));
    process.argv = getArgv("node blah.js cmd1 a --cmd1-bar woo");
    nc.parse();
    const h = nc.makeHelp();
    expect(h[1]).to.equal("Usage: foo");
  });

  it("should handle unknown option", () => {
    const nc = initParser();
    let x = nc.parse(getArgv("--unknown-opt --no-foo-zoo"));
    expect(x).to.deep.equal({
      source: {
        unknownOpt: "cli",
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default",
        fooZoo: "cli"
      },
      commands: [],
      opts: {
        unknownOpt: true,
        logLevel: "info",
        forceCache: true,
        applyDefault: "test",
        fooZoo: false
      },
      verbatim: { fooZoo: ["no-"] },
      index: 2
    });
    x = nc.parse(getArgv("--unknown-opt=blah"));
    expect(x).to.deep.equal({
      source: {
        unknownOpt: "cli",
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [],
      opts: {
        unknownOpt: "blah",
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: { unknownOpt: ["blah"] },
      index: 1
    });
  });

  it("should handle optional args for command", () => {
    const nc = initParser();
    expect(nc.parse(getArgv("6")).error.message).to.equal("Not enough arguments for command cmd6");
    let x = nc.parse(getArgv("cmd6 1"));
    expect(x).to.deep.equal({
      source: {
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [
        {
          name: "cmd6",
          long: "cmd6",
          unknown: false,
          args: {
            a: "1"
          },
          argList: ["1"],
          opts: {},
          source: {},
          verbatim: {}
        }
      ],
      opts: {
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {},
      index: 2
    });
    x = nc.parse(getArgv("cmd6 1 2"));
    expect(x).to.deep.equal({
      source: {
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [
        {
          name: "cmd6",
          long: "cmd6",
          unknown: false,
          args: {
            a: "1",
            b: "2"
          },
          argList: ["1", "2"],
          opts: {},
          source: {},
          verbatim: {}
        }
      ],
      opts: {
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {},
      index: 3
    });
    x = nc.parse(getArgv("cmd6 1 2 3"));
    expect(x).to.deep.equal({
      source: {
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [
        {
          name: "cmd6",
          long: "cmd6",
          unknown: false,
          args: {
            a: "1",
            b: "2",
            c: ["3"]
          },
          argList: ["1", "2", "3"],
          opts: {},
          source: {},
          verbatim: {}
        }
      ],
      opts: {
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {},
      index: 4
    });
    x = nc.parse(getArgv("cmd6 1 2 3 4"));
    expect(x).to.deep.equal({
      source: {
        applyDefault: "default",
        forceCache: "default",
        logLevel: "default"
      },
      commands: [
        {
          name: "cmd6",
          long: "cmd6",
          unknown: false,
          args: {
            a: "1",
            b: "2",
            c: ["3", "4"]
          },
          argList: ["1", "2", "3", "4"],
          opts: {},
          source: {},
          verbatim: {}
        }
      ],
      opts: {
        logLevel: "info",
        forceCache: true,
        applyDefault: "test"
      },
      verbatim: {},
      index: 5
    });
  });

  it("should fail if command option conflict with top level", () => {
    expect(() =>
      new NixClap().init(
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
    ).to.throw("Command test option blah conflicts with top level option");
  });

  it("should fail if command option conflict with top level alias", () => {
    expect(() =>
      new NixClap().init(
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
      )
    ).to.throw("Command test option xy alias b conflicts with top level alias");
  });

  it("should fail if command option alias conflict with top level option", () => {
    expect(() =>
      new NixClap().init(
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
      )
    ).to.throw("Command test option xy alias blah conflicts with top level option");
  });

  it("should fail if command option alias conflict with top level option alias", () => {
    expect(() =>
      new NixClap().init(
        {
          blah: { alias: "foo" }
        },
        {
          test: {
            options: {
              xy: { alias: "foo" }
            }
          }
        }
      )
    ).to.throw("Command test option xy alias foo conflicts with top level alias");
  });

  it("should fail if option alias conflict", () => {
    expect(() =>
      new NixClap().init({
        blah: { alias: "foo" },
        plug: { alias: "foo" }
      })
    ).to.throw("Option alias foo already used by option blah");
  });

  it("should fail if command option alias conflict", () => {
    expect(() =>
      new NixClap().init(
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
      new NixClap().init(
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
      return new NixClap().init(
        {},
        {
          cmd: {
            args: "<..> <blah>"
          }
        }
      );
    }).to.throw("Init command cmd failed - only last arg can be variadic");
  });

  it("should fail if command specify invalid arg", () => {
    expect(() => {
      return new NixClap().init(
        {},
        {
          cmd: {
            args: "<woo foo  blah>"
          }
        }
      );
    }).to.throw("Init command cmd failed - argument <woo foo  blah> is invalid");
  });

  it("should fail if command specify invalid arg type", () => {
    expect(() => {
      return new NixClap().init(
        {},
        {
          cmd: {
            args: "<woo foo>"
          }
        }
      );
    }).to.throw("Init command cmd failed - unknown argument <woo foo> type woo");
  });

  it("should invoke cmd exec", () => {
    const exec = argv => {
      expect(argv).to.deep.equal({
        name: "8",
        long: "cmd8",
        source: {
          cmd8Foo: "cli",
          applyDefault: "default",
          forceCache: "default",
          logLevel: "default"
        },
        opts: {
          logLevel: "info",
          forceCache: true,
          applyDefault: "test",
          cmd8Foo: "blah"
        },
        args: {
          a: "ax",
          b: "b",
          c: ["1", "2"]
        },
        argList: ["ax", "b", "1", "2"]
      });
    };
    const nc = initParser(exec);
    nc.parse(getArgv("8 ax b 1 2 --cmd8-foo blah"));
  });

  it("should support auto --version option", () => {
    const save = process.exit;
    let exited;
    process.exit = n => (exited = n);
    const nc = initParser(null, new NixClap({ name: "test" }).version("1.0.0"));
    nc.parse(getArgv("--version"));
    process.exit = save;
    expect(exited).to.equal(0);
  });

  it("should make help text", () => {
    const nc = initParser(null, new NixClap().version("1.0.0").usage("test"));
    expect(nc.makeHelp()).to.deep.equal([
      "",
      "Usage: test",
      "",
      "Commands:",
      "  cmd1",
      "  cmd2",
      "  cmd3",
      "  cmd4                                                              [aliases: 4]",
      "  cmd5 test command 5                                            [aliases: 5 c5]",
      "  cmd6 test command 6 test blah foo test blah foo test blah foo test blah foo",
      "                                                                    [aliases: 6]",
      "  cmd7",
      "  cmd8                                                              [aliases: 8]",
      "  sum",
      "",
      "Options:",
      "  --log-level, -q          One of: debug,verbose,info,warn,error,fyi,none",
      `                                                      [string] [default: "info"]`,
      "  --str-opt                                                             [string]",
      "  --require-arg-opt, --rao                                              [string]",
      "  --force-cache, -f, --fc  Don't check registry if cache exists.",
      "                                                       [boolean] [default: true]",
      "  --bar-bool, -b                                                       [boolean]",
      "  --foobool                                                            [boolean]",
      "  --array-opt-require, -a                                                [array]",
      "  --subtype-array                                                 [number array]",
      "  --fooNum                                                              [number]",
      "  --floatNum                                                             [float]",
      "  --customFn                                                              [xfoo]",
      "  --customRegex                                                        [rxmatch]",
      "  --customOther                                                        [rxother]",
      "  --bool-2                                                             [boolean]",
      "  --missing-type",
      "  --bool-3, -x",
      "  --count-opt, -c                                                        [count]",
      `  --apply-default                                    [boolean] [default: "test"]`,
      "  --empty-allow-cmd                                                    [boolean]",
      "  --has-allow-cmd, --hac                                               [boolean]",
      "  --version, -V            Show version number",
      "  --help, -h               Show help.  Add a command name to show its help",
      "                                                                        [string]"
    ]);
  });

  it("should turn off version and help option", () => {
    const nc = new NixClap()
      .version("")
      .usage("")
      .help(false)
      .init({}, {});
    const help = nc.makeHelp();
    expect(help).to.deep.equal([""]);
  });

  it("should show help and exit on parse error", () => {
    let exited;
    const outputed = [];
    const nc = new NixClap({
      name: "test",
      exit: n => (exited = n),
      output: o => outputed.push(o)
    });
    nc.init({ foo: { type: "string", requireArg: true } });
    nc.parse(getArgv("--foo"));
    expect(exited, "exit should have been called").to.equal(1);
    expect(outputed, "should have output help").to.be.ok;
    expect(outputed[1].trim()).to.equal("Error: option foo requires argument");
  });

  it("should show help for --help", () => {
    let exited;
    const outputed = [];
    const nc = new NixClap({
      name: "test",
      exit: n => (exited = n),
      output: o => outputed.push(o)
    });
    nc.init({ foo: { type: "string", requireArg: true } });
    nc.parse(getArgv("--help"));
    expect(exited, "exit should have been called").to.equal(0);
    expect(outputed, "should have output help").to.be.ok;
  });

  const numCommands = {
    sum: {
      alias: "s",
      desc: "Output sum of numbers",
      exec: () => undefined,
      args: "<number _..>"
    },
    sort: {
      alias: "sr",
      desc: "Output sorted numbers",
      exec: () => undefined,
      args: "<number _..>",
      options: {
        reverse: {
          alias: "r",
          desc: "Sort in descending order"
        }
      }
    }
  };

  it("should make help for command", () => {
    const nc = new NixClap()
      .cmdUsage("$0 $1")
      .version("1.0.0")
      .init({}, numCommands);
    let help = nc.makeHelp("s");
    expect(help).to.deep.equal([
      "",
      "Usage:  s",
      "",
      "Options:",
      "  --version, -V Show version number",
      "  --help, -h    Show help.  Add a command name to show its help         [string]",
      "",
      "Command s is alias for sum",
      "Command sum has no options"
    ]);
    help = nc.makeHelp("sum");
    expect(help).to.deep.equal([
      "",
      "Usage:  sum",
      "",
      "Options:",
      "  --version, -V Show version number",
      "  --help, -h    Show help.  Add a command name to show its help         [string]",
      "",
      "Command sum has no options"
    ]);
    help = nc.makeHelp("sr");
    expect(help).to.deep.equal([
      "",
      "Usage:  sr",
      "",
      "Options:",
      "  --version, -V Show version number",
      "  --help, -h    Show help.  Add a command name to show its help         [string]",
      "",
      "Command sr is alias for sort",
      "Command sort options:",
      "  --reverse, -r Sort in descending order"
    ]);
    help = nc.makeHelp("sort");
    expect(help).to.deep.equal([
      "",
      "Usage:  sort",
      "",
      "Options:",
      "  --version, -V Show version number",
      "  --help, -h    Show help.  Add a command name to show its help         [string]",
      "",
      "Command sort options:",
      "  --reverse, -r Sort in descending order"
    ]);
    help = nc.makeHelp("blah");
    expect(help).to.deep.equal(["Unknown command: blah"]);
  });

  it("should make help for command with custom usage", () => {
    const nc = new NixClap({ name: "test" })
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
    expect(help).to.deep.equal([
      "",
      "Usage: test foo bar",
      "",
      "Options:",
      "  --version, -V Show version number",
      "  --help, -h    Show help.  Add a command name to show its help         [string]",
      "",
      "Command foo has no options"
    ]);
    help = nc.makeHelp("blah");
    expect(help).to.deep.equal([
      "",
      "Usage: blah blah",
      "",
      "Options:",
      "  --version, -V Show version number",
      "  --help, -h    Show help.  Add a command name to show its help         [string]",
      "",
      "Command blah has no options"
    ]);
  });

  it("should emit no-action event", () => {
    const nc = new NixClap()
      .removeDefaultHandlers("*")
      .cmdUsage("$0 $1")
      .version("1.0.0")
      .init({}, numCommands);
    let called;
    nc.once("no-action", () => (called = true));
    nc.parse([]);
    expect(called).to.be.true;
  });

  it("should not emit no-action event when there's no command with exec", () => {
    let called;
    const nc = new NixClap({
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
    const nc = new NixClap({ noActionShowHelp: true })
      .cmdUsage("$0 $1")
      .version("1.0.0")
      .init({}, numCommands);
    let showed;
    nc.showHelp = () => (showed = true);
    nc.parse([]);
    expect(showed).to.be.true;
  });

  it("should fail when there are multiple default commands", () => {
    expect(() =>
      new NixClap().init(
        {},
        {
          foo: { args: "[a]", exec: () => undefined, default: true },
          bar: { exec: () => undefined, default: true }
        }
      )
    ).to.throw("Trying to set command bar as default but foo is already set.");
  });

  it("should fail when setting a command that requires args as default", () => {
    expect(() =>
      new NixClap().init(
        {},
        {
          foo: { args: "<a> [b]", exec: () => undefined, default: true },
          bar: { default: true, exec: () => undefined }
        }
      )
    ).to.throw("Init command foo failed - Command foo set as default but requires arguments");
  });

  it("should fail when setting a command that requires args as default", () => {
    expect(() =>
      new NixClap().init({}, { foo: { args: "<a> [b]", exec: () => undefined, default: true } })
    ).to.throw("Init command foo failed - Command foo set as default but requires arguments");
  });

  it("should fail when default command doesn't have exec handler", () => {
    expect(() => new NixClap().init({}, { foo: { args: "[b]", default: true } })).to.throw(
      "Init command foo failed - Command foo set as default but has no exec handler"
    );
  });

  it("should invoke default command handler", () => {
    let called;
    const exec = ctx => (called = ctx);
    const nc = new NixClap().init({}, { foo: { args: "[b]", exec, default: true }, bar: {} });
    nc.parse([]);
    expect(called).to.be.ok;
    expect(called.name).to.equal("foo");
  });

  it("should skip help if event handler throws", () => {
    const nc = new NixClap().init({}, {});
    const parsed = nc.removeDefaultHandlers("help").parse(["--help"]);
    expect(parsed).to.be.ok;
    expect(parsed.source.help).to.equal("cli");
  });

  it("should skip version if event handler throws", () => {
    const nc = new NixClap({ version: "test" }).init({}, {});
    const parsed = nc.removeDefaultHandlers("version").parse(["--version"]);
    expect(parsed).to.be.ok;
    expect(parsed.opts.version).to.be.true;
  });

  it("should apply user config after parse", () => {
    const line = "cmd1 a --cmd1-bar woo --count-opt -ccc --fooNum=900";
    const nc = initParser();
    const parsed = nc.parse(getArgv(line), 0);
    nc.applyConfig({ anything: 999, fooNum: 1000, logLevel: "test" }, parsed);
    expect(parsed.source.logLevel).to.equal("user");
    expect(parsed.opts.logLevel).to.equal("test");
    expect(parsed.source.fooNum).to.equal("cli");
    expect(parsed.opts.fooNum).to.equal(900);
    expect(parsed.source.anything).to.equal("user");
    expect(parsed.opts.anything).to.equal(999);
  });

  it("should skip exec if skipExec flag is set", () => {
    let called;
    const commands = {
      cmd1: {
        exec: () => {
          called = true;
        },
        default: true
      }
    };
    let nc = new NixClap({}).init({}, commands);
    let parsed = nc.parse(getArgv("cmd1"));
    expect(parsed).to.be.ok;
    expect(parsed.commands[0].name).to.equal("cmd1");
    expect(called).to.equal(true);
    called = undefined;
    nc = new NixClap({ skipExec: true }).init({}, commands);
    parsed = nc.parse(getArgv("cmd1"));
    expect(parsed).to.be.ok;
    expect(parsed.commands[0].name).to.equal("cmd1");
    expect(called).to.equal(undefined);
  });

  it("should skip default exec if skipExecDefault flag is set", () => {
    let called;
    const commands = {
      cmd1: {
        exec: () => {
          called = true;
        },
        default: true
      }
    };
    let nc = new NixClap({}).init({}, commands);
    let parsed = nc.parse([]);
    expect(parsed).to.be.ok;
    expect(parsed.commands).to.be.empty;
    expect(called).to.equal(true);
    called = undefined;
    nc = new NixClap({ skipExecDefault: true }).init({}, commands);
    parsed = nc.removeDefaultHandlers("no-action").parse([]);
    expect(parsed).to.be.ok;
    expect(parsed.commands).to.be.empty;
    expect(called).to.equal(undefined);
  });
});
