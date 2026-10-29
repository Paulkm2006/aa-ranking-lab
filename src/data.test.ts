import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
import { demo, normalize, parseDataset, validateDataset } from "./data";
it("validates and roundtrips demo", () =>
  expect(parseDataset(JSON.stringify(demo), "test.json")).toEqual(demo));
it("rejects malformed metadata, duplicate ids, Infinity and impossible dates", () => {
  for (const patch of [
    { source: "" },
    { asOf: "2026-02-31" },
    { synthetic: "false" },
    { models: [demo.models[0], demo.models[0]] },
    { dimensions: [demo.dimensions[0], demo.dimensions[0]] },
    { models: demo.models.map((m) => ({ ...m, scores: { d0: Infinity } })) },
  ])
    expect(() => validateDataset({ ...demo, ...patch })).toThrow();
});
it("excludes missing scores without zero imputation", () => {
  const d = structuredClone(demo);
  d.models[0].scores.d0 = null;
  const n = normalize(d);
  expect(n.excluded).toHaveLength(1);
  expect(n.models).toHaveLength(9);
});
it("reverses lower-is-better values and removes constants", () => {
  const d = structuredClone(demo);
  d.dimensions[0].direction = "min";
  d.models.forEach((m) => (m.scores.d1 = 5));
  const n = normalize(d);
  expect(n.dimensions).toHaveLength(5);
  expect(n.models[0].values[0]).toBe(0);
});
it("keeps normalization bounds independent of model selection", () => {
  const n = normalize(demo);
  expect(n.models[0].values[0]).toBe(1);
  expect(n.models[9].values[0]).toBe(0);
});
it("rejects malformed CSV and inconsistent provenance", () => {
  expect(() => parseDataset("name,x\na,2", "a.csv")).toThrow();
  expect(() =>
    parseDataset(
      "id,name,provider,source,asOf,synthetic,x\na,a,p,s,2026-01-01,true,1\nb,b,p,t,2026-01-01,true,2",
      "a.csv",
    ),
  ).toThrow();
});
it("rejects oversized and unknown files", () => {
  expect(() => parseDataset("x".repeat(1024 * 1024 + 1), "a.json")).toThrow();
  expect(() => parseDataset("{}", "a.txt")).toThrow();
});

it("imports the CSV template with provenance and lower-is-better direction", () => {
  const d = parseDataset(
    readFileSync("public/example.csv", "utf8"),
    "example.csv",
  );
  expect(d.models).toHaveLength(3);
  expect(d.synthetic).toBe(true);
  expect(d.version).toBe("synthetic-v1");
  expect(d.dimensions[2].direction).toBe("min");
  expect(normalize(d).models[2].values[2]).toBe(1);
});
it("keeps quoted CSV commas and missing scores", () => {
  const csv =
    'id,name,provider,source,asOf,synthetic,x\na,"A, one",p,s,2026-01-01,true,1\nb,B,p,s,2026-01-01,true,';
  const d = parseDataset(csv, "test.csv");
  expect(d.models[0].name).toBe("A, one");
  expect(d.models[1].scores.x).toBeNull();
  expect(normalize(d).excluded).toHaveLength(1);
});
