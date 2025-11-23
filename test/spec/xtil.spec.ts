import { describe, it, expect } from "vitest";
import { validParseInt, toBoolean, isBoolean, fitLine, fitLines, camelCase } from "../../src/xtil";

describe("xtil", () => {
  it("validParseInt should return default number", () => {
    expect(validParseInt("", 951)).toBe(951);
  });

  it("validParseInt should reject without default number", () => {
    expect(() => validParseInt("")).toThrow("Invalid number input");
  });

  it("validParseInt should reject string that is invalid number", () => {
    expect(() => validParseInt("%$#%%$")).toThrow("Invalid number input");
  });

  it("toBoolean should return false for falsy arg", () => {
    expect(toBoolean("")).toBe(false);
  });

  it("isBoolean should return false for falsy arg", () => {
    expect(isBoolean("")).toBe(false);
  });

  it("fitLine should format lines correctly", () => {
    const strs = ["This", "is", "a", "test"];
    const margin = ">";
    const indent = " ";
    const lineWidth = 10;
    const result = fitLine(strs, margin, indent, lineWidth);
    expect(result).toEqual([">This is a", ">     test"]);
  });

  it("fitLine should handle single word", () => {
    const strs = ["SingleWord"];
    const margin = ">";
    const indent = " ";
    const lineWidth = 10;
    const result = fitLine(strs, margin, indent, lineWidth);
    expect(result).toEqual([">SingleWord"]);
  });

  it("fitLine should handle empty input", () => {
    const strs: string[] = [];
    const margin = ">";
    const indent = " ";
    const lineWidth = 10;
    const result = fitLine(strs, margin, indent, lineWidth);
    expect(result).toEqual([]);
  });

  it("fitLine should handle long words", () => {
    const strs = ["ThisIsAVeryLongWordThatExceedsWidth"];
    const margin = ">";
    const indent = " ";
    const lineWidth = 10;
    const result = fitLine(strs, margin, indent, lineWidth);
    expect(result).toEqual([">ThisIsAVeryLongWordThatExceedsWidth"]);
  });

  it("fitLine should handle multiple lines with exact width", () => {
    const strs = ["This", "is", "a", "test"];
    const margin = ">";
    const indent = " ";
    const lineWidth = 7;
    const result = fitLine(strs, margin, indent, lineWidth);
    expect(result).toEqual([">This", "> is a", ">  test"]);
  });

  it("fitLines should format lines correctly with margin and indent", () => {
    const strs = ["This", "is", "a", "test"];
    const margin = ">";
    const indent = " ";
    const leftWidth = 5;
    const lineWidth = 10;
    const result = fitLines(strs, margin, indent, leftWidth, lineWidth);
    expect(result).toEqual([">This  is", "> a   test"]);
  });

  it("fitLines should handle single word", () => {
    const strs = ["SingleWord"];
    const margin = ">";
    const indent = " ";
    const leftWidth = 5;
    const lineWidth = 10;
    const result = fitLines(strs, margin, indent, leftWidth, lineWidth);
    expect(result).toEqual([">SingleWord"]);
  });

  it("fitLines should handle empty input", () => {
    const strs: string[] = [];
    const margin = ">";
    const indent = " ";
    const leftWidth = 5;
    const lineWidth = 10;
    const result = fitLines(strs, margin, indent, leftWidth, lineWidth);
    expect(result).toEqual([]);
  });

  it("fitLines should handle long words", () => {
    const strs = ["ThisIsAVeryLongWordThatExceedsWidth"];
    const margin = ">";
    const indent = " ";
    const leftWidth = 5;
    const lineWidth = 10;
    const result = fitLines(strs, margin, indent, leftWidth, lineWidth);
    expect(result).toEqual([">ThisIsAVeryLongWordThatExceedsWidth"]);
  });

  it("fitLines should handle multiple lines with exact width", () => {
    const strs = ["This", "is", "a", "test"];
    const margin = ">";
    const indent = " ";
    const leftWidth = 5;
    const lineWidth = 7;
    const result = fitLines(strs, margin, indent, leftWidth, lineWidth);
    expect(result).toEqual([">This", "> is a", ">  test"]);
  });

  it("fitLines should handle lines with left width exceeding first word", () => {
    const strs = ["This", "is", "a", "test"];
    const margin = ">";
    const indent = " ";
    const leftWidth = 2;
    const lineWidth = 10;
    const result = fitLines(strs, margin, indent, leftWidth, lineWidth);
    // When first word exceeds leftWidth, description aligns at leftWidth column
    expect(result).toEqual([">This", ">   is a", ">     test"]);
  });

  it("camelCase should convert kebab-case to camelCase", () => {
    expect(camelCase("kebab-case-string")).toBe("kebabCaseString");
  });

  it("camelCase should handle single word", () => {
    expect(camelCase("single")).toBe("single");
  });

  it("camelCase should handle empty string", () => {
    expect(camelCase("")).toBe("");
  });

  it("camelCase should handle multiple hyphens", () => {
    expect(camelCase("multiple-hyphens-in-string")).toBe("multipleHyphensInString");
  });

  // it("camelCase should handle leading and trailing hyphens", () => {
  //   expect(camelCase("-leading-and-trailing-")).toBe("leadingAndTrailing");
  // });

  // it("camelCase should handle consecutive hyphens", () => {
  //   expect(camelCase("consecutive--hyphens")).toBe("consecutiveHyphens");
  // });
});
