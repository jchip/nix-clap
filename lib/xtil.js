"use strict";

const stripAnsi = require("strip-ansi");
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

function noAnsiLen(str) {
  return stripAnsi(str).length;
}

function padStr(str, w) {
  const len = Math.max(0, w - noAnsiLen(str));
  return `${str}${Array(len + 1).join(" ")}`;
}

function padStrRight(str, w) {
  const len = w - noAnsiLen(str);
  return `${Array(len + 1).join(" ")}${str}`;
}

function fitLine(strs, margin, indent, lineWidth) {
  const out = [margin + strs[0]];

  const add = (str, last) => {
    let line = out[out.length - 1];
    if (noAnsiLen(line) + str.length + 1 > lineWidth) {
      out.push("");
      line = margin + indent;
    } else {
      line += " ";
    }
    if (last) {
      line += padStrRight(str, lineWidth - noAnsiLen(line));
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

  if (noAnsiLen(strs[0]) > leftWidth) {
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

function convertValue(type, value, spec) {
  if (typeof value !== "string") return value;

  if (type === "number") {
    return parseInt(value, 10);
  } else if (type === "float") {
    return parseFloat(value);
  } else if (!type || type === "boolean") {
    return toBoolean(value);
  } else if (spec && spec[type]) {
    const customType = spec[type].constructor.name;
    if (customType === "Function") {
      return spec[type](value);
    } else if (customType === "RegExp") {
      const mx = value.match(spec[type]);
      return mx ? mx[0] : undefined;
    } else {
      return spec[type];
    }
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
