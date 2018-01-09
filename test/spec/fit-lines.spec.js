"use strict";

const fitLines = require("../../lib/xtil").fitLines;

describe("fitLines", function() {
  it("should return [] for no strs", () => {
    expect(fitLines([])).to.deep.equal([]);
  });

  it("should return single line with margin", () => {
    expect(fitLines(["hello"], "  ")).to.deep.equal(["  hello"]);
  });

  it("should return lines if first str longer than leftWidth", () => {
    const x = fitLines(["blahblahblahblah", "hello world this is a test"], "  ", "    ", 10, 80);
    expect(x[0]).to.equal("  blahblahblahblah");
    expect(x[1].length).to.equal(80);
    expect(x[1].trimLeft()).to.equal("hello world this is a test");
  });

  it("should return lines all fit", () => {
    const x = fitLines(
      ["blahblahblahblah", "hello world this is a test", "[test]"],
      "  ",
      "    ",
      20,
      80
    );
    expect(x.length).to.equal(1);
    expect(x[0].length).to.equal(80);
    expect(x[0]).to.equal(
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
    expect(x.length).to.equal(2);
    expect(x[0]).to.equal(
      "  blahblahblahblah     hello world this is a test hello world this is a test"
    );
    expect(x[1]).to.equal(
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
    expect(x.length).to.equal(3);
    expect(x[0]).to.equal("  blahblahblahblah");
    expect(x[1]).to.equal(
      "      hello world this is a test hello world this is a test hello world this is a test hello world this is a test"
    );
    expect(x[2]).to.equal(
      "                                                                          [test]"
    );
  });
});
