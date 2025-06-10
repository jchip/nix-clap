"use strict";

import { NixClap } from "../src/index.ts";

const nc = new NixClap({
    allowUnknownCommand: true,
    allowUnknownOptions: true,
});

const args = ["node", "xrun", "task1", "task2"];

const r = nc.init({}).parse(args, 2);

console.log(Object.keys(r.command.subCmdNodes));
