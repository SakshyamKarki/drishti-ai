import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutThunk, selectUser } from "../features/auth/authSlice";
import { useEffect, useRef, useState } from "react";
import "../styles/navbar.css";

const Navbar = () => {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const location   = useLocation();
  const user       = useSelector(selectUser);
  const [open, setOpen] = useState(false);
  const ref        = useRef(null);

  const navLinks = [
    { label: "Dashboard",  path: "/dashboard"  },
    { label: "Detect",     path: "/upload"      },
    { label: "Compare",    path: "/compare"     },
    { label: "Research",   path: "/research"    },
    { label: "History",    path: "/history"     },
  ];

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate("/login");
  };

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  return (
    <nav className="navbar-shell">
      {/* ── Left: Logo ── */}
      <Link to="/dashboard" className="navbar-pill navbar-left">
        <div className="navbar-logo-ring">
          <div className="navbar-logo-dot" />
        </div>
        <span className="navbar-logo-name">
          Drishti<span>AI</span>
        </span>
      </Link>

      {/* ── Center: Profile dropdown ── */}
      <div className="navbar-pill navbar-center" ref={ref} onClick={() => setOpen((p) => !p)}>
        <div className="navbar-avatar">{getInitials(user?.username)}</div>
        <span className="navbar-username">{user?.username ?? "User"}</span>
        <span className={`navbar-chevron ${open ? "open" : ""}`}>▼</span>

        {open && (
          <div className="navbar-dropdown">
            <div className="navbar-dropdown-header">
              <div className="navbar-dropdown-name">{user?.username}</div>
              <div className="navbar-dropdown-email">{user?.email}</div>
            </div>
            <div className="navbar-dropdown-divider" />
            <div className="navbar-dropdown-item danger"
              onClick={(e) => { e.stopPropagation(); handleLogout(); }}>
              ⏻ &nbsp;Log out
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Nav links ── */}
      <div className="navbar-pill navbar-right">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`navbar-link ${location.pathname === link.path ? "active" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
