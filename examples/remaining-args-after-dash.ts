/**
 * Example demonstrating how commands can access remaining arguments after --
 *
 * When a user runs: prog cmd a b c -- d e f --blah
 * The command receives:
 * 1. a b c as its regular arguments
 * 2. d e f --blah as remaining args after -- (accessible via parsed._)
 */

import { NixClap, ParseResult } from "../src/index.ts";
import { CommandNode } from "../src/command-node.ts";

const nc = new NixClap({ name: "prog" }).init({}, {
  cmd: {
    desc: "Example command that receives args before and after --",
    args: "[args string..]",
    exec: (cmd: CommandNode, parsed?: ParseResult) => {
      console.log("Command arguments:", cmd.jsonMeta.argList);
      // Output: Command arguments: [ 'a', 'b', 'c' ]

      if (parsed && parsed._.length > 0) {
        console.log("Remaining args after --:", parsed._);
        // Output: Remaining args after --: [ 'd', 'e', 'f', '--blah' ]
      } else {
        console.log("No remaining args after --");
      }
    }
  }
});

// Example usage:
// prog cmd a b c -- d e f --blah
nc.parse(["cmd", "a", "b", "c", "--", "d", "e", "f", "--blah"]);

