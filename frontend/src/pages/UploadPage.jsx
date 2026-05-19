import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { uploadDetectionImage } from "../api/uploadApi";
import "../styles/uploadPage.css";

const riskColor = (v) => ({
  FAKE:       { main:"#f85149", bg:"rgba(248,81,73,0.12)",  border:"rgba(248,81,73,0.3)"  },
  REAL:       { main:"#56d364", bg:"rgba(86,211,100,0.12)", border:"rgba(86,211,100,0.3)" },
  SUSPICIOUS: { main:"#e3b341", bg:"rgba(227,179,65,0.12)", border:"rgba(227,179,65,0.3)" },
}[v] || { main:"#8b949e", bg:"rgba(139,148,158,0.1)", border:"rgba(139,148,158,0.3)" });

const LOADING_STEPS = [
  { msg:"Detecting face region…",       pct:12 },
  { msg:"Running DenseNet121…",         pct:40 },
  { msg:"Computing confidence…",        pct:70 },
  { msg:"Generating verdict…",          pct:90 },
];

/* ── Confidence Donut ─────────────────────────────────────────────────────── */
const ConfidenceDonut = ({ confidence, verdict }) => {
  const r = 38, circ = 2 * Math.PI * r;
  const offset = circ - (confidence / 100) * circ;
  const color  = riskColor(verdict).main;
  return (
    <div className="donut-wrapper">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition:"stroke-dashoffset 1.2s ease" }} />
      </svg>
      <div className="donut-center">
        <div className="donut-pct" style={{ color }}>{Math.round(confidence)}%</div>
        <div className="donut-label">confidence</div>
      </div>
    </div>
  );
};

/* ── Result Panel ─────────────────────────────────────────────────────────── */
const ResultPanel = ({ result, onReset }) => {
  if (!result) return (
    <div className="upload-panel">
      <span className="panel-label">Detection Result</span>
      <div className="result-empty">
        <div className="result-empty-icon">👁</div>
        <p className="result-empty-text">
          Upload a profile photo to run DenseNet121 — our best model at 98.62% accuracy
        </p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center", marginTop:8 }}>
          {["DenseNet121","Face Detection","Grad-CAM","Confidence Score"].map(t => (
            <span key={t} style={{ fontSize:9, padding:"2px 8px", borderRadius:20,
              background:"rgba(99,102,241,0.08)", border:"0.5px solid rgba(99,102,241,0.2)", color:"#818cf8" }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );

  const verdict = result.verdict || "SUSPICIOUS";
  const c       = riskColor(verdict);
  const icons   = { FAKE:"⚠", REAL:"✓", SUSPICIOUS:"?" };

  return (
    <div className="upload-panel" style={{ position:"relative" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, borderRadius:"20px 20px 0 0",
        background:`linear-gradient(90deg,${c.main},transparent)` }} />
      <span className="panel-label">Detection Result · DenseNet121</span>

      {/* Heatmap */}
      {result.heatmap && (
        <div className="heatmap-wrap">
          <img src={result.heatmap} alt="Grad-CAM" className="heatmap-img" />
          <div className="heatmap-badge">Grad-CAM · Attention Map</div>
        </div>
      )}

      {/* Verdict + donut */}
      <div className="verdict-conf-row">
        <div className="verdict-badge-large" style={{ background:c.bg, border:`1px solid ${c.border}`, color:c.main }}>
          <span className="verdict-icon">{icons[verdict] || "?"}</span>
          <div>
            <div className="verdict-label">{verdict}</div>
            <div className="verdict-sublabel">{result.risk_label || ""}</div>
          </div>
        </div>
        <ConfidenceDonut confidence={result.confidence || 0} verdict={verdict} />
      </div>

      {/* Probability bars */}
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {[
          { label:"Fake probability", val:result.p_fake || 0, color:"#f85149" },
          { label:"Real probability", val:result.p_real || 0, color:"#4ade80" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ display:"flex", flexDirection:"column", gap:3 }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:10, color:"#484f58", fontFamily:"DM Mono,monospace" }}>{label}</span>
              <span style={{ fontSize:10, color, fontFamily:"DM Mono,monospace" }}>{(val * 100).toFixed(1)}%</span>
            </div>
            <div style={{ height:5, background:"rgba(255,255,255,0.06)", borderRadius:999, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${val * 100}%`, background:color, borderRadius:999, transition:"width 0.8s ease" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Meta grid */}
      <div className="result-meta-grid">
        <div className="result-meta-item">
          <span className="result-meta-label">Model</span>
          <span className="result-meta-value">DenseNet121</span>
        </div>
        <div className="result-meta-item">
          <span className="result-meta-label">Processing</span>
          <span className="result-meta-value">{result.processing_time || "—"}s</span>
        </div>
        <div className="result-meta-item">
          <span className="result-meta-label">Face Detected</span>
          <span className="result-meta-value" style={{ color: result.face_detected ? "#4ade80" : "#f87171" }}>
            {result.face_detected ? "Yes" : "No"}
          </span>
        </div>
        <div className="result-meta-item">
          <span className="result-meta-label">Sharpness</span>
          <span className="result-meta-value">{result.face_meta?.sharpness ? Math.round(result.face_meta.sharpness) : "—"}</span>
        </div>
      </div>

      <button className="analyze-again-btn" onClick={onReset}>↩ Analyze another image</button>
    </div>
  );
};

/* ── Main Upload Page ─────────────────────────────────────────────────────── */
function UploadPage() {
  const [file,    setFile]    = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [result,  setResult]  = useState(null);
  const [step,    setStep]    = useState(0);

  const startCycle = () => {
    let i = 0;
    return setInterval(() => { i = Math.min(i + 1, LOADING_STEPS.length - 1); setStep(i); }, 900);
  };

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) { setError("Only JPG, PNG, WEBP images (max 15MB)."); return; }
    const f = accepted[0];
    setFile(f); setPreview(URL.createObjectURL(f)); setResult(null); setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg":[], "image/png":[], "image/webp":[] },
    maxFiles:1, maxSize:15*1024*1024,
  });

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true); setError(null); setStep(0);
    const iv = startCycle();
    try {
      const res = await uploadDetectionImage(file);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Analysis failed. Please try a clear face photo.");
    } finally { clearInterval(iv); setLoading(false); }
  };

  const handleReset = () => {
    setFile(null); setResult(null); setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  const ls = LOADING_STEPS[step];

  return (
    <div className="upload-page">
      <div className="mb-7">
        <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:24, fontWeight:700, color:"#e6edf3", margin:0 }}>
          Fake Profile Detector
        </h1>
        <p style={{ color:"#484f58", fontSize:13, marginTop:4 }}>
          DenseNet121 — best model · 98.62% accuracy · 99.79% AUC
        </p>
      </div>

      <div className="mode-info-bar">
        {[
          { l:"DenseNet121",    c:"#f59e0b" },
          { l:"Face Detection", c:"#60a5fa" },
          { l:"CLAHE Preproc.", c:"#a78bfa" },
          { l:"Confidence Score",c:"#34d399" },
        ].map(({ l, c }) => (
          <div key={l} className="mode-info-item">
            <span className="mode-info-dot" style={{ background:c }} />{l}
          </div>
        ))}
      </div>

      <div className="upload-grid">
        {/* Upload panel */}
        <div className="upload-panel">
          <span className="panel-label">Upload Profile Photo</span>
          <div {...getRootProps()} className={`dropzone ${isDragActive ? "dragging" : ""} ${file ? "has-file" : ""}`}>
            <input {...getInputProps()} />
            {file && preview ? (
              <>
                <img src={preview} alt="preview" className="w-full h-60 object-cover rounded-xl" />
                <p className="drop-filename">{file.name}</p>
                <p className="drop-change">Click or drop to replace</p>
              </>
            ) : (
              <>
                <div className="drop-icon">👤</div>
                <p className="drop-title">{isDragActive ? "Drop it!" : "Drop a profile photo"}</p>
                <p className="drop-sub">or</p>
                <p className="drop-browse">Browse files</p>
                <p className="drop-hint">JPG · PNG · WEBP · Max 15MB</p>
              </>
            )}
          </div>

          {error && <p className="upload-error">⚠ {error}</p>}

          {loading && (
            <div style={{ marginTop:4 }}>
              <div style={{ height:2, background:"rgba(255,255,255,0.06)", borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${ls.pct}%`, background:"linear-gradient(90deg,#6366f1,#818cf8)", transition:"width 0.9s ease", borderRadius:2 }} />
              </div>
              <p style={{ fontSize:10, color:"#484f58", marginTop:4, textAlign:"center", fontFamily:"DM Mono,monospace" }}>{ls.msg}</p>
            </div>
          )}

          <div className="upload-tips">
            <p className="tips-title">Tips for best results</p>
            <ul className="tips-list">
              <li>Front-facing profile photo (head &amp; shoulders)</li>
              <li>Single person, clearly visible face</li>
              <li>Good lighting, not blurry or heavily filtered</li>
              <li>Avoid sunglasses or extreme angles</li>
            </ul>
          </div>

          <button className="analyze-btn" onClick={handleAnalyze} disabled={!file || loading}>
            {loading
              ? <span className="loading-row"><span className="loading-spinner" />{ls.msg}</span>
              : "▶ Analyze with DenseNet121"
            }
          </button>

          <p style={{ fontSize:10, color:"#484f58", textAlign:"center", fontFamily:"DM Mono,monospace" }}>
            Want all 5 models? Try the <a href="/compare" style={{ color:"#818cf8" }}>Comparison page →</a>
          </p>
        </div>

        {/* Result panel */}
        <ResultPanel result={result} onReset={handleReset} />
      </div>
    </div>
  );
}

export default UploadPage;
