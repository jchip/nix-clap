import { BaseSpec, CliBase } from "./base.ts";
import { dup, prefixOption } from "./xtil.ts";

export const SUPPORT_TYPES = ["count", "string", "number", "float", "boolean"];
export const OPTION_FIELDS = {
  alias: ["string", "array"],
  type: ["string"],
  desc: ["string", "function"],
  describe: ["string", "function"],
  description: ["string", "function"],
  default: [],
  require: ["boolean"],
  requireArg: ["boolean"],
  allowCmd: ["array"],
  customTypes: ["object"]
};

/**
 * Option Spec
 */
export interface OptionSpec extends BaseSpec {
  /**
   * Enable counting how many times an option was specified in the command line.
   * The value is the maximum number of times the option can be specified.
   */
  counting?: number;
  // Add any option-specific properties here
  // For example:
  // shortFlag?: string;
  // longFlag?: string;
}

/**
 *
 */
// export type OptionData = {
//   name: string;
//   value: string;
//   verbatim: string;
//   dashes: number;
// };

/**
 * The class to represent an CLI Option from the specification of an option
 */
export class OptionBase extends CliBase<OptionSpec> {
  help: string;
  type: string;
  constructor(name: string, optSpec: OptionSpec) {
    const specCopy = dup(optSpec);
    super(name, specCopy);
    this.processArgs();
    this.type = this._buildTypeString();
    this.help = this._buildHelpString(name, optSpec);
  }

  /**
   * Builds the type string for display in help text.
   * Returns empty string for no args, single type for one arg, or "type .." for variadic.
   */
  private _buildTypeString(): string {
    if (this.expectArgs === 0) {
      return "";
    } else if (this.expectArgs === 1) {
      return this.args[0].type;
    } else {
      return `${this.args[0].type} ..`;
    }
  }

  /**
   * Builds the help string showing option name and aliases.
   * Format: "--name, -a, --alias"
   */
  private _buildHelpString(name: string, optSpec: OptionSpec): string {
    return [`--${name}`]
      .concat(
        []
          .concat(optSpec.alias)
          .filter(x => x)
          .map(prefixOption)
      )
      .join(", ");
  }

  get isCounting() {
    return this.spec.counting !== undefined;
  }

  get cliType(): string {
    return "option";
  }

  get unknown(): boolean {
    return false;
  }

  get isUnknown(): boolean {
    return false;
  }
}

class UnknownOption extends OptionBase {
  get unknown(): boolean {
    return true;
  }

  get isUnknown(): boolean {
    return true;
  }
}

export const optUnknown = new UnknownOption("", {});
