import "./App.css";
import Navbar from "./components/Navbar";
import { Outlet } from "react-router-dom";

function App() {
  return (
    <div className="relative min-h-screen" style={{ background: "#060611" }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.03) 1px,transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <Navbar />
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
