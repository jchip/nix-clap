"use strict";

/* eslint-disable no-magic-numbers */

const assert = require("assert");
const Command = require("./command");
const CMD = require("./symbols").CMD;
const xtil = require("./xtil");

const objEach = xtil.objEach;
const fitLines = xtil.fitLines;

/*
 * Commands
 */
class Commands {
  constructor(commands) {
    this._commands = {};
    this._alias = {};
    this._count = 0;
    this._execCount = 0;
    objEach(commands || {}, (cmd, name) => {
      this._count++;
      if (cmd.exec) {
        this._execCount++;
      }
      this._commands[name] = new Command(name, cmd);
      const isDefault = this._commands[name].isDefault;
      if (isDefault) {
        assert(
          !this._defaultCmd,
          `Trying to set command ${name} as default but ${this._defaultCmd} is already set.`
        );
        this._defaultCmd = name;
      }
      if (!cmd.alias) return;
      const alias = Array.isArray(cmd.alias) ? cmd.alias : [cmd.alias];
      alias.forEach(a => {
        assert(
          !this._alias.hasOwnProperty(a),
          `Command ${name} alias ${a} already used by command ${this._alias[a]}`
        );
        this._alias[a] = name;
      });
    });
  }

  get count() {
    return this._count;
  }

  get execCount() {
    return this._execCount;
  }

  get defaultCmd() {
    return this._defaultCmd;
  }

  get list() {
    return this._commands;
  }

  getContext(name) {
    let cmd = this._commands[name];
    let long = name;
    let unknown = false;

    if (!cmd) {
      long = this._alias[name];
      if (long) {
        cmd = this._commands[long];
      } else {
        long = name;
        unknown = true;
        cmd = new Command(name, {});
      }
    }

    return {
      name,
      long,
      unknown,
      [CMD]: cmd,
      args: {},
      argList: [],
      opts: {},
      source: {},
      verbatim: {}
    };
  }

  findLongestCommand() {
    return Object.keys(this._commands).reduce((max, n) => (n.length > max ? n.length : max), 0);
  }

  makeHelp(progName) {
    if (progName) {
      progName = `${progName} `;
    } else {
      progName = "";
    }
    const cmdWidth = this.findLongestCommand() + progName.length;
    let help = [];
    objEach(this._commands, (cmd, name) => {
      const strs = [`${progName}${name}`, cmd.desc || ""];
      const alias = cmd.alias.join(" ");
      strs.push(alias.length > 0 ? `[aliases: ${alias}]` : "");
      help = help.concat(fitLines(strs, "  ", "    ", cmdWidth, 80));
    });

    return help;
  }
}

module.exports = Commands;
