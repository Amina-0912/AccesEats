import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import AuthLayout, { IceCream, Leaf, Float } from "./AuthLayout";
import { homeForRole, saveSession } from "../components/auth";

/* ---- adjust these to match your backend / routes ---- */
const LOGIN_ENDPOINT = "/auth/login";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post(LOGIN_ENDPOINT, form);
      const role = saveSession(data);
      navigate(homeForRole(role), { replace: true }); // customer -> /menu, rider -> /rider, admin -> /admin
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "We couldn't log you in. Check your email and password and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      decor={
        <>
          <Float
            pos={{ top: "13%", right: "9%" }}
            size="clamp(52px, 6.4vw, 110px)"
            tilt={8}
            dx={14}
            dur={6.5}
          >
            <IceCream />
          </Float>
          <Float
            pos={{ bottom: "12%", left: "10%" }}
            size="clamp(30px, 3.6vw, 60px)"
            tilt={-75}
            dx={18}
            dur={5}
            delay={-2}
          >
            <Leaf />
          </Float>
        </>
      }
    >
      <h1 className="card__title">Welcome back!</h1>
      <p className="card__sub">Log in to order your favourites.</p>

      <form className="form" onSubmit={onSubmit}>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={onChange}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={onChange}
            required
          />
        </div>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Logging in…" : "Log In"}
        </button>
      </form>

      <p className="auth-switch">
        New here? <Link to="/register">Register</Link>
      </p>
    </AuthLayout>
  );
}