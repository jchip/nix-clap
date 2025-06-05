import { fitLines } from "../../src/xtil";
import { describe, it, expect } from "vitest";

describe("fitLines", () => {
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
});
