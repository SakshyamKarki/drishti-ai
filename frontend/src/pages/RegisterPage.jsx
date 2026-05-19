import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { useEffect } from "react";
import { registerThunk, selectAuthLoading, selectIsAuthenticated } from "../features/auth/authSlice";
import "../styles/auth.css";

const schema = Yup.object({
  username:        Yup.string().required("Username required").max(20),
  email:           Yup.string().email("Invalid email").required("Email required"),
  password:        Yup.string().min(8, "Min 8 characters").required("Password required"),
  confirmPassword: Yup.string().oneOf([Yup.ref("password")], "Passwords don't match").required("Confirm password"),
});

const Field = ({ id, label, type="text", placeholder, register, errors }) => (
  <div className="mb-5">
    <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide">{label}</label>
    <input type={type} placeholder={placeholder} {...register(id)}
      className="w-full rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all"
      style={{
        background: errors[id] ? "rgba(248,113,113,0.05)" : "rgba(255,255,255,0.05)",
        border:     errors[id] ? "0.5px solid rgba(248,113,113,0.5)" : "0.5px solid rgba(255,255,255,0.1)",
      }} />
    {errors[id] && <p className="text-xs text-red-400 mt-1.5">{errors[id].message}</p>}
  </div>
);

function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loading  = useSelector(selectAuthLoading);
  const isAuth   = useSelector(selectIsAuthenticated);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  useEffect(() => { if (isAuth) navigate("/"); }, [isAuth]);

  const onSubmit = async ({ confirmPassword, ...data }) => {
    const res = await dispatch(registerThunk(data));
    if (registerThunk.fulfilled.match(res)) navigate("/login");
  };

  return (
    <div className="auth-page">
      <div className="auth-orb-1" />
      <div className="auth-grid" />
      <div className="auth-card">
        <div className="auth-logo-row">
          <div className="auth-logo-ring"><div className="auth-logo-dot" /></div>
          <span className="auth-logo-name">Drishti<span>AI</span></span>
        </div>
        <div className="auth-badge"><span className="auth-badge-dot" />Create your account</div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-1" style={{ fontFamily:"Syne,sans-serif" }}>Get started</h1>
        <p className="text-sm text-slate-500 mb-8">Free account — full 5-model pipeline from day one</p>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Field id="username"        label="Username"         register={register} errors={errors} />
          <Field id="email"           label="Email address"    type="email"    placeholder="you@example.com" register={register} errors={errors} />
          <Field id="password"        label="Password"         type="password" placeholder="••••••••" register={register} errors={errors} />
          <Field id="confirmPassword" label="Confirm password" type="password" placeholder="••••••••" register={register} errors={errors} />

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all border-none cursor-pointer disabled:opacity-60 mt-2"
            style={{ background:"linear-gradient(135deg,#6366f1,#818cf8)", fontFamily:"Syne,sans-serif" }}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account? <Link to="/login" className="text-indigo-400 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
