import { describe, it, expect } from "vitest";
import { evaluate, visibleLocations, defaultThresholds, LOCATIONS } from "./data.js";

const band = { warn_min: 18, warn_max: 26, crit_min: 15, crit_max: 30 };

describe("evaluate — threshold state model (CP1 Figure 3.8)", () => {
  it("returns Normal for a reading inside the warning band", () => {
    expect(evaluate(22, band)).toBe("good");
  });

  it("returns Warning above the warning maximum but below critical", () => {
    expect(evaluate(28, band)).toBe("warning");
  });

  it("returns Warning below the warning minimum but above critical", () => {
    expect(evaluate(16, band)).toBe("warning");
  });

  it("returns Critical above the critical maximum", () => {
    expect(evaluate(31, band)).toBe("critical");
  });

  it("returns Critical below the critical minimum", () => {
    expect(evaluate(14, band)).toBe("critical");
  });

  it("treats the band boundaries as still Normal", () => {
    expect(evaluate(18, band)).toBe("good");
    expect(evaluate(26, band)).toBe("good");
  });

  it("defaults to Normal when no band is configured", () => {
    expect(evaluate(99, undefined)).toBe("good");
  });
});

describe("visibleLocations — access rules (A1 Table 1)", () => {
  const admin = { role: "Administrator", locations: "All locations" };
  const endUser = { role: "End User", locations: "Room A, Room B" };

  it("gives an Administrator every location", () => {
    expect(visibleLocations(admin)).toHaveLength(LOCATIONS.length);
  });

  it("restricts an End User to assigned locations only", () => {
    const names = visibleLocations(endUser).map((l) => l.name);
    expect(names).toEqual(["Room A", "Room B"]);
  });

  it("excludes locations the End User is not assigned", () => {
    const names = visibleLocations(endUser).map((l) => l.name);
    expect(names).not.toContain("Lab");
  });

  it("returns nothing when there is no session", () => {
    expect(visibleLocations(null)).toEqual([]);
  });
});

describe("defaultThresholds", () => {
  it("creates a configuration row for every location", () => {
    const config = defaultThresholds();
    expect(Object.keys(config)).toHaveLength(LOCATIONS.length);
  });

  it("keeps the critical band wider than the warning band", () => {
    const t = defaultThresholds()[1].temperature;
    expect(t.crit_min).toBeLessThan(t.warn_min);
    expect(t.crit_max).toBeGreaterThan(t.warn_max);
  });
});
