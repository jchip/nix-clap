import Path from "path";
import { objEach, noop } from "./xtil.ts";
import EventEmitter from "events";
import { Parser } from "./parser.ts";
import { CommandBase, CommandSpec, unknownCommandBaseNoOptions } from "./command-base.ts";
import { OptionSpec } from "./option-base.ts";
import { CommandNode } from "./command-node.ts";
import { rootCommandName } from "./base.ts";
import { ClapNode } from "./clap-node.ts";
import { unknownCommandBase } from "./command-base.ts";

const HELP = Symbol("help");

/**
 * Writes the given string to the standard output.
 *
 * @param s - The string to be written to the standard output.
 */
export const defaultOutput = (s: string) => {
  process.stdout.write(s);
};

/**
 * Exits the Node.js process with the specified exit code.
 *
 * @param code - The exit code to terminate the process with.
 */
export const defaultExit = (code: number) => {
  process.exit(code);
};

/**
 * Configuration options for NixClap.
 *
 * @property {string} [name] - Name of your app/program.
 * @property {number | string} [version] - Version of your app/program.
 * @property {string} [versionAlias] - Alias for option to show version. Default: `["V", "v"]`.
 * @property {any} [help] - Custom help option setting. Can also set with the `help` method.
 * @property {string | string[]} [helpAlias] - Alias for the help option. Default: `["?", "h"]`.
 * @property {string} [defaultCommand] - Name of the default command. It can be only one of the top level commands.
 * Sub commands cannot be the default command.
 * @property {boolean} [allowUnknownCommand] - When encounter an unknown command, take it and continue processing.
 * @property {string} [usage] - Usage message. Can also set with the `usage` method.
 * @property {string} [cmdUsage] - Generic usage message for commands. Can also set with the `cmdUsage` method.
 * @property {boolean} [skipExec] - Set to `true` to skip calling command `exec` handlers after parse.
 * In case you need to do some processing before invoking the `exec` handlers, you can set this flag
 * and call the `runExec` method yourself.
 * @property {boolean} [skipExecDefault] - Set to `true` to skip calling default command `exec` handler after parse.
 * In case you need to do some processing before invoking the `exec` handlers, you can set this flag
 * and call the `runExec` method yourself.
 * @property {any} [output] - Function to output text. Default is write to stdout.
 * @property {any} [handlers] - Custom event handlers.
 * @property {(code: number) => void} [exit] - Custom exit function. Default is to emit the `exit` event.
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
   * Name of the default command.  It can be only one of the top level commands. Sub commands
   * cannot be the default command.
   *
   * **How it's triggered**:
   *   - If there are no non-option argument
   *   - If the first non-option argument is not a valid command
   */
  defaultCommand?: string;
  /**
   * When encounter an unknown command, take it and continue processing.
   */
  allowUnknownCommand?: boolean;

  /**
   * When encounter an unknown option, take it without creating an error.
   * Each command can override this setting.
   */
  allowUnknownOptions?: boolean;
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
   * Custom exit function.
   *
   * Default is to emit the `exit` event
   */
  exit?: (code: number) => void;
  /**
   * Set to `true` to skip installing default handlers and always return the parsed result, and
   * allow user to process and handle errors and show help.
   */
  noDefaultHandlers?: boolean;
};

/**
 * Represents the result of parsing command-line arguments.
 *
 * @property {ClapNode[]} [errorNodes] - Optional array of nodes that encountered errors during parsing.
 * @property {CommandNode} command - The command node that was parsed.
 * @property {string[]} _ - Array of non-option arguments.
 * @property {string[]} argv - Array of all arguments passed to the command.
 * @property {number} index - The current index in the argument list.
 */
export type ParseResult = {
  errorNodes?: ClapNode[];
  command: CommandNode;
  _: string[];
  argv: string[];
  index: number;
};

/**
 * The `NixClap` class is an extension of `EventEmitter` that provides a command-line interface (CLI) parser
 * with support for commands, options, and event handling.
 *
 * @remarks
 * This class allows you to define commands and options, handle various events, and parse command-line arguments.
 * It also provides methods to display help and version information.
 *
 * @example
 * ```typescript
 * const nc = new NixClap({
 *   name: "my-cli",
 *   version: "1.0.0",
 *   help: {
 *     alias: ["?", "h"],
 *     desc: "Show help"
 *   }
 * });
 *
 * nc.init({
 *   verbose: {
 *     alias: "v",
 *     desc: "Enable verbose mode"
 *   }
 * }, {
 *   start: {
 *     desc: "Start the application"
 *   }
 * });
 *
 * nc.parse(process.argv);
 * ```
 *
 * @param config - Configuration object for initializing the `NixClap` instance.
 *
 * @event pre-help - Emitted before displaying help.
 * @event help - Emitted when help is requested.
 * @event post-help - Emitted after displaying help.
 * @event parse-fail - Emitted when parsing fails.
 * @event no-action - Emitted when no command is given.
 * @event exit - Emitted when the application is about to exit.
 *
 * @public
 */
export class NixClap extends EventEmitter {
  /**
   * @private
   * @property {string} _name - The name associated with the instance.
   */
  private _name: string;
  private _version: string | number | false;
  private _versionAlias: string;
  private _helpOpt: OptionSpec;
  private _usage: string;
  private _cmdUsage: string;
  private exit: (code: number) => void;
  /**
   * Represents the output of the process.
   */
  output: (s: string) => void;
  private _evtHandlers: any;
  private _skipExec: any;
  private _skipExecDefault: boolean;
  // private _defaults: any;
  private _config: NixClapConfig;
  _rootCommand?: CommandBase;

  /**
   * Constructs a new instance of the NixClap class.
   *
   * @param config - Optional configuration object for NixClap.
   *
   */
  constructor(_config?: NixClapConfig) {
    super();
    const config = { ..._config };
    this._config = config;
    this._name = config.name;
    this._version = config.version || false;

    this._versionAlias = config.versionAlias;

    this._helpOpt = config.hasOwnProperty("help")
      ? config.help
      : {
          [HELP]: true,
          alias: config.helpAlias || ["?", "h"],
          args: "[cmd string]",
          desc: () => {
            const cmdText =
              this._rootCommand.subCmdCount > 0 ? " Add a command to show its help" : "";
            return `Show help.${cmdText}`;
          }
        };

    this._usage = config.usage || "$0";
    this._cmdUsage = config.cmdUsage || "$0 $1";
    this.exit = config.exit || (n => this.emit("exit", n));
    this.output = config.output || defaultOutput;
    this._evtHandlers = config.noDefaultHandlers
      ? {}
      : {
          "pre-help": noop,
          help: parsed => this.showHelp(parsed.error, parsed.command.optNodes.help.argsMap.cmd),
          "post-help": noop,
          // version: () => this.showVersion(),
          "parse-fail": parsed => this.showHelp(parsed.command.getErrorNodes()[0].error),
          // parsed: () => undefined,
          // "unknown-option": name => {
          //   throw new Error(`Unknown option ${name}`);
          // },
          // "unknown-options-v2": noop,
          // "unknown-command": ctx => {
          //   throw new Error(`Unknown command ${ctx.name}`);
          // },
          "no-action": () => this.showHelp(new Error("No command given")),
          // "new-command": noop,
          exit: defaultExit
        };
    const handlers = config.handlers || {};
    objEach(this._evtHandlers, (handler, name) => {
      handler = handlers.hasOwnProperty(name) ? handlers[name] : handler;
      if (typeof handler === "function") {
        this.on(name, handler);
      }
    });
    this._skipExec = config.skipExec;
    this._skipExecDefault = config.skipExecDefault;
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

  // applyConfig(config: any, parsed: any, src?: string) {
  //   const source = parsed.source;

  //   for (const x in config) {
  //     if (!source.hasOwnProperty(x) || !source[x].startsWith("cli")) {
  //       parsed.opts[x] = config[x];
  //       source[x] = src || "user";
  //     }
  //   }

  //   return this;
  // }

  /**
   * Initializes the command-line interface with the provided options and commands.
   *
   * @param options - An optional record of option specifications. Each key represents an option name,
   * and the value is an `OptionSpec` object that defines the option's properties.
   * @param commands - An optional record of command specifications. Each key represents a command name,
   * and the value is a `CommandSpec` object that defines the command's properties.
   *
   * @returns The current instance of the class for method chaining.
   */
  init(options?: Record<string, OptionSpec>, commands?: Record<string, CommandSpec>) {
    options = { ...options };

    if (this._version) {
      let verAlias = ["V", "v"];
      Object.keys(options).forEach(k => {
        const opt = options[k];
        if (opt.alias) verAlias = verAlias.filter(x => opt.alias.indexOf(x) < 0);
      });
      options.version = this._getVersionOpt(verAlias);
    }

    if (this._helpOpt) {
      // eslint-disable-next-line dot-notation
      options["help"] = this._helpOpt;
    }

    // this._commands = new Commands(commands);
    this._rootCommand = new CommandBase(
      rootCommandName,
      {
        options,
        subCommands: commands,
        desc: "",
        allowUnknownOptions: this._config.allowUnknownOptions
      },
      this._config
    );

    unknownCommandBase.ncConfig = this._config;
    unknownCommandBase.parent = this._rootCommand;
    unknownCommandBaseNoOptions.ncConfig = this._config;
    unknownCommandBaseNoOptions.parent = this._rootCommand;

    // this._verifyOptions();
    // this._defaults = makeDefaults(options);

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
   * @returns
   */
  showVersion() {
    this.output(`${this._version}\n`);
    return this.exit(0);
  }

  /**
   * Generates help text for the specified command or the root command if no command name is provided.
   *
   * @param cmdName - The name of the command to generate help for. If not provided, help for the root command is generated.
   * @returns An array of strings representing the help text.
   */
  makeHelp(cmdName?: string) {
    let cmd = this._rootCommand;
    if (cmdName) {
      const matched = this._rootCommand.matchSubCommand(cmdName);
      if (!matched.cmd) {
        return [`Unknown command: ${cmdName}`];
      }
      cmd = matched.cmd;
    }

    const usage = [""];
    let usageMsg: string;
    if (this._usage && cmd) {
      usageMsg = cmd.usage || this._cmdUsage;
    }

    if (!usageMsg) {
      usageMsg = this._usage;
    }

    if (usageMsg) {
      usageMsg = usageMsg.replace("$0", this._name || "").replace("$1", cmdName || "<command>");
      usage.push(`Usage: ${usageMsg}`.trim(), "");
      if (cmd.desc) {
        usage.push(`  ${cmd.desc}`);
      }
      if (cmdName && cmd.name !== cmdName) {
        usage.push(`Command '${cmdName}' is alias for '${cmd.name}'`);
      }
    }

    const commandsHelp = cmd.subCmdCount > 0 ? ["Commands:"].concat(cmd.makeHelp()) : [];

    const makeOptionsHelp = () => {
      const options = cmd.options.makeHelp();

      if (options && options.length) {
        return ["", "Options:"].concat(options);
      }
      if (cmd.name && cmd.name !== "~root-command~") {
        return [`Command ${cmd.name} has no options`];
      }
      return [];
    };

    // console.log(usage, commandsHelp, optionHelp);

    const helpText = usage.concat(commandsHelp, makeOptionsHelp());
    // console.log(helpText);
    return helpText;
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
   * Set to skip exec for all command to true or false
   */
  skipExec(skip = true) {
    this._skipExec = skip;
    this._skipExecDefault = skip;
  }

  /**
   * Parses the given arguments and returns the result.
   *
   * @param argv - An optional array of strings representing the arguments to parse.
   * @param start - An optional number indicating the starting index for parsing.
   * @returns The result of the parsing as a `ParseResult` object.
   *
   * The method first calls `parse2` to perform the initial parsing. If there are any
   * failures detected by `_checkFailures`, it returns the parsed result immediately.
   * If there are no failures and `_skipExec` is not set, it proceeds to execute the
   * parsed result by calling `runExec`.
   */
  parse(argv?: string[], start?: number): ParseResult {
    const parsed = this.parse2(argv, start);

    if (this._checkFailures(parsed)) {
      return parsed;
    }

    if (!this._skipExec) {
      this.runExec(parsed);
    }

    return parsed;
  }

  /**
   *
   * @param argv
   * @param start
   * @returns
   */
  async parseAsync(argv?: string[], start?: number): Promise<ParseResult> {
    const parsed = this.parse2(argv, start);

    if (this._checkFailures(parsed)) {
      return parsed;
    }

    if (!this._skipExec) {
      await this.runExecAsync(parsed);
    }

    return parsed;
  }

  /**
   *
   * @param parsed
   * @returns
   */
  _checkFailures(parsed: ParseResult): boolean {
    if (parsed.errorNodes.length > 0) {
      this.emit("parse-fail", parsed);
      return true;
    }

    // check if user specified --help, to show help and exit
    if (this._helpOpt && this._helpOpt[HELP] && parsed.command.optNodes.help?.source === "cli") {
      this.emit("help", parsed);
      return true;
    }

    return false;
  }

  /**
   * Parses the given command-line arguments starting from the specified index.
   * If no arguments are provided, it defaults to using `process.argv`.
   *
   * @param argv - The array of command-line arguments to parse.
   * @param start - The index to start parsing from. Defaults to 0.
   * @returns An object containing the parsed command, the original arguments,
   *          any error nodes, the remaining unparsed arguments, and the index
   *          at which parsing stopped.
   */
  parse2(argv: string[], start = 0) {
    if (argv === undefined) {
      argv = process.argv;
      if (this._name === undefined) {
        this._name = Path.basename(argv[1], ".js");
      }
      start = 2;
    }

    const parser = new Parser(this);

    const { command, index } = parser.parse(argv, start);
    const missing = command.checkRequiredOptions();
    if (missing.length > 0) {
      command.addError(new Error("missing these required options " + missing.join(", ")));
    }

    // apply default args
    command.applyDefaults();
    command.makeCamelCaseOptions();

    const errorNodes = command.getErrorNodes();
    return {
      command,
      argv,
      errorNodes,
      _: argv.slice(index),
      index
    };
  }

  /**
   * Go through the commands in parsed and call their `exec` handler.
   *
   * The `parse` method call this at the end unless `skipExec` flag is set.
   *
   * @param parsed -  The parse result object.
   * @returns The number of commands with `exec` was invoked.
   */
  runExec(parsed: ParseResult): number {
    const command = parsed.command;

    let count = command.invokeExec(true);
    if (count === 0 && command.cmdBase.getExecCount() > 0) {
      const defaultCmd = this._makeDefaultExecCommand(parsed);
      if (defaultCmd) {
        count = defaultCmd.invokeExec(true);
      }
      if (count === 0) {
        this.emit("no-action");
      }
    }

    return count;
  }

  /**
   *
   * @param parsed
   * @returns
   */
  async runExecAsync(parsed: ParseResult): Promise<number> {
    const command = parsed.command;

    let count = await command.invokeExecAsync(true);
    if (count === 0 && command.cmdBase.getExecCount() > 0) {
      const defaultCmd = this._makeDefaultExecCommand(parsed);
      if (defaultCmd) {
        count = await defaultCmd.invokeExecAsync(true);
      }
      if (count === 0) {
        this.emit("no-action");
      }
    }

    return count;
  }

  /**
   *
   * @param parsed
   * @returns
   */
  _makeDefaultExecCommand(parsed: ParseResult): CommandNode {
    const command = parsed.command;

    if (
      !this._skipExecDefault &&
      this._config.defaultCommand &&
      command.getExecCommands([], true).length === 0
    ) {
      // trigger default command?
      // console.log("checking default command", this._config.defaultCommand);

      const matched = command.cmdBase.matchSubCommand(this._config.defaultCommand);
      if (matched.cmd) {
        const defaultCmd = new CommandNode(matched.name, matched.alias, matched.cmd);
        defaultCmd.applyDefaults();
        command.addCommandNode(defaultCmd);
        return defaultCmd;
      } else {
        command.addError(new Error(`default command ${this._config.defaultCommand} not found`));
        parsed.errorNodes = command.getErrorNodes();
      }
    }

    return undefined;
  }
}
