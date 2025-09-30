import Path from "path";
import { objEach, noop } from "./xtil.ts";
import EventEmitter from "events";
import { Parser } from "./parser.ts";
import { CommandBase, CommandSpec, unknownCommandBaseNoOptions } from "./command-base.ts";
import { OptionSpec } from "./option-base.ts";
import { CommandNode } from "./command-node.ts";
import { isRootCommand, rootCommandName } from "./base.ts";
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
  help?: OptionSpec | false;
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
  allowUnknownOption?: boolean;
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
  output?: (text: string) => void;
  /**
   * Custom event handlers
   */
  handlers?: Record<string, ((parsed?: ParseResult) => void | Promise<void>) | false>;
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
  private _helpOpt: OptionSpec | false;
  private _usage: string;
  private _cmdUsage: string;
  private exit: (code: number) => void;
  /**
   * Represents the output of the process.
   */
  output: (s: string) => void;
  private _evtHandlers: Record<string, ((parsed?: ParseResult) => void | Promise<void>) | false>;
  private _skipExec: boolean;
  private _skipExecDefault: boolean;
  // private _defaults: any;
  private _config: NixClapConfig;
  _rootCommand?: CommandBase;
  private _options?: Record<string, OptionSpec>;
  private _commands?: Record<string, CommandSpec>;

  /**
   * Constructs a new instance of the NixClap class.
   *
   * @param _config - Optional configuration object for NixClap.
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
      : ({
          [HELP]: true,
          alias: config.helpAlias || ["?", "h"],
          args: "[cmd string]",
          desc: () => {
            const cmdText =
              this._rootCommand.subCmdCount > 0 ? " Add a command to show its help" : "";
            return `Show help.${cmdText}`;
          }
        } as OptionSpec);

    this._usage = config.usage || "$0";
    this._cmdUsage = config.cmdUsage || "$0 $1";
    this.exit = config.exit || (n => this.emit("exit", n));
    this.output = config.output || defaultOutput;
    this._evtHandlers = config.noDefaultHandlers
      ? {}
      : {
          "pre-help": noop,
          help: parsed => {
            const errorNode = parsed.errorNodes?.[0];
            const helpCmd = parsed.command.optNodes?.help?.argsMap?.cmd;
            /* c8 ignore next */
            this.showHelp(errorNode?.error, helpCmd);
          },
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
          "no-action": () => this.showHelp(new Error("No command given"))
          // "new-command": noop,
        };

    // Handle exit separately since it has a different signature
    if (!config.noDefaultHandlers) {
      this.on("exit", defaultExit);
    }
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
      const handler = this._evtHandlers[evtName];
      if (typeof handler === "function") {
        this.removeListener(evtName, handler);
      }
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
   * Initialize NixClap with a single root command spec (clean API).
   *
   * This is the architecturally clean way to initialize NixClap - the root command
   * is just a CommandSpec like any other, with its options and subCommands defined inline.
   *
   * @param rootCommandSpec - Complete specification for the root command including options and subCommands
   * @returns this
   *
   * @example
   * ```typescript
   * new NixClap()
   *   .init2({
   *     desc: "My CLI tool",
   *     args: "[files..]",
   *     options: {
   *       verbose: { alias: "v", desc: "Verbose output" }
   *     },
   *     subCommands: {
   *       build: {
   *         desc: "Build the project",
   *         exec: (cmd) => { ... }
   *       },
   *       test: {
   *         desc: "Run tests",
   *         exec: (cmd) => { ... }
   *       }
   *     },
   *     exec: (cmd) => {
   *       // Root command handler (optional)
   *       // Only runs when args are provided
   *     }
   *   })
   *   .parse();
   * ```
   */
  init2(rootCommandSpec: CommandSpec) {
    let options = rootCommandSpec.options || {};
    const commands = rootCommandSpec.subCommands || {};

    // Add version option if version is set
    if (this._version) {
      options = { ...options };
      let verAlias = ["V", "v"];
      Object.keys(options).forEach(k => {
        const opt = options[k];
        if (opt.alias) verAlias = verAlias.filter(x => opt.alias.indexOf(x) < 0);
      });
      options.version = this._getVersionOpt(verAlias);
    }

    // Add help option if configured
    if (this._helpOpt) {
      options = { ...options };
      // eslint-disable-next-line dot-notation
      options["help"] = this._helpOpt;
    }

    this._options = options;
    this._commands = commands;
    this._name = this._config.name;

    // Build root command spec from the provided spec
    const rootCommandSpecFinal: CommandSpec = {
      alias: rootCommandName,
      desc: rootCommandSpec.desc || "",
      args: rootCommandSpec.args,
      argDefault: rootCommandSpec.argDefault,
      exec: rootCommandSpec.exec,
      usage: rootCommandSpec.usage,
      customTypes: rootCommandSpec.customTypes,
      options: options,
      subCommands: commands,
      allowUnknownOption: rootCommandSpec.allowUnknownOption ?? this._config.allowUnknownOption
    };

    this._rootCommand = new CommandBase(
      this._name || "program",
      rootCommandSpecFinal,
      this._config
    );

    unknownCommandBase.ncConfig = this._config;
    unknownCommandBase.parent = this._rootCommand;
    unknownCommandBaseNoOptions.ncConfig = this._config;
    unknownCommandBaseNoOptions.parent = this._rootCommand;

    return this;
  }

  /**
   * Convenience method to initialize with separate options and commands parameters.
   *
   * This is a wrapper around init2() for backward compatibility and convenience.
   *
   * @param options - An optional record of option specifications for the root command
   * @param commands - An optional record of command specifications (sub-commands)
   * @returns The current instance of the class for method chaining.
   *
   * @example
   * ```typescript
   * new NixClap().init(
   *   { verbose: { alias: "v" } },
   *   { build: { desc: "Build project", exec: ... } }
   * );
   * ```
   */
  init(
    options?: Record<string, OptionSpec>,
    commands?: Record<string, CommandSpec>
  ) {
    return this.init2({
      options: options || {},
      subCommands: commands || {}
    });
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

    // Guard against uninitialized CLI
    if (!cmd) {
      return ["Error: CLI not initialized. Call init() or init2() first."];
    }

    if (cmdName) {
      const matched = this._rootCommand.matchSubCommand(cmdName);
      if (!matched.cmd) {
        return [`Unknown command: ${cmdName}`];
      }
      cmd = matched.cmd;
    }

    const usage = [""];
    let usageMsg: string;

    // For root command showing help, prefer custom usage over cmdUsage
    const isShowingRootHelp = !cmdName && isRootCommand(cmd.alias[0]);

    if (this._usage && cmd) {
      usageMsg = cmd.usage || (isShowingRootHelp ? this._usage : this._cmdUsage);
    }

    if (!usageMsg) {
      usageMsg = this._usage;
    }

    if (usageMsg) {
      const progName = this._name || "";

      // Check if we need two-line usage (root command has both args and sub-commands)
      const hasRootArgs = isRootCommand(cmd.alias[0]) && cmd.verbatimArgs;
      const hasSubCommands = cmd.subCmdCount > 0;

      if (hasRootArgs && hasSubCommands && !cmdName) {
        // Two-line usage format: show both root command args and sub-command usage
        // First line: use custom usage (for root command with args)
        const rootUsage = usageMsg.replace("$0", progName);
        // Don't replace $1 for root usage - it's meant for command name when showing sub-command help
        usage.push(`Usage: ${rootUsage}`.trim());
        // Second line: show sub-command usage pattern
        usage.push(`  ${progName} <command> [command-args] [options]`, "");
      } else if (hasRootArgs && !hasSubCommands && !cmdName && usageMsg === "$0") {
        // Root command with args but no custom usage and no sub-commands
        // Generate usage from args
        usage.push(`Usage: ${progName} ${cmd.verbatimArgs}`.trim(), "");
      } else if (!hasRootArgs && hasSubCommands && !cmdName && usageMsg === "$0") {
        // Only sub-commands, no root args, no custom usage
        // Show <command> placeholder
        usage.push(`Usage: ${progName} <command>`.trim(), "");
      } else {
        // Standard single-line usage
        usageMsg = usageMsg.replace("$0", progName).replace("$1", cmdName || "<command>");
        usage.push(`Usage: ${usageMsg}`.trim(), "");
      }

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
      if (cmd.name && !isRootCommand(cmd.alias[0])) {
        return [`Command ${cmd.name} has no options`];
      }
      return [];
    };

    const helpText = usage.concat(commandsHelp, makeOptionsHelp());
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
      start = 2;
    }

    if (start > 0 && this._name === undefined) {
      this._name = Path.basename(argv[start - 1], ".js");
      this._rootCommand.name = this._name;
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
   * Determines if the root command should be executed based on parsing results.
   *
   * This is part of the root command execution logic that spans three locations:
   * 1. CommandNode.getExecCommands() - filters out root command from auto-execution
   * 2. This method (_shouldExecuteRootCommand) - determines if root should execute
   * 3. runExec/runExecAsync methods - performs the actual execution
   *
   * Root command executes when ALL of the following conditions are met:
   * - No other commands were executed (count === 0)
   * - Root command has an exec handler defined
   * - At least one argument was provided (root command requires args)
   * - No sub-commands were matched
   *
   * @param command - The parsed command node
   * @param count - Number of commands already executed
   * @returns true if root command should execute, false otherwise
   *
   * @remarks
   * The null checks provide robustness for edge cases during parsing.
   * If either command or _rootCommand is null/undefined, it indicates
   * the CLI was not properly initialized or parsing failed catastrophically.
   *
   * @private
   */
  private _shouldExecuteRootCommand(command: CommandNode, count: number): boolean {
    // Defensive checks for robustness - these should rarely be null in practice
    if (!command || !this._rootCommand) {
      return false;
    }

    return (
      count === 0 &&
      this._rootCommand.exec != null &&
      command.argsList.length > 0 &&
      Object.keys(command.subCmdNodes).length === 0
    );
  }

  /**
   * Go through the commands in parsed and call their `exec` handler.
   *
   * Root command execution logic (see _shouldExecuteRootCommand and CommandNode.getExecCommands):
   * - Execution priority: sub-commands → root command → defaultCommand
   * - Root command only executes when args are provided and no sub-commands matched
   * - This ensures sub-commands always take precedence over root command
   *
   * The `parse` method call this at the end unless `skipExec` flag is set.
   *
   * @param parsed -  The parse result object.
   * @returns The number of commands with `exec` was invoked.
   *
   * @remarks
   * **Immutability Note**: Command exec handlers should NOT modify the command structure
   * (e.g., argsList, subCmdNodes, optNodes) during execution. The parsed command tree is
   * considered read-only after parsing completes. Modifying it may cause unexpected behavior
   * if runExec is called multiple times on the same parsed result.
   */
  runExec(parsed: ParseResult): number {
    const command = parsed.command;

    let count = command.invokeExec(true);

    // Check if root command should execute FIRST (before defaultCommand)
    // This gives priority to root command when arguments are provided
    // See _shouldExecuteRootCommand() for execution conditions
    if (this._shouldExecuteRootCommand(command, count)) {
      command.cmdBase.exec(command, command.getBreadCrumb());
      count = 1;
    }

    // Then check defaultCommand (only if root command didn't execute)
    if (count === 0 && command.cmdBase.getExecCount() > 0) {
      const defaultCmd = this._makeDefaultExecCommand(parsed);
      if (defaultCmd) {
        count = defaultCmd.invokeExec(true);
      }
    }

    // Emit no-action only if truly no command was executed
    if (count === 0 && command.cmdBase.getExecCount() > 0) {
      this.emit("no-action");
    }

    return count;
  }

  /**
   * Async version of runExec - waits for all async exec handlers to complete.
   *
   * @param parsed - The parse result object.
   * @returns Promise resolving to the number of commands executed.
   *
   * @remarks
   * **Immutability Note**: Command exec handlers should NOT modify the command structure
   * (e.g., argsList, subCmdNodes, optNodes) during execution. The parsed command tree is
   * considered read-only after parsing completes. Modifying it may cause unexpected behavior
   * if runExec is called multiple times on the same parsed result.
   */
  async runExecAsync(parsed: ParseResult): Promise<number> {
    const command = parsed.command;

    let count = await command.invokeExecAsync(true);

    // Check if root command should execute FIRST (before defaultCommand)
    // This gives priority to root command when arguments are provided
    if (this._shouldExecuteRootCommand(command, count)) {
      await command.cmdBase.exec(command, command.getBreadCrumb());
      count = 1;
    }

    // Then check defaultCommand (only if root command didn't execute)
    if (count === 0 && command.cmdBase.getExecCount() > 0) {
      const defaultCmd = this._makeDefaultExecCommand(parsed);
      if (defaultCmd) {
        count = await defaultCmd.invokeExecAsync(true);
      }
    }

    // Emit no-action only if truly no command was executed
    if (count === 0 && command.cmdBase.getExecCount() > 0) {
      this.emit("no-action");
    }

    return count;
  }

  /**
   * Creates and adds a default command node to the parsed result if configured.
   *
   * This method is called during command execution (not parsing) when no other commands
   * were executed. It creates a new CommandNode for the default command and adds it to
   * the command tree.
   *
   * @param parsed - The parse result object
   * @returns The created default CommandNode, or undefined if no default command should be created
   *
   * @remarks
   * **Mutation Behavior**: This method INTENTIONALLY mutates the parsed result by:
   * 1. Adding a new CommandNode to the command tree (line: command.addCommandNode(defaultCmd))
   * 2. Adding errors to the command if default command is not found
   * 3. Updating parsed.errorNodes if errors occur
   *
   * This mutation happens during execution (not parsing) and is part of the default command
   * feature design. The default command is lazily added only when needed, rather than during
   * initial parsing. This is an exception to the general immutability guideline for exec handlers.
   *
   * @private
   */
  _makeDefaultExecCommand(parsed: ParseResult): CommandNode {
    const command = parsed.command;

    if (
      !this._skipExecDefault &&
      this._config.defaultCommand &&
      command.getExecCommands([], true).length === 0
    ) {
      const matched = command.cmdBase.matchSubCommand(this._config.defaultCommand);
      if (matched.cmd) {
        const defaultCmd = new CommandNode(matched.name, matched.alias, matched.cmd);
        defaultCmd.applyDefaults();
        command.addCommandNode(defaultCmd); // Intentional mutation for default command feature
        return defaultCmd;
      } else {
        command.addError(new Error(`default command ${this._config.defaultCommand} not found`));
        parsed.errorNodes = command.getErrorNodes(); // Intentional mutation for error tracking
      }
    }

    return undefined;
  }
}
