import { describe, it, expect } from "vitest";
import { fitRanking } from "./solver";
describe("LP preference inference", () => {
  it("maximizes a positive margin with normalized weights", () => {
    const r = fitRanking([
      [1, 0],
      [0.5, 0.5],
      [0, 1],
    ]);
    expect(r.strict).toBe(true);
    expect(r.margin).toBeCloseTo(0.5);
    expect(r.weights[0]).toBeCloseTo(1);
    expect(r.agreement).toBe(1);
  });
  it("does not classify equal scores as strict feasibility", () => {
    const r = fitRanking([
      [0.5, 0.5],
      [0.5, 0.5],
    ]);
    expect(r.strict).toBe(false);
    expect(r.totalSlack).toBeCloseTo(0.01);
    expect(r.ties).toBe(1);
    expect(r.agreement).toBe(0);
    expect(r.ranges[0][0]).toBeCloseTo(0);
    expect(r.ranges[0][1]).toBeCloseTo(1);
  });
  it("reports dominated preferences and minimizes slack", () => {
    const r = fitRanking([
      [0, 0],
      [1, 1],
    ]);
    expect(r.strict).toBe(false);
    expect(r.margin).toBeCloseTo(-1);
    expect(r.totalSlack).toBeCloseTo(1.01);
    expect(r.conflicts).toHaveLength(1);
    expect(r.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it("finds an interior solution rather than just one-hot weights", () => {
    const r = fitRanking([
      [1, 0],
      [0, 1],
      [0.4, 0],
    ]);
    expect(r.strict).toBe(true);
    expect(r.weights[0]).toBeCloseTo(10 / 17, 5);
    expect(r.margin).toBeCloseTo(3 / 17, 5);
  });
  it("handles a cycle that can only tie at the optimum", () => {
    const r = fitRanking([
      [1, 0],
      [0, 1],
      [1, 0],
    ]);
    expect(r.strict).toBe(false);
    expect(r.totalSlack).toBeCloseTo(0.02);
    expect(r.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it("reports non-identifiability for duplicate dimensions", () => {
    const r = fitRanking([
      [1, 1],
      [0, 0],
    ]);
    expect(r.strict).toBe(true);
    expect(r.ranges[0][0]).toBeCloseTo(0);
    expect(r.ranges[0][1]).toBeCloseTo(1);
  });
  it("rejects empty, ragged, nonfinite or unnormalized input", () => {
    for (const input of [[], [[1]], [[1], [1, 2]], [[NaN], [0]], [[2], [0]]])
      expect(() => fitRanking(input)).toThrow();
  });
  it("satisfies constraints on deterministic random feasible rankings", () => {
    let seed = 42;
    const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    for (let t = 0; t < 10; t++) {
      const w = [0.2, 0.3, 0.5];
      const rows = Array.from({ length: 8 }, () =>
        Array.from({ length: 3 }, random),
      ).sort(
        (a, b) =>
          b.reduce((s, x, j) => s + x * w[j], 0) -
          a.reduce((s, x, j) => s + x * w[j], 0),
      );
      const r = fitRanking(rows);
      expect(r.strict).toBe(true);
      expect(r.agreement).toBe(1);
      expect(r.weights.every((x) => x >= 0)).toBe(true);
      r.scores
        .slice(0, -1)
        .forEach((x, i) =>
          expect(x - r.scores[i + 1]).toBeGreaterThanOrEqual(r.margin - 1e-6),
        );
    }
  });
});
