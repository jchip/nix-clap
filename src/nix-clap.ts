/* eslint-disable no-magic-numbers,no-process-exit,max-statements,prefer-template,complexity, prefer-rest-params */
import assert from "assert";
import Path from "path";
import { objEach, makeDefaults, applyDefaults, noop } from "./xtil";
import { CMD } from "./symbols";
import { Options } from "./options";
import { Commands } from "./commands";
import EventEmitter from "events";
import { Parser } from "./parser";

const HELP = Symbol("help");

/**
 *
 * @param s
 */
export const defaultOutput = (s: string) => {
  process.stdout.write(s);
};

/**
 *
 * @param code
 */
export const defaultExit = (code: number) => {
  process.exit(code);
};

/**
 * Configuration for NixClap
 */
export type NixClapConfig = {
  /**
   * Name of your app/program
   */
  name?: string;
  /**
   * Version of your app/program
   */
  version?: number | string;
  /**
   * Alias for option to show version.  ie: `app -v`
   *
   * Default: `["V", "v"]`
   */
  versionAlias?: string;
  /**
   * custom help option setting.
   *
   * Can also set with the `help` method.
   *
   */
  help?: any;
  /**
   * Alias for the help option
   *
   * Default is `["?", "h"]`
   */
  helpAlias?: string | string[];
  /**
   * Name of the default command
   */
  defaultCommand?: string;
  /**
   * Usage message
   *
   * Can also set with the `usage` method.
   */
  usage?: string;
  /**
   * Generic usage message for commands.
   *
   * Can also set with the `cmdUsage` method
   */
  cmdUsage?: string;
  /**
   * Set to `true` to skip calling command `exec` handlers after parse.
   *
   * - In case you need to do some processing before invoking the `exec` handlers, you can set this flag
   *   and call the `runExec` method yourself.
   */
  skipExec?: boolean;
  /**
   * Set to `true` to skip calling default command `exec` handler after parse.
   *
   * - In case you need to do some processing before invoking the `exec` handlers, you can set this flag
   *   and call the `runExec` method yourself.
   */
  skipExecDefault?: boolean;
  /**
   * function to output text
   *
   * Default is write the stdout.
   */
  output?: any;
  /**
   * Custom event handlers
   */
  handlers?: any;
  /**
   * Custom Promise implementation
   */
  Promise?: any;
  /**
   * Custom exit function.
   *
   * Default is to emit the `exit` event
   */
  exit?: (code: number) => void;
};
/**
 *
 */
export class NixClap extends EventEmitter {
  private _name: any;
  private _version: any;
  private _versionAlias: any;
  private _helpOpt: any;
  private _commands: any;
  private _usage: any;
  private _cmdUsage: any;
  private exit: any;
  private output: any;
  private _evtHandlers: any;
  private _skipExec: any;
  private _skipExecDefault: any;
  private Promise: any;
  private _cliOptions: any;
  private _defaults: any;

  /**
   *
   * @param config
   */
  constructor(config?: NixClapConfig) {
    super();
    config = config || {};
    this._name = config.name;
    this._version = config.version || false;

    this._versionAlias = config.versionAlias;

    this._helpOpt = config.hasOwnProperty("help")
      ? config.help
      : {
          [HELP]: true,
          alias: config.helpAlias || ["?", "h"],
          type: "string",
          desc: () => {
            const cmdText = this._commands.count > 0 ? " Add a command to show its help" : "";
            return `Show help.${cmdText}`;
          }
        };

    this._usage = config.usage || "$0";
    this._cmdUsage = config.cmdUsage || "$0 $1";
    this.exit = config.exit || (n => this.emit("exit", n));
    this.output = config.output || defaultOutput;
    this._evtHandlers = {
      "pre-help": noop,
      help: parsed => this.showHelp(null, parsed.opts.help || parsed.optCmd.help),
      "post-help": noop,
      version: () => this.showVersion(),
      "parse-fail": parsed => this.showHelp(parsed.error),
      parsed: () => undefined,
      "unknown-option": name => {
        throw new Error(`Unknown option ${name}`);
      },
      "unknown-options-v2": noop,
      "unknown-command": ctx => {
        throw new Error(`Unknown command ${ctx.name}`);
      },
      "no-action": () => this.showHelp(new Error("No command given")),
      "new-command": noop,
      "regex-unmatch": data => {
        const ctx = data.ctx;
        const key = ctx.hasOwnProperty("args") ? "command" : "option";
        this.output(
          `warning: ${key} ${ctx.name} value ${data.value} does not match allowed values.` +
            `  Default will be used.\n`
        );
      },
      exit: defaultExit
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

  private _getVersionOpt(verAlias) {
    return {
      alias: this._versionAlias || verAlias,
      desc: "Show version number"
    };
  }

  /**
   * Remove NixClap's default handlers
   *
   * If you've replaced the handler through specifying `handlers` in `config` for the constructor, then this will not remove your handler.
   *
   *
   * - You can pass in `"*"` to remove all default handlers.
   * - You can pass in the event names you want to remove.
   *
   * ie:
   * ```js
   * nc.removeDefaultHandlers("parse-fail", "unknown-option", "unknown-command");
   * ```
   * @param events Names of events to remove the default handlers
   *
   * @returns The `NixClap` instance itself.
   */
  removeDefaultHandlers(...events: string[]) {
    const evts = events[0] === "*" ? Object.keys(this._evtHandlers) : events;
    for (let i = 0; i < evts.length; i++) {
      const evtName = evts[i];
      this.removeListener(evtName, this._evtHandlers[evtName]);
    }
    return this;
  }

  /**
   * Allow you to apply extra config to the parsed object, overriding any `opts` with `source` not start with `cli`.
   *
   * For example, you can allow user to specify options in their `package.json` file, and apply those after the command line is parsed.
   * @param config - Config object containing user options config
   * @param parsed - The parse result object from NixClap.
   * @param src - Name of the source that provided the config.  Default to `user`
   * @returns
   */
  applyConfig(config: any, parsed: any, src?: string) {
    const source = parsed.source;

    for (const x in config) {
      if (!source.hasOwnProperty(x) || !source[x].startsWith("cli")) {
        parsed.opts[x] = config[x];
        source[x] = src || "user";
      }
    }

    return this;
  }

  /**
   * Initialize your options and commands
   * @param options
   * @param commands
   * @returns The `NixClap` instance itself.
   */
  init(options?: any, commands?: any) {
    options = Object.assign({}, options);

    if (this._version) {
      let verAlias = ["V", "v"];
      Object.keys(options).forEach(k => {
        const opt = options[k];
        if (opt.alias) verAlias = verAlias.filter(x => opt.alias.indexOf(x) < 0);
      });
      options.version = this._getVersionOpt(verAlias);
    }

    if (this._helpOpt) {
      options.help = this._helpOpt;
    }

    this._cliOptions = new Options(options);
    this._commands = new Commands(commands);
    this._verifyOptions();
    this._defaults = makeDefaults(options);

    return this;
  }

  /**
   * Set usage message for the program, which can be override by individual command's own usage.
   *
   * @param msg any string. `$0` will be replaced with program name and `$1` with command name.
   * @returns `this`
   */
  usage(msg: string) {
    this._usage = msg;
    return this;
  }

  /**
   * Set generic usage message for commands, which can be override by individual command's own usage.
   *
   * @param msg any string. `$0` will be replaced with program name and `$1` with command name.
   * @returns The `NixClap` instance itself.
   * @param msg
   * @returns `this`
   */
  cmdUsage(msg: string) {
    this._cmdUsage = msg;
    return this;
  }

  /**
   * Set the app's version
   *
   * @param v version
   * @returns `this`
   */
  version(v: number | string) {
    this._version = v;
    return this;
  }

  /**
   * Set a custom option setting for invoking help.
   *
   * Default is:
   *
   * ```js
   * {
   *   alias: "h",
   *   desc: "Show help"
   * }
   * ```
   *
   * Option name is always `help`. Call `help(false)` to turn off the default `--help` option.
   *
   * > Must be called before the `init` method.
   * @param custom
   * @returns `this`
   */
  help(custom: any) {
    this._helpOpt = custom;
    return this;
  }

  /**
   *
   */
  get commands() {
    return this._commands;
  }

  /**
   *
   */
  get cliOptions() {
    return this._cliOptions;
  }

  /**
   *
   * @returns
   */
  showVersion() {
    this.output(`${this._version}\n`);
    return this.exit(0);
  }

  /**
   *
   * @param cmdName
   * @returns
   */
  makeHelp(cmdName?) {
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

    const options = this._cliOptions.makeHelp();
    const optionHelp = options && options.length ? ["Options:"].concat(options) : [];

    let commandsHelp = [];

    if (!cmd) {
      const cmds = this._commands.makeHelp(this._name);
      commandsHelp = cmds && cmds.length ? ["Commands:"].concat(cmds, "") : [];
    } else if (cmd.desc) {
      usage.push(`  ${cmd.desc}`, "");
    }

    let cmdHelp = [];
    if (cmd) {
      cmdHelp.push("");
      if (cmdCtx.name !== cmdCtx.long) {
        cmdHelp.push(`Command ${cmdName} is alias for ${cmdCtx.long}`);
      }
      const cmdOptions = cmd.options.makeHelp();
      if (cmdOptions.length) {
        cmdHelp = cmdHelp.concat(`Command "${cmdCtx.long}" options:`, cmdOptions);
      } else {
        cmdHelp.push(`Command ${cmdCtx.long} has no options`);
      }
    }

    return usage.concat(commandsHelp, optionHelp, cmdHelp);
  }

  /**
   *
   * @param err
   * @param cmdName
   * @returns
   */
  showHelp(err, cmdName?) {
    this.emit("pre-help", { self: this });
    this.output(`${this.makeHelp(cmdName).join("\n")}\n`);
    let code = 0;
    if (err) {
      this.output(`\nError: ${err.message}\n`);
      code = 1;
    }
    this.output("\n");
    this.emit("post-help", { self: this });
    return this.exit(code);
  }

  /**
   *
   * @param parsed
   */
  checkRequireOptions(parsed) {
    const missing = Object.keys(this._cliOptions._options)
      .filter(name => {
        const opt = this._cliOptions._options[name];
        return opt.require && !parsed.opts.hasOwnProperty(name);
      })
      .map(x => `'${x}'`);

    if (missing.length > 0) {
      parsed.error = Error(`Required option ${missing.join(", ")} missing`);
    }
  }

  /**
   * Set invoking command `exec` to false for all commands
   */
  skipExec() {
    this._skipExec = true;
    this._skipExecDefault = true;
  }

  /**
   *
   * Parse command line
   *
   * @param argv argv list
   * @param start index of the argv list to start parsing
   * @param parsed Previous parsed result
   * @returns parsed result
   */
  parse(argv, start?, parsed?) {
    parsed = this._parse(argv, start, parsed);

    if (!this._skipExec && this.runExec(parsed, this._skipExecDefault) === 0) {
      if (this._commands.execCount > 0) {
        this.emit("no-action");
      }
    }

    return parsed;
  }

  /**
   * Async version of `parse`
   *
   * @param argv argv list
   * @param start index of the argv list to start parsing
   * @param parsed Previous parsed result
   * @returns
   */
  parseAsync(argv, start?, parsed?) {
    parsed = this._parse(argv, start, parsed);

    if (this._skipExec) return this.Promise.resolve(parsed);

    return this.runExecAsync(parsed, this._skipExecDefault).then(count => {
      if (count === 0 && this._commands.execCount > 0) {
        this.emit("no-action");
      }

      return parsed;
    });
  }

  /**
   *
   * @param argv
   * @param start
   * @param parsed
   * @returns
   */
  private _parse(argv, start, parsed?) {
    if (argv === undefined) {
      argv = process.argv;
      if (this._name === undefined) {
        this._name = Path.basename(argv[1], ".js");
      }
      start = 2;
    }

    const parser = new Parser(this);

    parsed = parser.parse(argv, start, parsed);
    Object.defineProperties(parsed, {
      _: { value: argv.slice(parsed.index + 1), enumerable: false },
      argv: { value: argv, enumerable: false }
    });

    if (!parsed.error) {
      this.checkRequireOptions(parsed);
    }

    if (parsed.error) {
      this.emit("parse-fail", parsed);
      return parsed;
    }

    if (this._version && parsed.opts.version) {
      this.emit("version", parsed);
      return parsed;
    } else if (this._helpOpt && this._helpOpt[HELP] && parsed.source.help === "cli") {
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

  /**
   * Go through the commands in parsed and call their `exec` handler.
   *
   * The `parse` method call this at the end unless `skipExec` flag is set.
   *
   * @param parsed -  The parse result object.
   * @param skipDefault - Do not invoke default command's `exec` handler.
   * @returns The number of commands with `exec` was invoked.
   */
  runExec(parsed, skipDefault) {
    const count = this._execCmds(parsed);
    if (count > 0) return count;
    if (skipDefault === true) return 0;

    return this._runDefaultCmd(parsed);
  }

  /**
   * async version of `runExec`
   *
   * @param parsed -  The parse result object.
   * @param skipDefault - Do not invoke default command's `exec` handler.
   * @returns A promise that resolve with the number of commands with `exec` invoked.
   */
  runExecAsync(parsed, skipDefault) {
    return this._execCmdsAsync(parsed).then(count => {
      if (count > 0) return count;
      if (skipDefault === true) return 0;
      return this._runDefaultCmd(parsed);
    });
  }

  /**
   *
   * @param parsed
   * @returns
   */
  private _runDefaultCmd(parsed) {
    const defaultCmd = this._commands.defaultCmd;

    if (!defaultCmd) return 0;

    const defaultParsed = this._parse([defaultCmd], 0);
    const defaultCmdCtx = defaultParsed.commands[0];

    return this._doExec(parsed, defaultCmdCtx);
  }

  /**
   *
   */
  private _verifyOptions() {
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

  private _doExec(parsed, cmdCtx) {
    const cmd = cmdCtx[CMD];
    if (cmd.exec) {
      const source = Object.assign({}, parsed.source, cmdCtx.source);
      const opts = Object.assign({}, parsed.opts, cmdCtx.opts);
      return (
        cmd.exec(
          {
            name: cmdCtx.name,
            long: cmdCtx.long,
            source,
            opts,
            args: cmdCtx.args,
            argList: cmdCtx.argList
          },
          parsed
        ) || true
      );
    }
    return false;
  }

  private _execCmds(parsed) {
    let count = 0;
    parsed.commands.forEach(cmdCtx => {
      count += this._doExec(parsed, cmdCtx) ? 1 : 0;
    });
    return count;
  }

  private _execCmdsAsync(parsed) {
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
