import { expect, describe, it } from "vitest";
import { Option, optUnknown } from "../../src/option";

describe("option args", () => {
  it("should parse args and basic props", () => {
    const opt = new Option("test", {
      args: "<v1>",
      alias: "t",
      desc: "test option 1"
    });
    expect(opt.name).toBe("test");

    expect(opt.args).toEqual([
      {
        required: true,
        name: "v1",
        type: "string",
        variadic: undefined,
        min: 1,
        max: 1
      }
    ]);
  });

  it("should parse array and variadic args and basic props", () => {
    const opt = new Option("test", {
      args: "<v1> <v2..3> <..4> <v3..>",
      alias: ["t"],
      desc: "test option 1"
    });
    expect(opt.name).toBe("test");
    expect(opt.args).toEqual([
      {
        required: true,
        name: "v1",
        type: "string",
        variadic: undefined,
        min: 1,
        max: 1
      },
      {
        required: true,
        name: "v2",
        type: "string",
        variadic: undefined,
        min: 3,
        max: 3
      },
      {
        required: true,
        name: undefined,
        type: "string",
        variadic: undefined,
        min: 4,
        max: 4
      },
      {
        required: true,
        name: "v3",
        type: "string",
        variadic: true,
        min: 0,
        max: Infinity
      }
    ]);
  });

  it("should catch optional before required args", () => {
    expect(
      () =>
        new Option("test", {
          args: "<v1> [v2] <v3>",
          alias: ["t"],
          desc: "test option 1"
        })
    ).toThrow("cannot follow optional arg");
  });

  it("should parse types from args", () => {
    const opt = new Option("test", {
      args: "<v1 string> <v2..3> <v3 number..>",
      alias: ["t"],
      desc: "test option 1"
    });
    expect(opt.args).toEqual([
      {
        required: true,
        name: "v1",
        type: "string",
        variadic: undefined,
        min: 1,
        max: 1
      },
      {
        required: true,
        name: "v2",
        type: "string",
        variadic: undefined,
        min: 3,
        max: 3
      },
      {
        required: true,
        name: "v3",
        type: "number",
        variadic: true,
        min: 0,
        max: Infinity
      }
    ]);
  });

  it("should catch unknown types from args", () => {
    expect(
      () =>
        new Option("test", {
          args: "<v1 foo> <v2..3> <v3 number..>",
          alias: ["t"],
          desc: "test option 1"
        })
    ).toThrow(`unknown type 'foo' for argument`);
  });

  it("should parse variadic args", () => {
    const opt = new Option("test", {
      args: "<..>",
      desc: "test option 1"
    });
    expect(opt.args).toEqual([
      {
        required: true,
        name: undefined,
        type: "string",
        variadic: true,
        min: 0,
        max: Infinity
      }
    ]);

    const opt2 = new Option("test", {
      args: "<..1,>",
      desc: "test option 1"
    });
    expect(opt2.args).toEqual([
      {
        required: true,
        name: undefined,
        type: "string",
        variadic: true,
        min: 1,
        max: Infinity
      }
    ]);

    const opt3 = new Option("test", {
      args: "<..1,Inf>",
      desc: "test option 1"
    });
    expect(opt3.args).toEqual([
      {
        required: true,
        name: undefined,
        type: "string",
        variadic: true,
        min: 1,
        max: Infinity
      }
    ]);
  });

  it("should parse args that omit name and type", () => {
    const opt = new Option("test", {
      args: "<> []",
      desc: "test option 1"
    });
    expect(opt.args).toEqual([
      {
        required: true,
        name: undefined,
        type: "string",
        variadic: undefined,
        min: 1,
        max: 1
      },
      {
        required: false,
        name: undefined,
        type: "string",
        variadic: undefined,
        min: 1,
        max: 1
      }
    ]);
  });

  it("should parse args that omit name", () => {
    const opt = new Option("test", {
      args: "< xfoo> [ yfoo]",
      desc: "test option 1",
      coercions: {
        xfoo: () => "blah xfoo",
        yfoo: () => "blah yfoo"
      }
    });
    expect(opt.args).toEqual([
      {
        required: true,
        name: undefined,
        type: "xfoo",
        variadic: undefined,
        min: 1,
        max: 1
      },
      {
        required: false,
        name: undefined,
        type: "yfoo",
        variadic: undefined,
        min: 1,
        max: 1
      }
    ]);
  });

  it("optUnknown should return true for unknown", () => {
    expect(optUnknown.unknown).eq(true);
  });

  it("should return false for unknown", () => {
    expect(new Option("blah", {}).unknown).equal(false);
  });
});
