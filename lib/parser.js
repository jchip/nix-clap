"use strict";

/* eslint-disable one-var,no-magic-numbers */

const assert = require("assert");

const PARSING = 1;
const GATHERING_OPT_PARAMS = 2;
const GATHERING_CMD_PARAMS = 3;
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
    this._gathered = undefined;
    this._parsed = undefined;
    this._optCtx = undefined;
    this._cmdCtx = undefined;
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
      this._state = GATHERING_CMD_PARAMS;
      this._gathered = [];
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
      this.findApplyOptions(this._cliOptions, this._parsed, name) ||
      (this._cmdCtx && this.findApplyOptions(this._cmdCtx[CMD].options, this._cmdCtx, name));

    if (!ctx) {
      this.setUnknownOption(name, value, verbatim);
      return;
    }

    const ccLong = ctx.ccLong;
    const opt = ctx.opt;
    ctx[TARGET].source[ccLong] = "cli";

    if (value !== undefined || opt.type === "count") {
      this.convertOptValueType(ctx, value, verbatim);
    } else {
      this._states.push(this._state);
      this._state = GATHERING_OPT_PARAMS;
      this._optType = opt.type || "";
      this._gathered = [];
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
    if (this._gathered.length > 0) {
      this.convertOptValueType(this._optCtx, this._gathered, this._gathered);
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
    this._gathered = undefined;
    this._state = this._states.pop();
  }

  cmdEndGather() {
    const ctx = this._cmdCtx;
    const cmd = ctx[CMD];
    const args = cmd.args;
    ctx.argList = this._gathered;
    assert(this._gathered.length >= cmd.needArgs, `Not enough arguments for command ${cmd.name}`);

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

    this._gathered = undefined;
    this._state = this._states.pop();
  }

  gatherOptParams(arg) {
    if (arg.startsWith("-")) {
      // another opt, end of gathering
      this.optEndGather();
      this.getOpt(arg);
    } else {
      // save
      this._gathered.push(arg);
      // check if gathered everything
      if (this._optType.indexOf("array") < 0) {
        // if so, end gathering, resume parsing
        this.optEndGather();
      }
    }
  }

  gatherCmdParams(arg) {
    if (arg.startsWith("-")) {
      this.cmdEndGather();
      this.getOpt(arg);
    } else {
      const cmd = this._cmdCtx[CMD];
      this._gathered.push(arg);
      if (this._gathered.length === cmd.expectArgs && !cmd.isVariadicArgs()) {
        this.cmdEndGather();
      }
    }
  }

  parseArg(x) {
    const arg = this._argv[x];
    const state = this._state;
    if (state === PARSING) {
      // an option
      if (arg.startsWith("-")) {
        this.getOpt(arg);
      } else {
        // a command
        this.getCmd(arg);
      }
    } else if (state === GATHERING_OPT_PARAMS) {
      this.gatherOptParams(arg);
    } else {
      assert(state === GATHERING_CMD_PARAMS, `bug: unknown parsing state ${state}`);
      this.gatherCmdParams(arg);
    }
  }

  checkTerminator() {
    const state = this._state;
    if (state === GATHERING_OPT_PARAMS) {
      this.optEndGather();
      if (this._optCtx.opt.type === "array") {
        return false;
      }
    } else if (state === GATHERING_CMD_PARAMS) {
      this.cmdEndGather();
      if (this._cmdCtx[CMD].isVariadicArgs()) {
        return false;
      }
    }

    return true;
  }

  parse(argv, start, parsed) {
    this._argv = argv;
    this._parsed = parsed || { source: {}, commands: [], opts: {}, verbatim: {} };

    let index = start !== undefined ? start : 0;

    try {
      for (; index < argv.length; index++) {
        if (argv[index] === "--") {
          if (this.checkTerminator() === true) break;
        } else {
          this.parseArg(index);
        }
      }

      if (this._state === GATHERING_OPT_PARAMS) {
        this.optEndGather();
      } else if (this._state === GATHERING_CMD_PARAMS) {
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
