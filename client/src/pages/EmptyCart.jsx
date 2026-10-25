import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { IceCream, Leaf } from "./AuthLayout";
import "./EmptyCart.css";

const CONE = "22,70 78,70 50,142";

/* the scoop itself */
const SCOOP =
  "M15 72 C11 42 29 24 50 24 C71 24 89 42 85 72 C85 79 78 81 72 78 C66 83 58 79 50 81 C42 79 34 83 28 78 C22 81 15 79 15 72 Z";

/* the cream that flows down out of the scoop and flares over the cone rim */
const SKIRT =
  "M19 60 C11 70 8 82 16 88 C22 92 27 86 33 89 C39 93 44 88 50 91 C56 94 61 88 67 90 C73 93 78 87 84 88 C92 84 91 70 81 60 Z";

/* drips: two run down the cone, two hang in the air (d = when each one starts running) */
const DRIPS = [
  { x: 41, y1: 76, y2: 96, d: "0.5s" },
  { x: 57, y1: 78, y2: 110, d: "0.7s" },
  { x: 83, y1: 78, y2: 112, d: "0.6s" },
  { x: 17, y1: 78, y2: 98, d: "0.9s" },
];

/* a falling drop (teardrop, top at 0,0) */
const DROP = "M0 0 C0 0 5.6 7.5 5.6 11.5 A5.6 5.6 0 0 1 -5.6 11.5 C-5.6 7.5 0 0 0 0 Z";

/* where the puddle sits */
const POOL_Y = 147;

/* the scoop squashes while melting (same numbers as .is-melting .sad__sag in the CSS),
   so the falling drops are placed with the same squash applied */
const sagX = (x) => 50 + (x - 50) * 1.04;
const sagY = (y) => 80 + (y - 80) * 0.92;

/*
  The two drips on the cone that let go of drops, one after the other.
  delay       = seconds after the melt starts when this drip begins swelling
                (after it has finished running down)
  splashDelay = seconds after the melt starts of this drip's first drop that splashes
                (the puddle is big enough by then)
*/
const SOURCES = [
  { x: 57, y2: 110, delay: 1.8, splashDelay: 6.0 },
  { x: 41, y2: 96, delay: 3.0, splashDelay: 7.2 },
].map((s) => {
  const top = sagY(s.y2 - 4);
  return {
    ...s,
    dropX: sagX(s.x),
    dropTop: top,
    fall: POOL_Y - 18.8 - top, // how far the drop travels until it sinks into the puddle
  };
});

/* tiny droplets thrown up by a splash: dx = sideways direction, up = height */
const SPLASH = [
  { dx: -1, up: 7 },
  { dx: 0, up: 11 },
  { dx: 1, up: 8 },
];

/*
  All the white cream (scoop + flow + drips + the swelling drop tips) is drawn twice:
  first as a fat dark layer, then as a plain cream layer on top. The cream layer hides
  every line inside the shape, so the outline only goes around the outside.
*/
function Cream({ layer }) {
  return (
    <g className={`cream cream--${layer}`}>
      <path d={SCOOP} />
      <path className="sad__skirt" d={SKIRT} />

      {DRIPS.map((p) => (
        <line
          key={p.x}
          className="sad__drip"
          style={{ "--d": p.d }}
          x1={p.x}
          y1={p.y1}
          x2={p.x}
          y2={p.y2}
          pathLength="1"
        />
      ))}

      {/* the swelling bulge at the tip of the two dripping drips */}
      {SOURCES.map((s) => (
        <circle
          key={s.x}
          className={`sad__bulge sad__bulge--${layer}`}
          style={{ "--delay": `${s.delay}s` }}
          cx={s.x}
          cy={s.y2}
          r={layer === "outline" ? 9 : 4}
        />
      ))}
    </g>
  );
}

/* A sad ice cream that melts when you hover (or tap / focus) it. */
function SadIceCream() {
  return (
    <svg viewBox="0 0 100 160" className="sad" aria-hidden="true">
      <defs>
        <clipPath id="sadCone">
          <polygon points={CONE} />
        </clipPath>
      </defs>

      {/* cone */}
      <polygon points={CONE} fill="#f5d08f" />
      <path
        clipPath="url(#sadCone)"
        d="M-2 70 L58 130 M14 70 L74 130 M30 70 L90 130 M46 70 L106 130 M102 70 L42 130 M86 70 L26 130 M70 70 L10 130 M54 70 L-6 130"
        fill="none"
        stroke="#c99a52"
        strokeWidth="2.2"
      />
      <polygon points={CONE} fill="none" stroke="#3b0d0d" strokeWidth="5" strokeLinejoin="round" />

      {/* falling drops, puddle and splashes */}
      <g className="sad__ground">
        {SOURCES.map((s) => (
          <g key={s.x} transform={`translate(${s.dropX.toFixed(2)} ${s.dropTop.toFixed(2)})`}>
            <g
              className="sad__drop"
              style={{ "--delay": `${s.delay}s`, "--fall": `${s.fall.toFixed(1)}px` }}
            >
              <path d={DROP} fill="#3b0d0d" stroke="#3b0d0d" strokeWidth="6" strokeLinejoin="round" />
              <path d={DROP} fill="#fff8ec" />
            </g>
          </g>
        ))}

        <g className="sad__pool">
          <ellipse className="sad__pool-body" cx="50" cy={POOL_Y} rx="38" ry="5" />
        </g>

        {SOURCES.map((s) => (
          <g key={s.x} transform={`translate(${s.dropX.toFixed(2)} 143)`}>
            {SPLASH.map((p, i) => (
              <circle
                key={i}
                className="sad__splash"
                style={{ "--delay": `${s.splashDelay}s`, "--dx": p.dx, "--up": p.up }}
                r="2.2"
              />
            ))}
          </g>
        ))}
      </g>

      {/* scoop + melt + face (slumps and shivers while melting) */}
      <g className="sad__sag">
        <g className="sad__shiver">
          <circle cx="50" cy="22" r="9" fill="#8f0000" stroke="#3b0d0d" strokeWidth="4" />

          <Cream layer="outline" />
          <Cream layer="fill" />

          {/* cheeks */}
          <circle cx="27" cy="61" r="5" fill="#f6a5a5" />
          <circle cx="73" cy="61" r="5" fill="#f6a5a5" />

          {/* eyes: sad dots that turn into puppy eyes */}
          <g className="eye">
            <circle cx="36" cy="50" r="3.4" fill="#3b0d0d" />
            <circle className="eye__shine" cx="34.8" cy="48.6" r="1.1" fill="#fff" />
            <circle className="eye__shine" cx="37.3" cy="51.6" r="0.6" fill="#fff" />
          </g>
          <g className="eye">
            <circle cx="64" cy="50" r="3.4" fill="#3b0d0d" />
            <circle className="eye__shine" cx="62.8" cy="48.6" r="1.1" fill="#fff" />
            <circle className="eye__shine" cx="65.3" cy="51.6" r="0.6" fill="#fff" />
          </g>

          {/* worried brows + frown */}
          <path className="brow brow--l" d="M29 44 L42 39" fill="none" stroke="#3b0d0d" strokeWidth="3" strokeLinecap="round" />
          <path className="brow brow--r" d="M71 44 L58 39" fill="none" stroke="#3b0d0d" strokeWidth="3" strokeLinecap="round" />
          <path d="M41 67 Q50 58 59 67" fill="none" stroke="#3b0d0d" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

/*
  Used by the Cart page (empty cart) and the My Orders page (no orders yet).
  Only the text changes, through these props.
*/
export default function EmptyCart({
  title = "Your Cart",
  heading = "Your cart is empty",
  text = "Looks like you haven't added any treats yet.",
  buttonLabel = "Browse Menu",
  buttonTo = "/menu",
}) {
  const [melting, setMelting] = useState(false);
  /* stays on a little longer than `melting`, so the puddle can fade out smoothly */
  const [pooling, setPooling] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const melt = (on) => {
    clearTimeout(timer.current);
    setMelting(on);
    if (on) setPooling(true);
    else timer.current = setTimeout(() => setPooling(false), 900);
  };

  /* touch screens have no hover: tap to melt / un-melt */
  const onClick = () => {
    if (window.matchMedia("(hover: none)").matches) melt(!melting);
  };

  return (
    <PageShell title={title}>
      <div className="empty">
        <div className="empty__art">
          <span className="empty__leaf" aria-hidden="true">
            <Leaf />
          </span>

          <span className="empty__main">
            <button
              type="button"
              className={`melt${melting ? " is-melting" : ""}${pooling ? " is-pooling" : ""}`}
              aria-label="Sad ice cream. Hover or tap to make it melt."
              onPointerEnter={(e) => e.pointerType === "mouse" && melt(true)}
              onPointerLeave={(e) => e.pointerType === "mouse" && melt(false)}
              onFocus={(e) => e.target.matches(":focus-visible") && melt(true)}
              onBlur={() => melt(false)}
              onClick={onClick}
            >
              <SadIceCream />
            </button>
          </span>

          <span className="empty__mini" aria-hidden="true">
            <IceCream scoop="#8fb0ea" cherry={false} cheeks={false} />
          </span>
        </div>

        <h2 className="empty__title">{heading}</h2>
        <p className="empty__sub">{text}</p>

        <Link to={buttonTo} className="empty__btn">
          {buttonLabel}
        </Link>
      </div>
    </PageShell>
  );
}