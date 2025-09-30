import { describe, expect, it } from "vitest";
import { NixClap } from "../../src/nix-clap.ts";
import { CommandNode } from "../../src/command-node.ts";

describe("init2", () => {
  const noop = () => undefined;
  const noOutputExit = { output: noop, exit: noop };

  it("should initialize with a clean root command spec", () => {
    const nc = new NixClap({ name: "test-cli", ...noOutputExit }).init2({
      desc: "Test CLI",
      args: "[files..]",
      options: {
        verbose: { alias: "v", desc: "Verbose output" },
        debug: { alias: "d", desc: "Debug mode" }
      },
      subCommands: {
        build: {
          desc: "Build the project",
          args: "<target string>",
          exec: (cmd: CommandNode) => {
            // Build handler
          }
        },
        test: {
          desc: "Run tests",
          exec: (cmd: CommandNode) => {
            // Test handler
          }
        }
      }
    });

    const { command: root } = nc.parse2(["build", "production", "--verbose"]);
    const build = root.subCmdNodes.build;
    expect(build.name).toBe("build");
    expect(build.jsonMeta.args.target).toBe("production");
    expect(root.jsonMeta.opts.verbose).toBe(true);
  });

  it("should handle root command with exec and args", () => {
    let rootExecuted = false;
    let receivedFiles: string[] = [];

    const nc = new NixClap({ name: "test-cli", skipExec: true, ...noOutputExit }).init2({
      desc: "Test CLI",
      args: "[files string..]",
      options: {
        verbose: { alias: "v", desc: "Verbose output" }
      },
      exec: (cmd: CommandNode) => {
        rootExecuted = true;
        receivedFiles = cmd.jsonMeta.args.files || [];
      },
      subCommands: {
        build: {
          desc: "Build the project",
          exec: (cmd: CommandNode) => {
            // Build handler
          }
        }
      }
    });

    const parsed = nc.parse2(["file1.txt", "file2.txt", "--verbose"]);
    nc.runExec(parsed);

    expect(rootExecuted).toBe(true);
    expect(receivedFiles).toEqual(["file1.txt", "file2.txt"]);
    expect(parsed.command.jsonMeta.opts.verbose).toBe(true);
  });

  it("should handle root command without exec or args", () => {
    const nc = new NixClap({ name: "test-cli", ...noOutputExit }).init2({
      desc: "Test CLI",
      options: {
        verbose: { alias: "v", desc: "Verbose output" }
      },
      subCommands: {
        build: {
          desc: "Build the project",
          exec: (cmd: CommandNode) => {
            // Build handler
          }
        }
      }
    });

    const { command: root } = nc.parse2(["build", "--verbose"]);
    const build = root.subCmdNodes.build;
    expect(build.name).toBe("build");
    expect(root.jsonMeta.opts.verbose).toBe(true);
  });

  it("should handle nested subcommands", () => {
    const nc = new NixClap({ name: "test-cli", ...noOutputExit }).init2({
      desc: "Test CLI",
      options: {
        verbose: { alias: "v" }
      },
      subCommands: {
        docker: {
          desc: "Docker commands",
          options: {
            host: { args: "<url string>", desc: "Docker host" }
          },
          subCommands: {
            build: {
              desc: "Build docker image",
              args: "<tag string>",
              exec: (cmd: CommandNode) => {
                // Docker build handler
              }
            },
            push: {
              desc: "Push docker image",
              args: "<tag string>",
              exec: (cmd: CommandNode) => {
                // Docker push handler
              }
            }
          }
        }
      }
    });

    const { command: root } = nc.parse2(["docker", "--host", "tcp://localhost:2375", "build", "myimage:latest", "--verbose"]);
    const docker = root.subCmdNodes.docker;
    const build = docker.subCmdNodes.build;
    expect(build.name).toBe("build");
    expect(build.jsonMeta.args.tag).toBe("myimage:latest");
    expect(docker.jsonMeta.opts.host).toBe("tcp://localhost:2375");
    expect(root.jsonMeta.opts.verbose).toBe(true);
  });

  it("should handle root command with custom types", () => {
    const nc = new NixClap({ name: "test-cli", skipExec: true, ...noOutputExit }).init2({
      desc: "Test CLI",
      args: "[port port]",
      customTypes: {
        port: (val: string) => {
          const num = parseInt(val, 10);
          if (num < 1 || num > 65535) {
            throw new Error("Invalid port");
          }
          return num;
        }
      },
      exec: (cmd: CommandNode) => {
        // Handler
      }
    });

    const parsed = nc.parse2(["8080"]);
    expect(parsed.command.jsonMeta.args.port).toBe(8080);
  });

  it("should handle root command with allowUnknownOption", () => {
    const nc = new NixClap({ name: "test-cli", ...noOutputExit }).init2({
      desc: "Test CLI",
      args: "[files..]",
      allowUnknownOption: true,
      options: {
        verbose: { alias: "v" }
      }
    });

    const parsed = nc.parse2(["--verbose", "--unknown", "--another"]);
    expect(parsed.command.jsonMeta.opts.verbose).toBe(true);
    expect(parsed.command.jsonMeta.opts.unknown).toBe(true);
    expect(parsed.command.jsonMeta.opts.another).toBe(true);
  });

  it("should only add ROOT_CMD when exec or args are present", () => {
    const nc1 = new NixClap({ name: "test-cli", ...noOutputExit }).init2({
      desc: "Test CLI without exec or args",
      options: { verbose: {} },
      subCommands: { build: { exec: () => {} } }
    });

    const nc2 = new NixClap({ name: "test-cli", skipExec: true, ...noOutputExit }).init2({
      desc: "Test CLI with exec",
      options: { verbose: {} },
      exec: (cmd: CommandNode) => {},
      subCommands: { build: { exec: () => {} } }
    });

    const nc3 = new NixClap({ name: "test-cli", ...noOutputExit }).init2({
      desc: "Test CLI with args",
      args: "[files..]",
      options: { verbose: {} },
      subCommands: { build: { exec: () => {} } }
    });

    // All should parse successfully
    expect(() => nc1.parse2(["build"])).not.toThrow();
    expect(() => nc2.parse2(["file.txt"])).not.toThrow();
    expect(() => nc3.parse2(["file.txt"])).not.toThrow();
  });
});
