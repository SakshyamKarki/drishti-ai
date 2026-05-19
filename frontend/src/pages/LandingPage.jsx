import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../features/auth/authSlice";
import "../styles/landing.css";

const MODELS = [
  { name:"ResNet18",    acc:98.26, color:"#60a5fa", desc:"Skip connections",      year:2015 },
  { name:"EfficientNet",acc:98.49, color:"#34d399", desc:"Compound scaling",      year:2019 },
  { name:"MobileNetV2", acc:98.31, color:"#a78bfa", desc:"Inverted residuals",    year:2018 },
  { name:"DenseNet121", acc:98.62, color:"#f59e0b", desc:"Dense connectivity ★",  year:2016 },
  { name:"CustomCNN",   acc:94.57, color:"#f87171", desc:"Trained from scratch",  year:2024 },
];

const FEATURES = [
  { icon:"👁", title:"5-Model Comparison", desc:"Run all architectures simultaneously and see where they agree or diverge on every prediction." },
  { icon:"📊", title:"Research Benchmarks", desc:"Full metrics — accuracy, AUC, FPR/FNR, precision/recall — with interactive radar charts and confusion matrices." },
  { icon:"🔬", title:"Explainable AI", desc:"Grad-CAM heatmaps reveal exactly which facial regions triggered the fake/real decision." },
  { icon:"⚡", title:"Ensemble Voting", desc:"Weighted ensemble combining all 5 model outputs for a robust, statistically justified verdict." },
  { icon:"🧠", title:"14-Signal Pipeline", desc:"Beyond deep learning — DCT frequency, LBP texture, chromatic aberration, SSIM and more." },
  { icon:"🏆", title:"98.62% Accuracy", desc:"DenseNet121 achieves state-of-the-art on a 200K image benchmark of real vs AI-generated faces." },
];

function LandingPage() {
  const navigate = useNavigate();
  const isAuth   = useSelector(selectIsAuthenticated);

  return (
    <div className="lnd-page">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="lnd-hero">
        <div className="lnd-hero-bg" />
        <div className="lnd-hero-grid" />

        <div className="lnd-badge">
          <span className="lnd-badge-dot" />
          AI-Powered · Research-Grade · Open Source
        </div>

        <h1 className="lnd-hero-title">
          <span className="lnd-brand">DrishtiAI</span>
          <br />
          See Through the Lie
        </h1>

        <p className="lnd-hero-sub">
          The only fake profile photo detector that runs <strong>5 CNN architectures simultaneously</strong>,
          compares their decisions in real time, and explains exactly why each model voted the way it did.
        </p>

        <div className="lnd-hero-actions">
          <button className="lnd-btn-primary" onClick={() => navigate(isAuth ? "/upload" : "/register")}>
            Get Started Free →
          </button>
          <button className="lnd-btn-secondary" onClick={() => navigate(isAuth ? "/research" : "/login")}>
            View Research
          </button>
        </div>

        {/* Stats row */}
        <div className="lnd-stats-row">
          {[
            { val:"200K",  label:"Training Images"  },
            { val:"5",     label:"CNN Models"        },
            { val:"98.62%",label:"Best Accuracy"     },
            { val:"14",    label:"Detection Signals" },
            { val:"<25ms", label:"Avg Inference"     },
          ].map(({ val, label }) => (
            <div key={label} className="lnd-stat">
              <div className="lnd-stat-val">{val}</div>
              <div className="lnd-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Model Cards ───────────────────────────────────────────────────── */}
      <section className="lnd-section">
        <div className="lnd-section-tag">Architecture Comparison</div>
        <h2 className="lnd-section-title">Five Models, One Verdict</h2>
        <p className="lnd-section-sub">Each image is analyzed by all five architectures. Their confidence scores are fused into a single ensemble verdict with statistical agreement tracking.</p>

        <div className="lnd-models-row">
          {MODELS.map((m, i) => (
            <div key={m.name} className="lnd-model-card"
              style={{ "--mc": m.color, animationDelay: `${i * 80}ms` }}>
              <div className="lnd-mc-top">
                <div className="lnd-mc-dot" style={{ background: m.color }} />
                <span className="lnd-mc-year">{m.year}</span>
              </div>
              <div className="lnd-mc-name">{m.name}</div>
              <div className="lnd-mc-desc">{m.desc}</div>
              <div className="lnd-mc-acc-row">
                <div className="lnd-mc-acc-track">
                  <div className="lnd-mc-acc-fill"
                    style={{ width:`${(m.acc-90)/10*100}%`, background: m.color }} />
                </div>
                <span className="lnd-mc-acc-val" style={{ color: m.color }}>{m.acc}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="lnd-section">
        <div className="lnd-section-tag">Platform Features</div>
        <h2 className="lnd-section-title">Research-Grade Detection</h2>
        <div className="lnd-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="lnd-feature-card">
              <div className="lnd-feature-icon">{f.icon}</div>
              <div className="lnd-feature-title">{f.title}</div>
              <div className="lnd-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="lnd-section">
        <div className="lnd-section-tag">How It Works</div>
        <h2 className="lnd-section-title">From Upload to Verdict in Seconds</h2>
        <div className="lnd-steps-row">
          {[
            { n:"01", title:"Upload",   desc:"Drop a profile photo — JPEG, PNG or WEBP up to 15MB." },
            { n:"02", title:"Detect",   desc:"Haar cascade + CLAHE finds and crops the face region." },
            { n:"03", title:"Infer",    desc:"All 5 CNN models run in parallel on the face crop." },
            { n:"04", title:"Ensemble", desc:"Weighted vote fuses all predictions with agreement tracking." },
            { n:"05", title:"Explain",  desc:"Grad-CAM heatmap + 14-signal breakdown explain the verdict." },
          ].map((s) => (
            <div key={s.n} className="lnd-step">
              <div className="lnd-step-num">{s.n}</div>
              <div className="lnd-step-title">{s.title}</div>
              <div className="lnd-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="lnd-cta-section">
        <div className="lnd-cta-glow" />
        <h2 className="lnd-cta-title">Ready to Detect Deepfakes?</h2>
        <p className="lnd-cta-sub">Free account. No credit card. Full 5-model comparison pipeline from day one.</p>
        <button className="lnd-btn-primary lnd-btn-lg"
          onClick={() => navigate(isAuth ? "/upload" : "/register")}>
          {isAuth ? "Go to Dashboard →" : "Create Free Account →"}
        </button>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="lnd-footer">
        <div className="lnd-footer-logo">DrishtiAI</div>
        <div className="lnd-footer-sub">
          दृष्टि — Sight · Vision · Clarity &nbsp;·&nbsp; Built with PyTorch, Django &amp; React
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
