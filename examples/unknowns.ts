"use strict";

import { NixClap, CommandExecFunc } from "../src/index.ts";

const nc = new NixClap({
  allowUnknownCommand: true,
  allowUnknownOptions: true,
});

const r = nc.init({}).parse(["foo", "-a=50", "--bar=60"], 0);


console.log(r.command.subCmdNodes.foo.options);
