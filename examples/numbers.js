"use strict";

const NixClap = require("..");

const sum = parsed => {
  console.log("sum:", parsed.args._.reduce((s, x) => s + x, 0));
};

const sort = parsed => {
  console.log("sorted:", parsed.args._.sort((a, b) => (parsed.opts.reverse ? b - a : a - b)));
};

new NixClap({ noActionShowHelp: true })
  .version("1.0.0")
  .usage("$0 <command> Num [Num ..]")
  .init(
    {},
    {
      sum: {
        alias: "s",
        usage: "$0 $1 num [num ..]",
        desc: "Output sum of numbers",
        args: "<number _..>",
        exec: sum
      },
      sort: {
        alias: "sr",
        usage: () => "$0 $1 num [num ..]",
        desc: "Output sorted numbers",
        args: "<number _..>",
        exec: sort,
        options: {
          reverse: {
            alias: "r",
            desc: "Sort in descending order"
          }
        }
      }
    }
  )
  .parse();
