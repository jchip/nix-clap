import assert from "assert";
import { Command } from "./command.ts";
import { Option, OptionSpec } from "./option.ts";
import { cbOrVal, dup, fitLines, objEach } from "./xtil.ts";

/**
 * `Record<string, OptionSpec>`
 */
export type GroupOptionSpec = Record<string, OptionSpec>;

/**
 * Represents a matched option from the command-line arguments.
 *
 * @property {string} name - The name of the option.
 * @property {string} [alias] - An optional alias for the option.
 * @property {string} value - The value associated with the option.
 * @property {string} verbatim - The verbatim string of the option as it appeared in the input.
 * @property {string} arg - The argument associated with the option.
 * @property {number} dashes - The number of dashes used to prefix the option.
 * @property {Option} [option] - An optional reference to the Option object.
 */
export type OptionMatch = {
  name: string;
  alias?: string;
  value: string;
  verbatim: string;
  arg: string;
  dashes: number;
  option?: Option;
};

/**
 * The `Options` class is responsible for managing and processing command-line options.
 * It handles the specification data for options, including creating instances of options,
 * managing aliases, and generating help text for the options.
 *
 * @remarks
 * This class is designed to work with a command-line interface, providing functionality
 * to match provided option data against available options and aliases, and to generate
 * formatted help text for the options.
 *
 * @example
 * ```typescript
 * const options = new Options(specGroup, command);
 * const matchedOption = options.match(optionData);
 * const helpText = options.makeHelp();
 * ```
 *
 * @public
 */
export class Options {
  /**
   * Represents the specification data for a group option.
   * This data is used to define the properties and behavior of the option.
   */
  specData: GroupOptionSpec;
  /** number of options specified */
  count: number;
  _options: Record<string, Option>;
  _optAlias: Record<string, string>;
  command: Command;

  constructor(specGroup: GroupOptionSpec, cmd: Command) {
    this.specData = dup(specGroup);
    this._optAlias = {};
    this._options = {};
    this.command = cmd;
    this.processSpecData();
  }

  /**
   * Processes the specification data for options.
   *
   * This method iterates over the `specData` object, creating new `Option` instances
   * for each entry and storing them in the `_options` property. It also handles
   * aliases for options, ensuring that each alias is unique and not already used
   * by another option.
   *
   * @throws {Error} If an alias is already used by another option.
   */
  processSpecData() {
    this.count = 0;
    objEach(this.specData, (_spec: OptionSpec, name: string) => {
      this.count++;
      this._options[name] = new Option(name, _spec);

      if (_spec.alias) {
        if (!Array.isArray(_spec.alias)) {
          _spec.alias = [_spec.alias];
        }
        _spec.alias.forEach(a => {
          assert(
            !this._optAlias.hasOwnProperty(a),
            `Init command ${this.command.name} failed - Option alias ${a} already used by option ${this._optAlias[a]}`
          );
          this._optAlias[a] = name;
        });
      }
    });
  }

  /**
   * Matches the provided option data against the available options and aliases.
   *
   * @param data - The option data to match.
   * @returns The matched option data with updated name and alias, or `false` if no match is found.
   */
  match(data: OptionMatch): OptionMatch | false {
    const alias = data.name;
    let name: string;
    let option = this._options[alias];

    if (option) {
      name = alias;
    } else if (this._optAlias[alias]) {
      name = this._optAlias[alias];
      option = this._options[name];
    } else {
      return false;
    }

    return { ...data, name, alias: alias, option };
  }

  /**
   * Finds the length of the longest help text among all options.
   *
   * @returns {number} The length of the longest help text.
   */
  findLongestOptionHelpText(): number {
    let max = 0;
    objEach(this._options, (opt: Option) => {
      max = Math.max(opt.help.length, max);
    });
    return max;
  }

  /**
   * Generates a help text for the available options.
   *
   * This method constructs a formatted help text by iterating over the available options,
   * appending their descriptions, types, and default values if applicable. The help text
   * is formatted to fit within a specified width.
   *
   * @returns {string[]} An array of strings representing the formatted help text.
   */
  makeHelp(): string[] {
    const width = this.findLongestOptionHelpText();
    let help = [];
    objEach(this._options, (opt: Option) => {
      const tail = [];
      if (opt.type) {
        tail.push(`[${opt.type}]`);
      }

      if (opt.spec.argDefault && opt.isSingleArg) {
        tail.push(`[default: ${JSON.stringify(opt.spec.argDefault)}]`);
      }
      const desc = (cbOrVal(opt.spec.desc) || "").trim();
      const strs = [opt.help, ` ${desc}`, tail.filter(x => x).join(" ")];
      help = help.concat(fitLines(strs, "  ", "    ", width, 80));
    });

    return help;
  }
}
