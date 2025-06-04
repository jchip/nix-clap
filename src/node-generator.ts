/* eslint-disable max-params */
/* eslint-disable max-depth */
/* eslint-disable one-var */
/* eslint-disable complexity */
/* eslint-disable no-use-before-define */

import assert from "assert";
import { ArgInfo, BaseSpec, CliBase, UnknownCliArgError, UnknownOptionError } from "./base";
import { ClapNode } from "./clap-node";
import { CommandNode } from "./command-node";
import { Option } from "./option";
import { OptionNode } from "./option-node";
import { OptionMatch } from "./options";
import { isBoolean, toBoolean } from "./xtil";

/**
 * Represents the source of an option in the application.
 *
 * - `cli`: The option was provided via the command line interface.
 * - `user`: The option was set by the user.
 * - `default`: The option is using the default value.
 */
export type OptionSource = "cli" | "user" | "default";

const BUILDER_STATUS_GATHER_END = 1;
const BUILDER_STATUS_COMPLETE = 2;

/**
 * ClapNodeBuilder is responsible for constructing and managing ClapNode instances
 * during the command-line argument parsing process.
 *
 * @class
 * @description
 * This class provides methods to consume and process command-line arguments,
 * building a tree-like structure of ClapNode objects that represent the parsed
 * command, options, and their values.
 *
 * @remarks
 * - The builder maintains a reference to its parent builder, allowing for nested command structures.
 * - It handles both option and non-option arguments.
 * - The class manages the state of completeness for the current node being built.
 * - It interacts closely with the NixClap instance to determine how to process each argument.
 *
 * @example
 * ```typescript
 * const rootNode = new CommandNode(rootCommandName, rootCommandName, nixClap._rootCommand);
 * const builder = new ClapNodeBuilder(rootNode);
 * const result = builder.consumeOpt("-v");
 * // Process the result...
 * ```
 */
export class ClapNodeGenerator {
  node: ClapNode;
  parent?: ClapNodeGenerator;
  status: number;
  // commandContext?: CommandContext;
  constructor(node: ClapNode, parent?: ClapNodeGenerator) {
    this.node = node;
    this.status = 0;
    if (parent) {
      this.parent = parent;
    }
  }

  get cmdNode(): CommandNode {
    return this.node instanceof CommandNode ? this.node : null;
  }

  get optNode(): OptionNode {
    return this.node instanceof OptionNode ? this.node : null;
  }

  /**
   *
   * @param type
   * @param value
   * @param spec
   * @returns
   */
  convertValue(type: string, value: string, base: CliBase<BaseSpec>): any {
    if (typeof value !== "string") {
      return value;
    }

    if (type === "number") {
      return parseInt(value, 10);
    } else if (type === "float") {
      return parseFloat(value);
    } else if (!type || type === "boolean") {
      return toBoolean(value);
    } else {
      const coercion = base.spec.coercions?.[type];
      if (coercion === undefined) {
        // no coercion, so just keep as string
        return value;
      }

      if (typeof coercion === "string") {
        return coercion;
      } else if (typeof coercion === "function") {
        try {
          return coercion(value);
        } catch (e) {
          this.node.addError(e);
          return `${type} coercion function threw error: ${e.message}`;
        }
      } else if (coercion instanceof RegExp) {
        const mx = value.match(coercion);
        if (mx) {
          return mx[0];
        }

        if (base.spec.argDefault) {
          return base.spec.argDefault;
        }

        this.node.errors.push(
          new Error(`argument '${value}' didn't match RegExp requirement for ${base.name}`)
        );
      } else {
        this.node.errors.push(new Error(`Unknown coercion handler type: ${typeof coercion}`));
      }
    }

    return value;
  }

  /**
   *
   * @param arg
   * @returns
   */
  consumeNonOptAsCommand(arg: string, parsingCmd = ""): ClapNodeGenerator[] {
    const cmdNode = this.cmdNode;
    const cmd = cmdNode.cmdSpec;
    // is it a sub command?
    const matched = cmd.matchSubCommand(arg);
    if (matched.cmd) {
      // process as a known sub command
      const node = new CommandNode(matched.name, matched.alias, matched.cmd);
      cmdNode.addCommandNode(node);

      const builder = new ClapNodeGenerator(node);
      builder.parent = this;
      this.endArgGathering();
      return [builder];
    } else if (!this.status && cmd.expectArgs > 0) {
      // can we take it as an argument to the command?
      // is it a valid argument?
      //
      this.node.addArg(arg);

      if (cmd.expectArgs === this.node.argsList.length) {
        this.endArgGathering();
      }
    } else {
      this.endArgGathering();
      // this may be a sub command for the parent, if it's a command also
      if (this.parent && this.parent.cmdNode) {
        return this.parent.consumeNonOptAsCommand(arg, parsingCmd || cmd.name);
      }
      // unknown command or invalid argument
      throw new UnknownCliArgError(
        `Encountered unknown CLI argument '${arg}'` +
          (!parsingCmd ? "." : ` while parsing for command '${parsingCmd}'`),
        arg
      );
    }

    return [];
  }

  /**
   * Check that a boolean option that doesn't specify argument should auto sets true
   *
   * @param arg
   * @returns
   */
  checkAutoBooleanOption(arg: string): boolean {
    const opt = this.optNode.option;

    if (
      opt.expectArgs > 0 &&
      opt.args[0].type === "boolean" && // if option is expecting the first arg as a boolean
      this.node.argsList.length === 0 && // and no arg gathered yet
      !isBoolean(arg) // but incoming arg doesn't look like a boolean
    ) {
      // a boolean option without arg is auto true, with source 'cli'
      this.node.addArg("true");

      return true;
    }

    return false;
  }

  /**
   *
   * @param arg
   * @returns
   */
  consumeNonOptAsOption(arg: string): ClapNodeGenerator[] {
    if (this.checkAutoBooleanOption(arg)) {
      this.complete();
      // option must have a parent
      return [null].concat(this.parent.consumeNonOpt(arg));
    }

    this.node.addArg(arg);

    // if we have a node that remains open, then it must be expecting arguments
    const opt = this.optNode.option;

    if (this.node.argsList.length >= opt.expectArgs) {
      this.endArgGathering();
      return [null];
    }

    return [];
  }

  /**
   *
   * @param arg
   * @returns
   */
  consumeNonOpt(arg: string): ClapNodeGenerator[] {
    /**
     * Possibilities
     * 1. A valid subcommand
     * 1a. A valid subcommand for a parent
     * 2. A valid argument for a node (either command or option)
     * 3. Unknown command and invalid argument
     *
     */
    // does current node want sub command?
    // if (this.commandContext) {
    //   const cmd = this.commandContext[CMD];
    // }

    if (this.cmdNode) {
      if (this.cmdNode.isGreedy) {
        this.node.addArg(arg);
        return [];
      }
      return this.consumeNonOptAsCommand(arg);
    } else {
      return this.consumeNonOptAsOption(arg);
    }
  }

  /**
   *
   * @param data
   * @returns
   */
  setOptValue(data: OptionMatch, complete = false, source: OptionSource = "cli"): OptionNode {
    const cmd = this.cmdNode.cmdSpec;

    // does this command want this option

    const matched = cmd.options.match(data);

    let node: OptionNode;

    if (!matched) {
      if (this.parent) {
        return this.parent.setOptValue(data, complete);
      }
      this.node.addError(
        new UnknownOptionError(`Encountered unknown CLI option '${data.name}'.`, data.arg)
      );
      // no more parent, accept as unknown option at root command
      node = new OptionNode(data, this.node);
    } else {
      node = new OptionNode(matched, this.node);
    }

    node.source = source;
    this.cmdNode.addOptionNode(node);

    if (complete) {
      const builder = new ClapNodeGenerator(node, this);
      builder.complete();
    }

    return node;
  }

  /**
   * Adds an option with its arguments to the current node.
   *
   * @param name
   * @param args
   */
  addOptionWithArgs(
    name: string,
    args: string[],
    option: Option,
    source: OptionSource = "default"
  ) {
    const builder = this.makeOptNode({
      name: name,
      verbatim: name,
      arg: "",
      dashes: 2,
      value: args[0],
      option
    })[0];

    builder.optNode.source = source;
    // apply more default args
    for (let ix = 1; ix < args.length; ix++) {
      builder.consumeNonOptAsOption(args[ix]);
    }
    builder.complete();
    return builder.optNode;
  }

  /**
   * Consumes and processes an option argument.
   *
   * This method handles various types of option formats, including short options (-a),
   * long options (--option), negated options (--no-option), and options with values (--option=value).
   *
   * @param {string} opt - The option argument to process.
   * @returns {ClapNodeGenerator[]} An array of ClapNodeBuilder instances resulting from processing the option.
   *
   * @remarks
   * - If the option is "-." or "--.", it completes the current option or ends argument gathering.
   * - For options starting with "--no-", it sets the option value to "false".
   * - It handles combined short options (e.g., -abc) by processing each character as a separate option.
   * - Options with values (--option=value) are parsed and the value is associated with the option.
   * - If the current node is an option node, it completes that node before processing the new option.
   *
   * @example
   * ```typescript
   * const result = builder.consumeOpt("--verbose");
   * // Process the result...
   * ```
   */
  consumeOpt(opt: string): ClapNodeGenerator[] {
    if (this.cmdNode && (opt === "-#" || opt === "--#")) {
      this.cmdNode.isGreedy = true;
      return [];
    }

    if (opt === "-." || opt === "--.") {
      if (this.optNode) {
        this.complete();
      } else {
        this.endArgGathering();
      }
      return [null];
    }

    if (this.optNode) {
      // option ends previous option
      this.complete();

      return [null].concat(this.parent.consumeOpt(opt));
    }

    let name: string;
    let value: string;
    let verbatim: string;
    let dashes: number;

    if (opt.startsWith("--no-")) {
      name = opt.substring(5);
      value = "false";
      verbatim = "no-";
    } else {
      dashes = opt.startsWith("--") ? 2 : 1;
      name = opt.substring(dashes);

      const eqX = name.indexOf("=");
      if (eqX > 0) {
        value = verbatim = name.substring(eqX + 1);
        name = name.substring(0, eqX);
      }

      if (dashes === 1 && name.length > 1) {
        const singleOpts = name.split("").slice(0, name.length - 1);
        for (const f of singleOpts) {
          this.setOptValue({ name: f, value: undefined, verbatim: f, dashes, arg: opt }, true);
        }
        name = name[name.length - 1];
      }
    }

    return this.makeOptNode({ name, value, verbatim, dashes, arg: opt });
  }

  /**
   *
   * @param data
   * @returns
   */
  makeOptNode(data: OptionMatch): ClapNodeGenerator[] {
    const optNode = this.setOptValue(data);
    const builder = new ClapNodeGenerator(optNode, this);
    const minArg = data.value ? 1 : 0;
    if (!(optNode.option.args.length > minArg)) {
      builder.complete();
    }

    return [builder];
  }

  /**
   *
   */
  private optEndGatherArgs() {
    const node = this.optNode;
    const opt = node.option;
    const args = opt.args;

    assert(
      this.node.argsList && this.node.argsList.length >= opt.needArgs,
      `Not enough arguments for option '${opt.name}'`
    );

    const setArg = (argIx: number, arg: ArgInfo, value: string | string[]) => {
      const setValue = Array.isArray(value)
        ? value.map(v => this.convertValue(arg.type, v, opt))
        : this.convertValue(arg.type, value, opt);

      if (arg.name) {
        node.argsMap[arg.name] = setValue;
      }
      node.argsMap[argIx] = setValue;
    };

    if (opt.hasArgs) {
      for (let i = 0; i < args.length && i < node.argsList.length; i++) {
        setArg(i, args[i], node.argsList[i]);
      }
    } else {
      node.argsMap[0] =
        node.argsList.length > 0
          ? this.convertValue("boolean", node.argsList[0], opt)
          : (true as any);
    }

    if (opt.isVariadicArgs) {
      const lastIx = args.length - 1;
      if (node.argsList.length > lastIx) {
        setArg(lastIx, args[lastIx], node.argsList.slice(lastIx));
      }
    }
  }

  /**
   *
   */
  private cmdEndGatherArgs() {
    const node = this.cmdNode;
    const cmd = node.cmdSpec;
    const args = cmd.args;

    assert(
      this.node.argsList && this.node.argsList.length >= cmd.needArgs,
      `Not enough arguments for command '${cmd.name}'`
    );

    const setArg = (argIx: number, arg: ArgInfo, value: any) => {
      const setValue = Array.isArray(value)
        ? value.map(v => this.convertValue(arg.type, v, cmd))
        : this.convertValue(arg.type, value, cmd);

      if (arg.name) {
        node.argsMap[arg.name] = setValue;
      }
      node.argsMap[argIx] = setValue;
    };

    for (let i = 0; i < args.length && i < node.argsList.length; i++) {
      setArg(i, args[i], node.argsList[i]);
    }

    if (cmd.isVariadicArgs) {
      const lastIx = args.length - 1;
      if (node.argsList.length > lastIx) {
        setArg(lastIx, args[lastIx], node.argsList.slice(lastIx));
      }
    }
  }

  /**
   * End a node from gathering arguments.
   *
   * For command, these conditions will end gathering:
   * 1. Required args all gathered
   * 2. A new valid sub command found
   * 3. User explicitly terminates command with `-.`
   *
   * For option:
   * 1. Required args all gathered
   * 2. Encounter a new option, including `-.`
   */
  endArgGathering() {
    if (this.status === 0) {
      this.status = BUILDER_STATUS_GATHER_END;
      if (this.cmdNode) {
        this.cmdEndGatherArgs();
      } else {
        this.checkAutoBooleanOption(">");
        this.optEndGatherArgs();
      }
    }
  }

  /**
   *
   */
  completeOpt() {}

  /**
   *
   */
  completeCmd() {}

  complete() {
    this.endArgGathering();
    if (this.status !== BUILDER_STATUS_COMPLETE) {
      this.status = BUILDER_STATUS_COMPLETE;
      if (this.cmdNode) {
        // this is a command node
        this.completeCmd();
      } else {
        this.completeOpt();
      }
    }
  }

  get isComplete(): boolean {
    return this.status === BUILDER_STATUS_COMPLETE;
  }
}
