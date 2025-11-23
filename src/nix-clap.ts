import Path from "path";
import { noop, setHelpZebra } from "./xtil.ts";
import EventEmitter from "events";
import { Parser } from "./parser.ts";
import { CommandBase, CommandSpec, unknownCommandBaseNoOptions } from "./command-base.ts";
import { OptionSpec } from "./option-base.ts";
import { CommandNode } from "./command-node.ts";
import { isRootCommand, rootCommandName } from "./base.ts";
import { ClapNode } from "./clap-node.ts";
import { unknownCommandBase } from "./command-base.ts";
import { _PARENT } from "./symbols.ts";
import { OptionNode } from "./option-node.ts";

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
 * Sets the process exit code without forcing immediate termination.
 * This allows stdout to flush properly before the process ends naturally.
 *
 * @param code - The exit code for the process.
 */
export const defaultExit = (code: number) => {
  process.exitCode = code;
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
 * @property {string} [unknownCommandFallback] - When encounter an unknown command at root level, treat it as arguments to this command.
 * For example, with `unknownCommandFallback: "run"`, `prog unknown` becomes `prog run unknown`.
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
   * When encounter an unknown command at root level, treat it as arguments to this command.
   * For example, with `unknownCommandFallback: "run"`, `prog unknown` becomes `prog run unknown`.
   */
  unknownCommandFallback?: string;

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
  /**
   * Set to `true` to enable zebra striping (alternating dim rows) in help text
   * for better readability when terminal is wide.
   */
  helpZebra?: boolean;
};

/**
 * Represents the result of parsing command-line arguments.
 *
 * @property {ClapNode[]} [errorNodes] - Optional array of nodes that encountered errors during parsing.
 * @property {CommandNode} command - The root command of the parsed CLI args structure.
 * @property {CommandNode} [execCmd] - The command that was executed (set after runExec/runExecAsync).
 * @property {string[]} _ - Remaining args after `--` if it was specified.
 * @property {string[]} argv - Array of all arguments passed to the command.
 * @property {number} index - The current index in the argument list, in case not everything was consumed.
 */
export type ParseResult = {
  errorNodes?: ClapNode[];
  command: CommandNode;
  execCmd?: CommandNode;
  /**
   * The command node where --help was specified (set by _checkFailures when help is requested)
   */
  helpNode?: CommandNode;
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
  constructor(_config: NixClapConfig = {}) {
    super();
    const config = { ..._config };
    this._config = config;
    this._name = config.name;
    this._version = config.version || false;

    // Set zebra striping for help text
    setHelpZebra(config.helpZebra !== false);

    this._versionAlias = config.versionAlias;

    this._helpOpt = config.hasOwnProperty("help")
      ? config.help
      : ({
          [HELP]: true,
          alias: config.helpAlias || ["?", "h"],
          args: "[cmds string..]",
          desc: () => {
            const cmdText =
              this._rootCommand.subCmdCount > 0 ? " Add command path to show its help" : "";
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
            // Determine which command to show help for:
            // 1. Check if --help <cmd...> was used (takes priority) - supports command path
            // 2. If helpNode is a subcommand (not root), build path from helpNode to root
            let helpCmdPath: string[] | undefined;

            // Check for --help cmd1 cmd2... syntax
            const helpArgs = parsed.command.optNodes?.help?.argsMap?.cmds as string[] | undefined;
            if (helpArgs && helpArgs.length > 0) {
              helpCmdPath = helpArgs;
            } else if (parsed.helpNode && !isRootCommand(parsed.helpNode.alias)) {
              // Build command path from helpNode up to (but not including) root
              helpCmdPath = [];
              let node: CommandNode | undefined = parsed.helpNode;
              while (node && !isRootCommand(node.alias)) {
                helpCmdPath.unshift(node.name);
                node = node[_PARENT] as CommandNode | undefined;
              }
            }

            /* c8 ignore next */
            this.showHelp(errorNode?.error, helpCmdPath);
          },
          "post-help": noop,
          version: () => this.showVersion(),
          "parse-fail": parsed => this.showError(parsed.command.getErrorNodes()[0].error),
          "no-action": () => this.showHelp(new Error("No command given"))
          // "new-command": noop,
        };

    // Handle exit separately since it has a different signature
    if (!config.noDefaultHandlers) {
      this.on("exit", defaultExit);
    }
    const handlers = config.handlers || {};
    for (const [name, handler] of Object.entries(this._evtHandlers)) {
      const h = handlers.hasOwnProperty(name) ? handlers[name] : handler;
      if (typeof h === "function") {
        this.on(name, h);
      }
    }
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

  /**
   * Apply extra config to the parsed result, allowing user config from files or settings to override defaults,
   * but not override options explicitly specified on the command line (which has highest priority).
   *
   * This method enables configuration hierarchy where:
   * 1. Command line arguments have the highest priority (source: "cli")
   * 2. User config (from files/settings) has medium priority (source: "user")
   * 3. Defaults have the lowest priority (source: "default")
   *
   * For example, you can load options from package.json or user config files and apply them after CLI parsing,
   * but they won't override any options the user explicitly provided on the command line.
   *
   * @param config - Config object containing user options config (e.g., from package.json, config files)
   * @param parsed - The parsed result from parse() or parse2()
   * @param src - Name of the source that provided the config. Default to 'user'
   * @returns The NixClap instance for method chaining
   *
   * @example
   * ```typescript
   * const nc = new NixClap().init({ verbose: { alias: 'v' } });
   * const parsed = nc.parse(['--verbose']);
   * nc.applyConfig({ verbose: false, timeout: 5000 }, parsed);
   * // parsed.command.jsonMeta.opts.verbose is still true (from CLI)
   * // parsed.command.jsonMeta.opts.timeout is 5000 (from config)
   * ```
   */
  applyConfig(
    config: Record<string, any>,
    parsed: ParseResult,
    src: "cli" | "user" | "default" = "user"
  ) {
    parsed.command.applyConfig(config, src);
    return this;
  }

  /**
   * Recursively adds help option to all subcommands.
   * Filters out help aliases that conflict with existing options in the subcommand.
   */
  private _addHelpToSubCommands(commands: Record<string, CommandSpec>) {
    /* c8 ignore next */ if (!this._helpOpt) return;

    for (const name in commands) {
      const cmd = commands[name];
      const existingOptions = cmd.options || {};

      // Collect all aliases used by existing options in this command
      const usedAliases = new Set<string>();
      for (const optName in existingOptions) {
        const opt = existingOptions[optName];
        if (opt.alias) {
          const aliases = Array.isArray(opt.alias) ? opt.alias : [opt.alias];
          aliases.forEach(a => usedAliases.add(a));
        }
      }

      // Create a copy of help option, filtering out conflicting aliases
      /* c8 ignore next 3 */
      const helpAliases = this._helpOpt.alias
        ? (Array.isArray(this._helpOpt.alias) ? this._helpOpt.alias : [this._helpOpt.alias])
        : [];
      const filteredAliases = helpAliases.filter(a => !usedAliases.has(a));

      // Only add help if 'help' option name isn't already used
      if (!existingOptions.hasOwnProperty("help")) {
        cmd.options = {
          ...existingOptions,
          help: { ...this._helpOpt, alias: filteredAliases }
        };
      }

      // Recursively add to nested subcommands
      if (cmd.subCommands) {
        this._addHelpToSubCommands(cmd.subCommands);
      }
    }
  }

  /**
   * Initialize NixClap with a single root command spec.
   *
   * The root command is a CommandSpec, with its options and subCommands defined inline.
   *
   * @param rootCommandSpec - Complete specification for the root command including options and subCommands
   * @returns this
   */
  init2(rootCommandSpec: CommandSpec = {}) {
    let options = rootCommandSpec.options || {};
    const commands = { ...rootCommandSpec.subCommands };

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
      // Also add help option to all subcommands recursively
      this._addHelpToSubCommands(commands);
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
   */
  init(options?: Record<string, OptionSpec>, commands?: Record<string, CommandSpec>) {
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
   * Shows the version information and exits.
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
   * @param cmdPath - The command name or path (array) to generate help for. If not provided, help for the root command is generated.
   * @returns An array of strings representing the help text.
   */
  makeHelp(cmdPath?: string | string[]) {
    let cmd = this._rootCommand;

    // Guard against uninitialized CLI
    if (!cmd) {
      return ["Error: CLI not initialized. Call init() or init2() first."];
    }

    // Normalize cmdPath to array
    const cmdNames = cmdPath
      ? Array.isArray(cmdPath)
        ? cmdPath
        : [cmdPath]
      : [];

    // Walk the command path to find the target command
    for (const cmdName of cmdNames) {
      const matched = cmd.matchSubCommand(cmdName);
      if (!matched.cmd) {
        return [`Unknown command: ${cmdName}`];
      }
      cmd = matched.cmd;
    }

    // For display purposes, use the last command name in path
    const cmdName = cmdNames.length > 0 ? cmdNames[cmdNames.length - 1] : undefined;

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
      /* c8 ignore next 3 */ // Subcommands now have help option added automatically
      if (cmd.name && !isRootCommand(cmd.alias[0])) {
        return [`Command ${cmd.name} has no options`];
      }
      return [];
    };

    const helpText = usage.concat(commandsHelp, makeOptionsHelp());
    return helpText;
  }

  /**
   * Shows help information for the specified command or the root command.
   *
   * @param err - Optional error to display along with help
   * @param cmdPath - Optional command name or path (array) to show help for
   * @returns
   */
  showHelp(err?, cmdPath?: string | string[]) {
    this.emit("pre-help", { self: this });
    this.output(`${this.makeHelp(cmdPath).join("\n")}\n`);
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
   * Shows an error message without displaying full help text.
   * Outputs a hint to use --help for more information.
   *
   * @param err - The error to display
   * @returns
   */
  showError(err: Error) {
    this.output(`Error: ${err.message}\n`);
    this.output(`${this._name || "program"} --help for more info\n`);
    return this.exit(1);
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
   * Parses the given command-line arguments asynchronously.
   *
   * @param argv - Optional array of arguments to parse
   * @param start - Optional starting index for parsing
   * @returns Promise resolving to the parse result
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
   * Recursively find a command node that has --help specified via CLI.
   * Returns the command node where help was requested, or undefined if not found.
   *
   * @param cmdNode - The command node to search from
   * @returns The command node with help requested, or undefined
   */
  private _findHelpNode(cmdNode: CommandNode): CommandNode | undefined {
    if (cmdNode.optNodes.help?.source === "cli") {
      return cmdNode;
    }
    for (const key in cmdNode.subCmdNodes) {
      const found = this._findHelpNode(cmdNode.subCmdNodes[key]);
      if (found) return found;
    }
    return undefined;
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

    // check if user specified --help anywhere in the command tree
    if (this._helpOpt && this._helpOpt[HELP]) {
      const helpNode = this._findHelpNode(parsed.command);
      if (helpNode) {
        // Store which command requested help for the handler to use
        parsed.helpNode = helpNode;
        this.emit("help", parsed);
        return true;
      }
    }

    // check if user specified --version, to show version and exit
    if (this._version && parsed.command.optNodes.version?.source === "cli") {
      this.emit("version");
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

    // Execute if:
    // 1. No command already ran (count === 0)
    // 2. No subcommand matched
    // 3. Root exec handler is defined
    // 4. Either arguments were provided OR root command has no args spec (options-only CLI)
    const hasArgsProvided = command.argsList.length > 0;
    const hasNoArgsSpec = this._rootCommand.args.length === 0;

    return (
      count === 0 &&
      this._rootCommand.exec != null &&
      Object.keys(command.subCmdNodes).length === 0 &&
      (hasArgsProvided || hasNoArgsSpec)
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

    let count = command.invokeExec(true, parsed);

    // Check if root command should execute FIRST (before defaultCommand)
    // This gives priority to root command when arguments are provided
    // See _shouldExecuteRootCommand() for execution conditions
    if (this._shouldExecuteRootCommand(command, count)) {
      command.cmdBase.exec(command, parsed);
      if (!parsed.execCmd) {
        parsed.execCmd = command;
      }
      count = 1;
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

    let count = await command.invokeExecAsync(true, parsed);

    // Check if root command should execute FIRST (before defaultCommand)
    // This gives priority to root command when arguments are provided
    if (this._shouldExecuteRootCommand(command, count)) {
      await command.cmdBase.exec(command, parsed);
      if (!parsed.execCmd) {
        parsed.execCmd = command;
      }
      count = 1;
    }


    // Emit no-action only if truly no command was executed
    if (count === 0 && command.cmdBase.getExecCount() > 0) {
      this.emit("no-action");
    }

    return count;
  }

}
