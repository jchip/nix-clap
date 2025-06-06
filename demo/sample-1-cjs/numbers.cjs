"use strict";

const { NixClap } = require("nix-clap");

/*
 * Example to implement a cli program that has these commands:
 *   sum - add up numbers
 *   sort - sort numbers
 *   times - multiply numbers
 *   divide - divide two numbers
 *
 * Usage: numbers sum 1 2 3 4
 *        numbers sort 5 3 3 4 3 1 [--reverse]
 *        numbers times 3 4 5 6 7
 *        numbers divide 9 3
 */

//
// exec for command sum
//
const sum = cmd => {
  const json = cmd.jsonMeta;
  console.log(
    "sum:",
    json.args._.reduce((s, v) => s + v, 0)
  );
};

//
// exec for command sort
//
const sort = cmd => {
  const json = cmd.jsonMeta;
  const numbers = [...json.args._];
  const sorted = numbers.sort((a, b) => (json.opts.reverse ? b - a : a - b));
  console.log("sort:", sorted);
};

new NixClap({
  allowUnknownCommand: true
})
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
        // takes a variadic list of numbers into an array
        args: "<_ number..>",
        exec: sum
      },
      // command sort
      sort: {
        desc: "Output sorted numbers",
        alias: "sr",
        usage: () => "$0 $1 <num> [num ..]",
        // takes a variadic list of numbers into an array
        args: "<_ number..>",
        exec: sort,
        // options for command sort
        options: {
          // sort in reverse order
          reverse: {
            alias: "r",
            desc: "Sort in descending order"
          }
        }
      },
      // command times
      times: {
        desc: "Show product of numbers",
        alias: ["t", "product", "p"],
        usage: "$0 $1 <num> [num ..]",
        args: "<_ number..>",
        exec: cmd => {
          const json = cmd.jsonMeta;
          console.log(
            "product:",
            json.args._.reduce((p, v) => p * v, 1)
          );
        }
      },
      // command divide
      divide: {
        desc: "Show result of dividend/divisor",
        alias: ["d", "div"],
        usage: "$0 $1 <dividend> <divisor>",
        args: "<dividend> <divisor>",
        exec: cmd => {
          const json = cmd.jsonMeta;
          let dividend;
          let divisor;
          if (json.opts.switch) {
            dividend = json.args.divisor;
            divisor = json.args.dividend;
          } else {
            dividend = json.args.dividend;
            divisor = json.args.divisor;
          }
          console.log(json.argList);
          console.log(`quotient of ${dividend}/${divisor}:`, dividend / divisor);
        },
        options: {
          switch: {
            alias: "s",
            desc: "Switch dividend and divisor"
          }
        }
      }
    }
  )
  .parse();
