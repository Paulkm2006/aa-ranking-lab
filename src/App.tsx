import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Beaker,
  Check,
  ChevronDown,
  Download,
  GripVertical,
  Info,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  demo,
  normalize,
  parseDataset,
  type Dataset,
  type Model,
  type Dimension,
} from "./data";
import type { Fit } from "./solver";
const colors = [
  "#e77843",
  "#508dbc",
  "#9673bd",
  "#4c9d86",
  "#ceae52",
  "#6a8298",
  "#d4789b",
  "#6a9963",
  "#b38c70",
  "#717fc9",
  "#b27458",
  "#629eac",
];
function download(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Row({
  model,
  index,
  score,
  dimensions,
  onMove,
  onRemove,
  last,
}: {
  model: Model;
  index: number;
  score?: number;
  dimensions: Dimension[];
  onMove: (n: number) => void;
  onRemove: () => void;
  last: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: model.id });
  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      data-testid="model-row"
    >
      <td className="drag-cell">
        <button
          className="grip"
          {...attributes}
          {...listeners}
          aria-label={`拖动 ${model.name}`}
        >
          <GripVertical size={17} />
        </button>
      </td>
      <td className="rank">{String(index + 1).padStart(2, "0")}</td>
      <td>
        <div className="model-name">
          <span
            className="avatar"
            style={{
              background: colors[index % colors.length] + "20",
              color: colors[index % colors.length],
            }}
          >
            {model.name.slice(0, 1)}
          </span>
          <div>
            <strong>{model.name}</strong>
            <small>{model.provider}</small>
          </div>
        </div>
      </td>
      <td className="score-cell">
        <strong>{score === undefined ? "—" : (score * 100).toFixed(1)}</strong>
        <span className="score-track">
          <i style={{ width: `${(score ?? 0) * 100}%` }} />
        </span>
      </td>
      {dimensions.map((d) => (
        <td className="raw" key={d.id}>
          {model.scores[d.id] ?? "—"}
        </td>
      ))}
      <td>
        <div className="row-actions">
          <button
            title="上移"
            aria-label={`上移 ${model.name}`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp size={14} />
          </button>
          <button
            title="下移"
            aria-label={`下移 ${model.name}`}
            disabled={last}
            onClick={() => onMove(1)}
          >
            <ArrowDown size={14} />
          </button>
          <button
            title="移除"
            aria-label={`移除 ${model.name}`}
            onClick={onRemove}
          >
            <X size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
export default function App() {
  const [data, setData] = useState<Dataset>(demo);
  const [order, setOrder] = useState(demo.models.map((m) => m.id));
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");
  const [fit, setFit] = useState<Fit | null>(null);
  const [solving, setSolving] = useState(true);
  const [solverError, setSolverError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const normalized = useMemo(() => normalize(data), [data]);
  const selected = useMemo(
    () =>
      order.flatMap((id) => {
        const m = normalized.models.find((m) => m.model.id === id);
        return m ? [m] : [];
      }),
    [normalized, order],
  );
  useEffect(() => {
    const worker = new Worker(new URL("./solver.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e) => {
      setFit(e.data.result ?? null);
      setSolverError(e.data.error ?? "");
      setSolving(false);
    };
    worker.onerror = () => {
      setSolverError("求解线程启动失败，请刷新页面。");
      setSolving(false);
    };
    worker.postMessage(selected.map((m) => m.values));
    return () => worker.terminate();
  }, [selected]);
  function changeOrder(ids: string[]) {
    setFit(null);
    setSolving(true);
    setOrder(ids);
  }
  function reset() {
    setQuery("");
    setProvider("all");
    setError("");
    changeOrder(normalized.models.map((m) => m.model.id));
  }
  function loadDemo() {
    setData(demo);
    setShowPicker(false);
    setError("");
    setQuery("");
    setProvider("all");
    changeOrder(demo.models.map((m) => m.id));
  }
  function move(id: string, step: number) {
    const i = order.indexOf(id);
    changeOrder(arrayMove(order, i, i + step));
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function dragEnd(e: DragEndEvent) {
    if (e.over && e.active.id !== e.over.id)
      changeOrder(
        arrayMove(
          order,
          order.indexOf(String(e.active.id)),
          order.indexOf(String(e.over.id)),
        ),
      );
  }
  const candidates = normalized.models.filter(
    ({ model: m }) =>
      (provider === "all" || m.provider === provider) &&
      (m.name + " " + m.provider).toLowerCase().includes(query.toLowerCase()),
  );
  const predicted = fit
    ? selected
        .map((m, i) => ({ ...m, score: fit.scores[i], target: i + 1 }))
        .sort((a, b) => b.score - a.score)
    : [];
  const multi = fit?.ranges.some(([min, max]) => max - min > 1e-4);
  return (
    <>
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          <b>
            AA <span>Ranking Lab</span>
          </b>
        </a>
        <nav>
          <a className="active" href="#leaderboard">
            模型排行榜
          </a>
          <a href="#method">求解方法</a>
          <a
            href="https://artificialanalysis.ai/"
            target="_blank"
            rel="noreferrer"
          >
            Artificial Analysis <ArrowUpRight size={13} />
          </a>
        </nav>
        <span className="unofficial">独立实验项目</span>
      </header>
      <main>
        <div className="breadcrumb">
          Language models <span>/</span> Ranking experiments
        </div>
        <section className="hero">
          <div>
            <div className="eyebrow">
              <span /> BUILD YOUR OWN BENCHMARK
            </div>
            <h1>
              你的排名，<span>你的权重。</span>
            </h1>
            <p>
              拖动模型，定义你心中的排行榜。
              <br className="mobile-break" />
              让线性规划找到最能解释它的能力权重。
            </p>
          </div>
          <div className="hero-label">
            <Beaker size={28} />
            <span>
              RANKING
              <br />
              <b>LAB / 01</b>
            </span>
          </div>
        </section>
        <div className="dataset-banner">
          <span className="pill">
            {data.synthetic ? "SYNTHETIC DEMO" : "IMPORTED DATA"}
          </span>
          <span>
            {data.synthetic
              ? "当前展示虚构模型与合成评分，非 AA 实测。"
              : "正在使用本地导入数据，评分来源由导入者声明。"}
            <b> 数据只在你的浏览器中处理。</b>
          </span>
          <button onClick={() => file.current?.click()}>
            导入自己的数据 <ArrowUpRight size={14} />
          </button>
        </div>
        <section className="stats">
          <div>
            <span>参与排名</span>
            <strong>
              {selected.length}
              <small> / {data.models.length} models</small>
            </strong>
          </div>
          <div>
            <span>有效维度</span>
            <strong>
              {normalized.dimensions.length}
              <small> capabilities</small>
            </strong>
          </div>
          <div>
            <span>
              排序一致率{" "}
              <em title="所有模型对中严格顺序一致的比例；并列不计为一致。">
                ⓘ
              </em>
            </span>
            <strong>
              {fit ? `${(fit.agreement * 100).toFixed(0)}%` : "—"}
              <small>{fit ? `${fit.ties} 对并列` : "等待求解"}</small>
            </strong>
          </div>
          <div>
            <span>求解方式</span>
            <strong className="stat-text">
              <span className="live-dot" />
              Linear programming<small>非负权重 · 总和 100%</small>
            </strong>
          </div>
        </section>
        <div className="workspace">
          <section className="leaderboard card" id="leaderboard">
            <div className="card-heading">
              <div>
                <div className="section-kicker">MODEL LEADERBOARD</div>
                <h2>
                  模型能力排行榜 <span>{selected.length}</span>
                </h2>
              </div>
              <div className="heading-actions">
                <button className="button" onClick={reset}>
                  <RotateCcw size={14} />
                  重置排序
                </button>
                <button
                  className="button dark"
                  onClick={() => setShowPicker(!showPicker)}
                >
                  <SlidersHorizontal size={14} />
                  选择模型 <ChevronDown size={12} />
                </button>
              </div>
            </div>
            {showPicker && (
              <div className="picker">
                <div className="picker-filters">
                  <label className="search">
                    <Search size={15} />
                    <input
                      placeholder="搜索模型或提供商…"
                      aria-label="搜索模型"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <select
                    aria-label="筛选提供商"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  >
                    <option value="all">全部提供商</option>
                    {[...new Set(data.models.map((m) => m.provider))].map(
                      (p) => (
                        <option key={p}>{p}</option>
                      ),
                    )}
                  </select>
                  <button
                    className="text-button"
                    onClick={() => {
                      changeOrder(normalized.models.map((m) => m.model.id));
                    }}
                  >
                    全选
                  </button>
                </div>
                <div className="choices">
                  {candidates.map(({ model: m }) => (
                    <label key={m.id}>
                      <input
                        type="checkbox"
                        checked={order.includes(m.id)}
                        onChange={() =>
                          changeOrder(
                            order.includes(m.id)
                              ? order.filter((id) => id !== m.id)
                              : [...order, m.id],
                          )
                        }
                      />
                      {m.name}
                    </label>
                  ))}
                  {!candidates.length && <p>没有匹配的模型。</p>}
                </div>
                <small>筛选只影响选择列表，不隐藏已选模型的排序约束。</small>
              </div>
            )}
            <div className="table-note">
              <GripVertical size={14} />
              <span>拖动手柄调整目标顺序；也可使用方向按钮或空格 + 方向键</span>
              <span className="note-right">
                原始维度分数 · 分数不等于官方指数
              </span>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={dragEnd}
            >
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th />
                      <th>#</th>
                      <th>模型 / Model</th>
                      <th>
                        拟合分数 <ArrowDown size={11} />
                      </th>
                      {data.dimensions.map((d) => (
                        <th key={d.id}>
                          {d.label}
                          <small>
                            {d.direction === "min" ? "↓ LOWER" : "↑ HIGHER"}
                          </small>
                        </th>
                      ))}
                      <th>调整</th>
                    </tr>
                  </thead>
                  <SortableContext
                    items={order}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody>
                      {selected.map(({ model }, i) => (
                        <Row
                          key={model.id}
                          model={model}
                          index={i}
                          score={fit?.scores[i]}
                          dimensions={data.dimensions}
                          onMove={(step) => move(model.id, step)}
                          onRemove={() =>
                            changeOrder(order.filter((id) => id !== model.id))
                          }
                          last={i === selected.length - 1}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </table>
                {!selected.length && (
                  <div className="empty">
                    尚未选择模型，请点击「选择模型」添加。
                  </div>
                )}
              </div>
            </DndContext>
            <div className="table-footer">
              <span>
                <span className="live-dot" />{" "}
                {solving ? "正在求解…" : "拖动后自动求解"}
              </span>
              <span>
                {data.synthetic ? "合成快照" : "导入快照"} · {data.asOf}
              </span>
            </div>
          </section>
          <aside className="weights card">
            <div className="section-kicker">PREFERENCE WEIGHTS</div>
            <h2>
              解读你的排名 <Sparkles size={18} />
            </h2>
            <p className="muted">哪种能力，让模型更靠前？</p>
            <div
              className={`solve-status ${fit?.strict ? "success" : "warning"}`}
              role="status"
            >
              {solving ? (
                "正在解算…"
              ) : solverError ? (
                solverError
              ) : fit?.strict ? (
                <>
                  <Check size={16} />
                  可严格实现目标排序
                </>
              ) : (
                <>
                  <Info size={16} />
                  无法严格实现 · 最小违约解
                </>
              )}
            </div>
            {fit && (
              <>
                <div className="weight-stack">
                  {fit.weights.map((w, i) => (
                    <i
                      key={i}
                      style={{ width: `${w * 100}%`, background: colors[i] }}
                    />
                  ))}
                </div>
                <div className="weight-list">
                  {normalized.dimensions.map((d, i) => (
                    <div className="weight" key={d.id}>
                      <div>
                        <span>
                          <i style={{ background: colors[i] }} />
                          {d.label}
                        </span>
                        <b>
                          {(fit.weights[i] * 100).toFixed(1)}
                          <small>%</small>
                        </b>
                      </div>
                      <div className="weight-track">
                        <i
                          style={{
                            width: `${fit.weights[i] * 100}%`,
                            background: colors[i],
                          }}
                        />
                      </div>
                      <small>
                        最优解范围 {(fit.ranges[i][0] * 100).toFixed(1)}–
                        {(fit.ranges[i][1] * 100).toFixed(1)}%
                      </small>
                    </div>
                  ))}
                </div>
                <div className="solve-detail">
                  <span>
                    {fit.strict ? "最大最小间隔" : "总松弛量"}
                    <b>
                      {(fit.strict ? fit.margin : fit.totalSlack).toFixed(4)}
                    </b>
                  </span>
                  <span>
                    权重总和
                    <b>
                      {(fit.weights.reduce((a, b) => a + b, 0) * 100).toFixed(
                        1,
                      )}
                      %
                    </b>
                  </span>
                </div>
                <p className="inference-note">
                  {multi
                    ? "存在多组最优权重。当前展示其中一组，区间不代表统计置信度。"
                    : "在当前数据及数值容差内，最优权重范围很窄。"}
                  <br />
                  这解释你的偏好，不是在恢复 AA 官方权重。
                </p>
                <button
                  className="button export"
                  onClick={() =>
                    download(
                      {
                        dataset: data,
                        targetOrder: order,
                        normalization:
                          "full-dataset min-max; lower-is-better reversed; complete cases",
                        fit,
                      },
                      "ranking-experiment.json",
                    )
                  }
                >
                  <Download size={14} />
                  导出实验结果
                </button>
              </>
            )}
          </aside>
        </div>
        {fit && (
          <section className="comparison card">
            <div className="card-heading">
              <div>
                <div className="section-kicker">RANKING DIAGNOSTICS</div>
                <h2>目标与拟合</h2>
              </div>
              <span className="muted">
                并列分数保留目标顺序展示，不算排序成功
              </span>
            </div>
            <div className="comparison-grid">
              <div className="predicted">
                {predicted.map((m, i) => (
                  <div key={m.model.id}>
                    <span className="predicted-rank">{i + 1}</span>
                    <strong>{m.model.name}</strong>
                    <span className="target-position">目标 #{m.target}</span>
                    <b>{(m.score * 100).toFixed(1)}</b>
                  </div>
                ))}
              </div>
              <div className="diagnostics">
                <h3>
                  {fit.strict
                    ? "每个相邻偏好都能被解释"
                    : "存在无法满足的相邻偏好"}
                </h3>
                <p>
                  {fit.strict
                    ? "在非负权重下，相邻模型均有严格正间隔。排序可以实现，但不能据此推断唯一权重。"
                    : "某些模型的维度表现限制了排序。求解器已最小化达到 0.01 标准化间隔所需的总松弛量。"}
                </p>
                {fit.conflicts.map((c) => (
                  <div className="conflict" key={c.index}>
                    <Info size={15} />
                    <span>
                      {selected[c.index].model.name} ≻{" "}
                      {selected[c.index + 1].model.name}
                      <small>
                        实际间隔 {c.gap.toFixed(4)} · 松弛 {c.slack.toFixed(4)}
                      </small>
                    </span>
                  </div>
                ))}
                <div className="tip">
                  <Beaker size={18} />
                  <span>
                    试试看：把能力全面较弱的模型拖到第一名，观察约束冲突。
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}
        <section id="method" className="method-grid">
          <div>
            <div className="section-kicker">UNDER THE HOOD</div>
            <h2>排名是偏好，权重是解释。</h2>
            <p>
              固定全数据集各维度的 min–max 到
              [0,1]，低分更好的维度反向。选择模型不会改变标准化基准。
              {normalized.constant.length > 0 &&
                ` ${normalized.constant.map((d) => d.label).join("、")} 为常量或全空维度，已剔除。`}
            </p>
            <p>
              缺失任一维度的模型不参与求解，不填零。当前排除{" "}
              {normalized.excluded.length} 个
              {normalized.excluded.length > 0 &&
                `：${normalized.excluded.map((m) => m.name).join("、")}`}
              。
            </p>
            <code>
              max δ s.t. (xᵢ − xᵢ₊₁) · w ≥ δ<br />w ≥ 0, Σw = 1
            </code>
            <p>
              若最大间隔 ≤
              10⁻⁷，改为最小化相邻约束的总松弛量。权重区间在最优目标值的 10⁻⁷
              容差内分别求极值；不是所有能产生同一顺序的权重区间，也不能将各区间端点随意组合。
            </p>
          </div>
          <div className="data-panel">
            <div className="section-kicker">YOUR DATA, YOUR EXPERIMENT</div>
            <h2>接入你有权使用的评分</h2>
            <p>
              支持 JSON / CSV，最多 60 个模型、12 个维度、1
              MB。导入内容仅在内存中使用，刷新后清除。
            </p>
            <div className="data-actions">
              <button
                className="button dark"
                onClick={() => file.current?.click()}
              >
                <Upload size={15} />
                导入数据
              </button>
              <button
                className="button"
                onClick={() => download(demo, "demo-dataset.json")}
              >
                <Download size={15} />
                JSON 模板
              </button>
              <a className="button" href="./example.csv" download>
                CSV 模板
              </a>
              <button className="text-button" onClick={loadDemo}>
                恢复演示数据
              </button>
            </div>
            <input
              ref={file}
              type="file"
              accept=".json,.csv"
              className="hidden"
              aria-label="导入评分文件"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  if (f.size > 1024 * 1024) throw Error("文件不能超过 1 MB。");
                  const d = parseDataset(await f.text(), f.name);
                  setData(d);
                  setError("");
                  setQuery("");
                  setProvider("all");
                  changeOrder(normalize(d).models.map((m) => m.model.id));
                } catch (e) {
                  setError(e instanceof Error ? e.message : "无法解析文件");
                } finally {
                  if (file.current) file.current.value = "";
                }
              }}
            />
            {error && (
              <p role="alert" className="error">
                导入失败：{error} 原有数据未改变。
              </p>
            )}
            <div className="source">
              <strong>{data.name}</strong>
              <p>来源：{data.source}</p>
              <p>
                版本：{data.version} · 配置：{data.configuration}
              </p>
              <p>输入标度：{data.normalization}</p>
              <small>
                数据日期 {data.asOf} ·{" "}
                {data.synthetic ? "合成数据" : "用户声明来源，未独立核验"}
              </small>
            </div>
            <p className="legal-note">
              未内置 AA API 数据或抓取功能。AA
              数据在第三方排行榜中的使用可能需要书面许可。
              <a
                href="https://artificialanalysis.ai/data-api/docs"
                target="_blank"
                rel="noreferrer"
              >
                查看官方数据文档 ↗
              </a>
            </p>
          </div>
        </section>
        <footer>
          <a className="brand" href="#">
            <Beaker size={18} />
            <b>AA Ranking Lab</b>
          </a>
          <span>
            Independent experiment. Not affiliated with Artificial Analysis.
          </span>
          <a
            href="https://artificialanalysis.ai/methodology/intelligence-benchmarking"
            target="_blank"
            rel="noreferrer"
          >
            官方方法论 <ArrowUpRight size={12} />
          </a>
        </footer>
      </main>
    </>
  );
}
