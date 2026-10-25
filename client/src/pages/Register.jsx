import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import AuthLayout, { IceCream, Leaf, Float } from "./AuthLayout";
import { homeForRole, saveSession } from "../components/auth";

/* ---- adjust these to match your backend / routes ---- */
const REGISTER_ENDPOINT = "/auth/register";

const ACCOUNT_TYPES = [
  { value: "customer", label: "Customer" },
  { value: "rider", label: "Rider" },
  { value: "admin", label: "Admin" },
];

const ACCESSIBILITY = [
  { value: "none", label: "Standard View" },
  { value: "poor_sight", label: "Low Vision" },
  { value: "protanopia", label: "Colour Blind – Protanopia" },
  { value: "deuteranopia", label: "Colour Blind – Deuteranopia" },
  { value: "tritanopia", label: "Colour Blind – Tritanopia" },
  { value: "high_contrast", label: "High Contrast" },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: ACCOUNT_TYPES[0].value,
    accessibility_type: ACCESSIBILITY[0].value,
  });
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
      const { data } = await api.post(REGISTER_ENDPOINT, form);
      const hasSession = Boolean(data?.token || data?.accessToken || data?.access_token || data?.user);
      if (hasSession) {
        const role = saveSession(data, { name: form.name, role: form.role });
        navigate(homeForRole(role), { replace: true });
      } else {
        navigate("/login"); // backend didn't log us in, so go sign in
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "We couldn't create your account. Please check your details and try again."
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
            pos={{ top: "14%", left: "9%" }}
            size="clamp(46px, 5.6vw, 96px)"
            tilt={-6}
            dx={14}
            dur={6.5}
          >
            <IceCream scoop="#8fb0ea" cherry={false} cheeks={false} />
          </Float>
          <Float
            pos={{ bottom: "10%", left: "17%" }}
            size="clamp(24px, 2.8vw, 46px)"
            tilt={-15}
            dx={16}
            dur={5.2}
            delay={-1}
          >
            <Leaf />
          </Float>
          <Float
            pos={{ bottom: "12%", right: "11%" }}
            size="clamp(28px, 3.2vw, 54px)"
            tilt={8}
            dx={-16}
            dur={5.8}
            delay={-3}
          >
            <Leaf />
          </Float>
        </>
      }
    >
      <h1 className="card__title">Join the club!</h1>
      <p className="card__sub">Create your account to start ordering.</p>

      <form className="form" onSubmit={onSubmit}>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            value={form.name}
            onChange={onChange}
            required
          />
        </div>

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
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={onChange}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={6}
            value={form.password}
            onChange={onChange}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="role">Account type</label>
          <select id="role" name="role" value={form.role} onChange={onChange}>
            {ACCOUNT_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="accessibility_type">Accessibility preference</label>
          <select
            id="accessibility_type"
            name="accessibility_type"
            value={form.accessibility_type}
            onChange={onChange}
            aria-describedby="accessibility-hint"
          >
            {ACCESSIBILITY.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <small id="accessibility-hint" className="hint">
            Changes how AccessEats looks and reads for you.
          </small>
        </div>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Signing up…" : "Sign Up"}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}