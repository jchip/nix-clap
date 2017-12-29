[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]
[![Dependency Status][daviddm-image]][daviddm-url] [![devDependency Status][daviddm-dev-image]][daviddm-dev-url]

# NixClap

A comprehensive and straightforward approach to Un\*x Command Line Argument Parsing for NodeJS.

# Features

* Parsing capabilities similar to conventional Un\*x parsing.
* Parsing can be resumed after it's terminated by `--`.
* A simple and straightforward JSON interface for specifying options and commands.
* No dependencies

# Parsing Capabilities

## Options

Example: `prog -xazvf=hello --foo-option hello bar -- --enable-blah`

* Support `-` single char options or `--` long form options.
* Options can have aliases.
* Both option forms can have argument specified with `=` or space.
  * ie: long form `--foo-option=bar` or `--foo-option bar`
  * ie: short form `-f=bar` or `-f bar`
* Both option forms can have variadic array args.
  * ie: `--foo-option hello bar` or `-f hello bar`
  * array args can have an optional type
* `-` options can be compounded, like `-xazvf`.
  * Last char can have args, like `-xazvf=hello` or `-xazvf hello`.
  * Other chars are treated as `boolean` options automatically.
* Variadic array args can be terminated with `--`.
  * ie: `cmd1 arg1 arg2 --some-array abc def ghi -- cmd2 arg1 arg2`.
* Allow arbitrary unknown options but with arguments specified through `=` only.
  * Since it's ambiguous whether to take a non-option arg following an unknown option as an argument or a command.
* Counting number of option occurrences.
* Boolean option can be negated with `--no-` prefix.

## Commands

Example: `prog sum 1 2 3 4`

* Commands can have optional or required arguments.
  * Each argument type defaults to `string`, but can have an optional type
* Commands can have aliases.
* Possible to specify multiple commands.
* Commands can have variadic array arguments.
* Variadic array args can be terminated with `--`.
  * ie: `prog order pizza soda -- pickup` (specifies two commands: `order` and `pickup`)
* Command can have its own options that are binded to it only.
* Top level options can be binded to specific commands only.
* Unbind top level options can be specified before or after commands.
* Allow arbitrary unknown commands that do not have arguments.

## Terminating and Resuming

* `--` terminates parsing if not gathering variadic arguments for a command or an option.
* Parsing can be resumed after it's terminated.

# Install

```bash
npm i nix-clap --save
```

# Interface

This module exposes a class with a few methods.

See [APIs](#apis) for more details.

## Example

```js
const NixClap = require("nix-clap");

const parsed = new NixClap()
  .version("1.0.0")
  .usage("$0 [options] <command> [options]")
  .init(options, commands)
  .parse();

console.log(parsed.opts);
```

> `version`, `help`, and `usage` must be called before `init`

See [examples](./examples) folder for more working samples.

## `options spec`

```js
const options = {
  "some-option": {
    alias: ["s", "so"],
    type: "string",
    desc: "description",
    default: "foo",
    requireArg: true,
    allowCmd: ["cmd1", "cmd2"]
  },
  "another-option": {}
};
```

Where:

* `alias` - Specify aliases for the option, as a single string or an array of strings.
* `type` - Type of argument for the option, one of: `string`, `number`, `boolean`, `array`, `count`
  * `array` can set type of elements as one of `string`, `number`, `boolean` like this: `number array`
* `desc` - Description for the option - a string or a function that returns string.
* `default` - Default value to use for argument
* `requireArg` - `true`|`false` whether argument for the option is required.
* `allowCmd` - list of command names this option is allow to follow only.

## `commands spec`

```js
const commands = {
  cmd1: {
    alias: ["c"],
    args: "<arg1> [arg2..]",
    usage: "$0 $1",
    desc: "description",
    exec: argv => {},
    default: true,
    options: {}
  },
  cmd2: {}
};
```

Where:

* `alias` - Specify aliases for the command, as a single string or an array of strings.
* `args` - Specify arguments for the command. `<>` means it's required and `[]` optional.
  * all required args must be before optional args
  * last one can specify variadic args with `..`, like `<names..>` or `[names..]`
  * If you just want to get the list of args without naming it, you can specify with `<..>` or `[..]`
  * named args can have an optional type like `<number value>` or `[number values..]`
    * supported types are `number`, `string`, `boolean`
* `usage` - usage message when help for the command is invoked - a string or a function that returns a string.
  * `$0` will be replaced with program name and `$1` with command name.
* `desc` - Description for the command - can be a string or a function that returns a string.
* `exec` - The callback handler for the command - see [here](#command-exec-handler) for more details.
* `default` - If true, set the command as default, which is invoked when no command was given in command line.
  * Only one command can be default.
  * Default command cannot have required args and must have the `exec` handler
* `options` - List of options arguments private to the command. Follows the same spec as [top level options](#options-spec)

## Result

The method `parse` returns an object:

```js
{
  source: {},
  opts: {},
  commands: [],
  index: 5
}
```

Where:

* `index` - the index in `argv` parse stopped

- `source` and `opts` - object containing info for the options with names in camelCase form.

For example, the option `--foo-bar=test` would add:

```js
{
  source: {
    fooBar: "cli";
  }
  opts: {
    fooBar: "test";
  }
}
```

This tells that the value for `fooBar` was specified by the user in the command line and its value is `test`.

Possible sources are: `cli`, `default`

### `commands`

The `commands` object is an array of parsed commands:

```js
{
  commands: [
    {
      name: "cmdName",
      long: "cmdName",
      unknown: false,
      args: {
        foo: "bar",
        variadic: ["a", "b"]
      },
      argList: ["bar", "a", "b"],
      opts: {},
      source: {}
    }
  ];
}
```

* `name` is the name of the command used by the user in the command line that could be an alias
* `long` is the original form of the command name (not the alias)
* `unknown` - `true` if the command is not known
* `args` - the processed named arguments
* `argList` - list of all the arguments in unprocessed string form
* `opts`, `source` - info for the options private to the command

### Command `exec` handler

If the command has an `exec` handler, it will be called with the object:

```js
{
  name: "cmdName",
  long: "cmdName",
  args: {
    foo: "bar",
    variadic: [ "a", "b" ]
  },
  argList: [ "bar", "a", "b" ],
  opts: {},
  source: {}
}
```

Where `opts` and `source` contain both the command's private options and top level options.

## Events

`NixClap` emits these events:

* `help` - when `--help` is invoked
* `version` - when `--version` is invoked
* `parse-fail` - when parse failed, emitted with error object
* `unknown-option` - when an unknown option is found, emitted with option name
* `unknown-command` - when an unknown command is found, emitted with command context, which has `name` field.
* `no-action` - when no command trigger an `exec` call.

> If you want to skip the default behavior of outputing help and exit on `parse-fail`, you can rethrow the error in your `parse-fail` event handler and catch the error from `NixClap.parse`.

ie:

```js
nc.on("parse-fail", e => {
  throw e;
});
try {
  const parsed = nc.parse();
} catch (e) {
  // handle the parse error here
}
```

## APIs

These are methods `NixClap` class supports.

### `constructor(config)`

`config` is object with:

* `name` - set the program name. Will auto detect from `process.argv` if not specified.
* `version` - set the program version. Can also set with `version` method.
* `help` - custom help option setting. Can also set with `help` method.
* `usage` - usage message. Can also set with `usage` method.
* `cmdUsage` - generic usage message for commands. Can also set with `cmdUsage` method.
* `exit` - callback for exit program. Should take numeric exit code as param. Default to calling `process.exit`
* `output` - callback for printing to console. Should take string as param. Default to calling `process.stdout.write`
* `noActionShowHelp` - boolean. If `true`, will install default handler for `no-action` event to call `showHelp` method. Default: `false`
* `allowUnknownOption` - boolean. If `true`, will not fail when unknown option is seen. Default: `false`
  * Can also be done by calling `allowUnknownOption` method after constructor.
* `allowUnknownCommand` - boolean. If `true`, will not fail when unknown command is seen. Default: `false`
  * Can also be done by calling `allowUnknownCommand` method after constructor.

### `version(v)`

Set program version with a string. ie: `1.0.0`

### `help(setting)`

Set a custom option setting for invoking help. Default is:

```js
{
  alias: "h",
  desc: "Show help"
}
```

Option name is always `help`. Call `help(false)` to turn off the default `--help` option.

### `usage(msg)`, `cmdUsage(msg)`

Set usage message for the program or command, which can be override by individual command's own usage.

`msg` format is any string. `$0` will be replaced with program name and `$1` with command name.

### `init(options, commands)`

Initialize your options and commands

### `parse(argv, start, parsed)`

Parse command line. Call without any params to parse `process.argv`.

* `argv` - array of CLI args. Defaults to `process.argv`.
* `start` - index for argv from where to start parsing
* `parsed` - previous result from `parse`. If passed, then parsing will add new data to it.

### `showHelp(err, cmdName)`

Show help message and then call `exit`.

* `err` - if valid, then `err.message` will be printed after help message and exit with code `1`.
* `cmdName` - if valid, then will print help for the specific command.

# Others

* [argparse]
* [yargs]
* [commander]
* [optimist]
* [clap]
* [clap.js]

[optimist]: https://www.npmjs.com/package/optimist
[clap]: https://github.com/lahmatiy/clap
[clap.js]: https://github.com/litert/clap.js
[argparse]: https://github.com/nodeca/argparse
[yargs]: https://github.com/yargs/yargs
[commander]: https://github.com/tj/commander.js
[travis-image]: https://travis-ci.org/jchip/nix-clap.svg?branch=master
[travis-url]: https://travis-ci.org/jchip/nix-clap
[npm-image]: https://badge.fury.io/js/nix-clap.svg
[npm-url]: https://npmjs.org/package/nix-clap
[daviddm-image]: https://david-dm.org/jchip/nix-clap/status.svg
[daviddm-url]: https://david-dm.org/jchip/nix-clap
[daviddm-dev-image]: https://david-dm.org/jchip/nix-clap/dev-status.svg
[daviddm-dev-url]: https://david-dm.org/jchip/nix-clap?type=dev
