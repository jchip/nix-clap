import stripAnsi from "strip-ansi";

/**
 * Converts a kebab-case string to camelCase.
 *
 * @param str - The kebab-case string to convert.
 * @returns The camelCase version of the input string.
 */
export function camelCase(str: string) {
  return str.split("-").reduce((cc, w) => `${cc}${w[0].toUpperCase()}${w.slice(1)}`);
}

/**
 * Iterates over each key-value pair in an object and applies the provided iterator function.
 *
 * @template T - The type of the values in the object.
 * @param {Record<string, T>} obj - The object to iterate over.
 * @param {(v: T, k: string) => unknown} iterator - The function to apply to each key-value pair.
 * The function receives the value and the key as arguments.
 * @returns {void}
 */
export function objEach<T = any>(
  obj: Record<string, T>,
  iterator: (v: T, k: string) => unknown
): void {
  for (const key in obj) {
    iterator(obj[key], key);
  }
}

/**
 * Parses a string into an integer, with optional handling for special cases and defaults.
 *
 * @param s - The string to parse. If the string is "inf" or "infinity" (case-insensitive), it returns `Infinity`.
 * @param defaultN - An optional default number to return if the string is empty or undefined.
 * @returns The parsed integer, `Infinity` for "inf" or "infinity", or the default number if provided.
 * @throws Will throw an error if the string cannot be parsed into an integer and no default number is provided.
 */
export function validParseInt(s: string, defaultN?: number): number {
  if (s) {
    const ls = s.toLowerCase();

    if (ls === "inf" || ls === "infinity") {
      return Infinity;
    }

    const n = parseInt(ls);
    if (Number.isInteger(n)) {
      return n;
    }
  } else if (defaultN !== undefined) {
    return defaultN;
  }

  throw new Error(`Invalid number input '${s}' - expected an integer`);
}

/**
 * Returns the result of a function if the input is a function, otherwise returns the input value.
 *
 * @template T - The expected return type.
 * @param x - The input which can be a function or a value.
 * @returns The result of the function if `x` is a function, otherwise the value of `x`.
 */
export function cbOrVal<T = string>(x: unknown): T {
  return typeof x === "function" ? x() : (x as T);
}

/**
 * Creates a shallow copy of the given object.
 *
 * @template T - The type of the object to be duplicated.
 * @param {T} obj - The object to be duplicated.
 * @returns {T} - A shallow copy of the given object.
 */
export function dup<T = any>(obj: T): T {
  const copy = {};
  if (obj) {
    objEach(obj, (val: any, key: string) => {
      copy[key] = val && val.constructor.name === "Object" ? Object.assign({}, val) : val;
    });
  }
  return copy as T;
}

/**
 * Calculates the length of a string after removing any ANSI escape codes.
 *
 * @param str - The input string potentially containing ANSI escape codes.
 * @returns The length of the string without ANSI escape codes.
 */
export function noAnsiLen(str: string) {
  return stripAnsi(str).length;
}

/**
 * Pads the given string with spaces to ensure it reaches the specified width.
 * If the string is already longer than the specified width, no padding is added.
 *
 * @param str - The string to be padded.
 * @param width - The desired width of the resulting string.
 * @returns The padded string.
 */
export function padStr(str: string, width: number) {
  const len = Math.max(0, width - noAnsiLen(str));
  return `${str}${Array(len + 1).join(" ")}`;
}

/**
 * Pads the given string on the right side with spaces until it reaches the specified width.
 *
 * @param str - The string to be padded.
 * @param width - The desired width of the resulting string after padding.
 * @returns The padded string with spaces added to the right.
 */
export function padStrRight(str: string, width: number) {
  const len = width - noAnsiLen(str);
  return `${Array(len + 1).join(" ")}${str}`;
}

/**
 * Formats an array of strings into lines of text with specified margins and indentation,
 * ensuring that each line does not exceed a given width.
 *
 * @param strs - An array of strings to be formatted.
 * @param margin - A string to be added as a margin at the beginning of each line.
 * @param indent - A string to be used for indentation of wrapped lines.
 * @param lineWidth - The maximum width of each line, including the margin and indentation.
 * @returns An array of formatted lines of text.
 */
export function fitLine(strs: string[], margin: string, indent: string, lineWidth: number) {
  if (!strs || strs.length === 0) {
    return [];
  }

  const out = [margin + strs[0]];

  const add = (str: string, last: boolean) => {
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

  return out.map(x => x.trimEnd());
}

/**
 * Adjusts an array of strings to fit within specified margins and widths.
 *
 * @param strs - An array of strings to be adjusted.
 * @param margin - An optional string to be added as a margin to each line.
 * @param indent - An optional string to be used as an indent for lines after the first.
 * @param leftWidth - An optional number specifying the width of the left margin.
 * @param lineWidth - An optional number specifying the maximum width of each line.
 * @returns An array of strings adjusted to fit within the specified margins and widths.
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

/**
 * Converts a string argument to a boolean value.
 *
 * @param arg - The string to be converted to a boolean.
 * @returns `true` if the string is not "0", "FALSE", or "NO" (case insensitive), otherwise `false`.
 */
export function toBoolean(arg: string) {
  if (arg) {
    const x = arg.toUpperCase();
    return x !== "0" && x !== "FALSE" && x !== "NO";
  }
  return false;
}

/**
 *
 * @param arg
 * @returns
 */
export function isBoolean(arg: string) {
  if (arg) {
    const x = arg && arg.toUpperCase && arg.toUpperCase();
    return x === "0" || x === "1" || x === "FALSE" || x === "TRUE" || x === "YES" || x === "NO";
  }
  return false;
}

export const noop = () => {};

export function prefixOption(name: string) {
  return name.length > 1 ? `--${name}` : `-${name}`;
}
