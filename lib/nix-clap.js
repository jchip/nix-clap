"use strict";

/* eslint-disable no-magic-numbers,no-process-exit,max-statements,prefer-template,complexity */

const assert = require("assert");
const Path = require("path");
const xtil = require("./xtil");
const symbols = require("./symbols");
const Options = require("./options");
const Commands = require("./commands");
const EventEmitter = require("events");
const Parser = require("./parser");

const objEach = xtil.objEach;
const makeDefaults = xtil.makeDefaults;
const applyDefaults = xtil.applyDefaults;
const CMD = symbols.CMD;

const HELP = Symbol("help");

class NixClap extends EventEmitter {
  constructor(config) {
    super();
    config = config || {};
    this._name = config.name;
    this._version = config.version || false;
    this._help = config.help || {
      [HELP]: true,
      alias: "h",
      type: "string",
      desc: () => {
        const cmdText = this._commands.count > 0 ? "  Add a command name to show its help" : "";
        return `Show help.${cmdText}`;
      }
    };
    this._usage = config.usage || "$0";
    this._cmdUsage = config.cmdUsage || "$0 $1";
    this.exit = config.exit || (n => this.emit("exit", n));
    this.output = config.output || (s => process.stdout.write(s));
    this._evtHandlers = {
      help: parsed => this.showHelp(null, parsed.opts.help),
      version: () => this.showVersion(),
      "parse-fail": parsed => this.showHelp(parsed.error),
      parsed: () => undefined,
      "unknown-option": name => {
        throw new Error(`Unknown option ${name}`);
      },
      "unknown-command": ctx => {
        throw new Error(`Unknown command ${ctx.name}`);
      },
      "no-action": () => this.showHelp(new Error("No command given")),
      exit: code => process.exit(code)
    };
    const handlers = config.handlers || {};
    objEach(this._evtHandlers, (handler, name) => {
      handler = handlers.hasOwnProperty(name) ? handlers[name] : handler;
      if (typeof handler === "function") this.on(name, handler);
    });
    this._skipExec = config.skipExec;
    this._skipExecDefault = config.skipExecDefault;
    this.Promise = config.Promise || Promise;
  }

  removeDefaultHandlers(x) {
    const evts = x === "*" ? Object.keys(this._evtHandlers) : arguments;
    for (let i = 0; i < evts.length; i++) {
      const evtName = evts[i];
      this.removeListener(evtName, this._evtHandlers[evtName]);
    }
    return this;
  }

  applyConfig(config, parsed, src) {
    const source = parsed.source;

    for (const x in config) {
      if (!source.hasOwnProperty(x) || source[x] !== "cli") {
        parsed.opts[x] = config[x];
        source[x] = src || "user";
      }
    }

    return this;
  }

  init(options, commands) {
    options = Object.assign({}, options);

    if (this._version) {
      options.version = {
        alias: "V",
        desc: "Show version number"
      };
    }

    if (this._help) {
      options.help = this._help;
    }

    this._cliOptions = new Options(options);
    this._commands = new Commands(commands);
    this._verifyOptions();
    this._defaults = makeDefaults(options);

    return this;
  }

  usage(msg) {
    this._usage = msg;
    return this;
  }

  cmdUsage(msg) {
    this._cmdUsage = msg;
    return this;
  }

  version(v) {
    this._version = v;
    return this;
  }

  help(custom) {
    this._help = custom;
    return this;
  }

  get commands() {
    return this._commands;
  }

  get cliOptions() {
    return this._cliOptions;
  }

  showVersion() {
    this.output(`${this._version}\n`);
    return this.exit(0);
  }

  makeHelp(cmdName) {
    let cmdCtx;
    let cmd;
    if (cmdName) {
      cmdCtx = this._commands.getContext(cmdName);
      if (cmdCtx.unknown) {
        return [`Unknown command: ${cmdName}`];
      }
      cmd = cmdCtx[CMD];
    }

    const usage = [""];
    let usageMsg;
    if (cmd) {
      usageMsg = cmd.usage || this._cmdUsage;
    }

    if (!usageMsg) {
      usageMsg = this._usage;
    }

    if (usageMsg) {
      usageMsg = usageMsg.replace("$0", this._name || "").replace("$1", cmdName || "");
      usage.push(`Usage: ${usageMsg}`.trim(), "");
    }

    let commandsHelp = [];

    if (!cmd) {
      const cmds = this._commands.makeHelp(this._name);
      commandsHelp = cmds && cmds.length ? ["Commands:"].concat(cmds, "") : [];
    }

    const options = this._cliOptions.makeHelp();
    const optionHelp = options && options.length ? ["Options:"].concat(options) : [];

    let cmdHelp = [];
    if (cmd) {
      cmdHelp.push("");
      if (cmdCtx.name !== cmdCtx.long) {
        cmdHelp.push(`Command ${cmdName} is alias for ${cmdCtx.long}`);
      }
      const cmdOptions = cmd.options.makeHelp();
      if (cmdOptions.length) {
        cmdHelp = cmdHelp.concat(`Command ${cmdCtx.long} options:`, cmdOptions);
      } else {
        cmdHelp.push(`Command ${cmdCtx.long} has no options`);
      }
    }

    return usage.concat(commandsHelp, optionHelp, cmdHelp);
  }

  showHelp(err, cmdName) {
    this.output(`${this.makeHelp(cmdName).join("\n")}\n`);
    let code = 0;
    if (err) {
      this.output(`\nError: ${err.message}\n`);
      code = 1;
    }
    this.output("\n");
    return this.exit(code);
  }

  parse(argv, start, parsed) {
    parsed = this._parse(argv, start, parsed);

    if (!this._skipExec && this.runExec(parsed, this._skipExecDefault) === 0) {
      if (this._commands.execCount > 0) {
        this.emit("no-action");
      }
    }

    return parsed;
  }

  parseAsync(argv, start, parsed) {
    parsed = this._parse(argv, start, parsed);

    if (this._skipExec) return this.Promise.resolve(parsed);

    return this.runExecAsync(parsed, this._skipExecDefault).then(count => {
      if (count === 0 && this._commands.execCount > 0) {
        this.emit("no-action");
      }
      return parsed;
    });
  }

  _parse(argv, start, parsed) {
    if (argv === undefined) {
      argv = process.argv;
      if (this._name === undefined) {
        this._name = Path.basename(argv[1], ".js");
      }
      start = 2;
    }

    const parser = new Parser(this);

    parsed = parser.parse(argv, start, parsed);

    if (parsed.error) {
      this.emit("parse-fail", parsed);
      return parsed;
    }

    if (this._version && parsed.opts.version) {
      this.emit("version", parsed);
      return parsed;
    } else if (this._help && this._help[HELP] && parsed.source.help === "cli") {
      this.emit("help", parsed);
      return parsed;
    }

    applyDefaults(this._defaults, parsed);
    parsed.commands.forEach(cmdCtx => {
      cmdCtx[CMD].applyDefaults(cmdCtx);
    });

    this.emit("parsed", { nixClap: this, parsed });

    return parsed;
  }

  runExec(parsed, skipDefault) {
    const count = this._execCmds(parsed);
    if (count > 0) return count;
    if (skipDefault === true) return 0;

    return this._runDefaultCmd(parsed);
  }

  runExecAsync(parsed, skipDefault) {
    return this._execCmdsAsync(parsed).then(count => {
      if (count > 0) return count;
      if (skipDefault === true) return 0;
      return this._runDefaultCmd(parsed);
    });
  }

  _runDefaultCmd(parsed) {
    const defaultCmdCtx =
      this._commands.defaultCmd && this._commands.getContext(this._commands.defaultCmd);

    return defaultCmdCtx ? this._doExec(parsed, defaultCmdCtx) : 0;
  }

  _verifyOptions() {
    const top = this.cliOptions.list;
    const topAlias = this.cliOptions.alias;
    objEach(this.commands.list, (cmd, cmdName) => {
      objEach(cmd.options.list, (opt, optName) => {
        assert(
          !top.hasOwnProperty(optName),
          `Command ${cmdName} option ${optName} conflicts with top level option`
        );
        assert(
          !topAlias.hasOwnProperty(optName),
          `Command ${cmdName} option ${optName} conflicts with top level alias`
        );
      });
      objEach(cmd.options.alias, (optName, aliasName) => {
        assert(
          !top.hasOwnProperty(aliasName),
          `Command ${cmdName} option ${optName} alias ${aliasName} conflicts with top level option`
        );
        assert(
          !topAlias.hasOwnProperty(aliasName),
          `Command ${cmdName} option ${optName} alias ${aliasName} conflicts with top level alias`
        );
      });
    });
  }

  _doExec(parsed, cmdCtx) {
    const cmd = cmdCtx[CMD];
    if (cmd.exec) {
      const source = Object.assign({}, parsed.source, cmdCtx.source);
      const opts = Object.assign({}, parsed.opts, cmdCtx.opts);
      return (
        cmd.exec({
          name: cmdCtx.name,
          long: cmdCtx.long,
          source,
          opts,
          args: cmdCtx.args,
          argList: cmdCtx.argList
        }) || true
      );
    }
    return false;
  }

  _execCmds(parsed) {
    let count = 0;
    parsed.commands.forEach(cmdCtx => {
      count += this._doExec(parsed, cmdCtx) ? 1 : 0;
    });
    return count;
  }

  _execCmdsAsync(parsed) {
    let count = 0;
    return parsed.commands
      .reduce((promise, cmdCtx) => {
        return promise.then(() => {
          const r = this._doExec(parsed, cmdCtx);
          if (r) count++;
          return r;
        });
      }, this.Promise.resolve())
      .then(() => count);
  }
}

module.exports = NixClap;
