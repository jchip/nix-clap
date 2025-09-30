/**
 * Type for option values - can be string, number, boolean, or arrays of these
 */
export type OptionValue = string | number | boolean | string[] | number[] | boolean[];

/**
 * Type for argument values - similar to option values
 */
export type ArgumentValue = string | number | boolean | string[] | number[] | boolean[];

/**
 * Source tracking for where option/argument values came from
 */
export type OptionSource = "cli" | "cli-default" | "cli-unmatch" | "default" | "user";

/**
 * Represents JSON metadata for a command.
 */
export type CommandMeta = {
  /**
   * Options associated with the command.
   * Keys are option names, values are the parsed option values.
   */
  opts: Record<string, OptionValue>;

  /**
   * Count of each option used (for counting options).
   */
  optsCount: Record<string, number>;

  /**
   * Full options associated with the command (including array indices).
   */
  optsFull: Record<string, string | string[]>;

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
   * Formally specified and recognized arguments passed to the command.
   * Keys are argument names from the args spec, values are parsed values.
   */
  args: Record<string, ArgumentValue>;

  /**
   * List of all arguments passed to the command, even unknown ones.
   */
  argList: string[];

  /**
   * Source tracking for options - indicates where each option value came from.
   */
  source: Record<string, OptionSource>;

  /**
   * Verbatim (original string) values for options before type coercion.
   */
  verbatim: Record<string, string | string[]>;

  /**
   * Sub-commands associated with this command.
   */
  subCommands: Record<string, CommandMeta>;
};
