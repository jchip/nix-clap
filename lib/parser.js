"use strict";

/* eslint-disable one-var, max-statements, no-magic-numbers */

const assert = require("assert");

const PARSING = 1;
const GATHERING_OPT_PARAMS = 2;
const PARSING_CMD = 3;

const symbols = require("./symbols");

const CMD = symbols.CMD;
const OPTIONS = symbols.OPTIONS;
const TARGET = symbols.TARGET;

const xtil = require("./xtil");

const camelCase = xtil.camelCase;
const convertValue = xtil.convertValue;

/*
 * Parser
 */
class Parser {
  constructor(nc) {
    this._nc = nc;
    this._cliOptions = nc.cliOptions;
    this._commands = nc.commands;
    this._states = [];
    this._state = PARSING;
    this._optType = undefined;
    this._optArgs = undefined;
    this._cmdArgs = undefined;
    this._parsed = undefined;
    this._optCtx = undefined;
    this._cmdCtx = undefined;
    this._multiCommand = true; // allow specifying multiple commands at the same time?
  }

  getCmd(name) {
    const ctx = this._commands.getContext(name);
    // remember command context so any options that follow can be
    // checked to apply against its private options
    this._cmdCtx = ctx;
    if (ctx.unknown) {
      this._nc.emit("unknown-command", ctx);
    }
    this._parsed.commands.push(ctx);
    if (ctx[CMD].args.length > 0) {
      this._states.push(this._state);
      this._state = PARSING_CMD;
      this._cmdArgs = [];
    }
  }

  convertOptValueType(ctx, value, verbatim) {
    const ccLong = ctx.ccLong;
    const opt = ctx.opt;
    const type = opt.type;

    if (verbatim !== undefined) {
      ctx[TARGET].verbatim[ccLong] = verbatim;
    }

    if (type === "count") {
      value = (ctx[TARGET].opts[ccLong] || 0) + 1;
    } else if (type === "array") {
      if (opt.subtype) {
        value = value.map(v => convertValue(opt.subtype, v, opt));
      }
    } else {
      value = convertValue(type, value[0], opt);
    }

    ctx[TARGET].opts[ccLong] = value;
  }

  checkOptionAllowCmd(ctx) {
    const opt = ctx.opt;
    if (!opt.allowCmd || opt.allowCmd.length < 1) return;
    const valid = this._cmdCtx && opt.allowCmd.indexOf(this._cmdCtx.long) >= 0;
    assert(
      valid,
      `option ${ctx.name} must follow one of these commands ${opt.allowCmd.join(", ")}`
    );
  }

  findApplyOptions(options, target, name) {
    const ctx = options.parse(name);
    if (ctx) {
      this.checkOptionAllowCmd(ctx);
      ctx[TARGET] = target;
      ctx[OPTIONS] = options;
      this._optCtx = ctx;
    }

    return ctx;
  }

  setUnknownOption(name, value, verbatim) {
    this._nc.emit("unknown-option", name);
    const target = this._cmdCtx || this._parsed;
    const ccName = camelCase(name);
    if (verbatim !== undefined) {
      target.verbatim[ccName] = verbatim;
    }
    target.opts[ccName] = value !== undefined ? value[0] : true;
    target.source[ccName] = "cli";
  }

  setOptValue(name, value, verbatim) {
    const ctx =
      // first check if option should be applied to a command
      (this._cmdCtx && this.findApplyOptions(this._cmdCtx[CMD].options, this._cmdCtx, name)) ||
      // then the top level
      this.findApplyOptions(this._cliOptions, this._parsed, name);

    if (!ctx) {
      this.setUnknownOption(name, value, verbatim);
      return;
    }

    const ccLong = ctx.ccLong;
    const opt = ctx.opt;
    ctx[TARGET].source[ccLong] = "cli";

    if (ctx[TARGET].optCmd && this._cmdCtx) {
      ctx[TARGET].optCmd[ccLong] = this._cmdCtx.name;
    }

    if (value !== undefined || opt.type === "count") {
      this.convertOptValueType(ctx, value, verbatim);
    } else {
      this._states.push(this._state);
      this._state = GATHERING_OPT_PARAMS;
      this._optType = opt.type || "";
      this._optArgs = [];
    }
  }

  get applyOptions() {
    if (this._optCtx) return this._optCtx[OPTIONS];
    return this._cliOptions;
  }

  get applyTarget() {
    if (this._optCtx) return this._optCtx[TARGET];
    return this._parsed;
  }

  setInsideSingle(name) {
    const singleOpts = name.split("");
    if (singleOpts.length > 1) {
      singleOpts
        .slice(0, singleOpts.length - 1)
        .forEach(x => this.applyOptions.setSingle(x, this.applyTarget));
    }
    return singleOpts[singleOpts.length - 1];
  }

  getOpt(arg) {
    let name, value, verbatim;
    if (arg.startsWith("--no-")) {
      name = arg.substr(5);
      value = [false];
      verbatim = ["no-"];
    } else {
      const dashes = arg.startsWith("--") ? 2 : 1;
      name = arg.substr(dashes);

      const eqX = name.indexOf("=");
      if (eqX > 0) {
        value = [name.substr(eqX + 1)];
        name = name.substr(0, eqX);
      }

      if (dashes === 1) {
        name = this.setInsideSingle(name);
      }
      verbatim = value;
    }

    this.setOptValue(name, value, verbatim);
  }

  optEndGather() {
    if (this._optArgs.length > 0) {
      this.convertOptValueType(this._optCtx, this._optArgs, this._optArgs);
    } else if (!this._optType || this._optType.indexOf("boolean") >= 0) {
      this._optCtx[TARGET].opts[this._optCtx.ccLong] = true;
    } else {
      const ra = this._optCtx.opt.requireArg || this._optCtx.opt.requiresArg;
      assert(!ra, `option ${this._optCtx.name} requires argument`);
      // note: still leave source as "cli" since assigning default is due to
      // user specifying the option on the command line
      this._optCtx[TARGET].opts[this._optCtx.ccLong] = this._optCtx.opt.default;
    }

    this._optType = undefined;
    this._optArgs = undefined;
    this._state = this._states.pop();
  }

  cmdEndGather() {
    const ctx = this._cmdCtx;
    const cmd = ctx[CMD];
    const args = cmd.args;
    ctx.argList = this._cmdArgs;
    assert(this._cmdArgs.length >= cmd.needArgs, `Not enough arguments for command ${cmd.name}`);

    const setArg = (name, type, value) => {
      if (!name) return;
      if (type) {
        ctx.args[name] = Array.isArray(value)
          ? value.map(v => convertValue(type, v, cmd.spec))
          : convertValue(type, value, cmd.spec);
      } else {
        ctx.args[name] = value;
      }
    };

    for (let i = 0; i < args.length && i < ctx.argList.length; i++) {
      setArg(args[i].name, args[i].type, ctx.argList[i]);
    }

    if (cmd.isVariadicArgs()) {
      const lastIx = args.length - 1;
      if (ctx.argList.length > lastIx) {
        setArg(args[lastIx].name, args[lastIx].type, ctx.argList.slice(lastIx));
      }
    }

    this._cmdArgs = undefined;
    this._state = this._states.pop();
  }

  gatherOptParams(arg) {
    const isOpt = arg.startsWith("-");
    let endGather;
    // if opt type is boolean, then only accept true/false as arg
    if (this._optType === "boolean") {
      const larg = arg.toLowerCase();
      endGather = larg !== "true" && larg !== "false";
    } else {
      endGather = isOpt;
    }

    if (endGather) {
      // another opt, end of gathering
      this.optEndGather();
      if (isOpt) this.getOpt(arg);
      else this.parseArg(arg);
    } else {
      // save
      this._optArgs.push(arg);
      // check if gathered everything
      if (this._optType.indexOf("array") < 0) {
        // if so, end gathering, resume parsing
        this.optEndGather();
      }
    }
  }

  gatherCmdParams(arg) {
    const cmd = this._cmdCtx[CMD];
    this._cmdArgs.push(arg);
    if (this._cmdArgs.length === cmd.expectArgs && !cmd.isVariadicArgs()) {
      this.cmdEndGather();
    }
  }

  parseArg(arg) {
    const state = this._state;
    if (state === GATHERING_OPT_PARAMS) {
      return this.gatherOptParams(arg);
    }

    // terminate parsing for command in multi commands mode
    if (this._multiCommand && (arg === "-." || arg === "--.") && state === PARSING_CMD) {
      return this.cmdEndGather();
    }

    // an option
    if (arg.startsWith("-")) {
      return this.getOpt(arg);
    }

    if (state === PARSING_CMD) {
      return this.gatherCmdParams(arg);
    }

    assert(state === PARSING, `bug: unknown parsing state ${state}`);

    // a command
    return this.getCmd(arg);
  }

  parseArgIndex(x) {
    this.parseArg(this._argv[x]);
  }

  checkTerminator() {
    const state = this._state;
    if (state === GATHERING_OPT_PARAMS) {
      this.optEndGather();
      // if option wants an array of arguments, then consider -- the terminator
      // for specifying them and continue parsing
      if (this._optCtx.opt.type === "array") {
        return false;
      }
    } else if (state === PARSING_CMD) {
      this.cmdEndGather();
      // if command wants variadic arguments, then consider -- the terminator
      // for specifying them and continue parsing
      if (this._cmdCtx[CMD].isVariadicArgs()) {
        return false;
      }
    }

    return true;
  }

  parse(argv, start, parsed) {
    this._argv = argv;
    this._parsed = parsed || { source: {}, commands: [], opts: {}, optCmd: {}, verbatim: {} };

    let index = start !== undefined ? start : 0;

    try {
      for (; index < argv.length; index++) {
        if (argv[index] === "--") {
          if (this.checkTerminator() === true) {
            break;
          }
        } else {
          this.parseArgIndex(index);
        }
      }

      if (this._state === GATHERING_OPT_PARAMS) {
        this.optEndGather();
      } else if (this._state === PARSING_CMD) {
        this.cmdEndGather();
      }
    } catch (e) {
      this._parsed.error = e;
    }

    this._parsed.index = index;

    return this._parsed;
  }
}

module.exports = Parser;
