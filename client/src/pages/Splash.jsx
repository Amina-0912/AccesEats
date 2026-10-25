import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Splash.css";

const INK = "#3b0d0d";
const MAROON = "#8f0000";
const CREAM = "#fff8ec";
const TAN = "#f5d08f";
const BLUE = "#8fb0ea";
const BLUSH = "#f4a6a3";

/* ---------- small SVG pieces ---------- */

function IceCream({ scoop = CREAM, cherry = true, cheeks = true, className = "" }) {
  return (
    <svg className={className} viewBox="0 0 300 470" aria-hidden="true">
      {cherry && (
        <circle cx="150" cy="38" r="26" fill={MAROON} stroke={INK} strokeWidth="14" />
      )}
      {/* cone */}
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
      {/* scoop */}
      <path
        d="M40 200 C28 92 92 44 150 44 C208 44 272 92 260 200 C258 218 226 228 150 228 C74 228 42 218 40 200 Z"
        fill={scoop}
        stroke={INK}
        strokeWidth="16"
        strokeLinejoin="round"
      />
      {/* face */}
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

/* Cloud: outline layer is drawn behind (and offset for the shadow), fill layer on top */
function CloudShape({ fill = CREAM, shine = false, className = "" }) {
  const shapes = (
    <>
      <rect x="14" y="62" width="172" height="52" rx="26" />
      <circle cx="62" cy="62" r="30" />
      <circle cx="108" cy="48" r="40" />
      <circle cx="156" cy="70" r="26" />
    </>
  );
  return (
    <svg className={className} viewBox="0 0 210 130" aria-hidden="true">
      <g fill={INK} stroke={INK} strokeWidth="11" strokeLinejoin="round" transform="translate(5 6)">
        {shapes}
      </g>
      <g fill={INK} stroke={INK} strokeWidth="11" strokeLinejoin="round">
        {shapes}
      </g>
      <g fill={fill}>{shapes}</g>
      {shine && (
        <path
          d="M78 40 Q100 20 124 32"
          fill="none"
          stroke="#fff"
          strokeOpacity=".4"
          strokeWidth="6"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function Sparkle({ fill = TAN, className = "" }) {
  return (
    <svg className={className} viewBox="-4 -4 48 48" aria-hidden="true">
      <path
        d="M20 0 C22 14 26 18 40 20 C26 22 22 26 20 40 C18 26 14 22 0 20 C14 18 18 14 20 0Z"
        fill={fill}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Leaf({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 70 120" aria-hidden="true">
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

function Heart({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <path
        d="M20 36 C6 25 2 17 6 10 C10 4 18 5 20 11 C22 5 30 4 34 10 C38 17 34 25 20 36Z"
        fill="#f4a6a3"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* little hearts + sparkles that burst out of a cloud when it is clicked */
function Burst() {
  return (
    <span className="burst" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <span key={i} style={{ "--a": `${i * 45}deg` }}>
          {i % 2 ? <Heart /> : <Sparkle fill={i % 4 === 0 ? CREAM : TAN} />}
        </span>
      ))}
    </span>
  );
}

/* ---------- logo ---------- */

const LETTERS = [
  { c: "A", color: MAROON, rot: -4 },
  { c: "c", color: TAN, rot: 3 },
  { c: "c", color: CREAM, rot: -2 },
  { c: "e", color: BLUE, rot: 4 },
  { c: "s", color: MAROON, rot: -3 },
  { c: "s", color: TAN, rot: 2 },
  { c: "E", color: CREAM, rot: -3 },
  { c: "a", color: BLUE, rot: 4 },
  { c: "t", color: MAROON, rot: -2 },
  { c: "s", color: TAN, rot: 3 },
];

function Logo() {
  return (
    <h1 className="logo" aria-label="AccessEats">
      {LETTERS.map((l, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{ "--c": l.color, "--r": `${l.rot}deg`, "--i": i }}
        >
          {l.c}
        </span>
      ))}
    </h1>
  );
}

/* ---------- screen ---------- */

export default function Splash() {
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const [showActions, setShowActions] = useState(false);
  const [popping, setPopping] = useState(null); // which route was clicked
  const navigate = useNavigate();
  const timerRef = useRef(0);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // let the cloud bounce + burst first, then go to the page
  const handleCloudClick = (e, to) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (popping) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate(to);
      return;
    }
    setPopping(to);
    timerRef.current = setTimeout(() => navigate(to), 560);
  };

  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      const wrap = wrapRef.current;
      const stage = stageRef.current;
      if (!wrap || !stage) return;

      const max = wrap.offsetHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      stage.style.setProperty("--p", p.toFixed(4));

      // hysteresis so the clouds don't flicker around the threshold
      setShowActions((prev) => (prev ? p > 0.22 : p > 0.35));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className="splash" ref={wrapRef}>
      <div className="stage" ref={stageRef} style={{ "--p": 0 }}>
        {/* breezy picnic sheet */}
        <div className="sheet" aria-hidden="true" />
        <div className="breeze breeze--a" aria-hidden="true" />
        <div className="breeze breeze--b" aria-hidden="true" />
        <div className="glow" aria-hidden="true" />

        {/* drifting background clouds (stay put while you scroll) */}
        <div className="bgcloud bgcloud--tl" aria-hidden="true">
          <CloudShape />
        </div>
        <div className="bgcloud bgcloud--tr" aria-hidden="true">
          <CloudShape />
        </div>
        <div className="bgcloud bgcloud--bl" aria-hidden="true">
          <CloudShape />
        </div>
        <div className="bgcloud bgcloud--br" aria-hidden="true">
          <CloudShape />
        </div>

        {/* floating decorations: leave faster than the logo (parallax) */}
        <div className="decor" aria-hidden="true">
          <div className="d d--minblue" style={{ "--k": 70 }}>
            <IceCream className="art" scoop={BLUE} cherry={false} cheeks={false} />
          </div>
          <div className="d d--minwhite" style={{ "--k": 80 }}>
            <IceCream className="art" />
          </div>
          <div className="d d--leaf1" style={{ "--k": 60 }}>
            <Leaf className="art" />
          </div>
          <div className="d d--leaf2" style={{ "--k": 75 }}>
            <Leaf className="art" />
          </div>
          <div className="d d--sp1" style={{ "--k": 55 }}>
            <Sparkle className="art" />
          </div>
          <div className="d d--sp2" style={{ "--k": 65 }}>
            <Sparkle className="art" fill={CREAM} />
          </div>
          <div className="d d--sp3" style={{ "--k": 85 }}>
            <Sparkle className="art" />
          </div>
          <div className="d d--sp4" style={{ "--k": 50 }}>
            <Sparkle className="art" fill={CREAM} />
          </div>
          <div className="d d--sp5" style={{ "--k": 90 }}>
            <Sparkle className="art" />
          </div>
          <div className="d d--heart" style={{ "--k": 60 }}>
            <Heart className="art" />
          </div>
        </div>

        {/* the logo group: rises and dims as you scroll */}
        <section className="hero">
          <IceCream className="hero__cone" />
          <div className="hero__word">
            <Heart className="hero__heart" />
            <Logo />
          </div>
          <p className="tagline">Yummy food, made for everyone!</p>
        </section>

        {/* log in / register clouds: pop from a dot once you scroll */}
        <nav
          className={`actions ${showActions ? "is-visible" : ""}`}
          aria-label="Account"
          aria-hidden={!showActions}
        >
          <Link
            to="/login"
            className={`cloudbtn cloudbtn--login ${popping === "/login" ? "is-popping" : ""}`}
            tabIndex={showActions ? 0 : -1}
            onClick={(e) => handleCloudClick(e, "/login")}
          >
            <span className="cloudbtn__pop">
              <span className="cloudbtn__float">
                <CloudShape fill={MAROON} shine className="cloudbtn__svg" />
                <span className="cloudbtn__label">Log in</span>
                <Burst />
              </span>
            </span>
          </Link>

          <Link
            to="/register"
            className={`cloudbtn cloudbtn--register ${popping === "/register" ? "is-popping" : ""}`}
            tabIndex={showActions ? 0 : -1}
            onClick={(e) => handleCloudClick(e, "/register")}
          >
            <span className="cloudbtn__pop">
              <span className="cloudbtn__float">
                <CloudShape fill="#fff3da" shine className="cloudbtn__svg" />
                <span className="cloudbtn__label">Register</span>
                <Burst />
              </span>
            </span>
          </Link>
        </nav>

        <div className="scrollhint" aria-hidden="true">
          <span>Scroll</span>
          <i />
        </div>
      </div>
    </main>
  );
}