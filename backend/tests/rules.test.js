const { evaluate, validateBand } = require("../src/rules");

const band = { warn_min: 18, warn_max: 26, crit_min: 15, crit_max: 30 };

describe("Unit: threshold state model (CP1 Figure 3.8)", () => {
  test("a value inside the warning band is Normal", () => {
    expect(evaluate(22, band)).toBe("good");
  });
  test("a value outside the warning band but inside critical is Warning", () => {
    expect(evaluate(27, band)).toBe("warning");
    expect(evaluate(17, band)).toBe("warning");
  });
  test("a value outside the critical band is Critical", () => {
    expect(evaluate(31, band)).toBe("critical");
    expect(evaluate(14, band)).toBe("critical");
  });
  test("band edges are inclusive (26 is still Normal, 30 still Warning)", () => {
    expect(evaluate(26, band)).toBe("good");
    expect(evaluate(30, band)).toBe("warning");
  });
});

describe("Unit: threshold band validation", () => {
  test("a correctly ordered band is accepted", () => {
    expect(validateBand(band)).toBeNull();
  });
  test("an inverted or overlapping band is rejected", () => {
    expect(validateBand({ ...band, warn_min: 27 })).not.toBeNull();
    expect(validateBand({ ...band, crit_min: 19 })).not.toBeNull();
    expect(validateBand({ ...band, crit_max: 25 })).not.toBeNull();
  });
  test("non-numeric values are rejected", () => {
    expect(validateBand({ ...band, warn_max: "26" })).not.toBeNull();
  });
});
