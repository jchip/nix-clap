"use strict";

import { NixClap } from "../src/index.ts";

const nc = new NixClap({
  allowUnknownCommand: true,
  allowUnknownOption: true
});

const args = ["node", "xrun", "task1", "task2"];

const r = nc.init({}).parse();

console.log(Object.keys(r.command.subCmdNodes));

console.log(r.command.subCmdNodes.a.verbatimList);
