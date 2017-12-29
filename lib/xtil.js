"use strict";

/* eslint-disable no-magic-numbers,max-params, */

function camelCase(str) {
  return str.split("-").reduce((cc, w) => `${cc}${w[0].toUpperCase()}${w.slice(1)}`);
}

function objEach(obj, iterator) {
  for (const key in obj) {
    iterator(obj[key], key);
  }
}

function cbOrVal(x) {
  return typeof x === "function" ? x() : x;
}

// specialized obj dup for nix-clap
function dup(obj) {
  const copy = {};
  if (obj) {
    objEach(obj, (val, key) => {
      copy[key] = val && val.constructor.name === "Object" ? Object.assign({}, val) : val;
    });
  }
  return copy;
}

function padStr(str, w) {
  const len = Math.max(0, w - str.length);
  return `${str}${Array(len + 1).join(" ")}`;
}

function padStrRight(str, w) {
  const len = w - str.length;
  return `${Array(len + 1).join(" ")}${str}`;
}

function fitLine(strs, margin, indent, lineWidth) {
  const out = [margin + strs[0]];

  const add = (str, last) => {
    let line = out[out.length - 1];
    if (line.length + str.length + 1 > lineWidth) {
      out.push("");
      line = margin + indent;
    } else {
      line += " ";
    }
    if (last) {
      line += padStrRight(str, lineWidth - line.length);
    } else {
      line += str;
    }
    out[out.length - 1] = line;
  };

  const lastIx = strs.length - 1;
  for (let i = 1; i < strs.length; i++) {
    add(strs[i], i === lastIx);
  }

  return out.map(x => x.trimRight());
}

function fitLines(strs, margin, indent, leftWidth, lineWidth) {
  if (strs.length === 0) return [];
  if (strs.length === 1) return [`${margin}${strs[0]}`];

  if (strs[0].length > leftWidth) {
    const output = [`${margin}${strs[0]}`];
    return output.concat(fitLine([indent].concat(strs.slice(1)), margin, indent, lineWidth));
  } else {
    return fitLine([padStr(strs[0], leftWidth)].concat(strs.slice(1)), margin, indent, lineWidth);
  }
}

function makeDefaults(options) {
  const defaults = {};
  objEach(options, (opt, name) => {
    if (opt.hasOwnProperty("default")) {
      defaults[camelCase(name)] = opt.default;
    }
  });
  return defaults;
}

function applyDefaults(defaults, ctx, src) {
  objEach(defaults, (val, key) => {
    if (!ctx.opts.hasOwnProperty(key)) {
      ctx.opts[key] = val;
      ctx.source[key] = src || "default";
    }
  });
}

function toBoolean(value) {
  const x = value.toUpperCase();
  return x && x !== "0" && x !== "FALSE" && x !== "NO";
}

function convertValue(type, value) {
  if (typeof value !== "string") return value;

  if (type === "number") {
    return parseInt(value, 10);
  } else if (!type || type === "boolean") {
    return toBoolean(value);
  }

  return value;
}

module.exports = {
  camelCase,
  objEach,
  cbOrVal,
  dup,
  fitLines,
  padStr,
  padStrRight,
  makeDefaults,
  applyDefaults,
  toBoolean,
  convertValue
};
