[![NPM version][npm-image]][npm-url] [![Build Status][build-image]][build-url]
[![Dependency Status][daviddm-image]][daviddm-url] [![devDependency Status][daviddm-dev-image]][daviddm-dev-url]
[![coverage][coverage-image]][coverage-url]

# NixClap

Simple, lightweight, flexible, and comprehensive Un\*x Command Line Argument Parsing for Node.js.

## Features

- **Lightweight** - Minimal dependencies (`tslib`)
- **Comprehensive** - Full Un\*x-style parsing with options, commands, sub-commands, and variadic arguments
- **Root Command Support** - Define root command behavior directly in init2()
- **Type-Safe** - Written in TypeScript with full type definitions
- **Modern** - Dual ESM/CJS support, async/await support, Node.js 20+
- **Flexible** - JSON-based configuration with support for custom type coercions
- **Event-Driven** - Extensible event system for customizing behavior
- **Informative** - Detailed parse results showing argument sources (`cli`, `default`, `user`)
- **Greedy Mode** - Use `-#` flag to consume ambiguous arguments
- **Auto-Generated Help** - Beautiful help text generated from your specs
- **Bundler-Friendly** - Works with Webpack, Rollup, esbuild, etc.

## Quick Start

```bash
npm install nix-clap
```

### Simple CLI with commands

```js
import { NixClap } from "nix-clap";

new NixClap()
  .version("1.0.0")
  .init2({
    subCommands: {
      build: {
        desc: "Build the project",
        exec: cmd => console.log("Building...", cmd.opts, cmd.args)
      },
      test: {
        desc: "Run tests",
        exec: cmd => console.log("Testing...", cmd.opts, cmd.args)
      }
    }
  })
  .parse();
```

```bash
$ my-cli build        # "Building..."
$ my-cli test         # "Testing..."
$ my-cli --help       # Shows help
$ my-cli --version    # Shows version
```

### CLI with options

```js
import { NixClap } from "nix-clap";

const parsed = new NixClap()
  .init2({
    options: {
      name: { alias: "n", desc: "Your name", args: "<string>" }
    }
  })
  .parse();

// Access parsed options
const name = parsed.command.opts.name;

if (name) {
  console.log(`Hello ${name}!`);
}
```

```bash
$ my-cli --name Alice    # "Hello Alice!"
$ my-cli -n Bob          # "Hello Bob!"
```

### CLI with command arguments

```js
import { NixClap } from "nix-clap";

new NixClap()
  .init2({
    subCommands: {
      copy: {
        desc: "Copy files",
        args: "<source string> <dest string>",
        exec: cmd => {
          const { source, dest } = cmd.args;
          console.log(`Copying ${source} to ${dest}`);
        }
      }
    }
  })
  .parse();
```

```bash
$ my-cli copy file.txt backup.txt
# "Copying file.txt to backup.txt"
```

### Root command with arguments

```js
import { NixClap } from "nix-clap";

new NixClap({ name: "process" })
  .init2({
    args: "<files string..>",
    exec: cmd => {
      const files = cmd.args.files;
      console.log(`Processing: ${files.join(", ")}`);
    }
  })
  .parse();
```

```bash
$ process file.txt                    # "Processing: file.txt"
$ process file1.txt file2.txt         # "Processing: file1.txt, file2.txt"
```

> **Note:** Root command only executes when:
>
> 1. Arguments are provided on the command line, AND
> 2. No sub-command matches those arguments
>
> This means sub-commands always take precedence. For CLIs that should run without any arguments, use a [default command](#defaultcommandname) instead.

### With Commands and Options

```js
import { NixClap } from "nix-clap";

const nc = new NixClap()
  .version("1.0.0")
  .usage("$0 [options] <command> [options]")
  .init2({
    options: {
      verbose: {
        desc: "enable verbose mode",
        alias: "v",
        args: "<flag boolean>",
        argDefault: "false"
      }
    },
    subCommands: {
      compile: {
        desc: "run compile on the files",
        args: "<files...>",
        exec: cmd => {
          const meta = cmd.jsonMeta;
          console.log("compile", meta.args.files, "verbose", meta.opts.verbose);
        }
      }
    }
  });

nc.parse();
```

> **Important:** `version()`, `help()`, and `usage()` must be called **before** `init2()`.

**Usage:**

```bash
$ my-prog compile --verbose file1.jsx file2.jsx file3.jsx
```

> See [examples/with-commands.ts](./examples/with-commands.ts)

### Async/Await Support

```js
const nc = new NixClap().init2({
  subCommands: {
    deploy: {
      desc: "Deploy to production",
      exec: async cmd => {
        await someAsyncOperation();
        console.log("Deployed!");
      }
    }
  }
});

await nc.parseAsync(); // Use parseAsync for async exec handlers
```

> See [examples/async-await.ts](./examples/async-await.ts)

### Accessing Parsed Results

NixClap provides multiple ways to access parsed data:

```js
const parsed = nc.parse();

// Access via jsonMeta (recommended)
const opts = parsed.command.jsonMeta.opts; // { verbose: true, output: "file.txt" }
const args = parsed.command.jsonMeta.args; // { files: ["a.js", "b.js"] }
const source = parsed.command.jsonMeta.source; // { verbose: "cli" }

// Access sub-commands
const subCmd = parsed.command.jsonMeta.subCommands.compile;

// Check for errors
if (parsed.errorNodes && parsed.errorNodes.length > 0) {
  console.error(
    "Parse errors:",
    parsed.errorNodes.map(n => n.error.message)
  );
}
```

**Understanding `opts` vs `optsFull`**

NixClap provides two ways to access option values:

**`opts` - Simplified Direct Values (Recommended)**

The first/only argument value is stored directly on the option name:

```js
const nc = new NixClap().init2({
  options: {
    output: { args: "<path string>", desc: "Output file" },
    count: { args: "<num number>", desc: "Item count" },
    format: { args: "<fmt>", desc: "Output format" }
  },
  exec: cmd => {
    const meta = cmd.jsonMeta;

    // ✅ Correct - access values directly
    const output = meta.opts.output; // "file.txt"
    const count = meta.opts.count; // 42
    const format = meta.opts.format; // "json"
  }
});
```

**`optsFull` - Complete Objects with Argument Names**

All arguments are stored with both positional index and their named arguments:

```js
const nc = new NixClap().init2({
  options: {
    output: { args: "<path string>" },
    count: { args: "<num number>" }
  },
  exec: cmd => {
    const meta = cmd.jsonMeta;

    // Access by argument name
    const path = meta.optsFull.output?.path; // "file.txt"
    const num = meta.optsFull.count?.num; // 42

    // Or by positional index
    const first = meta.optsFull.output?.[0]; // "file.txt"
  }
});
```

**Structure comparison:**

```js
// Given: --output result.txt --count 42

// meta.opts (simplified)
{
  output: "result.txt",   // Direct value
  count: 42               // Direct value
}

// meta.optsFull (complete)
{
  output: {
    0: "result.txt",      // Positional
    path: "result.txt"    // Named from args: "<path string>"
  },
  count: {
    0: 42,                // Positional
    num: 42               // Named from args: "<num number>"
  }
}
```

**Common mistake:**

```js
// ❌ WRONG - trying to access argument name on simplified value
const output = meta.opts.output?.path; // undefined! (output is a string)

// ✅ CORRECT - use optsFull for argument names
const output = meta.optsFull.output?.path; // "file.txt"

// ✅ BETTER - use opts for simplicity
const output = meta.opts.output; // "file.txt"
```

> See [examples/accessing-parsed-results.ts](./examples/accessing-parsed-results.ts)

## Understanding init() vs init2()

NixClap provides two initialization methods. **`init2()` is the recommended primary API**, while `init()` is a convenience wrapper for simple cases.

### Use `init2()` (Recommended)

`init2()` is the modern, flexible API that allows you to define everything in one place:

```js
new NixClap().init2({
  args: "[files string..]", // Root command arguments
  exec: cmd => {
    /* ... */
  }, // Root command handler
  options: {
    /* ... */
  }, // Global options
  subCommands: {
    /* ... */
  } // Sub-commands
});
```

**Benefits:**

- ✅ Define root command behavior (args + exec) directly
- ✅ Single, declarative configuration object
- ✅ More intuitive and consistent API
- ✅ Full control over root command execution

**When to use:**

- You need root command to handle arguments directly (e.g., `mycli file.txt`)
- You want a clean, declarative configuration
- You're building any CLI (simple or complex)

### Use `init()` (Legacy/Convenience)

`init()` is a simpler wrapper that's useful for backwards compatibility or when you only need options and sub-commands:

```js
new NixClap().init(
  {
    /* options */
  },
  {
    /* commands */
  }
);
```

This is equivalent to:

```js
new NixClap().init2({
  options: {
    /* options */
  },
  subCommands: {
    /* commands */
  }
});
```

**When to use:**

- Maintaining existing code that uses `init()`
- Very simple CLIs with just options and commands
- You prefer two separate parameters over one object

> **Tip:** When in doubt, use `init2()` - it's more flexible and is the recommended approach going forward.

**Complete Example:**

```js
import { NixClap } from "nix-clap";

const nc = new NixClap({ name: "file-processor" })
  .version("1.0.0")
  .usage("$0 [options] <input-file> [additional-files...]")
  .init2({
    // Root command arguments
    args: "[inputFile string] [additionalFiles string..]",
    // Root command execution handler
    exec: cmd => {
      const meta = cmd.jsonMeta;
      console.log("Processing:", meta.args.inputFile);
      console.log("Additional files:", meta.args.additionalFiles);
      console.log("Output:", meta.opts.output);
    },
    // Root-level options (available to root command and sub-commands)
    options: {
      output: { alias: "o", desc: "Output file path", args: "<path string>" },
      verbose: { alias: "v", desc: "Enable verbose output" }
    },
    // Sub-commands (optional)
    subCommands: {
      convert: {
        desc: "Convert file format",
        args: "<input string> <output string>",
        exec: cmd => console.log("Converting...")
      }
    }
  });

nc.parse();
```

**Usage examples:**

```bash
# Root command (direct file processing)
$ file-processor input.txt --output result.txt
$ file-processor file1.txt file2.txt file3.txt --verbose

# Sub-commands still work
$ file-processor convert input.txt output.txt
$ file-processor --help
```

**Important notes:**

- Root command arguments should typically be **optional** (`[arg]`) rather than required (`<arg>`) to avoid parsing ambiguity with sub-command names
- Sub-commands always take precedence during parsing
- The root command only executes when:
  - Arguments are provided on the command line, AND
  - No sub-commands match those arguments
- When multiple non-option arguments are provided, they are checked sequentially. If any argument matches a sub-command name, that sub-command executes (and subsequent arguments are ignored for root command execution)
- If none of the non-option arguments match sub-command names, **all** arguments are passed to the root command
- All options defined in `init2()` are available to both the root command and sub-commands

### Root Command Execution Decision Tree

When you configure a root command with `exec` and `args`, NixClap determines whether to execute it based on this logic:

```
Preprocess CLI arguments
   ↓
Are there only option args (no non-option args)?
   ├─ YES → Insert default command upfront (if configured)
   └─ NO → Continue parsing normally
       ↓
Parse CLI arguments
   ↓
Does a sub-command match?
   ├─ YES → Execute matched sub-command (root command skipped)
   └─ NO → Continue to next check
       ↓
   Are non-option arguments provided?
       ├─ NO → Execute default command (if inserted during parsing)
       │        └─ No default? → Emit 'no-action' event
       └─ YES → Execute root command
```

**Key Points:**

1. **Sub-commands always win**: If any argument matches a sub-command name, that sub-command executes
2. **Root needs arguments**: Root command only executes when non-option arguments are provided
3. **Default command insertion**: When only option args exist, default command is inserted during preprocessing (before parsing)
4. **Execution order**: Sub-commands → Root command (when args provided) → Default command (inserted during parsing, executed automatically)

**Example Scenarios:**

```bash
# CLI defined with: init2({ args: "[file]", exec: rootHandler, subCommands: { build: {...} } })

$ mycli file.txt          # ✅ Executes root command (no sub-command match, args provided)
$ mycli build             # ✅ Executes 'build' sub-command (sub-command match)
$ mycli                   # ❌ No execution (no args, no default command)
$ mycli --help            # ⚠️  Shows help (--help is handled before execution logic)
```

**Multiple Arguments with Sub-Commands:**

When multiple non-option arguments are provided and none match sub-command names, all arguments are passed to the root command:

```bash
# CLI defined with: init2({ 
#   args: "[arg1 string] [arg2 string] [arg3 string]", 
#   exec: rootHandler, 
#   subCommands: { build: {...}, test: {...} } 
# })

$ mycli arg1 arg2 arg3    # ✅ Executes root command with all 3 args
                          #    (none match 'build' or 'test', so all go to root)
$ mycli build             # ✅ Executes 'build' sub-command (first arg matches)
$ mycli arg1 build        # ✅ Executes 'build' sub-command (second arg matches)
                          #    (arg1 is ignored, only 'build' executes)
```

> **Try the examples above:** [simple-cli.ts](./examples/simple-cli.ts), [cli-with-options.ts](./examples/cli-with-options.ts), [cli-command-args.ts](./examples/cli-command-args.ts), [simple-root-command.ts](./examples/simple-root-command.ts)

## More Examples

See [examples](./examples) folder for more working samples:

**Getting Started:**

- [quick-start.ts](./examples/quick-start.ts) - Minimal quick start example
- [simple-cli.ts](./examples/simple-cli.ts) - Simple CLI with commands
- [cli-with-options.ts](./examples/cli-with-options.ts) - CLI with options
- [cli-command-args.ts](./examples/cli-command-args.ts) - Commands with arguments

**Root Commands:**

- [simple-root-command.ts](./examples/simple-root-command.ts) - Simple root command
- [root-command.ts](./examples/root-command.ts) - Comprehensive root command example

**Options and Arguments:**

- [options.ts](./examples/options.ts) - Various option patterns
- [options-only.ts](./examples/options-only.ts) - Options without commands
- [with-commands.ts](./examples/with-commands.ts) - Commands with options and arguments
- [value-coercion.ts](./examples/value-coercion.ts) - Custom value coercion
- [numbers.ts](./examples/numbers.ts) - Numeric arguments and operations

**Advanced Features:**

- [async-await.ts](./examples/async-await.ts) - Async command handlers
- [default-command.ts](./examples/default-command.ts) - Using default commands
- [accessing-parsed-results.ts](./examples/accessing-parsed-results.ts) - Working with parsed data
- [allow-duplicate-option.ts](./examples/allow-duplicate-option.ts) - Sub-command option shadowing
- [unknowns.ts](./examples/unknowns.ts) - Handling unknown options
- [unknowns-cmd-only.ts](./examples/unknowns-cmd-only.ts) - Unknown commands only
- [unknown-multi-cmds.ts](./examples/unknown-multi-cmds.ts) - Multiple unknown commands

**TypeScript:**

- [typescript-usage.ts](./examples/typescript-usage.ts) - TypeScript integration

# Parsing Capabilities

NixClap implements comprehensive Un\*x-style CLI parsing with several unique design principles:

**Core Philosophy:**

- **Command-Centric Architecture**: Everything revolves around commands - they own their arguments, options, and execution logic
  - Commands are first-class entities, not just strings that trigger functions
  - Each command maintains its own parse state, arguments, and options context
  - Options and arguments are scoped to and processed within their command context
- **Flexibility First**: Commands, options, and arguments can be freely mixed and composed
- **Intuitive Un\*x Conventions**: Follows traditional Unix CLI patterns that users expect
- **Explicit Over Implicit**: Uses terminators (`-.`, `--.`, `--`) to resolve ambiguity rather than guessing
- **Type Safety**: Built-in type coercion with custom type support
- **Non-Greedy by Default**: Respects command/option boundaries unless explicitly told otherwise (greedy mode)

**Unique Aspects:**

1. **Command-Centric Parsing & Execution**: Unlike option-centric parsers, NixClap treats commands as the organizing principle
   - Options belong to commands (not the other way around)
   - Parse results are structured as a command tree with nested contexts
   - Each command has its own `jsonMeta` containing its args, options, and state
   - This enables complex command hierarchies with clean separation of concerns

2. **Multiple Commands in One Invocation**: Execute multiple commands in a single CLI call
   - Example: `prog add 1 2 -. mult 3 4` executes both `add` and `mult` commands
   - Each command maintains its own arguments and options context
   - Results accessible as a flat list or via command tree traversal

3. **Flexible Command Hierarchies**: Commands can have sub-commands, sub-sub-commands, and each level can have its own options
   - Options can be bound to specific commands or available globally
   - Options can appear before or after commands
   - Each command level is parsed independently with its own context

4. **Smart Argument Termination**: Variadic arguments are automatically terminated by:
   - The next option flag (e.g., `-x` or `--foo`)
   - The next command name
   - Explicit terminators (`-.` or `--.`)
   - This eliminates ambiguity without requiring special syntax

5. **Greedy Mode Control**: When you need to pass arbitrary strings that look like commands/options as arguments
   - Use `-#`, `-`, or `---` to enter greedy mode
   - Everything after becomes an argument until terminator

6. **Execution Model**: NixClap separates parsing from execution
   - Parse once, access results multiple times via command tree
   - Control when/if commands execute (via `skipExec`)
   - Async execution support with proper ordering and command context
   - Each command's exec handler receives its own CommandNode with full context

## Options

Example: `prog -xazvf=hello --foo-option hello bar -. --enable-blah`

- Support `-` single char options or `--` long form options.
- Options can have aliases.
- Both option forms can have argument specified with `=` or space.
  - ie: long form `--foo-option=bar` or `--foo-option bar`
  - ie: short form `-f=bar` or `-f bar`
- Both option forms can have variadic array args.
  - ie: `--foo-option hello bar` or `-f hello bar`
  - array args can have an optional type
- `-` options can be compounded, like `-xazvf`.
  - Last char can have args, like `-xazvf=hello` or `-xazvf hello`.
  - Other chars are treated as `boolean` options automatically.
- Variadic array args are terminated by any other options such as `-x` or `--xyz`, or explicitly with `-.` or `--.`
  - ie: `cmd1 arg1 arg2 --some-array abc def ghi -. cmd2 arg1 arg2`.
- Allow arbitrary unknown options but with arguments specified through `=` only.
  - Since it's ambiguous whether to take a non-option arg following an unknown option as an argument or a command.

### Unknown Options Behavior

When `allowUnknownOption` is enabled, unknown options follow a specific resolution pattern:

**Option Resolution: Unknown options bubble up to parent commands**

Unknown options are first attempted to be resolved on the current command. If not found, they bubble up to parent commands until reaching the root command. This allows sub-commands to inherit options from their parents while still allowing command-specific overrides.

**Root Command Storage: The root command stores unknown options**

If an unknown option cannot be resolved on any command in the hierarchy, it gets stored on the root command (when `allowUnknownOption: true`). This makes the root command the central repository for all unrecognized options.

**Access Pattern: Use `cmd.rootCmd.opts` to access parent/root command options**

To access options that may be stored on parent commands or the root:

```js
const nc = new NixClap({ allowUnknownOption: true }).init2({
  subCommands: {
    build: {
      exec: cmd => {
        // Access options from current command
        const localOpts = cmd.opts;

        // Access options from root command (includes bubbled up unknown options)
        const rootOpts = cmd.rootCmd.opts;

        // Combine or prioritize as needed
        const verbose = localOpts.verbose || rootOpts.verbose;
        console.log("Verbose:", verbose);
      }
    }
  }
});
```

**Example:**

```bash
# Unknown option --custom-flag bubbles up to root command
$ my-cli build --custom-flag=value

# In the build command exec handler:
exec: cmd => {
  console.log(cmd.opts.customFlag);        // undefined (not on build command)
  console.log(cmd.rootCmd.opts.customFlag); // "value" (stored on root)
}
```

This behavior enables flexible option inheritance while maintaining command-specific option isolation.

- Counting number of option occurrences.
- Boolean option can be negated with `--no-` prefix.
- Allow custom value type coercions with a function or RegExp.

## Commands

Example: `prog add 1 2 3 4`

- Commands can have optional or required arguments.
  - Each argument type defaults to `string`, but can have an optional type
- Commands can have aliases.
- Possible to specify multiple commands.
- Commands can have variadic array arguments.
- Variadic array args are terminated by any other options such as `-x` or `--xyz`, or explicitly with `-.` or `--.`
  - ie: `prog order pizza soda -. pickup` (specifies two commands: `order` and `pickup`)
- Command can have its own options that are binded to it only.
- Top level options can be binded to specific commands only.
- Unbind top level options can be specified before or after commands.
- Allow arbitrary unknown commands that do not have arguments.
- Allow multiple custom value type coercions for each command.

### Multiple Commands

Example: `prog add 1 2 3 4 -. mult 4 5 6 7 8`

> First Command: `add` with four numbers input
> Second Command: `mult` with five numbers input

- Since there are multiple commands with variadic arguments, the `-.` in the middle terminates the `add` command.

### Sub Commands

Example: `prog calc add 1 2 3 4 -. mult 4 5 6 7`

> Main command: `calc`
> Sub Command: `add` that can take variadic number of numbers
> Sub Command: `mult` that can take variadic number of numbers

- Since there are multiple sub commands, the `-.` in the middle terminates the `add` sub command.

### Sub-Command Option Shadowing

By default, sub-commands cannot define options with the same name as their parent command. To enable this feature, set `allowDuplicateOption: true` in the NixClap configuration. When enabled, the sub-command's option will shadow (override) the parent's option when parsing at that command level.

**Example:**

```js
const nc = new NixClap({
  allowDuplicateOption: true  // Enable duplicate option names
}).init(
  {
    // Root-level --verbose is a boolean flag
    verbose: { alias: "v", desc: "Enable verbose output" }
  },
  {
    build: {
      desc: "Build the project",
      options: {
        // Sub-command --verbose takes a level argument
        verbose: { alias: "v", desc: "Verbosity level", args: "<level>" }
      },
      exec: ({ opts, rootCmd }) => {
        console.log("Root verbose:", rootCmd.opts.verbose);   // boolean or undefined
        console.log("Build verbose:", opts.verbose);          // level string or undefined
      }
    }
  }
);
```

**Usage:**

```bash
$ prog --verbose build --verbose=debug
# Root verbose: true
# Build verbose: debug

$ prog build --verbose=2
# Root verbose: undefined
# Build verbose: 2

$ prog -v build -v
# Root verbose: true
# Build verbose: true (boolean, since no argument provided)
```

**Key points:**

- Requires `allowDuplicateOption: true` in config (default is `false`)
- Options are resolved at the current command level first
- If an option doesn't match the current command, it bubbles up to the parent
- This allows the same option name to have different behaviors at different levels
- Access parent options via `cmd.rootCmd.opts` or by traversing the command chain

> See [examples/allow-duplicate-option.ts](./examples/allow-duplicate-option.ts)

## Greedy Mode

Commands can enter "greedy mode" using the `-#`, `-`, or `---` flags, which allows them to consume all remaining arguments blindly, even if they look like commands or options.

**Example:**

```bash
# Without greedy mode - "command" is parsed as a new command
$ prog compile file1.js file2.js command other arguments

# With greedy mode - everything after -# is an argument to "compile"
$ prog compile file1.js file2.js -# command other arguments
```

Greedy mode continues until a terminator token (`-.` or `--.`) is encountered:

```bash
$ prog compile file1.js -# some-command-name more-args -. actual-command
#                        ↑                            ↑   ↑
#                  Start greedy            Stop greedy   New command
```

**Use cases:**

- Passing arbitrary strings that might look like commands/options
- Building proxy CLIs that forward args to other programs
- Accepting user-provided command names as data

## Terminating and Resuming

- `--` terminates parsing, with remaining args returned in `parsed._`.
- Parsing can be resumed after it's terminated.
- `-.` or `--.` can terminate variadic params for commands and options.

## Installation

```bash
npm install nix-clap
```

**Requirements:**

- Node.js >= 20
- ESM or CommonJS (both supported)

# Interface

This module exposes a class with a few methods.

See [APIs](#apis) for more details.

## `options spec`

```js
const options = {
  "some-option": {
    alias: ["s", "so"],
    desc: "description",
    args: "[number cans] [beverage] [boolean diet] [string..]",
    argDefault: ["6", "coke", "true", "foo"],
    // customTypes defines custom type validators/coercers
    customTypes: {
      beverage: /^(coke|pepsi)$/ // beverage must match this RegExp
    },
    allowCmd: ["cmd1", "cmd2"]
  },
  "another-option": {}
};
```

Where:

| field         | description                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `alias`       | Specify aliases for the option, as a single string or an array of strings.                              |
| `args`        | Arguments for the option. `<type name>` means it's required and `[type name]` optional.                 |
| `desc`        | Description for the option - a string or a function that returns string.                                |
| `argDefault`  | Default values to use _when all args are optional_.                                                     |
| `required`    | `true`/`false` whether this option must be specified.                                                   |
| `allowCmd`    | list of command names this option is allow to follow only.                                              |
| `customTypes` | Specify [value coercion](#value-coercion) for custom types. Keys are type names, values are converters. |
| `counting`    | Maximum count value for counting options. Use `Infinity` for unlimited counting.                        |

> **Note:** Options with kebab-case names (like `some-option`) are automatically accessible in camelCase (`someOption`) in the parsed results.

## `commands spec`

Command spec share some properties that are the same as [option spec](#options-spec).

Command doesn't support the following:

- no `allowCmd` property.
- args can't have `count` type.

Command supports a few more properties: `usage`, `exec`, and `options`.

```js
const commands = {
  // Regular sub-commands
  cmd1: {
    alias: ["c"],
    desc: "description",
    args: "[number cans] [enum] [boolean diet] [string..]",
    argDefault: ["6", "coke", "true", "foo"],
    customTypes: {
      enum: /^(coke|pepsi)$/
    },
    usage: "$0 $1",
    exec: cmd => {
      // cmd is the CommandNode instance
      const meta = cmd.jsonMeta;
      console.log(meta.args, meta.opts);
    },
    options: {},
    subCommands: {}
  },
  cmd2: {}
};
```

Where:

| field                | description                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `alias`              | Specify aliases for the command, as a single string or an array of strings.                                                        |
| `args`               | Specify arguments for the command. `<>` means it's required and `[]` optional. See [rules](#rules-for-command-args) for more info. |
| `usage`              | Usage message when help for the command is invoked - a string or a function that returns a string.                                 |
|                      | `$0` will be replaced with program name and `$1` with command name.                                                                |
| `desc`               | Description for the command - can be a string or a function that returns a string.                                                 |
| `exec`               | The callback handler for the command. Receives `CommandNode` as first arg. Can be async.                                           |
| `options`            | Options private to this command only. Follows the same spec as [top level options](#options-spec)                                  |
| `subCommands`        | Nested sub-commands under this command. Follows the same spec as commands.                                                         |
| `allowUnknownOption` | If `true`, allows unknown options for this command.                                                                                |

> **Note:** Set a default command via the `defaultCommand` config option in the NixClap constructor, not in the command spec.

### Rules for Command `args`

The `args` string uses a specific format to define command and option arguments:

**Basic Format:**

- `<arg>` - Required argument
- `[arg]` - Optional argument
- All required args must come before optional args
- Multiple arguments separated by spaces: `"<first> <second> [third]"`

**Naming and Types:**

- Named with type: `<name type>` or `[name type]`
- Named without type (defaults to string): `<name>` or `[name]`
- Unnamed with type: `<type>` or `[type]`
- Unnamed without type: `<>` or `[]`
- Supported types: `string`, `number`, `float`, `boolean`, `count` (options only), or custom types via [coercion](#value-coercion)

**Built-in Type Behaviors:**

| Type      | Coercion Behavior        | Example Input            | Parsed Value | Notes                                |
| --------- | ------------------------ | ------------------------ | ------------ | ------------------------------------ |
| `string`  | No coercion              | `"hello"`                | `"hello"`    | Default type if not specified        |
| `number`  | `parseInt(val, 10)`      | `"42"`                   | `42`         | Parses as integer                    |
| `float`   | `parseFloat(val)`        | `"3.14"`                 | `3.14`       | Parses as floating point             |
| `boolean` | Checks for truthy values | `"true"`, `"1"`, `"yes"` | `true`       | `"false"`, `"0"`, `"no"` → `false`   |
| `count`   | Increments on each use   | `-vvv`                   | `3`          | Only for options, counts occurrences |

**Type Coercion Failures:**

When a value cannot be coerced to the specified type:

- String values that fail number/float parsing return `NaN`
- Values that fail custom type validation trigger `regex-unmatch` event
- If `argDefault` is specified, the default value is used
- Otherwise, the original string value is returned

**Examples:**

```js
args: "<filename string>"; // Required named string arg
args: "<count number>"; // Required named number arg (parsed as integer)
args: "<price float>"; // Required named float arg (parsed as decimal)
args: "[enabled boolean]"; // Optional named boolean arg
args: "[output]"; // Optional named string arg (default type)
args: "<input> [output]"; // Required + optional args
args: "<value boolean> <name>"; // Multiple typed args
```

**Array Arguments:**

Use `..` suffix to specify array arguments (must be the last argument):

- **Unlimited variadic**: `<args..>` or `[args..]`
  - Consumes 0 or more arguments
  - Example: `"<files..>"` accepts any number of files

- **Fixed size**: `<args..N>`
  - Exactly N arguments required
  - Example: `"<coords..3>"` requires exactly 3 coordinates

- **Range with minimum**: `<args..N,>` or `<args..N,Inf>`
  - At least N arguments required, unlimited maximum
  - Example: `"<files..1,>"` requires 1+ files
  - Example: `"<names..2,Inf>"` requires 2+ names

- **Range with min and max**: `<args..N,M>`
  - Between N and M arguments (inclusive)
  - Example: `"<items..1,3>"` accepts 1-3 items
  - Example: `"<values..2,5>"` accepts 2-5 values

**Array Examples:**

```js
args: "<files string..>"; // 0+ files (variadic)
args: "<coords number..3>"; // Exactly 3 numbers
args: "<names..1,>"; // 1+ arguments (at least one required)
args: "<items string..1,5>"; // 1-5 string items
args: "[files..]"; // 0+ optional files
args: "<input> [extras..2,]"; // Required input + 2+ optional extras
```

**Special Cases:**

- Unnamed arrays: `<..>`, `<..3>`, `<..1,>`, `<..1,5>`
- Typed unnamed: `<string..>`, `<number..3>`, `<boolean..1,3>`

**Rules:**

- Only the last argument can be an array/variadic argument
- All required arguments must appear before optional arguments
- Array arguments are accessible as JavaScript arrays in `jsonMeta.args`

## Value Coercion

If none of the predefined types work for you, you can specify your own as a function or a RegExp, or any value.

You use any valid identifier for the value type, and then you define a field with the same name in your spec that can be:

- `function` - will be called with the value to convert
- `RegExp` - will be used to match the value. `undefined` is returned if it didn't match.
- Anything else - will be used as the converted value.

For example:

```js
const options = {
  customFn: {
    args: "<val fnval>",
    customTypes: {
      fnval: value => value.substring(0, 1)
    }
  },
  customRegex: {
    args: "<val rx>",
    customTypes: {
      rx: /^test$/i
    }
  },
  customValue: {
    args: "<val foo>",
    customTypes: {
      foo: "bar" // Always returns "bar"
    }
  }
};

const commands = {
  foo: {
    args: "<value1 type1> <value2 type2>",
    customTypes: {
      type1: value => `test-${value}`,
      type2: /^test$/i
    }
  }
};
```

> See [examples/value-coercion.ts](./examples/value-coercion.ts) for a working example.

## Parse Result

Use the method [`parse`](#parseargv-start-parsed) to parse command line arguments. It will return a parse result object.

```js
{
  command: {
    jsonMeta: {
      name: "~root-command~",
      alias: "~root-command~",
      argList: [],
      args: {},
      opts: {},
      optsFull: {},
      optsCount: {},
      source: {},
      verbatim: {},
      subCommands: {}
    }
  },
  execCmd: undefined, // Set after runExec/runExecAsync - the command that was executed
  index: 5,
  error,
  _: [],
  argv: []
}
```

Where:

- `command` - The parsed command object with a `jsonMeta` property containing detailed information
- `execCmd` - The command that was executed (set after `runExec`/`runExecAsync`). This is the primary command that ran, useful for accessing the executed command directly without traversing the command tree.
- `index` - the index in `argv` parse stopped
- `error` - If parse failed and your `parse-fail` event handler throws, then this will contain the parse error. See [skip default event behaviors](#skip-default-event-behaviors) for more details.
- `argv` - original array of argv
- `_` - remaining args in the `argv` array in case parsing was terminated by `--`.

If any command with [`exec` handlers](#command-exec-handler) were specified, then `parse` will invoke them before returning the parse result object.

### Error Handling

NixClap provides comprehensive error tracking during parsing. Errors are collected in `parsed.errorNodes`:

**Checking for Errors:**

```js
const parsed = nc.parse();

if (parsed.errorNodes && parsed.errorNodes.length > 0) {
  console.error("Parsing errors occurred:");
  parsed.errorNodes.forEach(node => {
    console.error(`  - ${node.error.message}`);
  });
  process.exit(1);
}
```

**Common Error Types:**

| Error Type                 | When It Occurs                  | Example                                                   |
| -------------------------- | ------------------------------- | --------------------------------------------------------- |
| `InvalidArgSpecifierError` | Invalid args spec format        | `args: "<required> [optional]"` (required after optional) |
| `UnknownOptionError`       | Unknown option encountered      | `--unknown` when `allowUnknownOption: false`              |
| `UnknownCliArgError`       | Unknown argument provided       | Extra args when strict mode enabled                       |
| Missing required argument  | Required arg not provided       | `<file>` not provided                                     |
| Type coercion failure      | Value doesn't match custom type | `--port abc` when expecting number                        |
| RegExp validation failure  | Value doesn't match RegExp      | `--env prod` when only `/(dev\|test)/` allowed            |

**Error Handling Patterns:**

```js
// Pattern 1: Let default handlers work (shows help + exits)
const nc = new NixClap().init(options, commands);
nc.parse(); // Errors trigger help automatically

// Pattern 2: Custom error handling (disable default handlers)
const nc = new NixClap({ noDefaultHandlers: true }).init(options, commands);
const parsed = nc.parse();

if (parsed.errorNodes?.length) {
  // Handle errors your way
  logErrors(parsed.errorNodes);
  showCustomHelp();
  process.exit(1);
}

// Pattern 3: Selective error handling
const nc = new NixClap().removeDefaultHandlers("parse-fail").init(options, commands);

const parsed = nc.parse();
if (parsed.errorNodes?.length) {
  // Custom handling for parse errors only
}
```

**Accessing Error Details:**

```js
parsed.errorNodes.forEach(node => {
  console.log("Error message:", node.error.message);
  console.log("Error type:", node.error.constructor.name);
  console.log("Node type:", node.type); // "option", "command", etc.

  if (node.type === "option") {
    console.log("Option name:", node.name);
  }
});
```

### Parse Result Command Object

The command.jsonMeta object contains the following information:

```js
{
  name: "~root-command~",
  alias: "~root-command~",
  argList: [],
  args: {},
  opts: {}, // contains the parsed values for each option (coerced to proper types)
  optsFull: {}, // contains the full string/array values for each option (before coercion)
  optsCount: {}, // contains the count for counting options
  source: {}, // contains info about where the option value came from
  verbatim: {}, // contains original unprocessed values as provided on command line
  subCommands: {} // contains parsed sub-commands
}
```

The `source` field can have the following values:

- `cli` - option specified by user in the command line
- `cli-default` - User specified a value that didn't match RegExp and fallback to default.
- `cli-unmatch` - User specified a value that didn't match RegExp and there's no default to fallback to.
- `default` - default value in your [options spec](#options-spec)
- `user` - values you applied by calling the [`applyConfig`](#applyconfigconfig-parsed-src) method

### Command `exec` handler

If the command has an `exec` handler, it receives the following arguments:

```js
exec(cmd, parsed);
```

- `cmd` - The `CommandNode` instance for this command
- `parsed` - The parsed result containing remaining args after `--` (optional)

You can access command-specific arguments and options through the `jsonMeta` property:

```js
exec(cmd) {
  const meta = cmd.jsonMeta;
  console.log("Args:", meta.args);         // { filename: "test.js", count: 5 }
  console.log("Options:", meta.opts);      // { verbose: true }
  console.log("Source:", meta.source);     // { verbose: "cli" }
  console.log("Sub-commands:", meta.subCommands);
  
  // Access command chain (sequence from root to this command)
  const cmdChain = cmd.cmdChain;  // Array of CommandNodes from root to this command
}
```

**Accessing remaining args after `--`:**

```js
exec(cmd, parsed) {
  // Regular command arguments
  console.log("Args:", cmd.jsonMeta.argList);  // ["a", "b", "c"]
  
  // Remaining args after --
  if (parsed && parsed._.length > 0) {
    console.log("Remaining:", parsed._);  // ["d", "e", "f", "--blah"]
  }
}
```

**Async handlers:**

```js
exec: async (cmd, parsed) => {
  await someAsyncTask();
  // Use parseAsync() to ensure this completes before parse returns
};
```

> You can turn off automatic exec invocation with the `skipExec` config flag passed to [`NixClap` constructor](#constructorconfig)

## Events

`NixClap` extends `EventEmitter` and emits various events during the parsing and execution lifecycle.

### Event Reference

| Event             | When Emitted                         | Parameters                                  | Common Use Case                      |
| ----------------- | ------------------------------------ | ------------------------------------------- | ------------------------------------ |
| `pre-help`        | Before help output is displayed      | `{ self: NixClap }`                         | Modify help display, add headers     |
| `help`            | When `--help` is requested           | `ParseResult`                               | Custom help formatting               |
| `post-help`       | After help output is displayed       | `{ self: NixClap }`                         | Add footer, cleanup                  |
| `parsed`          | After parsing, before exec handlers  | `{ nixClap: NixClap, parsed: ParseResult }` | Validation, logging, transformations |
| `parse-fail`      | When parsing encounters errors       | `ParseResult` (with `errorNodes`)           | Custom error reporting               |
| `unknown-option`  | Unknown option encountered           | `string` (option name)                      | Dynamic option handling              |
| `unknown-command` | Unknown command encountered          | `{ name: string, ... }`                     | Dynamic command routing              |
| `no-action`       | No command with exec was invoked     | none                                        | Show help or default behavior        |
| `regex-unmatch`   | Value doesn't match RegExp validator | `{ value: string, name: string, ... }`      | Custom validation messages           |
| `exit`            | Program should terminate             | `number` (exit code)                        | Cleanup, logging before exit         |

### Event Lifecycle

```
User runs CLI
   ↓
parse() called
   ↓
Argument parsing
   ↓
emit('parsed')  ← After parsing, before execution
   ↓
Parse errors? ──YES→ emit('parse-fail') → emit('exit', 1)
   ↓ NO
Execute commands
   ↓
--help flag? ──YES→ emit('pre-help') → emit('help') → emit('post-help') → emit('exit', 0)
   ↓ NO
No exec invoked? ──YES→ emit('no-action') → emit('exit', 1)
   ↓ NO
Return parse result
```

### Using Events

**Basic Event Listening:**

```js
const nc = new NixClap().init(options, commands);

nc.on("parsed", ({ parsed }) => {
  console.log("Parsed successfully:", parsed.command.name);
});

nc.on("parse-fail", parsed => {
  console.error("Parse failed with", parsed.errorNodes.length, "errors");
});

nc.parse();
```

**Custom Help Handling:**

```js
nc.on("pre-help", ({ self }) => {
  console.log("╔═══════════════════╗");
  console.log("║   My Awesome CLI   ║");
  console.log("╚═══════════════════╝\n");
});

nc.on("post-help", () => {
  console.log("\nFor more info: https://example.com/docs");
});
```

**Dynamic Command Handling:**

```js
nc.on("unknown-command", ctx => {
  console.log(`Did you mean: ${suggestCommand(ctx.name)}?`);
  process.exit(1);
});
```

### Default Event Handlers

NixClap has default handlers for these events:

- `help` - Output help and emit `exit`
- `version` - If `version` has been set, then output version and emit `exit`.
- `parse-fail` - Output help and error message, and emit `exit`.
- `unknown-option` - Throws Error `Unknown option ${name}`
- `unknown-command` - Throws Error `Unkown command ${ctx.name}`
- `no-action` - Output help with error `No command given` and emit `exit`

* `regex-unmatch` - Output a message to let user know that value didn't match and default will be used.

- `exit` - calls `process.exit(code)`

#### Skip Default Event Behaviors

You can remove the default event handlers with one of these approaches:

- With the [`removeDefaultHandlers`](#removedefaulthandlers) method.
- By passing in `handlers` object in the `config` for the constructor.

For example, using `removeDefaultHandlers`:

```js
const nc = new NixClap().init(options, commands);
const parsed = nc.removeDefaultHandlers("parse-fail").parse();
if (parsed.error) {
  // handle the parse error here
}
```

Using constructor config.

```js
const parsed = new NixClap({ handlers: { "parse-fail": false } }).parse();
if (parsed.error) {
  // handle the parse error here
}
```

## APIs

These are methods `NixClap` class supports.

- [Quick Start](#quick-start)
- [Parsing Capabilities](#parsing-capabilities)
  - [Options](#options)
  - [Commands](#commands)
    - [Multiple Commands](#multiple-commands)
    - [Sub Commands](#sub-commands)
  - [Greedy Mode](#greedy-mode)
  - [Terminating and Resuming](#terminating-and-resuming)
- [Installation](#installation)
- [Interface](#interface)
  - [`options spec`](#options-spec)
  - [`commands spec`](#commands-spec)
    - [Rules for Command `args`](#rules-for-command-args)
  - [Value Coercion](#value-coercion)
  - [Parse Result](#parse-result)
    - [Parse Result Command Object](#parse-result-command-object)
    - [Command `exec` handler](#command-exec-handler)
  - [Events](#events)
    - [Default Event Handlers](#default-event-handlers)
      - [Skip Default Event Behaviors](#skip-default-event-behaviors)
- [API Methods](#api-methods)
  - [`constructor(config)`](#constructorconfig)
  - [`version(v)`](#versionv)
  - [`help(setting)`](#helpsetting)
  - [`usage(msg)`, `cmdUsage(msg)`](#usagemsg-cmdusagemsg)
  - [`init(options, commands)`](#initoptions-commands)
  - [`init2(rootCommandSpec)`](#init2rootcommandspec)
  - [`defaultCommand(name)`](#defaultcommandname)
  - [`parse(argv, start, parsed)`](#parseargv-start-parsed)
  - [`parseAsync(argv, start, parsed)`](#parseasyncargv-start-parsed)
  - [`showHelp(err, cmdName)`](#showhelperr-cmdname)
  - [`removeDefaultHandlers()`](#removedefaulthandlers)
  - [`applyConfig(config, parsed, src)`](#applyconfigconfig-parsed-src)
  - [`runExec(parsed)`](#runexecparsed)
  - [`runExecAsync(parsed)`](#runexecasyncparsed)
- [TypeScript Support](#typescript-support)
- [Best Practices](#best-practices)
- [Alternatives](#alternatives)

### `constructor(config)`

`config` is an object with:

| Property              | Type               | Description                                                                                         |
| --------------------- | ------------------ | --------------------------------------------------------------------------------------------------- |
| `name`                | `string`           | Program name. Auto-detected from `process.argv` if not specified.                                   |
| `version`             | `string \| number` | Program version. Can also set with [`version()`](#versionv) method.                                 |
| `help`                | `object \| false`  | Custom help option setting. Can also set with [`help()`](#helpsetting) method.                      |
| `usage`               | `string`           | Usage message. Can also set with [`usage()`](#usagemsg-cmdusagemsg) method.                         |
| `cmdUsage`            | `string`           | Generic usage message for commands. Can also set with [`cmdUsage()`](#usagemsg-cmdusagemsg) method. |
| `defaultCommand`      | `string`           | Name of the default command to invoke when no command is given.                                     |
| `unknownCommandFallback` | `string`        | When unknown command encountered at root, treat it as arguments to this command (e.g., `"run"`).   |
| `allowUnknownCommand` | `boolean`          | Allow unknown commands to be parsed without error.                                                  |
| `allowUnknownOption`  | `boolean`          | Allow unknown options to be parsed without error.                                                   |
| `allowDuplicateOption`| `boolean`          | Allow sub-commands to define options with the same name as parent commands.                         |
| `skipExec`            | `boolean`          | If true, will not call command `exec` handlers after parse.                                         |
| `skipExecDefault`     | `boolean`          | If true, default command will not be inserted during parsing (prevents execution).                 |
| `output`              | `function`         | Callback for printing to console. Defaults to `process.stdout.write`.                               |
| `exit`                | `function`         | Custom exit function. Defaults to emitting the `exit` event.                                        |
| `handlers`            | `object`           | Custom event handlers (see below).                                                                  |
| `noDefaultHandlers`   | `boolean`          | If true, skip installing all default handlers. You must handle errors yourself.                     |

**Handlers Example:**

The `handlers` object can specify a function for each [event](#events) or set it to `false` to turn off the default handler.

```js
const nc = new NixClap({
  handlers: {
    "parse-fail": parsed => {
      console.error("Parse failed:", parsed.errorNodes[0].error.message);
      process.exit(1);
    },
    "unknown-option": false // Disable default handler
  }
});
```

### `version(v)`

Set program version with a string. ie: `1.0.0`

Return: The `NixClap` instance itself.

> Must be called before the [`init`](#initoptions-commands) or [`init2`](#init2rootcommandspec) method.

### `help(setting)`

Set a custom option setting for invoking help. Default is:

Return: The `NixClap` instance itself.

```js
{
  alias: "h",
  desc: "Show help"
}
```

Option name is always `help`. Call `help(false)` to turn off the default `--help` option.

> Must be called before the [`init`](#initoptions-commands) or [`init2`](#init2rootcommandspec) method.

### `usage(msg)`, `cmdUsage(msg)`

Set usage message for the program or command, which can be override by individual command's own usage.

`msg` format is any string. `$0` will be replaced with program name and `$1` with command name.

Return: The `NixClap` instance itself.

> Must be called before the [`init`](#initoptions-commands) or [`init2`](#init2rootcommandspec) method.

### `init(options, commands)` - Legacy/Convenience Wrapper

**Note:** `init()` is a convenience wrapper around `init2()`. **Consider using [`init2()`](#init2rootcommandspec) directly** for a more flexible and consistent API.

Initialize your options and commands using separate parameters.

**Parameters:**

- `options` - Top-level options available globally (or to specific commands via `allowCmd`)
- `commands` - Sub-commands under the root command

Return: The `NixClap` instance itself.

**What this does internally:**

```js
// init(options, commands) is equivalent to:
init2({
  options: options,
  subCommands: commands
});
```

**Example:**

```js
import { NixClap } from "nix-clap";

// Using init()
const nc = new NixClap().init(
  { verbose: { alias: "v" } },
  { build: { desc: "Build project", exec: () => {} } }
);

// Equivalent using init2() (recommended)
const nc = new NixClap().init2({
  options: { verbose: { alias: "v" } },
  subCommands: { build: { desc: "Build project", exec: () => {} } }
});
```

**Limitations:**

- Cannot define root command arguments or exec handler directly
- Less flexible than `init2()`
- Primarily exists for backwards compatibility

> **Recommendation:** Use [`init2()`](#init2rootcommandspec) for new code - it's more powerful and provides a cleaner API.

### `init2(rootCommandSpec)` - Primary API (Recommended)

Initialize your CLI by defining the root command directly. **This is the recommended primary API for setting up NixClap.**

**Parameters:**

- `rootCommandSpec` - A command spec object that defines the root command, including:
  - `args` - Arguments for the root command (optional)
  - `exec` - Execution handler for the root command (optional)
  - `options` - Top-level options available to root and sub-commands (optional)
  - `subCommands` - Sub-commands under the root command (optional)
  - All other fields from [command spec](#commands-spec)

Return: The `NixClap` instance itself.

**Basic Example:**

```js
import { NixClap } from "nix-clap";

// Root command with arguments
const nc = new NixClap({ name: "process" }).init2({
  args: "<files string..>",
  exec: cmd => {
    const files = cmd.jsonMeta.args.files;
    console.log("Processing:", files);
  }
});
```

**Complete Example with Options and Sub-commands:**

```js
const nc = new NixClap({ name: "file-processor" }).init2({
  // Root command arguments
  args: "[input string] [files string..]",
  // Root command exec
  exec: cmd => {
    const meta = cmd.jsonMeta;
    console.log("Root command:", meta.args);
    console.log("Options:", meta.opts);
  },
  // Top-level options
  options: {
    verbose: { alias: "v", desc: "Verbose output" },
    output: { alias: "o", desc: "Output file", args: "<path string>" }
  },
  // Sub-commands
  subCommands: {
    build: {
      desc: "Build the project",
      exec: cmd => console.log("Building...")
    },
    convert: {
      desc: "Convert files",
      args: "<input string> <output string>",
      exec: cmd => console.log("Converting...")
    }
  }
});
```

**Advantages over init():**

- ✅ Define root command behavior (args + exec) directly
- ✅ Single, declarative configuration object
- ✅ More flexible and powerful
- ✅ Cleaner, more consistent API

See the [Understanding init() vs init2()](#understanding-init-vs-init2) section for detailed comparison.

### `defaultCommand(name)`

Set the default command which is invoked when no non-option arguments are provided in the command line.

**How it works:**

- When preprocessing detects only option arguments (no non-option args), the default command is inserted upfront during parsing
- All subsequent parsing happens under the default command, allowing options to be routed correctly
- The default command is executed automatically if it has an `exec` handler

**Requirements:**

- Only one command can be default
- Default command cannot have required args
- Default command must have the `exec` handler

**Example with init2():**

```js
// Make 'build' the default command
const nc = new NixClap({ defaultCommand: "build" }).version("1.0.0").init2({
  subCommands: {
    build: {
      desc: "Build the project",
      exec: cmd => console.log("Building...")
    },
    test: {
      desc: "Run tests",
      exec: cmd => console.log("Testing...")
    }
  }
});

// These are equivalent:
// $ my-prog          # Runs 'build' (default)
// $ my-prog build    # Explicitly runs 'build'
```

**How it interacts with root command:**

When using `init2()` with both a root command and a default command:

```js
const nc = new NixClap({ defaultCommand: "serve" }).init2({
  args: "[files string..]", // Root command args
  exec: cmd => console.log("Root:", cmd.jsonMeta.args.files),
  subCommands: {
    serve: { desc: "Start server", exec: () => console.log("Serving...") },
    build: { desc: "Build project", exec: () => console.log("Building...") }
  }
});
```

**Execution priority:**

1. **Sub-command match** → Executes matched sub-command
2. **Non-option arguments provided** → Executes root command
3. **Only options (no non-option args)** → Default command inserted during parsing, then executed

```bash
$ my-prog build           # 1. Executes 'build' sub-command
$ my-prog file.txt        # 2. Executes root command with args
$ my-prog                 # 3. Executes 'serve' (default command, inserted during parsing)
$ my-prog --verbose       # 3. Executes 'serve' with --verbose option (default command inserted during parsing)
```

**Note:** The default command is inserted during preprocessing when only option arguments are detected. This ensures options are correctly routed to the default command, while root-level options (if any) remain at the root level.

**Note:** When `unknownCommandFallback` is also configured, unknown commands take precedence over default command. See [`unknownCommandFallback`](#unknowncommandfallback) for details.

> **Tip:** Use default command when you have a primary action for your CLI (e.g., `serve` for a server, `build` for a build tool)

> See [examples/default-command.ts](./examples/default-command.ts)

### `unknownCommandFallback`

When an unknown command is encountered at the root level, treat it as arguments to a specified fallback command. For example, with `unknownCommandFallback: "run"`, `prog unknown` becomes `prog run unknown`.

**Requirements:**

- Only applies at root level
- Does not apply if `allowUnknownCommand` is enabled
- Fallback command must exist
- Fallback command should accept arguments (variadic or fixed)

**Example:**

```js
const nc = new NixClap({
  defaultCommand: "install",
  unknownCommandFallback: "run"
}).init2({
  subCommands: {
    install: {
      desc: "Install packages",
      exec: cmd => console.log("Installing...")
    },
    run: {
      desc: "Run a script",
      args: "[script string..]",
      exec: cmd => {
        const script = cmd.jsonMeta.argList[0];
        console.log(`Running script: ${script}`);
      }
    }
  }
});
```

**Behavior:**

```bash
$ my-prog                    # Runs 'install' (defaultCommand)
$ my-prog --verbose          # Runs 'install' with --verbose option (defaultCommand)
$ my-prog install           # Runs 'install' explicitly
$ my-prog run build         # Runs 'run' with 'build' as argument
$ my-prog build             # Unknown command → becomes 'run build'
$ my-prog test x y z        # Unknown command → becomes 'run test x y z'
```

**Interaction with `defaultCommand`:**

The `unknownCommandFallback` and `defaultCommand` work together seamlessly:

1. **No arguments or only options** → `defaultCommand` is inserted during parsing and executed
   - `prog` → runs default command (inserted during parsing)
   - `prog --verbose` → runs default command with options (inserted during parsing)

2. **First non-option argument is unknown** → `unknownCommandFallback` is triggered
   - `prog unknown` → becomes `prog <fallback> unknown`
   - The unknown command name becomes the first argument to the fallback command

3. **First non-option argument is a known command** → That command runs normally
   - `prog install` → runs `install` command
   - `prog run script` → runs `run` command with `script` as argument

**Key points:**

- Known commands work normally (`install`, `run`, etc.)
- Unknown commands are treated as arguments to the fallback command
- The unknown command name becomes the first argument to the fallback command
- Options alone (no non-option args) don't trigger fallback - they use `defaultCommand` instead

### `parse(argv, start, parsed)`

Parse command line. Call without any params to parse `process.argv`.

Return: The parse result object.

- `argv` - array of CLI args. Defaults to `process.argv`.
- `start` - index for argv from where to start parsing
- `parsed` - previous result from `parse`. If passed, then parsing will add new data to it.

### `parseAsync(argv, start, parsed)`

async version of [parse](#parseargv-start-parsed).

- It will use [runExecAsync](#runexecasyncparsed) to invoke command `exec` handlers serially.
- The command handler can return a Promise, which will be awaited.

Return: A promise the resolve with the parse result object.

### `showHelp(err, cmdName)`

Show help message and then emit `exit`.

- `err` - if valid, then `err.message` will be printed after help message and exit with code `1`.
- `cmdName` - if valid, then will print help for the specific command.

### `removeDefaultHandlers()`

Remove NixClap's default handlers for the list of [event names](#events).

If you've replaced the handler through specifying `handlers` in `config` for the constructor, then this will not remove your handler.

Return: The `NixClap` instance itself.

- You can pass in `"*"` to remove all default handlers.
- You can pass in the event names you want to remove.

ie:

```js
nc.removeDefaultHandlers("parse-fail", "unknown-option", "unknown-command");
```

### `applyConfig(config, src)`

Apply configuration from external sources (e.g., config files) to a parsed command.

**Note:** This method is called **on a CommandNode instance**, not on the NixClap instance.

**Parameters:**

- `config` - Object containing option values to apply
- `src` - Source name for tracking. Should be one of: `"cli"`, `"cli-default"`, `"cli-unmatch"`, `"default"`, or `"user"` (default: `"user"`)

This method only overrides options whose `source` does **not** start with `"cli"`, ensuring command-line arguments always take precedence.

**Example:** Load options from `package.json`:

```js
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const parsed = nc.parse();

// Apply config from package.json
// Use "user" as the source type (standard practice for external configs)
parsed.command.applyConfig(pkg.myCliConfig, "user");

console.log(parsed.command.jsonMeta.opts);
console.log(parsed.command.jsonMeta.source); // Shows where each option came from
```

### `runExec(parsed)`

Go through the commands in parsed and call their `exec` handler.

> The [`parse`](#parseargv-start-parsed) method will call this at the end unless `skipExec` flag is set.

Return: The number of commands with `exec` was invoked.

- `parsed` - The parse result object.

**Note:** Default command execution is controlled by the `skipExecDefault` config option. If `skipExecDefault` is `true`, the default command will not be inserted during parsing, and therefore won't be executed.

### `runExecAsync(parsed)`

Async version of [runExec](#runexecparsed)

Return: A promise that resolves with the number of commands with `exec` invoked.

- `parsed` - The parse result object.

## TypeScript Support

NixClap is written in TypeScript and provides full type definitions out of the box.

### Basic TypeScript Usage

```typescript
import { NixClap, CommandSpec, OptionSpec, ParseResult } from "nix-clap";

const options: Record<string, OptionSpec> = {
  verbose: {
    alias: "v",
    desc: "Enable verbose output",
    args: "<boolean>"
  }
};

const commands: Record<string, CommandSpec> = {
  build: {
    desc: "Build the project",
    exec: cmd => {
      // cmd is typed as CommandNode
      const meta = cmd.jsonMeta;
      console.log(meta.opts.verbose); // Type-safe access
    }
  }
};

const nc = new NixClap().init(options, commands);
const parsed: ParseResult = nc.parse();
```

### Using init2() with TypeScript

```typescript
import { NixClap, CommandSpec } from "nix-clap";

// Define root command spec with full type safety
const rootSpec: CommandSpec = {
  args: "[input string] [files string..]",
  desc: "Process input files",
  exec: cmd => {
    const { input, files } = cmd.jsonMeta.args;
    console.log("Processing:", input, files);
  },
  options: {
    verbose: { alias: "v", desc: "Verbose output" }
  },
  subCommands: {
    build: {
      desc: "Build the project",
      exec: () => console.log("Building...")
    }
  }
};

const nc = new NixClap().init2(rootSpec);
```

### Type-Safe Command Specs

```typescript
import { NixClap, CommandSpec, OptionSpec } from "nix-clap";

// Define options with full types
const options: Record<string, OptionSpec> = {
  output: {
    alias: "o",
    desc: "Output file path",
    args: "<path string>"
  },
  verbose: {
    alias: "v",
    desc: "Enable verbose output"
  }
};

// Define commands with full types
const commands: Record<string, CommandSpec> = {
  process: {
    args: "<files string..>",
    desc: "Process files",
    exec: cmd => {
      const { files } = cmd.jsonMeta.args;
      const { output, verbose } = cmd.jsonMeta.opts;
      console.log("Files:", files);
      console.log("Output:", output);
      console.log("Verbose:", verbose);
    }
  }
};

// Use with init2() for root command
const nc = new NixClap().init2({
  args: "[input string]",
  exec: cmd => {
    const { input } = cmd.jsonMeta.args;
    console.log("Input:", input);
  },
  options,
  subCommands: commands
});
```

**Type Safety Benefits:**

- ✅ Full IntelliSense/autocomplete support
- ✅ Compile-time checking of command specs
- ✅ Type-safe access to parsed arguments and options
- ✅ Self-documenting API through types

> See [examples/typescript-usage.ts](./examples/typescript-usage.ts)

## Best Practices

### 1. Prefer `init2()` over `init()`

```js
// ✅ Recommended - modern, flexible API
const nc = new NixClap().version("1.0.0").init2({
  args: "[files string..]",
  exec: cmd => console.log(cmd.jsonMeta.args.files),
  options: { verbose: { alias: "v" } },
  subCommands: { build: { desc: "Build", exec: () => {} } }
});

// ⚠️  Older approach - works but less flexible
const nc = new NixClap().init(
  { verbose: { alias: "v" } },
  { build: { desc: "Build", exec: () => {} } }
);
```

### 2. Call configuration methods before `init2()`

```js
// ✅ Correct order
const nc = new NixClap().version("1.0.0").usage("$0 [cmd]").init2({ options, subCommands });

// ❌ Wrong - version/usage/help must come before init2()
const nc = new NixClap().init2({ options, subCommands }).version("1.0.0"); // Too late!
```

### 3. Use `jsonMeta` for accessing parsed data

```js
// ✅ Recommended - clean and typed
const opts = parsed.command.jsonMeta.opts;
const args = parsed.command.jsonMeta.args;

// ⚠️  Avoid - raw node access is more complex
const opts = parsed.command.optNodes;
```

### 4. Handle errors properly

```js
const nc = new NixClap({ noDefaultHandlers: true }).init2({ options, subCommands });
const parsed = nc.parse();

if (parsed.errorNodes?.length > 0) {
  for (const node of parsed.errorNodes) {
    console.error(`Error: ${node.error.message}`);
  }
  process.exit(1);
}
```

### 5. Use async handlers with `parseAsync()`

```js
const nc = new NixClap().init2({
  subCommands: {
    deploy: {
      exec: async cmd => {
        await deployToServer();
      }
    }
  }
});

await nc.parseAsync(); // Waits for all async exec handlers
```

## Alternatives

Other popular CLI parsers you might consider:

- [yargs] - Feature-rich, larger footprint
- [commander] - Imperative API, widely used
- [argparse] - Python's argparse port
- [clap] - Declarative configuration
- [clap.js] - TypeScript-first

**Why NixClap?**

- Smaller and faster than yargs/commander
- More Unix-like parsing semantics
- Better support for complex command structures
- Type-safe TypeScript support
- Detailed parse results with source tracking

[optimist]: https://www.npmjs.com/package/optimist
[clap]: https://github.com/lahmatiy/clap
[clap.js]: https://github.com/litert/clap.js
[argparse]: https://github.com/nodeca/argparse
[yargs]: https://github.com/yargs/yargs
[commander]: https://github.com/tj/commander.js
[build-image]: https://github.com/jchip/nix-clap/actions/workflows/node.js.yml/badge.svg
[build-url]: https://github.com/jchip/nix-clap/actions/workflows/node.js.yml
[npm-image]: https://badge.fury.io/js/nix-clap.svg
[npm-url]: https://npmjs.org/package/nix-clap
[daviddm-image]: https://david-dm.org/jchip/nix-clap/status.svg
[daviddm-url]: https://david-dm.org/jchip/nix-clap
[daviddm-dev-image]: https://david-dm.org/jchip/nix-clap/dev-status.svg
[daviddm-dev-url]: https://david-dm.org/jchip/nix-clap?type=dev
[webpack]: https://webpack.js.org/
[coverage-image]: https://coveralls.io/repos/github/jchip/nix-clap/badge.svg?branch=master
[coverage-url]: https://coveralls.io/github/jchip/nix-clap?branch=master
