"use strict";

/* eslint-disable max-statements, no-magic-numbers */

import assert from "assert";
import { cbOrVal, camelCase, dup, fitLines, objEach } from "./xtil";
const SUPPORT_TYPES = ["count", "string", "number", "float", "boolean"];
const OPTION_FIELDS = {
  alias: ["string", "array"],
  type: ["string"],
  desc: ["string", "function"],
  describe: ["string", "function"],
  description: ["string", "function"],
  default: [],
  require: ["boolean"],
  requireArg: ["boolean"],
  allowCmd: ["array"]
};

/*
 * Options
 */
export class Options {
  private _options: any;
  private _alias: any;
  constructor(options) {
    this._options = dup(options);
    this._alias = {};
    this.processOptions();
  }

  prefixFlag(name) {
    return name.length > 1 ? `--${name}` : `-${name}`;
  }

  validateOptionFields(opt, name) {
    Object.keys(opt).forEach(f => {
      if (!OPTION_FIELDS.hasOwnProperty(f)) {
        if (opt.type && opt.type.indexOf(f) >= 0) return;
        throw new Error(`option '${name}' field '${f}' is not valid`);
      }
      const tof = Array.isArray(opt[f]) ? "array" : typeof opt[f];
      const typeOk = OPTION_FIELDS[f].find(t => t === tof);
      if (OPTION_FIELDS[f].length > 0 && !typeOk) {
        const expect = OPTION_FIELDS[f].join(", ");
        throw new Error(
          `option '${name}' field '${f}' type '${tof}' is not valid: expect ${expect}`
        );
      }
    });
  }

  processOptions() {
    objEach(this._options, (opt, name) => {
      const isValidType = type => {
        if (SUPPORT_TYPES.indexOf(type) >= 0) return true;
        return opt.hasOwnProperty(type);
      };

      this.validateOptionFields(opt, name);

      const help = [`--${name}`];
      const type = opt.type;
      if (type) {
        if (type.indexOf("array") >= 0) {
          const splits = type.split(" ");
          if (splits.length > 1) {
            opt.type = "array";
            opt.subtype = splits[0];
            assert(
              isValidType(opt.subtype),
              `Unknown array argument type ${opt.subtype} for option ${name}`
            );
          }
        } else {
          assert(isValidType(type), `Unknown argument type ${type} for option ${name}`);
        }
      }
      opt.name = name;
      if (opt.alias) {
        if (!Array.isArray(opt.alias)) opt.alias = [opt.alias];
        opt.alias.forEach(a => {
          assert(
            !this._alias.hasOwnProperty(a),
            `Option alias ${a} already used by option ${this._alias[a]}`
          );
          this._alias[a] = name;
          help.push(this.prefixFlag(a));
        });
      }

      opt.help = help.join(", ");
      opt.desc = opt.desc || opt.describe || opt.description;
    });
  }

  setSingle(name, parsed) {
    const long = this._alias[name];
    if (long) {
      const ccLong = camelCase(long);
      parsed.source[ccLong] = "cli";
      const opt = this._options[long];
      if (opt.type === "count") {
        parsed.opts[ccLong] = (parsed.opts[ccLong] || 0) + 1;
      } else {
        parsed.opts[ccLong] = true;
      }
      return true;
    }
    return false;
  }

  parse(name) {
    let long;
    let opt = this._options[name];

    if (opt) {
      long = name;
    } else if (this._alias[name]) {
      long = this._alias[name];
      opt = this._options[long];
    } else {
      return false;
    }

    const ccLong = camelCase(long);
    return { name, opt, long, ccLong };
  }

  get list() {
    return this._options;
  }

  get alias() {
    return this._alias;
  }

  findLongestOption() {
    let max = 0;
    objEach(this._options, opt => {
      max = opt.help.length > max ? opt.help.length : max;
    });
    return max;
  }

  makeHelp() {
    const width = this.findLongestOption();
    let help = [];
    objEach(this._options, opt => {
      const tail = [];
      const type = [opt.subtype, opt.type].filter(x => x).join(" ");
      if (type) tail.push(`[${type}]`);

      if (opt.hasOwnProperty("default")) {
        tail.push(`[default: ${JSON.stringify(opt.default)}]`);
      }
      const desc = (cbOrVal(opt.desc) || "").trim();
      const strs = [opt.help, ` ${desc}`, tail.filter(x => x).join(" ")];
      help = help.concat(fitLines(strs, "  ", "    ", width, 80));
    });

    return help;
  }
}
