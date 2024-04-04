import { ClapNode } from "./clap-node";
import { Option, optUnknown } from "./option";
import { OptionMatch } from "./options";
import { OptionSource } from "./node-generator";

/**
 * Represents an option node in the command-line argument parser.
 * Extends the `ClapNode` class to include specific option-related data.
 *
 * @remarks
 * This class is used to handle options parsed from the command-line input.
 * It includes the option itself and its source.
 *
 * @example
 * ```typescript
 * const optionMatch: OptionMatch = { name: 'verbose', alias: 'v', value: true, option: someOption };
 * const optionNode = new OptionNode(optionMatch);
 * ```
 *
 */
export class OptionNode extends ClapNode {
  option: Option;
  source: OptionSource;

  constructor(data: OptionMatch, parent?: ClapNode) {
    super(data.name, data.alias, parent);
    if (data.value !== undefined) {
      this.addArg(data.value);
    }
    this.option = data.option || optUnknown;
  }

  applyDefaults(): void {
    const spec = this.option.spec;
    if (!spec.argDefault) {
      return;
    }
  }
}
