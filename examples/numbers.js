"use strict";

const NixClap = require("..");

/*
 * Example to implement a cli program that has two commands:
 *   sum - add up numbers
 *   sort - sort numbers
 *
 * Usage: numbers sum 1 2 3 4
 *        numbers sort 5 3 3 4 3 1 [--reverse]
 */

//
// exec for command sum
//
const sum = parsed => {
  console.log("sum:", parsed.args._.reduce((s, x) => s + x, 0));
};

//
// exec for command sort
//
const sort = parsed => {
  console.log("sorted:", parsed.args._.sort((a, b) => (parsed.opts.reverse ? b - a : a - b)));
};

new NixClap({})
  .version("1.0.0")
  .usage("$0 <command> Num [Num ..]")
  .init(
    // No top level options
    {},
    // Commands
    {
      // command sum
      sum: {
        alias: "s",
        usage: "$0 $1 num [num ..]",
        desc: "Output sum of numbers",
        // takes a variadic list of numbers into an array named _
        args: "<number _..>",
        exec: sum
      },
      // command sort
      sort: {
        alias: "sr",
        usage: () => "$0 $1 num [num ..]",
        desc: "Output sorted numbers",
        // takes a variadic list of numbers into an array named _
        args: "<number _..>",
        exec: sort,
        // options for command sort
        options: {
          // sort in reverse order
          reverse: {
            alias: "r",
            desc: "Sort in descending order"
          }
        }
      }
    }
  )
  .parse();
