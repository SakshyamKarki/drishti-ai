import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { uploadForComparison } from "../api/uploadApi";
import "../styles/compare.css";

const MODEL_META = {
  ResNet18:    { color: "#60a5fa", year: 2015, params: "11.7M", short: "R18" },
  EfficientNet:{ color: "#34d399", year: 2019, params: "5.3M",  short: "EN"  },
  MobileNetV2: { color: "#a78bfa", year: 2018, params: "3.4M",  short: "MV2" },
  DenseNet121: { color: "#f59e0b", year: 2016, params: "8.0M",  short: "DN"  },
  CustomCNN:   { color: "#f87171", year: 2026, params: "2.1M",  short: "CC"  },
};
const MODEL_ORDER = ["ResNet18","EfficientNet","MobileNetV2","DenseNet121","CustomCNN"];

const LOADING_STEPS = [
  { msg: "Detecting face region…",        pct: 8  },
  { msg: "Running ResNet18…",             pct: 22 },
  { msg: "Running EfficientNet…",         pct: 38 },
  { msg: "Running MobileNetV2…",          pct: 52 },
  { msg: "Running DenseNet121…",          pct: 66 },
  { msg: "Running CustomCNN…",            pct: 78 },
  { msg: "Computing ensemble vote…",      pct: 88 },
  { msg: "Analysing agreement…",          pct: 95 },
];

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const verdictColor = (v) => ({
  FAKE:       "#f87171",
  REAL:       "#4ade80",
  SUSPICIOUS: "#fbbf24",
  NO_FACE:    "#94a3b8",
}[v] ?? "#94a3b8");

/* ── Probability Bar ──────────────────────────────────────────────────────── */
const ProbBar = ({ fake, real, color }) => (
  <div className="cmp-prob-track">
    <div className="cmp-prob-fake" style={{ width: `${fake * 100}%`, background: "#f87171" }} />
    <div className="cmp-prob-real" style={{ width: `${real * 100}%`, background: "#4ade80" }} />
  </div>
);

/* ── Confidence Donut (small) ─────────────────────────────────────────────── */
const MiniDonut = ({ confidence, color }) => {
  const r = 24, circ = 2 * Math.PI * r;
  const offset = circ - (confidence / 100) * circ;
  return (
    <svg width="60" height="60" viewBox="0 0 60 60">
      <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 30 30)" style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x="30" y="34" textAnchor="middle" fontSize="10" fill={color}
        fontFamily="DM Mono, monospace" fontWeight="600">
        {Math.round(confidence)}%
      </text>
    </svg>
  );
};

/* ── Model Result Card ────────────────────────────────────────────────────── */
const ModelCard = ({ name, result, isEnsemblePick, animDelay }) => {
  const meta   = MODEL_META[name];
  const vc     = verdictColor(result.prediction);
  const isFake = result.prediction === "FAKE";

  return (
    <div
      className={`cmp-model-card ${isEnsemblePick ? "ensemble-pick" : ""}`}
      style={{ "--card-color": meta.color, animationDelay: `${animDelay}ms` }}
    >
      {isEnsemblePick && (
        <div className="cmp-ep-badge" style={{ background: meta.color + "22", color: meta.color }}>
          Ensemble Pick
        </div>
      )}

      {/* Header */}
      <div className="cmp-card-head">
        <div className="cmp-dot" style={{ background: meta.color }} />
        <div className="cmp-card-name">{name}</div>
        <div className="cmp-card-meta">{meta.year} · {meta.params}</div>
      </div>

      {/* Verdict */}
      <div className="cmp-verdict" style={{ color: vc, background: vc + "15", borderColor: vc + "40" }}>
        {isFake ? "⚠ FAKE" : "✓ REAL"}
      </div>

      {/* Donut + prob */}
      <div className="cmp-donut-row">
        <MiniDonut confidence={result.confidence} color={vc} />
        <div className="cmp-probs">
          <div className="cmp-prob-row">
            <span style={{ color: "#f87171" }}>Fake</span>
            <span style={{ color: "#f87171" }}>{(result.p_fake * 100).toFixed(1)}%</span>
          </div>
          <ProbBar fake={result.p_fake} real={result.p_real} color={vc} />
          <div className="cmp-prob-row">
            <span style={{ color: "#4ade80" }}>Real</span>
            <span style={{ color: "#4ade80" }}>{(result.p_real * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Inference time */}
      <div className="cmp-footer">
        <span className="cmp-footer-label">Inference</span>
        <span className="cmp-footer-val">{result.inference_ms.toFixed(1)} ms</span>
      </div>

      {result.error && (
        <div className="cmp-error-note">⚠ {result.error}</div>
      )}
    </div>
  );
};

/* ── Ensemble Panel ───────────────────────────────────────────────────────── */
const EnsemblePanel = ({ ensemble, agreement, statistics, totalMs }) => {
  const vc = verdictColor(ensemble.prediction);
  const consensusLabel = {
    unanimous_fake: "All 5 models agree — FAKE",
    unanimous_real: "All 5 models agree — REAL",
    majority_fake:  `${agreement.fake_votes}/5 models say FAKE`,
    majority_real:  `${agreement.real_votes}/5 models say REAL`,
    split:          "Models split 50/50 — uncertain",
  }[agreement.consensus] ?? agreement.consensus;

  return (
    <div className="cmp-ensemble">
      {/* Main verdict */}
      <div className="cmp-ens-hero">
        <div className="cmp-ens-label">Ensemble Verdict (Weighted Vote)</div>
        <div className="cmp-ens-verdict" style={{ color: vc }}>{ensemble.prediction}</div>
        <div className="cmp-ens-conf">
          <MiniDonut confidence={ensemble.confidence} color={vc} />
          <div>
            <div className="cmp-ens-conf-pct" style={{ color: vc }}>{ensemble.confidence}%</div>
            <div className="cmp-ens-conf-label">confidence</div>
          </div>
        </div>
        <div className="cmp-ens-score">
          Fake score: <span style={{ color: "#f87171" }}>{(ensemble.fake_score * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Agreement */}
      <div className="cmp-ens-agreement">
        <div className="cmp-ens-section-label">Model Agreement</div>
        <div className="cmp-agreement-meter">
          <div className="cmp-agree-bar"
            style={{ width: `${agreement.agreement_pct}%`, background: agreement.agreement_pct > 80 ? "#4ade80" : "#fbbf24" }} />
        </div>
        <div className="cmp-agreement-text">{consensusLabel}</div>
        <div className="cmp-vote-row">
          <span style={{ color: "#f87171" }}>⬤ {agreement.fake_votes} FAKE</span>
          <span style={{ color: "#4ade80" }}>⬤ {agreement.real_votes} REAL</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="cmp-stats-grid">
        <div className="cmp-stat-item">
          <div className="cmp-stat-label">Mean Fake Prob</div>
          <div className="cmp-stat-val" style={{ color: "#f87171" }}>{(statistics.mean_fake_prob * 100).toFixed(1)}%</div>
        </div>
        <div className="cmp-stat-item">
          <div className="cmp-stat-label">Std Dev</div>
          <div className="cmp-stat-val">{(statistics.std_fake_prob * 100).toFixed(1)}%</div>
        </div>
        <div className="cmp-stat-item">
          <div className="cmp-stat-label">Range</div>
          <div className="cmp-stat-val">{(statistics.range * 100).toFixed(1)}%</div>
        </div>
        <div className="cmp-stat-item">
          <div className="cmp-stat-label">Total Time</div>
          <div className="cmp-stat-val">{totalMs} ms</div>
        </div>
      </div>
    </div>
  );
};

/* ── Trust Scores Chart ───────────────────────────────────────────────────── */
const TrustChart = ({ trustScores }) => (
  <div className="cmp-trust-chart">
    <div className="cmp-section-title">Trust Scores (Benchmark Accuracy × Model Confidence)</div>
    {MODEL_ORDER.filter((m) => trustScores[m] != null).map((m) => {
      const score = trustScores[m];
      const meta  = MODEL_META[m];
      return (
        <div key={m} className="cmp-trust-row">
          <div className="cmp-trust-name" style={{ color: meta.color }}>{meta.short}</div>
          <div className="cmp-trust-track">
            <div className="cmp-trust-fill" style={{ width: `${score * 100}%`, background: meta.color }} />
          </div>
          <div className="cmp-trust-val">{(score * 100).toFixed(1)}%</div>
        </div>
      );
    })}
  </div>
);

/* ── Main Compare Page ────────────────────────────────────────────────────── */
function ComparePage() {
  const [file, setFile]             = useState(null);
  const [preview, setPreview]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [step, setStep]             = useState(0);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState(null);
  const intervalRef                 = useRef(null);

  const startCycle = () => {
    let i = 0;
    return setInterval(() => {
      i = Math.min(i + 1, LOADING_STEPS.length - 1);
      setStep(i);
    }, 1200);
  };

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) { setError("Only JPG/PNG/WEBP images under 15MB."); return; }
    const f = accepted[0];
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    maxSize: 15 * 1024 * 1024,
  });

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setStep(0);
    intervalRef.current = startCycle();
    try {
      const res = await uploadForComparison(file);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Analysis failed — please try a clear face photo.");
    } finally {
      clearInterval(intervalRef.current);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null); setResult(null); setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  const ls = LOADING_STEPS[step];

  return (
    <div className="cmp-page">
      {/* Page header */}
      <div className="cmp-header">
        <div className="cmp-header-tag">5-Model Inference</div>
        <h1 className="cmp-title">Side-by-Side Comparison</h1>
        <p className="cmp-subtitle">
          Upload a profile photo and instantly compare all 5 CNN architectures — see where they agree, where they diverge, and why the ensemble wins.
        </p>
      </div>

      {/* Upload zone */}
      {!result ? (
        <div className="cmp-upload-zone">
          <div {...getRootProps()} className={`cmp-dropzone ${isDragActive ? "dragging" : ""} ${file ? "filled" : ""}`}>
            <input {...getInputProps()} />
            {file && preview ? (
              <>
                <img src={preview} alt="preview" className="cmp-preview-img" />
                <div className="cmp-preview-name">{file.name}</div>
              </>
            ) : (
              <>
                <div className="cmp-drop-icon">⊡</div>
                <div className="cmp-drop-title">{isDragActive ? "Drop it!" : "Drop a profile photo"}</div>
                <div className="cmp-drop-hint">JPG · PNG · WEBP · max 15MB</div>
              </>
            )}
          </div>

          {/* Model badges */}
          <div className="cmp-model-badges">
            {MODEL_ORDER.map((m) => (
              <div key={m} className="cmp-model-badge">
                <div className="cmp-badge-dot" style={{ background: MODEL_META[m].color }} />
                <span>{m}</span>
              </div>
            ))}
          </div>

          {error && <div className="cmp-err">{error}</div>}

          {/* Progress */}
          {loading && (
            <div className="cmp-progress-wrap">
              <div className="cmp-progress-track">
                <div className="cmp-progress-fill" style={{ width: `${ls.pct}%` }} />
              </div>
              <div className="cmp-progress-label">{ls.msg}</div>
            </div>
          )}

          <button className="cmp-analyze-btn" disabled={!file || loading} onClick={handleAnalyze}>
            {loading ? (
              <span className="cmp-loading-row">
                <span className="cmp-spinner" /> {ls.msg}
              </span>
            ) : "▶ Run All 5 Models"}
          </button>
        </div>
      ) : (
        /* ── Results ── */
        <div className="cmp-results">
          {/* Preview + ensemble side by side */}
          <div className="cmp-results-top">
            {/* Image preview */}
            <div className="cmp-result-img-wrap">
              {preview && <img src={preview} alt="analyzed" className="cmp-result-img" />}
              <div className="cmp-result-filename">{file?.name}</div>
            </div>
            {/* Ensemble panel */}
            <EnsemblePanel
              ensemble={result.ensemble}
              agreement={result.agreement}
              statistics={result.statistics}
              totalMs={result.total_inference_ms}
            />
          </div>

          {/* Per-model cards */}
          <div className="cmp-section-title" style={{ marginBottom: 12 }}>Per-Model Results</div>
          <div className="cmp-cards-row">
            {MODEL_ORDER.map((m, i) => result.models[m] && (
              <ModelCard
                key={m}
                name={m}
                result={result.models[m]}
                isEnsemblePick={m === result.best_model}
                animDelay={i * 80}
              />
            ))}
          </div>

          {/* Trust scores + reset */}
          <div className="cmp-bottom-row">
            {result.trust_scores && <TrustChart trustScores={result.trust_scores} />}
            <button className="cmp-reset-btn" onClick={handleReset}>↩ Analyze Another</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComparePage;
