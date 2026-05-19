import { useNavigate } from "react-router-dom";
import "../styles/detection.css";
import { useSelector } from "react-redux";
import { selectUser } from "../features/auth/authSlice";
import { useEffect, useState } from "react";
import { api } from "../api/axiosInstance";

const BENCHMARK = {
  ResNet18:    { accuracy: 98.26, auc: 99.81, color: "#60a5fa" },
  EfficientNet:{ accuracy: 98.49, auc: 99.73, color: "#34d399" },
  MobileNetV2: { accuracy: 98.31, auc: 99.68, color: "#a78bfa" },
  DenseNet121: { accuracy: 98.62, auc: 99.79, color: "#f59e0b" },
  CustomCNN:   { accuracy: 94.57, auc: 98.77, color: "#f87171" },
};
const MODEL_ORDER = ["DenseNet121","EfficientNet","ResNet18","MobileNetV2","CustomCNN"];

const verdictColors = {
  FAKE:       { main:"#f85149", bg:"rgba(248,81,73,0.08)",  border:"rgba(248,81,73,0.2)"  },
  REAL:       { main:"#56d364", bg:"rgba(86,211,100,0.08)", border:"rgba(86,211,100,0.2)" },
  SUSPICIOUS: { main:"#e3b341", bg:"rgba(227,179,65,0.08)", border:"rgba(227,179,65,0.2)" },
};

/* ── Detection Card ───────────────────────────────────────────────────────── */
const DetectionCard = ({ item }) => {
  const verdict = item.verdict || (item.is_fake ? "FAKE" : "REAL");
  const c = verdictColors[verdict] || verdictColors.SUSPICIOUS;
  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "—";

  return (
    <div className="det-card" style={{ border: `1px solid ${c.border}` }}>
      <div className="det-img" style={{ background: c.bg }}>
        {item.image
          ? <img src={item.image} alt="det" className="det-img-tag" />
          : <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",fontSize:28,opacity:.25 }}>👤</div>
        }
        <span className="det-badge" style={{ background:c.bg, color:c.main, border:`0.5px solid ${c.border}` }}>
          {verdict}
        </span>
      </div>
      <div className="det-body">
        <div className="det-filename">Detection #{item.id}</div>
        <div className="det-meta">
          <span className="det-mode">{verdict === "FAKE" ? "AI Generated" : verdict === "REAL" ? "Authentic" : "Uncertain"}</span>
          <span className="det-conf" style={{ color:c.main }}>
            {item.confidence_score ? `${Math.round(item.confidence_score)}%` : "—"}
          </span>
        </div>
        <div className="det-date">{fmt(item.created_at)}</div>
      </div>
    </div>
  );
};

/* ── Stat Card ────────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, unit, sub, subColor }) => (
  <div className="stat-card">
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}<span>{unit}</span></div>
    <div className="stat-trend" style={{ color: subColor || "#56d364" }}>{sub}</div>
  </div>
);

/* ── Mini Model Bar ───────────────────────────────────────────────────────── */
const ModelBar = ({ name, accuracy, auc, color }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
    <div style={{ width:8,height:8,borderRadius:"50%",background:color,flexShrink:0 }} />
    <span style={{ fontSize:11,color:"#8b949e",width:96,flexShrink:0 }}>{name}</span>
    <div style={{ flex:1,height:4,borderRadius:9999,background:"rgba(255,255,255,0.06)",overflow:"hidden" }}>
      <div style={{ height:"100%",borderRadius:9999,background:color,width:`${(accuracy-90)/10*100}%` }} />
    </div>
    <span style={{ fontSize:10,color,fontFamily:"DM Mono,monospace",width:50,textAlign:"right" }}>{accuracy}%</span>
  </div>
);

/* ── Dashboard ────────────────────────────────────────────────────────────── */
function Dashboard() {
  const navigate = useNavigate();
  const user     = useSelector(selectUser);
  const [stats,   setStats]   = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [sRes, hRes] = await Promise.all([
          api.get("/detection/stats/").catch(() => null),
          api.get("/detection/").catch(() => null),
        ]);
        if (sRes?.data)  setStats(sRes.data);
        if (hRes?.data)  setHistory(hRes.data.slice(0, 6));
      } finally { setLoading(false); }
    };
    fetch();
  }, []);

  return (
    <div className="dash-page">
      {/* Greeting */}
      <div className="mb-7">
        <h1 className="dash-greeting">Welcome back, {user?.username ?? "there"} 👁</h1>
        <p className="dash-sub">Fake profile photo detection · 5-model comparison engine</p>
      </div>

      {/* Stats */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:28 }}>
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="stat-card" style={{ opacity:.3,minHeight:80 }} />)
        ) : (
          <>
            <StatCard label="Total Analyzed" value={stats?.total_checked ?? 0} unit=" images"
              sub={`↑ ${stats?.weekly_count ?? 0} this week`} />
            <StatCard label="Fake Detected" value={stats?.fake_count ?? 0} unit=""
              sub={`${stats?.fake_rate ?? 0}% fake rate`} subColor="#f85149" />
            <StatCard label="Avg Confidence" value={stats?.avg_confidence ?? "—"} unit="%"
              sub="across all detections" subColor="#79c0ff" />
            <StatCard label="Best Model" value="DenseNet" unit="121"
              sub="98.62% accuracy" subColor="#f59e0b" />
          </>
        )}
      </div>

      {/* Two column: recent + model benchmarks */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 320px",gap:20,marginBottom:28 }}>
        {/* Recent detections */}
        <div>
          <div className="section-header">
            <span className="section-title">Recent Detections</span>
            <span className="view-all" onClick={() => navigate("/history")}>View all →</span>
          </div>
          <div className="cards-grid">
            {history.length === 0
              ? <div className="empty-state">No detections yet. Upload a profile photo to start.</div>
              : history.map(item => <DetectionCard key={item.id} item={item} />)
            }
          </div>
        </div>

        {/* Model benchmark mini */}
        <div>
          <div className="section-header">
            <span className="section-title">Model Benchmarks</span>
            <span className="view-all" onClick={() => navigate("/research")}>Details →</span>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:8,
            padding:16,borderRadius:16,background:"rgba(13,17,23,0.95)",border:"1px solid #21262d" }}>
            <div style={{ fontSize:10,color:"#484f58",fontFamily:"DM Mono,monospace",textTransform:"uppercase",
              letterSpacing:"0.1em",marginBottom:4 }}>Accuracy on 20K test set</div>
            {MODEL_ORDER.map(m => (
              <ModelBar key={m} name={m} accuracy={BENCHMARK[m].accuracy}
                auc={BENCHMARK[m].auc} color={BENCHMARK[m].color} />
            ))}
            <div style={{ marginTop:8,padding:"8px 0",borderTop:"0.5px solid #21262d" }}>
              <div style={{ fontSize:10,color:"#484f58",marginBottom:4,fontFamily:"DM Mono,monospace" }}>Dataset</div>
              <div style={{ fontSize:11,color:"#8b949e" }}>200K Real vs AI Visuals · 10 epochs · 64×64px</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action CTAs */}
      <div style={{ display:"flex",gap:12 }}>
        <button className="analyze-banner" onClick={() => navigate("/upload")}>
          <div className="analyze-icon">👁</div>
          <div className="analyze-text">
            <div className="analyze-title">Detect a Profile Photo</div>
            <div className="analyze-sub">DenseNet121 — best accuracy 98.62%</div>
          </div>
          <div className="analyze-arrow">→</div>
        </button>
        <button className="analyze-banner"
          style={{ background:"linear-gradient(135deg,#059669,#10b981)" }}
          onClick={() => navigate("/compare")}>
          <div className="analyze-icon">⊞</div>
          <div className="analyze-text">
            <div className="analyze-title">Compare All 5 Models</div>
            <div className="analyze-sub">Side-by-side ensemble analysis</div>
          </div>
          <div className="analyze-arrow">→</div>
        </button>
        <button className="analyze-banner"
          style={{ background:"linear-gradient(135deg,#7c3aed,#a78bfa)" }}
          onClick={() => navigate("/research")}>
          <div className="analyze-icon">📊</div>
          <div className="analyze-text">
            <div className="analyze-title">Research & Benchmarks</div>
            <div className="analyze-sub">Metrics, trade-offs & confusion matrices</div>
          </div>
          <div className="analyze-arrow">→</div>
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
