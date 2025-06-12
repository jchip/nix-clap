"use strict";

import { NixClap, CommandExecFunc } from "../src/index.ts";

const nc = new NixClap({
  allowUnknownCommand: true,
  allowUnknownOption: false,
  noDefaultHandlers: true
});

const r = nc.init({}).parse(["foo", "-a=50", "--bar=60"], 0);

console.log(
  r.errorNodes?.reduce((acc, n) => {
    acc.push(...n.errors);
    return acc;
  }, [])
);
console.log(r.command.subCmdNodes.foo.options);
