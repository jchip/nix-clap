import { ClapNode } from "./clap-node.ts";
import { Command } from "./command.ts";
import { CommandMeta } from "./command-meta.ts";
import { OptionNode } from "./option-node.ts";
import { ClapNodeGenerator, OptionSource } from "./node-generator.ts";
import { camelCase } from "./xtil.ts";

/**
 * Object representation for an instance of a command on the CLI
 */

export class CommandNode extends ClapNode {
  /**
   * sub command nodes
   */
  cmdNodes: Record<string, CommandNode>;
  /**
   * Associated Command data
   */
  cmdSpec: Command;
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

  constructor(name: string, alias: string, cmd?: Command) {
    super(name, alias);
    this.cmdSpec = cmd;
    this.cmdNodes = {};
    this.optNodes = {};
    this.optCount = {};
    this.isGreedy = false;
  }

  options() {
    return this.jsonMeta.optsFull;
  }

  opts() {
    return this.jsonMeta.opts;
  }

  getParent<T extends ClapNode = CommandNode>(): T {
    return super.getParent();
  }

  /**
   * Get array of all commands that have exec callback
   *
   * @param cmds
   * @returns
   */
  getExecCommands(cmds: CommandNode[], includeSubCommands: boolean): CommandNode[] {
    if (this.cmdSpec.exec) {
      cmds.push(this);
    }
    if (includeSubCommands) {
      for (const _key in this.cmdNodes) {
        this.cmdNodes[_key].getExecCommands(cmds, includeSubCommands);
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
      cmd.cmdSpec.exec(cmd, cmd.getBreadCrumb());
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
      await cmd.cmdSpec.exec(cmd, cmd.getBreadCrumb());
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
    node._parent = this;
    this.cmdNodes[node.name] = node;
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

    for (const _key in this.cmdNodes) {
      this.cmdNodes[_key].getErrorNodes(errorNodes);
    }

    return errorNodes;
  }

  /**
   * Add a option to this node
   * @param name
   * @returns node for the new option
   */
  addOptionNode(node: OptionNode) {
    node._parent = this;
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

    const options = this.cmdSpec.options._options;
    // add any option with argDefault that was not specified
    for (const optName in options) {
      const opt = options[optName];
      if (opt.spec.argDefault && !this.optNodes[optName]) {
        new ClapNodeGenerator(this).addOptionWithArgs(optName, [].concat(opt.spec.argDefault), opt);
      }
    }

    for (const subCmdName in this.cmdNodes) {
      this.cmdNodes[subCmdName].applyDefaults();
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
      const matchOpt = this.cmdSpec.options.match(data);
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
    for (const key in this.cmdNodes) {
      this.cmdNodes[key].makeCamelCaseOptions();
    }
  }

  /**
   * check for missing options that are required
   *
   * @param missing
   * @returns
   */
  checkRequiredOptions(missing = []) {
    const _opts = this.cmdSpec.options._options;
    for (const name in _opts) {
      const opt = _opts[name];
      if (opt.spec.required) {
        if (!this.optNodes[name]) {
          missing.push(name);
        }
      }
    }

    for (const kCmd in this.cmdNodes) {
      this.cmdNodes[kCmd].checkRequiredOptions(missing);
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
    for (const name in this.cmdNodes) {
      subCommands[name] = this.cmdNodes[name].jsonMeta;
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
