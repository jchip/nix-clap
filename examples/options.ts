"use strict";

import { NixClap, CommandExecFunc } from "../src/index.ts";

const nc = new NixClap({
  allowUnknownCommand: true,
  allowUnknownOption: true
}).init({
  a: {
    alias: "a",
    args: "< string>"
  }
});

const r = nc.parse(["-a", "50"], 0);

console.log(r.command.opts.a);
