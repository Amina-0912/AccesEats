import "./Auth.css";

const INK = "#3b0d0d";
const MAROON = "#8f0000";
const CREAM = "#fff8ec";
const TAN = "#f5d08f";
const BLUE = "#8fb0ea";
const BLUSH = "#f4a6a3";

export function IceCream({ scoop = CREAM, cherry = true, cheeks = true }) {
  return (
    <svg viewBox="0 0 300 470" aria-hidden="true">
      {cherry && (
        <circle cx="150" cy="38" r="26" fill={MAROON} stroke={INK} strokeWidth="14" />
      )}
      <polygon
        points="64,205 236,205 150,440"
        fill={TAN}
        stroke={INK}
        strokeWidth="16"
        strokeLinejoin="round"
      />
      <g stroke="#9a6b4a" strokeWidth="9" strokeLinecap="round" fill="none">
        <path d="M100 232 L150 340" />
        <path d="M200 232 L165 300" />
        <path d="M118 262 L140 258" />
      </g>
      <path
        d="M40 200 C28 92 92 44 150 44 C208 44 272 92 260 200 C258 218 226 228 150 228 C74 228 42 218 40 200 Z"
        fill={scoop}
        stroke={INK}
        strokeWidth="16"
        strokeLinejoin="round"
      />
      <circle cx="108" cy="122" r="10" fill={INK} />
      <circle cx="192" cy="122" r="10" fill={INK} />
      <path
        d="M134 138 Q150 158 166 138"
        fill="none"
        stroke={INK}
        strokeWidth="7"
        strokeLinecap="round"
      />
      {cheeks && (
        <>
          <ellipse cx="78" cy="148" rx="18" ry="15" fill={BLUSH} />
          <ellipse cx="222" cy="148" rx="18" ry="15" fill={BLUSH} />
        </>
      )}
    </svg>
  );
}

export function Leaf() {
  return (
    <svg viewBox="0 0 70 120" aria-hidden="true">
      <path
        d="M8 6 C58 12 78 66 46 112 C8 84 -6 38 8 6 Z"
        fill={BLUE}
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M14 20 L44 94" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Float({ pos, size, tilt = 0, dx = 12, delay = 0, dur = 6, children }) {
  return (
    <div
      className="fl"
      aria-hidden="true"
      style={{
        ...pos,
        width: size,
        "--tilt": `${tilt}deg`,
        "--dx": `${dx}px`,
        "--dur": `${dur}s`,
        "--delay": `${delay}s`,
      }}
    >
      <div className="fl__art">{children}</div>
    </div>
  );
}

export default function AuthLayout({ decor, children }) {
  return (
    <main className="auth">
      <div className="auth__sheet" aria-hidden="true" />
      <div className="auth__breeze auth__breeze--a" aria-hidden="true" />
      <div className="auth__breeze auth__breeze--b" aria-hidden="true" />
      <div className="auth__glow" aria-hidden="true" />

      {decor}

      <div className="auth__center">
        <div className="card-wrap">
          <section className="card">{children}</section>
        </div>
      </div>
    </main>
  );
}