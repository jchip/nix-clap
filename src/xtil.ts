import stripAnsi from "strip-ansi";
/* eslint-disable no-magic-numbers,max-params,@typescript-eslint/no-empty-function */

/**
 *
 * @param str
 * @returns
 */
export function camelCase(str: string) {
  return str.split("-").reduce((cc, w) => `${cc}${w[0].toUpperCase()}${w.slice(1)}`);
}

/**
 *
 * @param obj
 * @param iterator
 */
export function objEach(obj, iterator) {
  for (const key in obj) {
    iterator(obj[key], key);
  }
}

/**
 *
 * @param x
 * @returns
 */
export function cbOrVal(x) {
  return typeof x === "function" ? x() : x;
}

/**
 * specialized obj dup for nix-clap
 * @param obj
 * @returns
 */
export function dup(obj: any) {
  const copy = {};
  if (obj) {
    objEach(obj, (val: any, key: string) => {
      copy[key] = val && val.constructor.name === "Object" ? Object.assign({}, val) : val;
    });
  }
  return copy;
}

/**
 * find the length of a string without ANSI codes
 * @param str
 * @returns
 */
export function noAnsiLen(str: string) {
  return stripAnsi(str).length;
}

/**
 * Pad a string with trailing spaces
 * @param str
 * @param width
 * @returns
 */
export function padStr(str: string, width: number) {
  const len = Math.max(0, width - noAnsiLen(str));
  return `${str}${Array(len + 1).join(" ")}`;
}

/**
 * Pad a string with leading spaces
 * @param str
 * @param width - width
 * @returns
 */
export function padStrRight(str: string, width: number) {
  const len = width - noAnsiLen(str);
  return `${Array(len + 1).join(" ")}${str}`;
}

/**
 *
 * @param strs
 * @param margin
 * @param indent
 * @param lineWidth
 * @returns
 */
export function fitLine(strs: string[], margin: string, indent: string, lineWidth: number) {
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

/**
 *
 * @param strs
 * @param margin
 * @param indent
 * @param leftWidth
 * @param lineWidth
 * @returns
 */
export function fitLines(
  strs: string[],
  margin?: string,
  indent?: string,
  leftWidth?: number,
  lineWidth?: number
) {
  if (strs.length === 0) return [];
  if (strs.length === 1) return [`${margin}${strs[0]}`];

  if (noAnsiLen(strs[0]) > leftWidth) {
    const output = [`${margin}${strs[0]}`];
    return output.concat(fitLine([indent].concat(strs.slice(1)), margin, indent, lineWidth));
  } else {
    return fitLine([padStr(strs[0], leftWidth)].concat(strs.slice(1)), margin, indent, lineWidth);
  }
}

export function makeDefaults(options) {
  const defaults = {};
  objEach(options, (opt, name) => {
    if (opt.hasOwnProperty("default")) {
      defaults[camelCase(name)] = opt.default;
    }
  });
  return defaults;
}

/**
 *
 * @param defaults
 * @param ctx
 * @param src
 */
export function applyDefaults(defaults: any, ctx: any, src?: any) {
  objEach(defaults, (val: any, key: string) => {
    if (!ctx.opts.hasOwnProperty(key)) {
      ctx.opts[key] = val;
      ctx.source[key] = src || "default";
    }
  });
}

/**
 * Convert a string to a boolean
 * @param value
 * @returns
 */
export function toBoolean(value: string) {
  const x = value.toUpperCase();
  return x && x !== "0" && x !== "FALSE" && x !== "NO";
}

export const noop = () => {};
