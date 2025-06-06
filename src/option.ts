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
export class Option extends CliBase<OptionSpec> {
  help: string;
  type: string;
  constructor(name: string, optSpec: OptionSpec) {
    const specCopy = dup(optSpec);
    super(name, specCopy);
    this.processArgs();
    if (this.expectArgs === 0) {
      this.type = "";
    } else if (this.expectArgs === 1) {
      this.type = this.args[0].type;
    } else {
      this.type = `${this.args[0].type} ..`;
    }
    this.help = [`--${name}`]
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
}

class UnknownOption extends Option {
  get unknown(): boolean {
    return true;
  }
}

export const optUnknown = new UnknownOption("", {});
