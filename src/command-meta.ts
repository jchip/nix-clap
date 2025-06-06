/**
 * Represents JSON metadata for a command.
 */
export type CommandMeta = {
  /**
   * Options associated with the command.
   */
  opts: Record<string, any>;

  /**
   * Count of each option used.
   */
  optsCount: Record<string, number>;

  /**
   * Full options associated with the command.
   */
  optsFull: Record<string, any>;

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
   */
  args: any;

  /**
   * List of all arguments passed to the command, even unknown ones.
   */
  argList: string[];

  /**
   * Source of the command.
   */
  source: any;

  /**
   * Verbatim string of the command.
   */
  verbatim: any;

  /**
   * Sub-commands associated with this command.
   */
  subCommands: Record<string, CommandMeta>;
};
