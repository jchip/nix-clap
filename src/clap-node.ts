/**
 * Represents a node in a command-line application parser.
 *
 * @remarks
 * This class is used to represent commands or options in a CLI application. Each node can have a parent node,
 * which represents a hierarchical relationship (e.g., command -> sub-command, option).
 *
 * @example
 * ```typescript
 * const rootNode = new ClapNode('root', 'rootAlias');
 * const childNode = new ClapNode('child', 'childAlias', rootNode);
 * rootNode.addArg('arg1');
 * childNode.addError(new Error('An error occurred'));
 * ```
 *
 * @public
 */
export class ClapNode {
  /**
   * command/option name
   */
  name: string;
  /**
   * Holds the name used in CLI to create the node, in case an alias was used.  It could be
   * the same as name.
   */
  alias: string;
  /**
   * arguments for this node
   */
  argsList: string[];
  argsMap: Record<string, string | string[]>;
  /**
   * Parent node (command -> sub command, option)
   */
  _parent?: ClapNode;
  _prev?: ClapNode;
  _next?: ClapNode;

  private _errors: Error[];
  /**
   *
   * @param name - idiomatic name of the command
   * @param inputName - name that was specified by user to trigger this command
   * @param parent
   */
  constructor(name: string, alias: string, parent?: ClapNode) {
    this.name = name;
    this.alias = alias;
    this.argsList = [];
    this.argsMap = {};
    if (parent) {
      this._parent = parent;
    }
    this._errors = [];
  }

  /**
   * Add an arg to this node
   * @param arg
   * @returns
   */
  addArg(arg: string) {
    this.argsList.push(arg);
  }

  addError(e: Error) {
    this._errors.push(e);
  }

  get hasErrors() {
    return this._errors.length > 0;
  }

  get error() {
    return this._errors[0];
  }

  get errors() {
    return this._errors;
  }

  get parent(): ClapNode {
    return this._parent;
  }

  getParent<T extends ClapNode = ClapNode>(): T {
    return this.parent as T;
  }
}
