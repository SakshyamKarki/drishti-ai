import { useState, useEffect, useRef } from "react";
import "../styles/research.css";

// ── Static benchmark data (mirrors backend) ────────────────────────────────
const BENCHMARK = {
  ResNet18:    { accuracy: 98.26, f1: 98.25, auc: 99.81, precision: 98.33, recall: 98.18, fpr: 1.67, fnr: 1.82, params: 11.7, ms: 12,  size: 44.7, year: 2015, color: "#60a5fa" },
  EfficientNet:{ accuracy: 98.49, f1: 98.48, auc: 99.73, precision: 98.91, recall: 98.06, fpr: 1.08, fnr: 1.94, params: 5.3,  ms: 18,  size: 20.4, year: 2019, color: "#34d399" },
  MobileNetV2: { accuracy: 98.31, f1: 98.31, auc: 99.68, precision: 98.40, recall: 98.23, fpr: 1.60, fnr: 1.77, params: 3.4,  ms: 8,   size: 13.6, year: 2018, color: "#a78bfa" },
  DenseNet121: { accuracy: 98.62, f1: 98.61, auc: 99.79, precision: 98.78, recall: 98.45, fpr: 1.22, fnr: 1.55, params: 8.0,  ms: 22,  size: 30.8, year: 2016, color: "#f59e0b" },
  CustomCNN:   { accuracy: 94.57, f1: 94.52, auc: 98.77, precision: 95.45, recall: 93.60, fpr: 4.46, fnr: 6.40, params: 2.1,  ms: 5,   size: 8.2,  year: 2024, color: "#f87171" },
};

const MODEL_ORDER = ["ResNet18", "EfficientNet", "MobileNetV2", "DenseNet121", "CustomCNN"];

const DESCRIPTIONS = {
  ResNet18:    "Pioneered residual (skip) connections to solve vanishing gradients. Uses 18 layers with identity shortcuts, enabling very deep networks to train effectively.",
  EfficientNet:"Systematically scales depth, width and resolution using a compound coefficient. Achieves state-of-the-art accuracy with far fewer parameters than traditional approaches.",
  MobileNetV2: "Designed for mobile and edge deployment using inverted residuals and linear bottlenecks. Minimizes memory footprint while maintaining competitive accuracy.",
  DenseNet121: "Connects every layer to every subsequent layer in a feed-forward fashion. Dense connectivity encourages feature reuse and improves gradient flow significantly.",
  CustomCNN:   "Purpose-built 4-block CNN with channel attention trained from scratch on deepfake data. No ImageNet pretraining — learns task-specific features directly.",
};

// ── Animated Bar ───────────────────────────────────────────────────────────
const AnimatedBar = ({ value, max = 100, color, delay = 0 }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth((value / max) * 100), delay + 100);
    return () => clearTimeout(t);
  }, [value, max, delay]);
  return (
    <div className="rsc-bar-track">
      <div
        className="rsc-bar-fill"
        style={{ width: `${width}%`, background: color, transitionDelay: `${delay}ms` }}
      />
    </div>
  );
};

// ── Radar Chart (SVG) ──────────────────────────────────────────────────────
const RadarChart = ({ model, data, color }) => {
  const metrics = [
    { label: "Accuracy", value: (data.accuracy - 90) / 10 },
    { label: "Precision", value: (data.precision - 90) / 10 },
    { label: "Recall", value: (data.recall - 90) / 10 },
    { label: "F1 Score", value: (data.f1 - 90) / 10 },
    { label: "AUC", value: (data.auc - 90) / 10 },
    { label: "Speed", value: 1 - Math.min(data.ms / 30, 1) },
  ];

  const cx = 80, cy = 80, r = 60;
  const n = metrics.length;
  const angleStep = (2 * Math.PI) / n;

  const points = metrics.map((m, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const dist = m.value * r;
    return [cx + dist * Math.cos(angle), cy + dist * Math.sin(angle)];
  });

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const polygon = points.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      {/* Grid */}
      {gridLevels.map((lv) => {
        const gPts = Array.from({ length: n }, (_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return `${cx + lv * r * Math.cos(angle)},${cy + lv * r * Math.sin(angle)}`;
        }).join(" ");
        return <polygon key={lv} points={gPts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}
      {/* Axes */}
      {metrics.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return (
          <line key={i}
            x1={cx} y1={cy}
            x2={cx + r * Math.cos(angle)}
            y2={cy + r * Math.sin(angle)}
            stroke="rgba(255,255,255,0.08)" strokeWidth="1"
          />
        );
      })}
      {/* Data polygon */}
      <polygon points={polygon} fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" />
      {/* Points */}
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
      ))}
      {/* Labels */}
      {metrics.map((m, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const lx = cx + (r + 16) * Math.cos(angle);
        const ly = cy + (r + 16) * Math.sin(angle);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize="7" fill="rgba(255,255,255,0.4)" fontFamily="DM Mono, monospace">
            {m.label}
          </text>
        );
      })}
    </svg>
  );
};

// ── Model Card ─────────────────────────────────────────────────────────────
const ModelCard = ({ name, data, isBest, selectedMetric }) => {
  const [expanded, setExpanded] = useState(false);
  const metrics = [
    { key: "accuracy",  label: "Accuracy",  val: data.accuracy.toFixed(2),  unit: "%" },
    { key: "precision", label: "Precision", val: data.precision.toFixed(2), unit: "%" },
    { key: "recall",    label: "Recall",    val: data.recall.toFixed(2),    unit: "%" },
    { key: "f1",        label: "F1 Score",  val: data.f1.toFixed(2),        unit: "%" },
    { key: "auc",       label: "AUC",       val: data.auc.toFixed(2),       unit: "%" },
    { key: "fpr",       label: "False Positive Rate", val: data.fpr.toFixed(2), unit: "%" },
    { key: "fnr",       label: "False Negative Rate", val: data.fnr.toFixed(2), unit: "%" },
  ];

  return (
    <div className={`rsc-model-card ${isBest ? "best" : ""}`}
         style={{ "--model-color": data.color }}>
      {isBest && <div className="rsc-best-badge">★ Best Model</div>}
      <div className="rsc-card-header">
        <div className="rsc-model-dot" style={{ background: data.color }} />
        <div>
          <div className="rsc-model-name">{name}</div>
          <div className="rsc-model-year">{data.year} · {data.params}M params</div>
        </div>
        <div className="rsc-card-auc" style={{ color: data.color }}>{data.auc}%</div>
      </div>

      <div className="rsc-radar-wrap">
        <RadarChart model={name} data={data} color={data.color} />
        <div className="rsc-key-stats">
          <div className="rsc-key-stat">
            <span className="rsc-ks-label">Accuracy</span>
            <span className="rsc-ks-val" style={{ color: data.color }}>{data.accuracy}%</span>
          </div>
          <div className="rsc-key-stat">
            <span className="rsc-ks-label">Inference</span>
            <span className="rsc-ks-val">{data.ms}ms</span>
          </div>
          <div className="rsc-key-stat">
            <span className="rsc-ks-label">Size</span>
            <span className="rsc-ks-val">{data.size}MB</span>
          </div>
          <div className="rsc-key-stat">
            <span className="rsc-ks-label">FPR</span>
            <span className="rsc-ks-val" style={{ color: "#f87171" }}>{data.fpr}%</span>
          </div>
        </div>
      </div>

      <p className="rsc-description">{DESCRIPTIONS[name]}</p>

      <button className="rsc-expand-btn" onClick={() => setExpanded(!expanded)}>
        {expanded ? "▲ Hide metrics" : "▼ All metrics"}
      </button>

      {expanded && (
        <div className="rsc-metrics-grid">
          {metrics.map((m) => (
            <div key={m.key} className={`rsc-metric-row ${selectedMetric === m.key ? "highlighted" : ""}`}>
              <span className="rsc-metric-label">{m.label}</span>
              <AnimatedBar
                value={m.key === "fpr" || m.key === "fnr" ? 10 - m.val : parseFloat(m.val) - 88}
                max={12}
                color={data.color}
                delay={Math.random() * 200}
              />
              <span className="rsc-metric-val" style={{ color: data.color }}>{m.val}{m.unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Comparison Bar Chart ───────────────────────────────────────────────────
const ComparisonChart = ({ metric, label, unit = "%", ascending = false }) => {
  const entries = MODEL_ORDER.map((m) => ({
    name: m,
    value: BENCHMARK[m][metric],
    color: BENCHMARK[m].color,
  }));

  const sorted = [...entries].sort((a, b) =>
    ascending ? a.value - b.value : b.value - a.value
  );

  const max = Math.max(...sorted.map((e) => e.value));
  const min = Math.min(...sorted.map((e) => e.value));
  const range = max - min || 1;

  return (
    <div className="rsc-chart-wrap">
      <div className="rsc-chart-label">{label}</div>
      <div className="rsc-chart-bars">
        {sorted.map((entry, i) => {
          const pct = ((entry.value - min) / range) * 80 + 15;
          const isBest = i === (ascending ? 0 : 0);
          return (
            <div key={entry.name} className="rsc-chart-row">
              <span className="rsc-chart-name">{entry.name}</span>
              <div className="rsc-chart-bar-track">
                <div
                  className="rsc-chart-bar-fill"
                  style={{ width: `${pct}%`, background: entry.color }}
                />
              </div>
              <span className="rsc-chart-val" style={{ color: entry.color }}>
                {entry.value.toFixed(2)}{unit}
                {isBest && <span className="rsc-best-star"> ★</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Trade-off Scatter ──────────────────────────────────────────────────────
const TradeoffScatter = () => {
  // accuracy vs speed scatter
  const w = 320, h = 200, pad = 40;
  const maxMs = Math.max(...MODEL_ORDER.map((m) => BENCHMARK[m].ms));
  const minAcc = Math.min(...MODEL_ORDER.map((m) => BENCHMARK[m].accuracy));
  const maxAcc = Math.max(...MODEL_ORDER.map((m) => BENCHMARK[m].accuracy));

  const toX = (ms) => pad + ((ms / maxMs) * (w - 2 * pad));
  const toY = (acc) => h - pad - (((acc - minAcc) / (maxAcc - minAcc)) * (h - 2 * pad));

  return (
    <div className="rsc-chart-wrap">
      <div className="rsc-chart-label">Accuracy vs Inference Speed Trade-off</div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: w }}>
        {/* Axes */}
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <text x={w / 2} y={h - 5} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)" fontFamily="DM Mono">Inference (ms) →</text>
        <text x={8} y={h / 2} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)" fontFamily="DM Mono" transform={`rotate(-90 8 ${h / 2})`}>Accuracy %</text>
        {/* Pareto frontier guide */}
        <line x1={pad} y1={toY(maxAcc)} x2={toX(maxMs)} y2={h - pad}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
        {MODEL_ORDER.map((m) => {
          const d = BENCHMARK[m];
          const x = toX(d.ms);
          const y = toY(d.accuracy);
          return (
            <g key={m}>
              <circle cx={x} cy={y} r={(d.params / 4) + 4} fill={d.color} fillOpacity="0.2" stroke={d.color} strokeWidth="1.5" />
              <circle cx={x} cy={y} r="3" fill={d.color} />
              <text x={x + 6} y={y - 4} fontSize="8" fill={d.color} fontFamily="DM Mono">{m.replace("Net", "").replace("Mobile", "Mob")}</text>
            </g>
          );
        })}
      </svg>
      <div className="rsc-scatter-legend">
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px" }}>Circle size ∝ model parameters</span>
      </div>
    </div>
  );
};

// ── Confusion Matrix Mini ──────────────────────────────────────────────────
const MiniConfusion = ({ name, data }) => {
  const tp = data.recall;
  const fp = data.fpr;
  const tn = 100 - data.fpr;
  const fn = data.fnr;
  const cells = [
    { label: "TP", value: `${tp.toFixed(1)}%`, color: data.color },
    { label: "FP", value: `${fp.toFixed(1)}%`, color: "#f87171" },
    { label: "FN", value: `${fn.toFixed(1)}%`, color: "#f87171" },
    { label: "TN", value: `${tn.toFixed(1)}%`, color: data.color },
  ];
  return (
    <div className="rsc-confusion">
      <div className="rsc-confusion-name" style={{ color: data.color }}>{name}</div>
      <div className="rsc-confusion-grid">
        {cells.map((c) => (
          <div key={c.label} className="rsc-cell">
            <div className="rsc-cell-label">{c.label}</div>
            <div className="rsc-cell-val" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Summary Table ──────────────────────────────────────────────────────────
const SummaryTable = () => (
  <div className="rsc-table-wrap">
    <table className="rsc-table">
      <thead>
        <tr>
          <th>Model</th>
          <th>Accuracy</th>
          <th>Precision</th>
          <th>Recall</th>
          <th>F1</th>
          <th>AUC</th>
          <th>FPR</th>
          <th>FNR</th>
          <th>Params</th>
          <th>Speed</th>
        </tr>
      </thead>
      <tbody>
        {MODEL_ORDER.map((m) => {
          const d = BENCHMARK[m];
          const isBest = m === "DenseNet121";
          return (
            <tr key={m} className={isBest ? "best-row" : ""}>
              <td style={{ color: d.color, fontWeight: 600 }}>{m}{isBest && " ★"}</td>
              <td>{d.accuracy.toFixed(2)}%</td>
              <td>{d.precision.toFixed(2)}%</td>
              <td>{d.recall.toFixed(2)}%</td>
              <td>{d.f1.toFixed(2)}%</td>
              <td>{d.auc.toFixed(2)}%</td>
              <td style={{ color: "#f87171" }}>{d.fpr.toFixed(2)}%</td>
              <td style={{ color: "#f87171" }}>{d.fnr.toFixed(2)}%</td>
              <td>{d.params}M</td>
              <td>{d.ms}ms</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// ── Main Research Page ─────────────────────────────────────────────────────
function ResearchPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMetric, setSelectedMetric] = useState("accuracy");

  const tabs = [
    { id: "overview",   label: "Model Overview" },
    { id: "comparison", label: "Metric Comparison" },
    { id: "tradeoff",   label: "Trade-off Analysis" },
    { id: "confusion",  label: "Confusion Matrices" },
    { id: "table",      label: "Summary Table" },
  ];

  const metrics = [
    { id: "accuracy",  label: "Accuracy" },
    { id: "auc",       label: "AUC" },
    { id: "f1",        label: "F1 Score" },
    { id: "precision", label: "Precision" },
    { id: "recall",    label: "Recall" },
    { id: "fpr",       label: "FPR (↓ better)", ascending: true },
    { id: "fnr",       label: "FNR (↓ better)", ascending: true },
    { id: "ms",        label: "Speed ms (↓ better)", ascending: true },
  ];

  return (
    <div className="rsc-page">
      {/* Header */}
      <div className="rsc-header">
        <div className="rsc-header-tag">Research · Benchmark Study</div>
        <h1 className="rsc-title">5-Model Comparative Analysis</h1>
        <p className="rsc-subtitle">
          Systematic evaluation of CNN architectures for AI-generated profile photo detection.
          Trained on 200K image dataset with identical hyperparameters.
        </p>
        {/* Dataset pills */}
        <div className="rsc-pills">
          {[
            { l: "Dataset", v: "200K images" },
            { l: "Train / Val / Test", v: "80 / 10 / 10%" },
            { l: "Image Size", v: "64 × 64 px" },
            { l: "Epochs", v: "10" },
            { l: "Optimizer", v: "Adam · lr=0.0001" },
            { l: "Classes", v: "FAKE · REAL" },
          ].map(({ l, v }) => (
            <div key={l} className="rsc-pill">
              <span className="rsc-pill-label">{l}</span>
              <span className="rsc-pill-val">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="rsc-kpi-row">
        {[
          { label: "Best Accuracy", val: "98.62%", sub: "DenseNet121", color: "#f59e0b" },
          { label: "Best AUC",      val: "99.81%", sub: "ResNet18",    color: "#60a5fa" },
          { label: "Fastest Model", val: "5ms",    sub: "CustomCNN",   color: "#f87171" },
          { label: "Smallest Model",val: "8.2MB",  sub: "CustomCNN",   color: "#f87171" },
          { label: "Best Precision",val: "98.91%", sub: "EfficientNet",color: "#34d399" },
          { label: "Best Recall",   val: "98.45%", sub: "DenseNet121", color: "#f59e0b" },
        ].map(({ label, val, sub, color }) => (
          <div key={label} className="rsc-kpi">
            <div className="rsc-kpi-label">{label}</div>
            <div className="rsc-kpi-val" style={{ color }}>{val}</div>
            <div className="rsc-kpi-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="rsc-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`rsc-tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rsc-content">
        {activeTab === "overview" && (
          <div className="rsc-cards-grid">
            {MODEL_ORDER.map((m) => (
              <ModelCard
                key={m}
                name={m}
                data={BENCHMARK[m]}
                isBest={m === "DenseNet121"}
                selectedMetric={selectedMetric}
              />
            ))}
          </div>
        )}

        {activeTab === "comparison" && (
          <div>
            {/* Metric selector */}
            <div className="rsc-metric-tabs">
              {metrics.map((mt) => (
                <button
                  key={mt.id}
                  className={`rsc-metric-tab ${selectedMetric === mt.id ? "active" : ""}`}
                  onClick={() => setSelectedMetric(mt.id)}
                >
                  {mt.label}
                </button>
              ))}
            </div>
            <div className="rsc-charts-grid">
              {metrics.filter((mt) => mt.id === selectedMetric || selectedMetric === "all").map((mt) => (
                <ComparisonChart
                  key={mt.id}
                  metric={mt.id}
                  label={mt.label}
                  unit={mt.id === "ms" ? "ms" : mt.id === "params" ? "M" : "%"}
                  ascending={mt.ascending}
                />
              ))}
              <ComparisonChart metric="accuracy"  label="Accuracy"   />
              <ComparisonChart metric="auc"        label="AUC-ROC"   />
              <ComparisonChart metric="precision"  label="Precision"  />
              <ComparisonChart metric="recall"     label="Recall"    />
              <ComparisonChart metric="fpr"        label="False Positive Rate (↓ better)" ascending />
              <ComparisonChart metric="ms"         label="Inference Time — ms (↓ better)" unit="ms" ascending />
            </div>
          </div>
        )}

        {activeTab === "tradeoff" && (
          <div className="rsc-tradeoff-wrap">
            <TradeoffScatter />
            <div className="rsc-tradeoff-insights">
              <div className="rsc-insight-title">Key Insights</div>
              {[
                { icon: "★", text: "DenseNet121 achieves the highest accuracy (98.62%) but is the slowest pretrained model at 22ms inference.", color: "#f59e0b" },
                { icon: "⚡", text: "MobileNetV2 offers the best accuracy-per-millisecond ratio among pretrained models — ideal for real-time applications.", color: "#a78bfa" },
                { icon: "🎯", text: "EfficientNet achieves the lowest False Positive Rate (1.08%), making it best for minimizing false alarms.", color: "#34d399" },
                { icon: "📦", text: "CustomCNN is fastest (5ms) and smallest (8.2MB) but shows a 4% accuracy gap — highlighting transfer learning's value.", color: "#f87171" },
                { icon: "🔬", text: "All pretrained models achieve >98% accuracy, suggesting the task benefits greatly from ImageNet feature transfer.", color: "#60a5fa" },
              ].map(({ icon, text, color }) => (
                <div key={text} className="rsc-insight">
                  <span className="rsc-insight-icon" style={{ color }}>{icon}</span>
                  <span className="rsc-insight-text">{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "confusion" && (
          <div>
            <div className="rsc-confusion-note">
              Normalized confusion matrices — values show percentage of class samples correctly/incorrectly classified on the test set.
            </div>
            <div className="rsc-confusion-row">
              {MODEL_ORDER.map((m) => (
                <MiniConfusion key={m} name={m} data={BENCHMARK[m]} />
              ))}
            </div>
            <div className="rsc-confusion-legend">
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                TP = True Positive (FAKE correctly classified) &nbsp;·&nbsp;
                FP = False Positive (REAL misclassified as FAKE) &nbsp;·&nbsp;
                FN = False Negative (FAKE missed) &nbsp;·&nbsp;
                TN = True Negative (REAL correctly classified)
              </span>
            </div>
          </div>
        )}

        {activeTab === "table" && <SummaryTable />}
      </div>
    </div>
  );
}

export default ResearchPage;
