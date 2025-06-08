import { rootCommandName } from "./base.ts";
import { ClapNode } from "./clap-node.ts";
import { NixClap } from "./nix-clap.ts";
import { ClapNodeGenerator } from "./node-generator.ts";
import { CommandNode } from "./command-node.ts";
import { _NEXT, _PREV } from "./symbols.ts";

/**
 * Represents the result of parsing command-line arguments.
 *
 *
 * @property {any} source - The source of the parsed arguments.
 * @property {any[]} commands - An array of parsed commands.
 * @property {any} opts - The parsed options.
 * @property {any} optCmd - The parsed optional command.
 * @property {any} verbatim - The verbatim arguments.
 * @property {NixClap} nixClap - The NixClap instance used for parsing.
 * @property {any} [_] - Remaining arguments that were not consumed due to the `--` terminating option.
 * @property {any} [error] - Any error encountered during parsing.
 * @property {number} [index] - The index at which parsing stopped.
 */
export type ParsedResult = {
  source: any;
  commands: any[];
  opts: any;
  optCmd: any;
  verbatim: any;
  nixClap: NixClap;
  /**
   * Remaining argv that were not consumed due to the `--` terminating option
   */
  _?: any;
  error?: any;
  index?: number;
};

/**
 * The `Parser` class is responsible for parsing command-line arguments
 * and building a command tree structure.
 *
 * @class
 * @description
 * This class provides functionality to parse command-line arguments into a structured
 * representation of commands, options, and their values. It uses a tree-like structure
 * to represent nested commands and their associated options.
 *
 * @remarks
 * - The parser works with an instance of `NixClap` to handle the actual parsing logic.
 * - It maintains a list of `ClapNode` objects to represent the parsed structure.
 * - The parsing process is managed using a stack of `ClapNodeBuilder` instances.
 * - Error handling is implemented to catch and store parsing errors within the relevant nodes.
 *
 * @example
 * ```typescript
 * const nixClap = new NixClap();
 * const parser = new Parser(nixClap);
 * const { command, index } = parser.parse(process.argv, 2);
 * // Now `command` contains the root of the parsed command tree
 * ```
 */
export class Parser {
  /**
   * An instance of the NixClap class used for parsing command-line arguments.
   * This private member variable is utilized internally within the parser.
   *
   * @private
   */
  private _nc: NixClap;
  /**
   * An array of command-line arguments passed to the application.
   * This is typically populated from the process.argv array.
   *
   * @private
   */
  private _argv: string[];
  /**
   * A private array of ClapNode objects that represents the list of nodes
   * managed by the parser.
   *
   * @private
   * @type {ClapNode[]}
   */
  private _nodeList: ClapNode[];

  /**
   * Creates an instance of the parser.
   *
   * @param nc - An instance of NixClap.
   */
  constructor(nc: NixClap) {
    this._nc = nc;
    this._nodeList = [];
  }

  /**
   * A stack of `ClapNodeBuilder` instances used to build the structure of the parsed command-line arguments.
   * This stack helps in managing nested command structures and ensures that the correct hierarchy is maintained.
   */
  private _builderStack: ClapNodeGenerator[];

  /**
   * Adds a node to the list of nodes. If the list is not empty, it sets the
   * previous node's `_next` property to the current node and the current node's
   * `_prev` property to the previous node.
   *
   * @param node - The node to be added to the list.
   */
  private _addNodeToList(node: ClapNode) {
    if (this._nodeList.length > 0) {
      const l = this._nodeList.at(-1);  
      Object.defineProperty(node, _PREV, {
        value: l,
        configurable: true,
        enumerable: false,
        writable: true,
      });
      Object.defineProperty(l, _NEXT, {
        value: node,
        configurable: true,
        enumerable: false,
        writable: true,
      });
    }

    this._nodeList.push(node);
  }

  /**
   * Consumes the next argument and processes it using the current builder.
   *
   * If the argument is not an option (does not start with a "-"), it is processed as a non-option.
   * Otherwise, it is processed as an option.
   *
   * Depending on the result of the processing, the builder stack is updated:
   * - If the builder returns `null`, it is removed from the stack.
   * - If the builder is not complete, it is pushed back onto the stack.
   *
   * @param arg - The argument to be consumed and processed.
   */
  private _consumeNext(arg: string) {
    const builder = this._builderStack.at(-1);

    const rets = !(arg[0] === "-")
      ? // not an option
      builder.consumeNonOpt(arg)
      : // an option
      builder.consumeOpt(arg);

    for (const _builder of rets) {
      if (_builder === null) {
        this._builderStack.pop();
      } else {
        this._addNodeToList(_builder.node);
        if (!_builder.isComplete) {
          this._builderStack.push(_builder);
        }
      }
    }
  }

  /**
   * Parses the given command-line arguments starting from the specified index.
   *
   * This method processes the provided command-line arguments and builds a command tree structure.
   * It handles both options and non-option arguments, and can work with nested command structures.
   *
   * @param {string[]} argv - The array of command-line arguments to parse.
   * @param {number} start - The index in the argv array from which to start parsing.
   * @param {CommandNode} [command] - An optional root command node to start parsing with.
   *                                  If not provided, a new root CommandNode will be created.
   *
   * @returns {{ command: CommandNode; index: number }} An object containing:
   *   - command: The root CommandNode of the parsed command tree.
   *   - index: The index in the argv array at which parsing ended.
   *
   * @throws {Error} Catches and stores any errors encountered during parsing in the command node's errors array.
   *
   * @remarks
   * - The method uses a stack of ClapNodeBuilder instances to manage the parsing process.
   * - It handles the '--' terminator, which signals the end of options.
   * - Any errors encountered during parsing are caught and stored in the relevant command node's errors array.
   * - After processing all arguments, it completes any remaining builders in the stack.
   */
  parse(
    argv: string[],
    start: number,
    command?: CommandNode
  ): { command: CommandNode; index: number } {
    this._argv = argv;

    const rootNode =
      command || new CommandNode(rootCommandName, rootCommandName, this._nc._rootCommand);

    this._addNodeToList(rootNode);

    let _index = start;

    this._builderStack = [new ClapNodeGenerator(rootNode)];

    while (_index < argv.length) {
      const arg = this._argv[_index];
      _index++;
      if (arg === "--") {
        break;
      }
      try {
        this._consumeNext(arg);
      } catch (e) {
        this._builderStack.at(-1).node.errors.push(e);
      }
    }

    try {
      let builder = this._builderStack.at(-1);
      while (builder) {
        builder.complete();
        builder = builder.parent;
      }
    } catch (e) {
      rootNode.errors.push(e);
    }

    return { command: rootNode, index: _index };
  }
}
