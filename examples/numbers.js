"use strict";

const NixClap = require("..");

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
        usage: () => "$0 $1 <num> [num ..]",
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
      },
      // command times
      times: {
        args: "<number _..>",
        alias: ["t", "product", "p"],
        usage: "$0 $1 <num> [num ..]",
        desc: "Show product of numbers",
        exec: parsed => {
          console.log("product:", parsed.args._.reduce((p, v) => p * v, 1));
        }
      },
      // command divide
      divide: {
        alias: ["d", "div"],
        usage: "$0 $1 <dividend> <divisor>",
        desc: "Show result of dividend/divisor",
        exec: parsed => {
          let dividend, divisor;
          if (parsed.opts.switch) {
            dividend = parsed.args.divisor;
            divisor = parsed.args.dividend;
          } else {
            dividend = parsed.args.dividend;
            divisor = parsed.args.divisor;
          }
          const args = parsed.args;
          console.log(`quotient of ${dividend}/${divisor}:`, dividend / divisor);
        },
        args: "<dividend> <divisor>",
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
