import { describe, it, expect, beforeEach } from "vitest";
import {
  validParseInt,
  toBoolean,
  isBoolean,
  fitLine,
  fitLines,
  camelCase,
  setHelpZebra,
  isHelpZebraEnabled,
  padLeftFill,
  padLeft,
  resetZebraIndex,
  nextZebraIndex
} from "../../src/xtil";

describe("xtil", () => {
  // Disable zebra by default for consistent test output
  beforeEach(() => {
    setHelpZebra(false);
  });

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

  it("padLeft should pad string with spaces on the left", () => {
    expect(padLeft("test", 10)).toBe("      test");
  });

  describe("dotted line fill", () => {
    it("should toggle with setHelpZebra", () => {
      setHelpZebra(true);
      expect(isHelpZebraEnabled()).toBe(true);

      setHelpZebra(false);
      expect(isHelpZebraEnabled()).toBe(false);
    });

    it("padLeftFill should use dots on odd index when enabled", () => {
      setHelpZebra(true);
      resetZebraIndex();
      nextZebraIndex(); // index = 1 (odd)
      const result = padLeftFill("test", 10);
      expect(result).toBe("······test");
    });

    it("padLeftFill should use spaces on even index when enabled", () => {
      setHelpZebra(true);
      resetZebraIndex(); // index = 0 (even)
      const result = padLeftFill("test", 10);
      expect(result).toBe("      test");
    });

    it("padLeftFill should use spaces when disabled", () => {
      setHelpZebra(false);
      resetZebraIndex();
      nextZebraIndex(); // index = 1, but zebra disabled
      const result = padLeftFill("test", 10);
      expect(result).toBe("      test");
    });

    it("padLeftFill should return string unchanged if width is less than string length", () => {
      const result = padLeftFill("test", 2);
      expect(result).toBe("test");
    });

    it("fitLine should use dots for right-aligned text on odd index when enabled", () => {
      setHelpZebra(true);
      resetZebraIndex();
      nextZebraIndex(); // index = 1 (odd)
      const strs = ["--option", "description", "[type]"];
      const result = fitLine(strs, "  ", "    ", 50);
      expect(result[0]).toContain("·");
      expect(result[0]).toContain("[type]");
    });

    it("fitLine should use spaces for right-aligned text on even index when enabled", () => {
      setHelpZebra(true);
      resetZebraIndex(); // index = 0 (even)
      const strs = ["--option", "description", "[type]"];
      const result = fitLine(strs, "  ", "    ", 50);
      expect(result[0]).not.toContain("·");
      expect(result[0]).toContain("[type]");
    });
  });
});
