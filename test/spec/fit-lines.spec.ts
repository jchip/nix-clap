import { fitLines, setHelpZebra } from "../../src/xtil";
import { describe, it, expect, beforeEach } from "vitest";

describe("fitLines", () => {
  beforeEach(() => {
    setHelpZebra(false);
  });
  it("should return [] for no strs", () => {
    expect(fitLines([])).toEqual([]);
  });

  it("should return single line with margin", () => {
    expect(fitLines(["hello"], "  ")).toEqual(["  hello"]);
  });

  it("should return lines if first str longer than leftWidth", () => {
    const x = fitLines(["blahblahblahblah", "hello world this is a test"], "  ", "    ", 10, 80);
    expect(x[0]).toBe("  blahblahblahblah");
    expect(x[1].length).toBe(80);
    expect(x[1].trimStart()).toBe("hello world this is a test");
  });

  it("should return lines all fit", () => {
    const x = fitLines(
      ["blahblahblahblah", "hello world this is a test", "[test]"],
      "  ",
      "    ",
      20,
      80
    );
    expect(x.length).toBe(1);
    expect(x[0].length).toBe(80);
    expect(x[0]).toBe(
      "  blahblahblahblah     hello world this is a test                         [test]"
    );
  });

  it("should make last line fit right", () => {
    const x = fitLines(
      ["blahblahblahblah", "hello world this is a test hello world this is a test", "[test]"],
      "  ",
      "    ",
      20,
      80
    );
    expect(x.length).toBe(2);
    expect(x[0]).toBe(
      "  blahblahblahblah     hello world this is a test hello world this is a test"
    );
    expect(x[1]).toBe(
      "                                                                          [test]"
    );
  });

  it("should fit all long lines", () => {
    const x = fitLines(
      [
        "blahblahblahblah",
        "hello world this is a test hello world this is a test hello world this is a test hello world this is a test",
        "[test]"
      ],
      "  ",
      "    ",
      20,
      80
    );
    expect(x.length).toBe(3);
    expect(x[0]).toBe("  blahblahblahblah");
    expect(x[1]).toBe(
      "      hello world this is a test hello world this is a test hello world this is a test hello world this is a test"
    );
    expect(x[2]).toBe(
      "                                                                          [test]"
    );
  });

  it("should skip padding when description fits without padding but not with", () => {
    // Simulates --layout case: short option (8 chars) with large leftWidth (28)
    // margin (2) + leftWidth (28) + space (1) + desc (52) = 83 > lineWidth (80)
    // margin (2) + option (8) + space (1) + desc (52) = 63 <= lineWidth (80)
    const x = fitLines(
      [
        "--layout",
        " set node_modules packages layout - normal or detail",
        "[string] [default: \"normal\"]"
      ],
      "  ",
      "    ",
      28,
      80
    );
    // Description should be on same line as --layout (not wrapped)
    expect(x.length).toBe(2);
    expect(x[0]).toBe("  --layout  set node_modules packages layout - normal or detail");
    expect(x[1]).toContain("[string] [default: \"normal\"]");
  });
});
