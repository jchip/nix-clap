/**
 * Using NixClap as an In-Process Module
 *
 * This example demonstrates how to use NixClap as a library/module instead of
 * a terminal application. Useful for:
 * - Daemon processes that handle CLI commands via HTTP/IPC
 * - Testing CLI parsers without process.exit()
 * - Embedded CLI in larger applications
 * - Capturing help/version output programmatically
 *
 * Key techniques:
 * - Custom output function to capture stdout
 * - Custom exit function to prevent process.exit()
 * - Handling help/version requests without terminating
 *
 * Usage:
 *   npx tsx examples/use-as-inplace-module.ts
 */

import { NixClap } from "../src/index.ts";

/**
 * Result from executing a CLI command in-process
 */
interface CLIResult {
  success: boolean;
  output: string;
  exitCode: number;
  error?: string;
}

/**
 * Create a CLI parser configured for in-process use
 */
function createInProcessCLI() {
  // Capture all output instead of writing to stdout
  let capturedOutput = '';

  // Capture exit code without calling process.exit()
  let exitCode: number | null = null;

  const nc = new NixClap({
    name: 'mytool',
    // Custom output handler - captures instead of writing to stdout
    output: (text: string) => {
      capturedOutput += text;
    },
    // Custom exit handler - captures code without exiting process
    exit: (code: number) => {
      exitCode = code;
      // Note: We don't call process.exit() here!
    },
    // Keep default handlers enabled so help/version work
    // but they'll use our custom output/exit functions
    noDefaultHandlers: false,
    skipExec: true  // We'll handle exec ourselves
  })
    .version('1.0.0')
    .usage('$0 [options] <command>')
    .init2({
      options: {
        verbose: {
          alias: 'v',
          desc: 'Enable verbose output'
        },
        config: {
          alias: 'c',
          desc: 'Config file path',
          args: '<file string>'
        }
      },
      subCommands: {
        build: {
          desc: 'Build the project',
          args: '[files string..]',
          options: {
            watch: {
              alias: 'w',
              desc: 'Watch for changes'
            }
          }
        },
        test: {
          desc: 'Run tests',
          args: '[pattern string]',
          options: {
            coverage: {
              desc: 'Generate coverage report'
            }
          }
        }
      }
    });

  return {
    nc,
    getOutput: () => capturedOutput,
    getExitCode: () => exitCode,
    resetCapture: () => {
      capturedOutput = '';
      exitCode = null;
    }
  };
}

/**
 * Execute a CLI command in-process and return the result
 */
function executeCLICommand(argv: string[]): CLIResult {
  const { nc, getOutput, getExitCode, resetCapture } = createInProcessCLI();

  // Reset capture state
  resetCapture();

  try {
    // Parse the command line
    const parsed = nc.parse(argv, 0);

    // Check if help/version was triggered (via custom exit handler)
    const exitCode = getExitCode();
    if (exitCode !== null) {
      // Help or version was shown
      return {
        success: exitCode === 0,
        output: getOutput(),
        exitCode
      };
    }

    // Check for parse errors
    if (parsed.errorNodes && parsed.errorNodes.length > 0) {
      const errors = parsed.errorNodes.map(n => n.error.message).join(', ');
      return {
        success: false,
        output: getOutput(),
        exitCode: 1,
        error: errors
      };
    }

    // Get the command that was invoked
    const meta = parsed.command.jsonMeta;
    const subCommands = meta.subCommands || {};
    const commandName = Object.keys(subCommands).find(cmd => subCommands[cmd]);

    if (!commandName) {
      return {
        success: false,
        output: getOutput(),
        exitCode: 1,
        error: 'No command specified'
      };
    }

    // Execute the command logic
    let result = '';
    const opts = meta.opts;
    const args = subCommands[commandName].args || {};

    switch (commandName) {
      case 'build':
        result = `Building project...\n`;
        if (args.files && args.files.length > 0) {
          result += `Files: ${args.files.join(', ')}\n`;
        }
        if (opts.watch) {
          result += `Watch mode: enabled\n`;
        }
        if (opts.verbose) {
          result += `Verbose: enabled\n`;
        }
        result += `Build completed successfully!\n`;
        break;

      case 'test':
        result = `Running tests...\n`;
        if (args.pattern) {
          result += `Pattern: ${args.pattern}\n`;
        }
        const testOpts = subCommands[commandName].opts || {};
        if (testOpts.coverage) {
          result += `Coverage: enabled\n`;
        }
        result += `Tests passed!\n`;
        break;

      default:
        return {
          success: false,
          output: '',
          exitCode: 1,
          error: `Unknown command: ${commandName}`
        };
    }

    return {
      success: true,
      output: result + getOutput(),
      exitCode: 0
    };

  } catch (error: any) {
    return {
      success: false,
      output: getOutput(),
      exitCode: 1,
      error: error.message
    };
  }
}

/**
 * Demonstrate in-process CLI usage
 */
function demo() {
  console.log('=== NixClap In-Process Module Demo ===\n');

  // Test 1: Help request
  console.log('Test 1: Request help');
  console.log('Command: mytool --help');
  const helpResult = executeCLICommand(['--help']);
  console.log('Result:', {
    success: helpResult.success,
    exitCode: helpResult.exitCode
  });
  console.log('Output:\n' + helpResult.output);
  console.log('---\n');

  // Test 2: Version request
  console.log('Test 2: Request version');
  console.log('Command: mytool --version');
  const versionResult = executeCLICommand(['--version']);
  console.log('Result:', {
    success: versionResult.success,
    exitCode: versionResult.exitCode
  });
  console.log('Output:', versionResult.output);
  console.log('---\n');

  // Test 3: Build command
  console.log('Test 3: Execute build command');
  console.log('Command: mytool build src/main.ts src/utils.ts --watch --verbose');
  const buildResult = executeCLICommand(['build', 'src/main.ts', 'src/utils.ts', '--watch', '--verbose']);
  console.log('Result:', {
    success: buildResult.success,
    exitCode: buildResult.exitCode
  });
  console.log('Output:\n' + buildResult.output);
  console.log('---\n');

  // Test 4: Test command with coverage
  console.log('Test 4: Execute test command');
  console.log('Command: mytool test "**/*.test.ts" --coverage');
  const testResult = executeCLICommand(['test', '**/*.test.ts', '--coverage']);
  console.log('Result:', {
    success: testResult.success,
    exitCode: testResult.exitCode
  });
  console.log('Output:\n' + testResult.output);
  console.log('---\n');

  // Test 5: Command help
  console.log('Test 5: Request help for specific command');
  console.log('Command: mytool --help build');
  const cmdHelpResult = executeCLICommand(['--help', 'build']);
  console.log('Result:', {
    success: cmdHelpResult.success,
    exitCode: cmdHelpResult.exitCode
  });
  console.log('Output:\n' + cmdHelpResult.output);
  console.log('---\n');

  // Test 6: Error case
  console.log('Test 6: Invalid command');
  console.log('Command: mytool invalid');
  const errorResult = executeCLICommand(['invalid']);
  console.log('Result:', {
    success: errorResult.success,
    exitCode: errorResult.exitCode,
    error: errorResult.error
  });
  console.log('---\n');

  console.log('✅ Demo completed - process did not exit!');
  console.log('Notice: All commands were executed in-process without calling process.exit()');
}

// Run the demo
demo();
