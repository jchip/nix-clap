import { ClapNode } from "./clap-node.ts";
import { CommandBase } from "./command-base.ts";
import { CommandMeta } from "./command-meta.ts";
import { OptionNode } from "./option-node.ts";
import { ClapNodeGenerator, OptionSource } from "./node-generator.ts";
import { camelCase } from "./xtil.ts";
import { _PARENT } from "./symbols.ts";
import { isRootCommand } from "./base.ts";

/**
 * Object representation for an instance of a command on the CLI
 */

export class CommandNode extends ClapNode {
  /**
   * sub command nodes
   */
  subCmdNodes: Record<string, CommandNode>;
  /**
   * Associated Command data
   */
  cmdBase: CommandBase;
  /**
   * If this is a command node, then it can have options
   */
  optNodes: Record<string, OptionNode>;
  optCount: Record<string, number>;
  /**
   * Command consumes all remaining arguments blindly
   */
  isGreedy: boolean;

  _jsonMeta?: CommandMeta;

  constructor(name: string, alias: string, cmdBase?: CommandBase) {
    super(name, alias);
    this.argv.push(name);
    this.cmdBase = cmdBase;
    this.subCmdNodes = {};
    this.optNodes = {};
    this.optCount = {};
    this.isGreedy = false;
  }

  /** get the options with full values for this command */
  get options() {
    return this.jsonMeta.optsFull;
  }

  /** get the options for this command */
  get opts() {
    return this.jsonMeta.opts;
  }

  /** get the arguments for this command */
  get args() {
    return this.jsonMeta.args;
  }

  get source() {
    return this.jsonMeta.source;
  }

  get optsFull() {
    return this.jsonMeta.optsFull;
  }

  get subCommands() {
    return this.jsonMeta.subCommands;
  }

  getParent<T extends ClapNode = CommandNode>(): T {
    return super.getParent();
  }

  /**
   * Get the root command by traversing up the parent chain until no more parent exists.
   * @returns The root CommandNode
   */
  get rootCmd(): CommandNode {
    let current: CommandNode = this;
    while (current.getParent()) {
      current = current.getParent();
    }
    return current;
  }

  /**
   * Get array of all commands that have exec callback
   *
   * Root command execution is handled specially:
   * - This method filters out the root command (returns false for isRootCommand)
   * - Root command execution is determined by _shouldExecuteRootCommand() in nix-clap.ts
   * - Root command is executed in runExec/runExecAsync methods when conditions are met
   *
   * @param cmds - Array to accumulate command nodes with exec handlers
   * @param includeSubCommands - Whether to recursively include sub-commands
   * @returns Array of command nodes that have exec handlers (excluding root command)
   */
  getExecCommands(cmds: CommandNode[], includeSubCommands: boolean): CommandNode[] {
    // Don't include root command exec in automatic execution list
    // Root command exec is handled separately in:
    // - NixClap._shouldExecuteRootCommand() - determines if root should execute
    // - NixClap.runExec() / runExecAsync() - performs the actual execution
    if (this.cmdBase.exec && !isRootCommand(this.alias)) {
      cmds.push(this);
    }
    if (includeSubCommands) {
      for (const _key in this.subCmdNodes) {
        this.subCmdNodes[_key].getExecCommands(cmds, includeSubCommands);
      }
    }
    return cmds;
  }

  getBreadCrumb() {
    let parent = this;
    const nodes = [];
    while (parent && (parent = parent.getParent())) {
      nodes.push(parent);
    }
    return nodes.reverse().concat(this);
  }

  /**
   * Invoke the command's exec handler
   *
   * @param includeSubCommands - if true, then also do sub commands
   */
  invokeExec(includeSubCommands: boolean) {
    let count = 0;
    const cmds = this.getExecCommands([], includeSubCommands);

    for (const cmd of cmds) {
      cmd.cmdBase.exec(cmd, cmd.getBreadCrumb());
      count++;
    }

    return count;
  }

  /**
   *
   * @param includeSubCommands
   * @returns
   */
  async invokeExecAsync(includeSubCommands: boolean): Promise<number> {
    let count = 0;
    const cmds = this.getExecCommands([], includeSubCommands);

    for (const cmd of cmds) {
      await cmd.cmdBase.exec(cmd, cmd.getBreadCrumb());
      count++;
    }

    return count;
  }

  /**
   * Add a sub command to this node
   * @param name
   * @returns node for the new command
   */
  addCommandNode(node: CommandNode) {
    node[_PARENT] = this;
    this.subCmdNodes[node.name] = node;
    return node;
  }

  getErrorNodes(errorNodes: ClapNode[] = []): ClapNode[] {
    if (this.hasErrors) {
      errorNodes.push(this);
    }

    for (const _key in this.optNodes) {
      const _optNode = this.optNodes[_key];
      if (_optNode.hasErrors) {
        errorNodes.push(_optNode);
      }
    }

    for (const _key in this.subCmdNodes) {
      this.subCmdNodes[_key].getErrorNodes(errorNodes);
    }

    return errorNodes;
  }

  /**
   * Add a option to this node
   * @param name
   * @returns node for the new option
   */
  addOptionNode(node: OptionNode) {
    node[_PARENT] = this;
    const name = node.option.name || node.name;

    this.optNodes[name] = node;
    if (!this.optCount[name]) {
      this.optCount[name] = 0;
    }
    this.optCount[name]++;

    return node;
  }

  removeOptionNode(name: string) {
    if (this.optNodes[name]) {
      delete this.optNodes[name];
      delete this.optCount[name];
    }
  }

  /**
   *
   */
  applyDefaults(): void {
    for (const optName in this.optNodes) {
      this.optNodes[optName].applyDefaults();
    }

    const options = this.cmdBase.options._options;
    // for any option that was not specified in command line or config, if it has argDefault then add it
    for (const optName in options) {
      const opt = options[optName];
      if (opt.spec.hasOwnProperty("argDefault") && !this.optNodes[optName]) {
        new ClapNodeGenerator(this).addOptionWithArgs(optName, [].concat(opt.spec.argDefault), opt);
      }
    }

    for (const subCmdName in this.subCmdNodes) {
      this.subCmdNodes[subCmdName].applyDefaults();
    }
  }

  /**
   * Allow you to apply extra config to the parsed object, overriding any `opts` with `source` not start with `cli`.
   *
   * For example, you can allow user to specify options in their `package.json` file, and apply those after the command line is parsed.
   * @param config - Config object containing user options config
   * @param src - Name of the source that provided the config.  Default to `user`
   * @returns
   */
  applyConfig(config: Record<string, any>, src: OptionSource = "user") {
    for (const key in config) {
      const data = {
        name: key,
        value: config[key],
        verbatim: config[key],
        arg: config[key],
        dashes: 0
      };
      const matchOpt = this.cmdBase.options.match(data);
      if (matchOpt) {
        const optNode = this.optNodes[matchOpt.name];
        if (!optNode || !optNode.source.startsWith("cli")) {
          this.removeOptionNode(matchOpt.name);
          new ClapNodeGenerator(this).addOptionWithArgs(
            matchOpt.name,
            [].concat(data.arg),
            matchOpt.option,
            src
          );
        }
      } else if (!this.optNodes[key]) {
        new ClapNodeGenerator(this).addOptionWithArgs(key, [].concat(data.arg), undefined, src);
      }
    }
  }

  /**
   * For options that has names with - in them, add it using its name converted to camelCase.
   */
  makeCamelCaseOptions() {
    for (const key in this.optNodes) {
      const camelCaseKey = camelCase(key);
      if (camelCaseKey !== key && !this.optNodes[camelCaseKey]) {
        this.optNodes[camelCaseKey] = this.optNodes[key];
        this.optCount[camelCaseKey] = this.optCount[key];
      }
    }
    for (const key in this.subCmdNodes) {
      this.subCmdNodes[key].makeCamelCaseOptions();
    }
  }

  /**
   * check for missing options that are required
   *
   * @param missing
   * @returns
   */
  checkRequiredOptions(missing = []) {
    const _opts = this.cmdBase.options._options;
    for (const name in _opts) {
      const opt = _opts[name];
      if (opt.spec.required) {
        if (!this.optNodes[name]) {
          missing.push(name);
        }
      }
    }

    for (const kCmd in this.subCmdNodes) {
      this.subCmdNodes[kCmd].checkRequiredOptions(missing);
    }

    return missing;
  }

  get jsonMeta(): CommandMeta {
    if (this._jsonMeta) {
      return this._jsonMeta;
    }

    const opts = {};
    const optsFull = {};

    const source = {};
    for (const name in this.optNodes) {
      const variants = [name];
      const node = this.optNodes[name];

      if (node.alias && name !== node.alias) {
        variants.push(node.alias);
      }
      for (const _name of variants) {
        if (node.option.isSingleArg) {
          opts[_name] = node.argsMap[0];
          // opts[name] = node.argsMap;
        } else if (node.option.isCounting) {
          opts[_name] = this.optCount[node.option.name];
        } else if (!node.option.hasArgs) {
          opts[_name] = node.argsMap[0];
        } else {
          opts[_name] = node.argsMap;
        }
        optsFull[_name] = node.argsMap;
        source[_name] = this.optNodes[name].source;
      }
    }

    const subCommands = {};
    for (const name in this.subCmdNodes) {
      subCommands[name] = this.subCmdNodes[name].jsonMeta;
    }

    const meta: CommandMeta = {
      name: this.name,
      alias: this.alias,
      argList: this.argsList,
      args: this.argsMap,
      opts,
      optsFull,
      optsCount: this.optCount,
      source,
      verbatim: {},
      subCommands
    };

    this._jsonMeta = meta;
    return meta;
  }
}
