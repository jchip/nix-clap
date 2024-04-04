/* eslint-disable no-use-before-define */
/* eslint-disable max-statements, no-magic-numbers */

import { BaseSpec, CliBase, isRootCommand } from "./base";
import { CommandNode } from "./command-node";
import { GroupOptionSpec, Options } from "./options";
import { cbOrVal, dup, fitLines, objEach } from "./xtil";

/**
 * The execution function you provide for a command.  It is called with an array of command nodes.
 *
 */
export type CommandExecFunc = (cmd: CommandNode, cmdNodes?: CommandNode[]) => void;
export type CommandExecAsyncFunc = (cmd: CommandNode, cmdNodes?: CommandNode[]) => Promise<void>;

/**
 *
 */
/**
 * Represents the specification for a command.
 *
 * @extends BaseSpec
 *
 * @property {CommandExecFunc | CommandExecAsyncFunc} [exec] - Execute function to invoke for the command.
 * @property {string | (() => string)} [usage] - Command usage help text.
 * @property {GroupOptionSpec} [options] - Options for this command only.
 * @property {Record<string, CommandSpec>} [subCommands] - Sub commands under this command.
 */
export type CommandSpec = BaseSpec & {
  /**
   * Execute funtion to invoke for the command
   */
  exec?: CommandExecFunc | CommandExecAsyncFunc;
  /**
   * Command usage help text
   */
  usage?: string | (() => string);
  /**
   * Options for this command only
   */
  options?: GroupOptionSpec;
  /**
   * Sub commands under this command
   */
  subCommands?: Record<string, CommandSpec>;
};

/**
 * Represents a matched command with its name, alias, and the command itself.
 *
 * @property {string} name - The name of the matched command.
 * @property {string} alias - The alias of the matched command.
 * @property {Command} cmd - The command object associated with the matched command.
 */
export type CommandMatched = {
  name: string;
  alias: string;
  cmd: Command;
};

/**
 * Represents a command in the CLI application.
 *
 * @template CommandSpec - The specification type for the command.
 *
 * @extends CliBase<CommandSpec>
 *
 * @property {Record<string, string>} subAliases - A record of sub-command aliases.
 * @property {Options} options - The options associated with the command.
 * @property {number} subCommandCount - The count of sub-commands.
 * @property {Record<string, Command>} subCommands - A record of sub-commands.
 * @property {number} execCount - The count of executable sub-commands.
 * @property {Command} [parent] - The parent command, if any.
 *
 * @remarks
 * This class provides methods to manage and execute CLI commands, including handling sub-commands, options,
 * and aliases. It also includes functionality to generate help messages and verify the uniqueness of options
 * and aliases.
 *
 * @example
 * ```typescript
 * const cmdSpec: CommandSpec = { /* command specification *\/ };
 * const command = new Command('start', cmdSpec);
 * command.setCommandAliases(['run', 'execute'], 'start');
 * const helpMessage = command.makeHelp('myProgram');
 * console.log(helpMessage.join('\n'));
 * ```
 */
export class Command extends CliBase<CommandSpec> {
  subAliases: Record<string, string>;
  options: Options;
  subCommandCount: number;
  subCommands: Record<string, Command>;
  execCount: number;
  parent?: Command;

  /**
   * Creates an instance of a Command.
   *
   * @param name - The name of the command.
   * @param cmdSpec - The specification object for the command.
   * @param parent - An optional parent command.
   */
  constructor(name: string, cmdSpec: CommandSpec, parent?: Command) {
    const specCopy = dup(cmdSpec);
    super(name, specCopy);
    this.subCommandCount = 0;
    this.execCount = 0;
    this.subCommands = {};
    this.subAliases = {};
    this.parent = parent;

    specCopy.alias = [].concat(specCopy.alias || []);
    specCopy.desc = specCopy.desc;
    this.options = new Options(specCopy.options, this);
    this.needArgs = 0;
    this.expectArgs = 0;
    this.processArgs();
    // let count = 0;
    if (specCopy.subCommands) {
      for (const subName in specCopy.subCommands) {
        const subSpec = specCopy.subCommands[subName];
        this.subCommandCount++;
        this.subCommands[subName] = new Command(subName, subSpec, this);
        // count++;
        if (subSpec.exec) {
          this.execCount++;
        }
      }
    }

    if (parent) {
      this.verifyNoDupOptions();
      parent.setCommandAliases(specCopy.alias, name);
    }
  }

  /**
   * Sets aliases for a command.
   *
   * @param alias - An array of alias strings to be associated with the command.
   * @param name - The name of the command to which the aliases will be assigned.
   * @throws {Error} Throws an error if an alias is already used by another command.
   */
  setCommandAliases(alias: string[], name: string) {
    alias.forEach(a => {
      if (this.subAliases[a]) {
        throw new Error(`Command ${name} alias ${a} already used by command ${this.subAliases[a]}`);
      }
      this.subAliases[a] = name;
    });
  }

  /**
   * Verifies that an option with the given name does not already exist in the current command or any of its
   * parent commands. If the option exists, an error is thrown.
   *
   * @param optName - The name of the option to verify.
   * @param _from - The command from which the verification is initiated.
   * @throws {Error} If the option already exists in the current command or any parent command.
   */
  verifyOptionNotExist(optName: string, _from: Command) {
    if (_from !== this && this.options._options.hasOwnProperty(optName)) {
      throw new Error(
        `Command ${_from.name} option ${optName} already used by parent command '${this.name}'`
      );
    }
    if (this.parent) {
      this.parent.verifyOptionNotExist(optName, _from);
    }
  }

  /**
   * Verifies that there are no duplicate options in the command.
   * Iterates through the options and checks each one to ensure it does not already exist.
   * Throws an error if a duplicate option is found.
   */
  verifyNoDupOptions() {
    for (const _key in this.options._options) {
      this.verifyOptionNotExist(_key, this);
    }
  }

  get verbatimArgs() {
    return this.cmdSpec.args || "";
  }

  get desc() {
    return cbOrVal(this.cmdSpec.desc);
  }

  get usage() {
    return cbOrVal(this.cmdSpec.usage);
  }

  get exec() {
    return this.cmdSpec.exec;
  }

  get alias(): string[] {
    return [].concat(this.cmdSpec.alias);
  }

  /**
   * Retrieves the command specification.
   *
   * @returns {CommandSpec} The specification of the command.
   */
  get cmdSpec(): CommandSpec {
    return this.spec;
  }

  /**
   * Matches a sub-command based on the provided alias.
   *
   * @param alias - The alias of the sub-command to match.
   * @returns An object containing the matched command's name, alias, and the command itself.
   *
   * @remarks
   * If the alias does not directly match a sub-command, it will attempt to match using sub-aliases.
   * If no match is found, the alias is returned as the name with an undefined command.
   *
   * @example
   * ```typescript
   * const result = matchSubCommand('start');
   * console.log(result.name); // 'start'
   * console.log(result.alias); // 'start'
   * console.log(result.cmd); // Command object or undefined
   * ```
   */
  matchSubCommand(alias: string): CommandMatched {
    let cmd = this.subCommands[alias];
    let name = alias;

    if (!cmd) {
      name = this.subAliases[alias];
      if (name) {
        cmd = this.subCommands[name];
      } else {
        name = alias;
      }
    }

    return {
      name,
      alias: alias,
      cmd
    };
  }

  /**
   * Get the number of commands, including sub commands, that has exec
   *
   * @returns
   */
  getExecCount() {
    let a = this.exec ? 1 : 0;
    for (const cmd in this.subCommands) {
      a += this.subCommands[cmd].getExecCount();
    }
    return a;
  }

  /**
   * Generates a help message for the command and its subcommands.
   *
   * @param progName - Optional name of the program to be included in the help message.
   * @returns An array of strings representing the formatted help message.
   */
  makeHelp(progName?: string) {
    if (progName) {
      progName = `${progName} `;
    } else if (!isRootCommand(this.name)) {
      progName = `${this.name} `;
    } else {
      progName = "";
    }

    const data = [];

    objEach(this.subCommands, (cmd: Command, name: string) => {
      let args = cmd.verbatimArgs;
      args = args ? ` ${args}` : "";
      const strs = [`${progName}${name}${args}`, cmd.desc ? ` ${cmd.desc.trim()}` : ""];
      const alias = cmd.alias.join(" ");
      strs.push(alias.length > 0 ? `[aliases: ${alias}]` : "");
      data.push(strs);
    });

    const cmdWidth = data.reduce((max, n) => (n[0].length > max ? n[0].length : max), 0);

    return data.reduce((help, strs) => help.concat(fitLines(strs, "  ", "    ", cmdWidth, 80)), []);
  }
}

/**
 * Represents metadata for a command.
 */
export class CommandMeta {
  /**
   * Options associated with the command.
   */
  opts: Record<string, any>;

  /**
   * Count of each option used.
   */
  optsCount: Record<string, number>;

  /**
   * Full options associated with the command.
   */
  optsFull: Record<string, any>;

  /**
   * Name of the command.
   */
  name?: string;

  /**
   * Alias for the command.
   */
  alias?: string;

  /**
   * CamelCase version of the long option.
   */
  ccLong?: string;

  /**
   * Indicates if the command is unknown.
   */
  unknown?: boolean;

  /**
   * Arguments passed to the command.
   */
  args: any;

  /**
   * List of arguments.
   */
  argList: any;

  /**
   * Source of the command.
   */
  source: any;

  /**
   * Verbatim string of the command.
   */
  verbatim: any;

  /**
   * Sub-commands associated with this command.
   */
  subCommands: Record<string, CommandMeta>;
}
