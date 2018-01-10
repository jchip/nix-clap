"use strict";

/* eslint-disable max-statements, no-magic-numbers */

const assert = require("assert");
const Options = require("./options");
const xtil = require("./xtil");

const cbOrVal = xtil.cbOrVal;
const dup = xtil.dup;
const makeDefaults = xtil.makeDefaults;
const applyDefaults = xtil.applyDefaults;

const SUPPORT_TYPES = ["number", "string", "float", "boolean"];
/*
 * Command
 */
class Command {
  constructor(name, command) {
    try {
      const cmd = dup(command);
      this._cmd = cmd;
      if (cmd.alias) {
        if (!Array.isArray(cmd.alias)) {
          cmd.alias = [cmd.alias];
        }
      } else {
        cmd.alias = [];
      }
      cmd.name = name;
      cmd.desc = cmd.desc || cmd.describe || cmd.description;
      this._args = [];
      this._defaults = makeDefaults(cmd.options);
      this._options = new Options(cmd.options);
      this._needArgs = 0;
      this._expectArgs = 0;
      this.processArgs();
    } catch (e) {
      throw new Error(`Init command ${name} failed - ${e.message}`);
    }
  }

  processArgs() {
    const cmd = this._cmd;
    const args = cmd.args;
    if (!args) return;
    //
    // check "<arg1> <arg2> [arg3]"
    //
    args.replace(/([<\[])([^>\]]+)([>\]])/g, (a, mark, xname) => {
      assert(!this._variadic, `only last arg can be variadic`);
      let name = xname.replace(/\.+$/, "");
      let variadic;
      if (xname.length > name.length) {
        variadic = true;
        this._variadic = true;
      }

      const isValidType = type => {
        if (SUPPORT_TYPES.indexOf(type) >= 0) return true;
        return cmd.hasOwnProperty(type);
      };

      let type;

      if (name) {
        const splits = name
          .split(" ")
          .map(x => x.trim())
          .filter(x => x);
        assert(splits.length > 0 && splits.length <= 2, `argument ${a} is invalid`);
        if (splits.length > 1) {
          type = splits[0];
          name = splits[1];
          assert(isValidType(type), `unknown argument ${a} type ${type}`);
        } else {
          name = splits[0];
        }
      }
      const required = mark === "<";
      if (required) {
        this._needArgs++;
      }
      this._expectArgs++;
      this._args.push({
        required,
        name,
        type,
        variadic
      });
      return "";
    });

    assert(
      !this.isDefault || this._needArgs === 0,
      `Command ${this.name} set as default but requires arguments`
    );

    assert(
      !this.isDefault || typeof this.exec === "function",
      `Command ${this.name} set as default but has no exec handler`
    );
  }

  applyDefaults(ctx) {
    applyDefaults(this._defaults, ctx);
  }

  isVariadicArgs() {
    return this._variadic;
  }

  get options() {
    return this._options;
  }

  get needArgs() {
    return this._needArgs;
  }

  get expectArgs() {
    return this._expectArgs;
  }

  get args() {
    return this._args;
  }

  get name() {
    return this._cmd.name;
  }

  get desc() {
    return cbOrVal(this._cmd.desc);
  }

  get usage() {
    return cbOrVal(this._cmd.usage);
  }

  get exec() {
    return this._cmd.exec;
  }

  get alias() {
    return this._cmd.alias;
  }

  get isDefault() {
    return Boolean(this._cmd.default);
  }

  get spec() {
    return this._cmd;
  }
}

module.exports = Command;
