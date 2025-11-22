# NixClap Examples

This directory contains examples demonstrating various features and use cases of NixClap.

## Quick Start

- **min-start.ts** - The absolute minimum code needed to use NixClap, parsing CLI options with flag=value form.
- **quick-start.ts** - Basic usage with a simple command and option, showing how to access root command options from subcommands.
- **simple-cli.ts** - Basic example with commands that have exec handlers for build and test operations.

## Commands

- **cli-command-args.ts** - Commands that accept arguments (e.g., `copy source dest`).
- **with-commands.ts** - Commands with arguments and options, showing a compile command that accepts file arguments and verbose flag.
- **simple-root-command.ts** - Simple CLI that processes files via root command execution using init2().
- **root-command.ts** - Full-featured root command with arguments, showing a file processor that can be invoked directly without sub-commands while still supporting traditional sub-commands.
- **default-command.ts** - Using a default command that runs when no command is specified.

## Options

- **cli-with-options.ts** - Parsing options and accessing them from the parsed result.
- **options.ts** - Basic option parsing with unknown command and option support enabled.
- **options-only.ts** - Parsing options without commands, showing how to specify and retrieve option values.
- **options-only-with-exec.ts** - CLI that only takes options (no args, no subcommands) with an exec handler, useful for tools like linters or configuration utilities.

## Advanced Features

- **accessing-parsed-results.ts** - Different ways to access parsed data via jsonMeta, including options, arguments, and their sources.
- **async-await.ts** - Using async exec handlers with parseAsync() for asynchronous operations.
- **numbers.ts** - Math operations CLI (sum, sort, times, divide) with number arguments and various options.
- **value-coercion.ts** - Custom value coercion using functions, RegExp, and constants for both options and command arguments.
- **typescript-usage.ts** - Type-safe usage with TypeScript using init2() and typed CommandSpec.
- **remaining-args-after-dash.ts** - Accessing remaining arguments after `--` separator (e.g., `prog cmd a b c -- d e f --blah`).
- **use-as-inplace-module.ts** - Using NixClap as a library/module instead of a terminal app, with custom output/exit handlers for daemon processes, testing, or embedded CLIs.

## Unknown Handling

- **unknowns.ts** - Parsing with both allowUnknownCommand and allowUnknownOption enabled.
- **unknowns-cmd-only.ts** - Parsing unknown commands with allowUnknownCommand but not allowUnknownOption enabled.
- **unknown-multi-cmds.ts** - Parsing with allowUnknownCommand enabled, demonstrating access to unknown subcommand nodes.
- **subcommand-collision.ts** - Demonstrates behavior when a command requires a subcommand (has subcommands but no exec/args). Shows how unknown args are handled vs bubbling up as sibling commands.

## Running Examples

All examples can be run using `nvx tsx`:

```bash
nvx tsx examples/quick-start.ts
nvx tsx examples/options-only-with-exec.ts --port 3000 --verbose
nvx tsx examples/root-command.ts input.txt --output output.txt
```

Use `--help` with any example to see usage information:

```bash
nvx tsx examples/quick-start.ts --help
```
