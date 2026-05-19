import { useEffect, useState } from "react";
import { api } from "../api/axiosInstance";

const verdictColors = {
  FAKE:       { main:"#f85149", bg:"rgba(248,81,73,0.08)",  badge:"rgba(248,81,73,0.15)",  border:"rgba(248,81,73,0.25)"  },
  REAL:       { main:"#56d364", bg:"rgba(86,211,100,0.08)", badge:"rgba(86,211,100,0.15)", border:"rgba(86,211,100,0.25)" },
  SUSPICIOUS: { main:"#e3b341", bg:"rgba(227,179,65,0.08)", badge:"rgba(227,179,65,0.15)", border:"rgba(227,179,65,0.25)" },
};

const fmt = (iso) => iso
  ? new Date(iso).toLocaleDateString("en-US",{ month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" })
  : "—";

const FilterTab = ({ label, active, count, onClick }) => (
  <button onClick={onClick} style={{
    padding:"6px 14px", borderRadius:10, border:"none", cursor:"pointer",
    fontSize:11, fontWeight:500,
    background: active ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
    color:      active ? "#818cf8" : "#484f58",
  }}>
    {label}
    {count !== undefined && (
      <span style={{ marginLeft:5, padding:"1px 5px", borderRadius:5,
        background: active ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
        color: active ? "#818cf8" : "#484f58", fontSize:9 }}>
        {count}
      </span>
    )}
  </button>
);

function HistoryPage() {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filter,  setFilter]  = useState("ALL");

  useEffect(() => {
    api.get("/detection/")
      .then(r => setDetections(r.data || []))
      .catch(() => setError("Failed to load history."))
      .finally(() => setLoading(false));
  }, []);

  const counts = detections.reduce((a, d) => {
    const v = d.verdict || (d.is_fake ? "FAKE" : "REAL");
    a[v] = (a[v] || 0) + 1;
    return a;
  }, {});

  const filtered = filter === "ALL" ? detections
    : detections.filter(d => (d.verdict || (d.is_fake ? "FAKE" : "REAL")) === filter);

  return (
    <div style={{ padding:"28px 24px", maxWidth:900, margin:"0 auto" }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:24, fontWeight:700, color:"#e6edf3", margin:0 }}>
          Detection History
        </h1>
        <p style={{ color:"#484f58", fontSize:13, marginTop:4 }}>
          {detections.length} total analyses
        </p>
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        <FilterTab label="All"        active={filter==="ALL"}        count={detections.length}  onClick={() => setFilter("ALL")} />
        <FilterTab label="Fake"       active={filter==="FAKE"}       count={counts.FAKE||0}     onClick={() => setFilter("FAKE")} />
        <FilterTab label="Real"       active={filter==="REAL"}       count={counts.REAL||0}     onClick={() => setFilter("REAL")} />
        <FilterTab label="Suspicious" active={filter==="SUSPICIOUS"} count={counts.SUSPICIOUS||0} onClick={() => setFilter("SUSPICIOUS")} />
      </div>

      {loading ? (
        <div style={{ color:"#484f58", fontSize:13, padding:"40px 0", textAlign:"center" }}>Loading…</div>
      ) : error ? (
        <div style={{ color:"#f85149", fontSize:12, padding:12, background:"rgba(248,81,73,0.08)",
          border:"0.5px solid rgba(248,81,73,0.2)", borderRadius:10 }}>{error}</div>
      ) : filtered.length === 0 ? (
        <div style={{ color:"#484f58", fontSize:13, padding:"40px 0", textAlign:"center",
          border:"1px dashed #21262d", borderRadius:14 }}>
          {filter === "ALL" ? "No detections yet." : `No ${filter.toLowerCase()} detections found.`}
        </div>
      ) : (
        filtered.map(item => {
          const verdict = item.verdict || (item.is_fake ? "FAKE" : "REAL");
          const c = verdictColors[verdict] || verdictColors.SUSPICIOUS;
          return (
            <div key={item.id} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"12px 16px", borderRadius:12,
              background:"rgba(13,17,23,0.95)", border:`0.5px solid ${c.border}`,
              marginBottom:8,
            }}>
              <div style={{
                width:48, height:48, borderRadius:10, overflow:"hidden", flexShrink:0,
                background:c.bg, display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                {item.image
                  ? <img src={item.image} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                  : <span style={{ fontSize:20, opacity:.4 }}>👤</span>
                }
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:500, color:"#e6edf3" }}>Detection #{item.id}</div>
                <div style={{ fontSize:10, color:"#484f58" }}>{fmt(item.created_at)}</div>
              </div>
              <div style={{
                padding:"3px 10px", borderRadius:8, fontSize:10, fontWeight:600,
                letterSpacing:"0.05em", background:c.badge, color:c.main, border:`0.5px solid ${c.border}`,
              }}>{verdict}</div>
              <div style={{ textAlign:"right", minWidth:52 }}>
                <div style={{ fontSize:14, fontWeight:700, color:c.main }}>
                  {item.confidence_score ? `${Math.round(item.confidence_score)}%` : "—"}
                </div>
                <div style={{ fontSize:9, color:"#484f58" }}>confidence</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default HistoryPage;
