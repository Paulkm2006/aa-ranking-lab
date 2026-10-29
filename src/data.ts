import Papa from "papaparse";
export type Dimension = { id: string; label: string; direction: "max" | "min" };
export type Model = {
  id: string;
  name: string;
  provider: string;
  scores: Record<string, number | null>;
};
export type Dataset = {
  name: string;
  source: string;
  asOf: string;
  synthetic: boolean;
  version: string;
  configuration: string;
  normalization: string;
  dimensions: Dimension[];
  models: Model[];
};
const labels = [
  "知识工作",
  "代码能力",
  "科学推理",
  "通用知识",
  "指令遵循",
  "长上下文",
];
const scores = [
  [92, 86, 80, 91, 84, 87],
  [84, 94, 82, 85, 87, 82],
  [81, 82, 95, 86, 79, 80],
  [88, 79, 82, 88, 93, 91],
  [78, 88, 76, 81, 85, 78],
  [83, 75, 86, 79, 80, 85],
  [76, 80, 79, 77, 82, 73],
  [73, 72, 74, 75, 77, 79],
  [64, 67, 62, 68, 72, 65],
  [58, 60, 57, 63, 66, 61],
];
export const demo: Dataset = {
  name: "Frontier models · Synthetic",
  source: "项目手工构造的虚构模型与分数；非 AA 测量数据",
  asOf: "2026-10-29",
  synthetic: true,
  version: "synthetic-v1 (not AA v5)",
  configuration: "Fictional models; no inference configuration",
  normalization: "Synthetic raw points; dataset min-max applied by this app",
  dimensions: labels.map((label, i) => ({
    id: `d${i}`,
    label,
    direction: "max",
  })),
  models: scores.map((s, i) => ({
    id: `model-${i}`,
    name: [
      "Atlas Pro",
      "Nova Code",
      "Helix Science",
      "Orion Ultra",
      "Nova Flash",
      "Helix Reason",
      "Atlas Mini",
      "Orion Lite",
      "Cedar Open",
      "Cedar Small",
    ][i],
    provider: [
      "Atlas Labs",
      "Nova AI",
      "Helix",
      "Orion",
      "Nova AI",
      "Helix",
      "Atlas Labs",
      "Orion",
      "Cedar",
      "Cedar",
    ][i],
    scores: Object.fromEntries(s.map((v, j) => [`d${j}`, v])),
  })),
};
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= 300;
export function validateDataset(value: unknown): Dataset {
  if (
    !object(value) ||
    !text(value.name) ||
    !text(value.source) ||
    typeof value.asOf !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.asOf) ||
    !Number.isFinite(Date.parse(value.asOf)) ||
    new Date(value.asOf).toISOString().slice(0, 10) !== value.asOf ||
    typeof value.synthetic !== "boolean"
  )
    throw Error(
      "数据必须包含 name、source、有效 asOf 日期 (YYYY-MM-DD) 和 synthetic 布尔标记。",
    );
  if (
    !Array.isArray(value.dimensions) ||
    value.dimensions.length < 1 ||
    value.dimensions.length > 12
  )
    throw Error("需要 1–12 个评分维度。");
  const dimensions: Dimension[] = value.dimensions.map((d) => {
    if (
      !object(d) ||
      !text(d.id) ||
      !text(d.label) ||
      !["max", "min"].includes(String(d.direction))
    )
      throw Error("维度需提供 id、label 和 direction (max/min)。");
    return {
      id: d.id as string,
      label: d.label as string,
      direction: d.direction as "max" | "min",
    };
  });
  if (new Set(dimensions.map((d) => d.id)).size !== dimensions.length)
    throw Error("维度 ID 不得重复。");
  if (
    !Array.isArray(value.models) ||
    value.models.length < 2 ||
    value.models.length > 60
  )
    throw Error("需要 2–60 个模型。");
  const models: Model[] = value.models.map((m) => {
    if (
      !object(m) ||
      !text(m.id) ||
      !text(m.name) ||
      !text(m.provider) ||
      !object(m.scores)
    )
      throw Error("每个模型需要 id、name、provider 和 scores。");
    const raw = m.scores;
    const scores = Object.fromEntries(
      dimensions.map((d) => {
        const v = raw[d.id] ?? null;
        if (
          v !== null &&
          (typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > 1e9)
        )
          throw Error(`${m.name} 的 ${d.label} 必须为有限数值或 null。`);
        return [d.id, v];
      }),
    );
    return {
      id: m.id as string,
      name: m.name as string,
      provider: m.provider as string,
      scores,
    };
  });
  if (new Set(models.map((m) => m.id)).size !== models.length)
    throw Error("模型 ID 不得重复。");
  for (const key of ["version", "configuration", "normalization"])
    if (value[key] !== undefined && !text(value[key]))
      throw Error(`${key} 必须为非空文本。`);
  return {
    version: (value.version as string) ?? "unspecified",
    configuration: (value.configuration as string) ?? "unspecified",
    normalization:
      (value.normalization as string) ??
      "Raw values; dataset min-max applied by this app",
    name: value.name as string,
    source: value.source as string,
    asOf: value.asOf,
    synthetic: value.synthetic,
    dimensions,
    models,
  };
}
export function parseDataset(input: string, filename: string): Dataset {
  if (new TextEncoder().encode(input).length > 1024 * 1024)
    throw Error("文件不能超过 1 MB。");
  if (filename.toLowerCase().endsWith(".json"))
    return validateDataset(JSON.parse(input));
  if (!filename.toLowerCase().endsWith(".csv"))
    throw Error("请选择 JSON 或 CSV 文件。");
  const parsed = Papa.parse<Record<string, string>>(input, {
    header: true,
    skipEmptyLines: "greedy",
  });
  if (parsed.errors.length)
    throw Error("CSV 格式错误：" + parsed.errors[0].message);
  if (
    parsed.meta.renamedHeaders &&
    Object.keys(parsed.meta.renamedHeaders).length
  )
    throw Error("CSV 表头不得重复。");
  const fields = parsed.meta.fields ?? [];
  const required = ["id", "name", "provider", "source", "asOf", "synthetic"];
  const reserved = [...required, "version", "configuration", "normalization"];
  if (!required.every((k) => fields.includes(k)))
    throw Error("CSV 缺少 id,name,provider,source,asOf,synthetic 表头。");
  const dimensions = fields
    .filter((k) => !reserved.includes(k))
    .map((k) => ({
      id: k,
      label: k.replace(/:(min|max)$/, ""),
      direction: k.endsWith(":min") ? "min" : "max",
    }));
  const first = parsed.data[0];
  if (!first) throw Error("CSV 不能为空。");
  if (
    !["true", "false"].includes(first.synthetic) ||
    parsed.data.some(
      (r) =>
        r.source !== first.source ||
        r.asOf !== first.asOf ||
        r.synthetic !== first.synthetic ||
        ["version", "configuration", "normalization"].some(
          (k) => r[k] !== first[k],
        ),
    )
  )
    throw Error(
      "CSV 各行 source、asOf、synthetic 必须一致；synthetic 使用 true/false。",
    );
  return validateDataset({
    version: first.version,
    configuration: first.configuration,
    normalization: first.normalization,
    name: filename,
    source: first.source,
    asOf: first.asOf,
    synthetic: first.synthetic === "true",
    dimensions,
    models: parsed.data.map((r) => ({
      id: r.id,
      name: r.name,
      provider: r.provider,
      scores: Object.fromEntries(
        dimensions.map((d) => [d.id, r[d.id]?.trim() ? Number(r[d.id]) : null]),
      ),
    })),
  });
}
export function normalize(data: Dataset) {
  const bounds = data.dimensions.map((d) => {
    const values = data.models
      .map((m) => m.scores[d.id])
      .filter((v): v is number => v !== null);
    return { min: Math.min(...values), max: Math.max(...values) };
  });
  const active = data.dimensions.filter(
    (_, j) => bounds[j].max > bounds[j].min,
  );
  const excluded = data.models.filter((m) =>
    data.dimensions.some((d) => m.scores[d.id] === null),
  );
  const models = data.models
    .filter((m) => !excluded.includes(m))
    .map((m) => ({
      model: m,
      values: active.map((d) => {
        const b = bounds[data.dimensions.indexOf(d)];
        const n = ((m.scores[d.id] as number) - b.min) / (b.max - b.min);
        return d.direction === "min" ? 1 - n : n;
      }),
    }));
  return {
    dimensions: active,
    models,
    excluded,
    constant: data.dimensions.filter((d) => !active.includes(d)),
  };
}
