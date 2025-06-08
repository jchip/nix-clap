import assert from "assert";
import { validParseInt } from "./xtil.ts";
import { OptionMatch } from "./options.ts";

const SUPPORT_TYPES = ["number", "string", "float", "boolean"];

export const rootCommandName = "~root-command~";

export const isRootCommand = (name: string) => name === rootCommandName;

export type BaseArgTypes = string | number | boolean;

export type CoercionFunc = (value: string) => any;

/**
 * Error thrown when an invalid argument specifier is encountered.
 *
 * @extends {Error}
 */
export class InvalidArgSpecifierError extends Error {
  arg: string;
  constructor(msg: string, arg = "") {
    super(msg);
    this.arg = arg;
  }
}

/**
 * User provided an option that's unknown
 */
export class UnknownOptionError extends Error {
  data: OptionMatch;
  constructor(msg: string, data: OptionMatch) {
    super(msg);
    this.data = data;
  }
}

/**
 * User provided an cli argument that's unknown
 */
export class UnknownCliArgError extends Error {
  arg: string;
  constructor(msg: string, arg: string) {
    super(msg);
    this.arg = arg;
  }
}

/**
 * Represents the base specification for an option or command.
 */
export type BaseSpec = {
  /**
   * name of the option or command
   */
  name?: string;
  /**
   * Aliases for the option or command.
   * Can be a single string or an array of strings.
   */
  alias?: string | string[];

  /**
   * Description of the option or command.
   */
  desc?: string;

  /**
   * Indicates whether the command/option is required.
   * If true, the command/option must be specified.
   */
  required?: boolean;

  /**
   * Specifies arguments for the command or option.
   *
   * - **Format**: `"<name type>"` or `"[name type]"`. **Types**: `number`, `string`, `boolean`, and `float`.
   *   - `<>` denotes a required argument, while `[]` denotes an optional argument.
   *     - All required arguments must precede optional arguments.
   *   - The default type is `string` and can be omitted, e.g., `"<name>"`. A blank space omits name,
   *     e.g., `"< string>"`. Both can be omitted, e.g., `<>`.
   *   - Examples: `"<arg string>"`, `"[arg number]"`, or `"<arg1 boolean> <arg2 string>"`.
   * - Array arguments: specify with `..N` or `..`
   *   - Fixed size array: `"<arg string..3>"` or `"<..3>"` means 3 arguments are required.
   *   - Variadic size array: `"<..>"` for 0 to many; `"<..1,>"` or `"<..1,Inf>"` for 1 to many, indicating at least 1 is required.
   *     - Only the last argument can be variadic.
   */
  args?: string;

  /**
   * Default argument values for the option or command.
   *
   * After parsing, the parser applies this accordingly:
   * - For options: if the user didn't specify the option, the parser will automatically add the option with the default value.
   * - For commands: if the user specifies the command without any arguments.
   *
   * The `source` will be `"default"`.
   */
  argDefault?: string | string[];

  /**
   * Specifies coercion handlers for custom types.
   *
   * The handler can be one of:
   * - A function: the return value will be taken as the argument value.
   * - A RegExp: if matched, the first entry from the matched result will be used as the argument value.
   * - A string: the string will be used as the argument value.
   *
   * Example:
   * ```js
   * {
   *   myCustomType: (value) => value.toLowerCase()
   * }
   * ```
   */
  coercions?: Record<string, CoercionFunc | RegExp | string>;
};

export type ArgInfo = {
  name: string;
  type: string;
  variadic: boolean;
  required: boolean;
  min: number;
  max: number;
};

/**
 * The base class for objects to represent the processed specification of a
 * CLI command or option.
 */
export class CliBase<TSpec extends BaseSpec> {
  /** The name of the command or option */
  name: string;

  /** Array of argument information for the command or option */
  args: ArgInfo[];

  /** The original specification provided for the command or option */
  spec: TSpec;

  /** The number of required arguments */
  needArgs: number;

  /** The total number of expected arguments (required + optional) */
  expectArgs: number;

  /** Information about variadic arguments, if any */
  variadic?: { min: number; max: number };

  /**
   * Creates a new CliBase instance.
   * @param name - The name of the command or option
   * @param spec - The specification for the command or option
   */
  constructor(name: string, spec: TSpec) {
    this.name = name;
    this.args = [];
    this.spec = spec;
    this.needArgs = 0;
    this.expectArgs = 0;
  }

  /** Indicates whether this command or option has a single argument */
  get isSingleArg() {
    return this.args.length === 1;
  }

  /** Indicates whether this command or option has any arguments */
  get hasArgs() {
    return this.args.length > 0;
  }

  /** Returns the CLI type (e.g., "command" or "option") */
  get cliType(): string {
    return "command";
  }

  /** Indicates whether this command or option has variadic arguments */
  get isVariadicArgs(): boolean {
    return !!this.variadic;
  }

  /**
   * Processes the argument specification string and populates the args array.
   * @throws {InvalidArgSpecifierError} If the argument specification is invalid
   */
  processArgs() {
    const spec = this.spec;
    const args = spec.args;
    if (!args) {
      return;
    }

    let seenOptional: string;
    //
    // check "<arg1> <arg2> [arg3]"
    //
    args.replace(/([<[])([^>\]]*)([>\]])/g, (a, mark, xname: string) => {
      assert(
        !this.variadic,
        `For args specifier of '${this.name}', only the last one can be variadic`
      );
      // "[string foo..1,3]"

      //   xname = xname.trim();
      const xm = xname.match(/([^\. ]+)?( +)?([^\.]+)?(\.\.+)?([^\.,]*)?( *, *)?([^\.]+)?$/);
      assert(
        xm,
        new InvalidArgSpecifierError(`Invalid args specifier '${xname}' for '${this.name}'`)
      );

      let variadic: boolean;
      let min = 1;
      let max = 1;
      const name = xm[1]; // "a b..1,3" <-- "a"
      const type = xm[3] || "string"; // "a b..1,3" <-- "b"
      assert(
        SUPPORT_TYPES.indexOf(type) >= 0 || spec.coercions?.hasOwnProperty(type),
        new InvalidArgSpecifierError(
          `${this.cliType} ${this.name} - unknown type '${type}' for argument '${a}'`,
          args
        )
      );

      if (xm[5]) {
        // "a b..1,3" : "1"
        min = max = validParseInt(xm[5], 0);
        if (xm[7]) {
          // "a b..1,3" : "3"
          max = validParseInt(xm[7], min);
        } else if (xm[6]) {
          // "a b..1,3" : ","
          max = Infinity;
        }
      } else if (xm[4]) {
        // "a b..1,3" : ".."
        min = 0;
        max = Infinity;
      }

      const required = mark === "<";
      if (required) {
        assert(
          !seenOptional,
          new InvalidArgSpecifierError(
            `Required arg '${xname}' cannot follow optional arg '${seenOptional}'`
          )
        );
        this.needArgs += min;
      } else {
        seenOptional = xname;
      }

      if (max > min) {
        variadic = true;
        this.variadic = { min, max };
        this.expectArgs += max;
      } else {
        this.expectArgs += min;
      }

      assert(
        !SUPPORT_TYPES.includes(name),
        new InvalidArgSpecifierError(
          `For args of ${this.name} - its name is using a type name: ${name}`
        )
      );

      this.args.push({
        required,
        name,
        type,
        variadic,
        min,
        max
      });
      return "";
    });

    assert(
      !(args && this.args.length === 0),
      new InvalidArgSpecifierError(`Invalid args specifier '${args}' for '${this.name}'`)
    );
  }
}
