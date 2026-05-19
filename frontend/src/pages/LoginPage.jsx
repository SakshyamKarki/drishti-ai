import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { useEffect } from "react";
import { loginThunk, selectAuthError, selectAuthLoading, selectIsAuthenticated } from "../features/auth/authSlice";
import "../styles/auth.css";

const schema = Yup.object({
  username: Yup.string().required("Username is required"),
  password: Yup.string().min(8, "Min 8 characters").required("Password is required"),
});

function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loading  = useSelector(selectAuthLoading);
  const isAuth   = useSelector(selectIsAuthenticated);
  const error    = useSelector(selectAuthError);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  useEffect(() => { if (isAuth) navigate("/dashboard"); }, [isAuth]);

  const onSubmit = (data) => dispatch(loginThunk(data));

  return (
    <div className="auth-page">
      <div className="auth-orb-1" />
      <div className="auth-grid" />
      <div className="auth-card">
        <div className="auth-logo-row">
          <div className="auth-logo-ring"><div className="auth-logo-dot" /></div>
          <span className="auth-logo-name">Drishti<span>AI</span></span>
        </div>
        <div className="auth-badge"><span className="auth-badge-dot" />5-Model Fake Detection</div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-1" style={{ fontFamily:"Syne,sans-serif" }}>Welcome back</h1>
        <p className="text-sm text-slate-500 mb-8">Sign in to continue</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {[
            { id:"username", label:"Username", type:"text",     placeholder:"your_username" },
            { id:"password", label:"Password", type:"password", placeholder:"••••••••"      },
          ].map(({ id, label, type, placeholder }) => (
            <div key={id} className="mb-5">
              <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide">{label}</label>
              <input type={type} placeholder={placeholder} {...register(id)}
                className="w-full rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all"
                style={{
                  background: errors[id] ? "rgba(248,113,113,0.05)" : "rgba(255,255,255,0.05)",
                  border:     errors[id] ? "0.5px solid rgba(248,113,113,0.5)" : "0.5px solid rgba(255,255,255,0.1)",
                }} />
              {errors[id] && <p className="text-xs text-red-400 mt-1.5">{errors[id].message}</p>}
            </div>
          ))}

          {error && <p className="text-xs text-red-400 text-center mb-4">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all border-none cursor-pointer disabled:opacity-60"
            style={{ background:"linear-gradient(135deg,#6366f1,#818cf8)", fontFamily:"Syne,sans-serif" }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          No account? <Link to="/register" className="text-indigo-400 font-medium hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
