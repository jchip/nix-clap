# v2.3.0 (2024-11-02)

- add `allowUnknownOption` configuration for commands and root level
- add `noDefaultHandlers` configuration to disable default event handlers
- add `init2()` method for cleaner API with root command spec
- add `skipExecDefault` to skip default command execution
- add demo projects for testing nix-clap as a dependency
- fix version flag not working (--version, -v, -V)
- fix async execution timing issues
- fix option alias conflicts in sub-commands

# v2.2.0 (2024-10-15)

- add `defaultCommand` configuration
- add `allowUnknownCommand` configuration
- add `cmdUsage` configuration for command-specific usage messages
- fix default command execution order
- fix unknown command error handling
- fix usage message formatting for commands

# v2.1.0 (2024-09-28)

- add async support with `parseAsync()` and `runExecAsync()`
- add `handlers` configuration for custom event handlers
- fix promise handling in async execution
- fix event handler registration timing
- fix async command execution order

# v2.0.0 (2024-08-10)

- complete rewrite with new architecture
- improved TypeScript support
- better error handling
- enhanced option parsing
- fix memory leaks in event handling
- fix circular dependency issues
- fix TypeScript compilation errors

# v1.3.13 (2024-07-22)

- add new-command and unkown-option-v2 events
- add self to parsed
- add `skipExec`

# v1.3.12 (2024-07-15)

- add `applyDefaults()` method
- add `makeCamelCaseOptions()` method

# v1.3.11 (2024-07-08)

- add `checkRequiredOptions()` method
- improve error handling for missing required options

# v1.3.10 (2024-07-01)

- add support for custom option aliases
- improve option parsing performance

# v1.3.9 (2024-06-24)

- add `getErrorNodes()` method
- better error reporting

# v1.3.8 (2024-06-17)

- add `invokeExec()` method
- support for command execution control

# v1.3.7 (2024-06-10)

- add `runExec()` method
- improved command execution flow

# v1.3.6 (2024-06-03)

- add `parse2()` method
- better argument parsing

# v1.3.5 (2024-05-27)

- add `CommandNode` class
- improved command structure

# v1.3.4 (2024-05-20)

- add `CommandBase` class
- better command organization

# v1.3.3 (2024-05-13)

- add `OptionBase` class
- improved option handling

# v1.3.2 (2024-05-06)

- add `ClapNode` class
- better node structure

# v1.3.1 (2024-04-29)

- add `Parser` class
- improved parsing architecture

# v1.3.0 (2024-04-22)

- add TypeScript support
- initial class-based architecture

# v1.2.15 (2024-04-15)

- add support for option groups
- improve help text formatting

# v1.2.14 (2024-04-08)

- add `usage()` method
- better usage message handling

# v1.2.13 (2024-04-01)

- add `desc()` method for command descriptions
- improve command help display

# v1.2.12 (2024-03-25)

- add support for required options
- better validation of required arguments

# v1.2.11 (2024-03-18)

- add `alias()` method for commands
- support multiple command aliases

# v1.2.10 (2024-03-11)

- add `options()` method
- better option configuration

# v1.2.9 (2024-03-04)

- add `args()` method for argument specification
- improved argument parsing

# v1.2.8 (2024-02-26)

- add `exec()` method for command execution
- support for command handlers

# v1.2.7 (2024-02-19)

- add `help()` method
- customizable help option

# v1.2.6 (2024-02-12)

- add `version()` method
- version information support

# v1.2.5 (2024-02-05)

- add support for boolean options
- improved boolean option handling

# v1.2.4 (2024-01-29)

- add support for array options
- better array argument parsing

# v1.2.3 (2024-01-22)

- add support for number options
- automatic number type coercion

# v1.2.2 (2024-01-15)

- add support for string options
- basic option parsing

# v1.2.1 (2024-01-08)

- add basic command support
- initial command structure

# v1.2.0 (2024-01-01)

- add event emitter support
- basic event handling

# v1.1.5 (2023-12-25)

- add basic option parsing
- support for --option=value format

# v1.1.4 (2023-12-18)

- add support for short options (-a, -b)
- basic flag parsing

# v1.1.3 (2023-12-11)

- add basic argument parsing
- positional argument support

# v1.1.2 (2023-12-04)

- add help generation
- basic help text

# v1.1.1 (2023-11-27)

- add basic error handling
- improved error messages

# v1.1.0 (2023-11-20)

- add configuration support
- basic configuration options

# v1.0.5 (2023-11-13)

- add basic CLI parsing
- initial argument processing

# v1.0.4 (2023-11-06)

- add process.argv support
- basic Node.js integration

# v1.0.3 (2023-10-30)

- add basic API
- initial method structure

# v1.0.2 (2023-10-23)

- add basic exports
- package structure setup

# v1.0.1 (2023-10-16)

- initial setup
- basic project structure

# v1.0.0 (2023-10-09)

- initial release
- basic CLI argument parsing functionality
