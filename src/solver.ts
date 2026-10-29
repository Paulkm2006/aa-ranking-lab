import solver from "javascript-lp-solver";
export type Fit = {
  weights: number[];
  ranges: [number, number][];
  strict: boolean;
  margin: number;
  totalSlack: number;
  scores: number[];
  conflicts: { index: number; gap: number; slack: number }[];
  agreement: number;
  ties: number;
};
type LP = {
  optimize: string;
  opType: "max" | "min";
  constraints: Record<string, { min?: number; max?: number; equal?: number }>;
  variables: Record<string, Record<string, number>>;
};
const EPS = 1e-7;
function solve(lp: LP) {
  const r = solver.Solve(lp) as Record<string, number | boolean>;
  if (!r.feasible || r.bounded === false)
    throw Error("线性规划未收敛，请检查数据。");
  return r;
}
const val = (r: Record<string, number | boolean>, k: string) =>
  typeof r[k] === "number" ? (r[k] as number) : 0;
export function fitRanking(rows: number[][]): Fit {
  const n = rows.length,
    k = rows[0]?.length ?? 0;
  if (
    n < 2 ||
    k < 1 ||
    rows.some(
      (r) =>
        r.length !== k || r.some((v) => !Number.isFinite(v) || v < 0 || v > 1),
    )
  )
    throw Error("至少需要两个完整模型、一个变化维度，且输入已标准化到 [0,1]。");
  const differences = rows
    .slice(0, -1)
    .map((r, i) => r.map((x, j) => x - rows[i + 1][j]));
  const constraints: LP["constraints"] = {
    sum: { equal: 1 },
    bound: { max: 2 },
  };
  differences.forEach((_, i) => (constraints[`p${i}`] = { min: -1 }));
  const variables: LP["variables"] = {
    margin: {
      objective: 1,
      bound: 1,
      ...Object.fromEntries(differences.map((_, i) => [`p${i}`, -1])),
    },
  };
  for (let j = 0; j < k; j++)
    variables[`w${j}`] = {
      sum: 1,
      ...Object.fromEntries(differences.map((d, i) => [`p${i}`, d[j]])),
    };
  const first = solve({
    optimize: "objective",
    opType: "max",
    constraints,
    variables,
  });
  const margin = val(first, "margin") - 1;
  const strict = margin > EPS;
  let best = first,
    face: LP;
  if (strict) {
    face = {
      optimize: "target",
      opType: "min",
      constraints: {
        sum: { equal: 1 },
        ...Object.fromEntries(
          differences.map((_, i) => [`p${i}`, { min: margin - EPS }]),
        ),
      },
      variables: Object.fromEntries(
        Array.from({ length: k }, (_, j) => [
          `w${j}`,
          {
            sum: 1,
            ...Object.fromEntries(differences.map((d, i) => [`p${i}`, d[j]])),
          },
        ]),
      ),
    };
  } else {
    const c: LP["constraints"] = {
      sum: { equal: 1 },
      ...Object.fromEntries(
        differences.map((_, i) => [`p${i}`, { min: 0.01 }]),
      ),
    };
    const v: LP["variables"] = Object.fromEntries(
      Array.from({ length: k }, (_, j) => [
        `w${j}`,
        {
          sum: 1,
          ...Object.fromEntries(differences.map((d, i) => [`p${i}`, d[j]])),
        },
      ]),
    );
    differences.forEach(
      (_, i) => (v[`s${i}`] = { objective: 1, [`p${i}`]: 1, slackTotal: 1 }),
    );
    face = {
      optimize: "objective",
      opType: "min",
      constraints: c,
      variables: v,
    };
    best = solve(face);
    face.constraints.slackTotal = { max: val(best, "result") + EPS };
  }
  const weights = Array.from({ length: k }, (_, j) =>
    Math.max(0, val(best, `w${j}`)),
  );
  const sum = weights.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-5) throw Error("求解器返回了无效权重。");
  const scores = rows.map((r) => r.reduce((s, x, j) => s + x * weights[j], 0));
  const conflicts = differences
    .map((_, i) => ({
      index: i,
      gap: scores[i] - scores[i + 1],
      slack: Math.max(0, 0.01 - (scores[i] - scores[i + 1])),
    }))
    .filter((x) => x.gap <= EPS);
  const ranges = weights.map((_, j) => {
    const p = structuredClone(face);
    Object.entries(p.variables).forEach(
      ([name, v]) => (v.target = name === `w${j}` ? 1 : 0),
    );
    p.optimize = "target";
    p.opType = "min";
    const min = val(solve(p), `w${j}`);
    p.opType = "max";
    const max = val(solve(p), `w${j}`);
    return [Math.max(0, min), Math.min(1, max)] as [number, number];
  });
  let agreed = 0,
    ties = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const d = scores[i] - scores[j];
      if (d > EPS) agreed++;
      else if (Math.abs(d) <= EPS) ties++;
    }
  return {
    weights,
    ranges,
    strict,
    margin,
    totalSlack: strict
      ? 0
      : scores
          .slice(0, -1)
          .reduce((s, x, i) => s + Math.max(0, 0.01 - (x - scores[i + 1])), 0),
    scores,
    conflicts,
    agreement: agreed / ((n * (n - 1)) / 2),
    ties,
  };
}
