[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]
[![Dependency Status][daviddm-image]][daviddm-url] [![devDependency Status][daviddm-dev-image]][daviddm-dev-url]

# NixClap

Simple, lightweight, flexible, and comprehensive Un\*x Command Line Argument Parsing for NodeJS.

# Features

* Comprehensive and flexible parsing capabilities similar to conventional Un\*x parsing.
* Parsing can be resumed after it's terminated by `--`.
* A simple and straightforward JSON interface for specifying options and commands.
* Lightweight with minimal dependencies
* [Webpack] friendly - allows bundling your cli into a single JS file with webpack

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
* Allow custom value type coercions with a function or RegExp.

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
* Allow multiple custom value type coercions for each command.

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
* `type` - Type of argument for the option, one of: `string`, `number`, `float`, `boolean`, `array`, `count`, or [coercion](#value-coercion)
  * `array` can set type of elements as one of `string`, `number`, `float`, `boolean` like this: `number array` or `float array`
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
    * supported types are `number`, `float`, `string`, `boolean`, or [coercion](#value-coercion)
* `usage` - usage message when help for the command is invoked - a string or a function that returns a string.
  * `$0` will be replaced with program name and `$1` with command name.
* `desc` - Description for the command - can be a string or a function that returns a string.
* `exec` - The callback handler for the command - see [here](#command-exec-handler) for more details.
* `default` - If true, set the command as default, which is invoked when no command was given in command line.
  * Only one command can be default.
  * Default command cannot have required args and must have the `exec` handler
* `options` - List of options arguments private to the command. Follows the same spec as [top level options](#options-spec)

## Value Coercion

If none of the predefined types work for you, you can specify your own as a function or a RegExp, or any value.

You use any valid identifier for the value type, and then you define a field with the same name in your spec that can be:

* `function` - will be called with the value to convert
* `RegExp` - will be used to match the value. `undefined` is returned if it didn't match.
* Anything else - will be used as the converted value.

For example:

```js
const options = {
  customFn: {
    type: "fnval",
    fnval: value => {
      return value.substr(0, 1);
    }
  },
  customRegex: {
    type: "rx",
    rx: /^test$/i
  },
  customAny: {
    type: "foo",
    foo: "bar"
  }
};

const commands = {
  foo: {
    args: "<type1 value1> <type2 value2>",
    type1: value => `test-${value}`,
    type2: /^test$/i
  }
};
```

## Parse Result

Use the method [`parse`](#parseargv-start-parsed) to parse command line arguments. It will return a parse result object.

```js
{
  source: {},
  opts: {},
  verbatim: {},
  commands: [],
  index: 5,
  error
}
```

Where:

* `index` - the index in `argv` parse stopped
* `error` - If parse failed and your `parse-fail` event handler throws, then this will contain the parse error. See [skip default event behaviors](#skip-default-event-behaviors) for more details.
* `source`, `opts`, `verbatim` - objects containing info for the options. See [details here](#parse-result-source-and-opts-objects)
* `commands` - array of parsed command objects. See [`commands`](#parse-result-commands-object) for more details.

If any command with [`exec` handlers](#command-exec-handler) were specified, then `parse` will invoke them before returning the parse result object.

### Parse Result `source` and `opts` objects

* `opts` - contains actual value for each option
* `source` - contains info about where the option value came from

  * `cli` - option specified by user in the command line
  * `default` - default value in your [options spec](#options-spec)
  * `user` - values you applied by calling the [`applyConfig`](#applyconfigconfig-parsed-src) method

* `verbatim` - contains original unprocessed value as given by the user in the command line

  * This is an array of values if there was actual values from the user
  * If there's no explicit value (ie. boolean or counting options), then this doesn't contain a field for the option.
  * If it's a boolean but the user specified with `--no-` prefix, then this contains a field with the value `["no-"]`

For example, with the following conditions:

1. User specified `--foo-bar=test` in the command line
1. You have an option `fooDefault` with default value `bar`
1. You called `applyConfig` with `applyConfig({fooConfig: 1, fooBar: "oops"}, parsed)`

You would get the following in the parse result object:

```js
{
  source: {
    fooBar: "cli",
    fooDefault: "default",
    fooConfig: "user"
  },
  opts: {
    fooBar: "test",
    fooDefault: "bar",
    fooConfig: 1
  },
  verbatim: {
    fooBar: ["test"]
  }
}
```

> Note that the value `oops` for `fooBar` passed to `applyConfig` is not used since user's specified value is used.

### Parse Result `commands` object

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
      source: {},
      verbatim: {}
    }
  ];
}
```

* `name` is the name of the command used by the user in the command line that could be an alias
* `long` is the original form of the command name (not the alias)
* `unknown` - `true` if the command is not known
* `args` - the processed named arguments
* `argList` - list of all the arguments in unprocessed string form
* `opts`, `source`, `verbatim` - info for the options private to the command

### Command `exec` handler

If the command has an `exec` handler, then it will be called with the object:

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
  source: {},
  verbatim: {}
}
```

Where `opts` and `source` contain both the command's private options and top level options.

> You can turn this off with the `skipExec` config flag passed to [`NixClap` constructor](#constructorconfig)

## Events

`NixClap` emits these events:

* `help` - when `--help` is invoked, emitted with the parse result object.
* `version` - when `--version` is invoked, emitted with the parse result object.
* `parsed` - when all parsing is done but before command `exec` are invoked, emitted with `{ nixClap, parsed }` where `nixClap` is the NixClap instance.
* `parse-fail` - when parse failed, emitted with parse result object, which has `error` field.
* `unknown-option` - when an unknown option is found, emitted with option name
* `unknown-command` - when an unknown command is found, emitted with command context, which has `name` field.
* `no-action` - when you have commands with `exec` and user specified no command that triggered an `exec` call.
* `exit` - When program is expected to terminate, emit with exit code.

### Default Event Handlers

NixClap has default handlers for these events:

* `help` - Output help and emit `exit`
* `version` - If `version` has been set, then output version and emit `exit`.
* `parse-fail` - Output help and error message, and emit `exit`.
* `unknown-option` - Throws Error `Unknown option ${name}`
* `unknown-command` - Throws Error `Unkown command ${ctx.name}`
* `no-action` - Output help with error `No command given` and emit `exit`
* `exit` - calls `process.exit(code)`

#### Skip Default Event Behaviors

You can remove the default event handlers with one of these approaches:

* With the [`removeDefaultHandlers`](#removedefaulthandlers) method.
* By passing in `handlers` object in the `config` for the constructor.

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

* [`constructor(config)`](#constructorconfig)
* [`version(v)`](#versionv)
* [`help(setting)`](#helpsetting)
* [`usage(msg), cmdUsage(msg)`](#usagemsg-cmdusagemsg)
* [`init(options, commands)`](#initoptions-commands)
* [`parse(argv, start, parsed)`](#parseargv-start-parsed)
* [`parseAsync(argv, start, parsed)`](#parseasyncargv-start-parsed)
* [`showHelp(err, cmdName)`](#showhelperr-cmdname)
* [`removeDefaultHandlers()`](#removedefaulthandlers)
* [`applyConfig(config, parsed, src)`](#applyconfigconfig-parsed-src)
* [`runExec(parsed, skipDefault)`](#runexecparsed-skipdefault)
* [`runExecAsync(parsed, skipDefault)`](#runexecasyncparsed-skipdefault)

### `constructor(config)`

`config` is object with:

* `name` - set the program name. Will auto detect from `process.argv` if not specified.
* `version` - set the program version. Can also set with [`version`](#versionv) method.
* `help` - custom help option setting. Can also set with [`help`](#helpsetting) method.
* `usage` - usage message. Can also set with [`usage`](#usagemsg-cmdusagemsg) method.
* `cmdUsage` - generic usage message for commands. Can also set with [`cmdUsage`](#usagemsg-cmdusagemsg) method.
* `skipExec` - If true, will not call command `exec` handlers after parse.
* `skipExecDefault` - if true, will not call default command `exec` handler after parse.
  * In case you need to do something before invoking the `exec` handlers, you can set these flags and call the [`runExec(parsed, skipDefault)`](#runexecparsed-skipdefault) method yourself.
* `output` - callback for printing to console. Should take string as param. Default to calling `process.stdout.write`
* `handlers` - custom event handlers.

The `handlers` object can specify a function for each of the [events](#events) or set it to `false` to turn off the default handler.

For example, this config will replace handler for `parse-fail` and turn off the default `unknown-option` handler.

```js
const nc = new NixClap({
  handlers: {
    "parse-fail": (parsed) => { ... },
    "unknown-option": false
  }
});
```

### `version(v)`

Set program version with a string. ie: `1.0.0`

Return: The `NixClap` instance itself.

> Must be called before the [`init`](#initoptions-commands) method.

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

> Must be called before the [`init`](#initoptions-commands) method.

### `usage(msg)`, `cmdUsage(msg)`

Set usage message for the program or command, which can be override by individual command's own usage.

`msg` format is any string. `$0` will be replaced with program name and `$1` with command name.

Return: The `NixClap` instance itself.

> Must be called before the [`init`](#initoptions-commands) method.

### `init(options, commands)`

Initialize your options and commands

Return: The `NixClap` instance itself.

### `parse(argv, start, parsed)`

Parse command line. Call without any params to parse `process.argv`.

Return: The parse result object.

* `argv` - array of CLI args. Defaults to `process.argv`.
* `start` - index for argv from where to start parsing
* `parsed` - previous result from `parse`. If passed, then parsing will add new data to it.

### `parseAsync(argv, start, parsed)`

async version of [parse](#parseargv-start-parsed).

* It will use [runExecAsync](#runexecasyncparsed-skipdefault) to invoke command `exec` handlers serially.
* The command handler can return a Promise, which will be awaited.

Return: A promise the resolve with the parse result object.

### `showHelp(err, cmdName)`

Show help message and then emit `exit`.

* `err` - if valid, then `err.message` will be printed after help message and exit with code `1`.
* `cmdName` - if valid, then will print help for the specific command.

### `removeDefaultHandlers()`

Remove NixClap's default handlers for the list of [event names](#events).

If you've replaced the handler through specifying `handlers` in `config` for the constructor, then this will not remove your handler.

Return: The `NixClap` instance itself.

* You can pass in `"*"` to remove all default handlers.
* You can pass in the event names you want to remove.

ie:

```js
nc.removeDefaultHandlers("parse-fail", "unknown-option", "unknown-command");
```

### `applyConfig(config, parsed, src)`

Allow you to apply extra config to the parsed object, overriding any `opts` with `source` not equal to `cli`.

For example, you can allow user to specify options in their `package.json` file, and apply those after the command line is parsed.

* `config` - Config object containing user options config
* `parsed` - The parse result object from NixClap.
* `src` - String, source to set if override. Default to `user`

Example on applying user config from `package.json`:

```js
const pkg = require(path.resolve("package.json"));
const parsed = nc.parse();
nc.applyConfig(pkg.cliConfig, parsed);
```

### `runExec(parsed, skipDefault)`

Go through the commands in parsed and call their `exec` handler.

> The [`parse`](#parseargv-start-parsed) method will call this at the end unless `skipExec` flag is set.

Return: The number of commands with `exec` was invoked.

* `parsed` - The parse result object.
* `skipDefault` - `boolean`, if `true` then do not invoke default command's `exec` handler when no command with `exec` handler was given.

### `runExecAsync(parsed, skipDefault)`

async version of [runExec](#runexecparsed-skipdefault)

Return: A promise that resolve with the number of commands with `exec` invoked.

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
[webpack]: https://webpack.js.org/
