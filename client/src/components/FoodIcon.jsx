/* Small food icons (same drawings as the Menu page). */
const INK = "#3b0d0d";
const MAROON = "#8f0000";
const CREAM = "#fff8ec";
const TAN = "#f5d08f";

const Svg = ({ children }) => (
  <svg viewBox="0 0 100 100" aria-hidden="true" style={{ display: "block", width: "100%", height: "auto" }}>
    {children}
  </svg>
);

const Burger = () => (
  <Svg>
    <path d="M16 46 C16 26 32 16 50 16 C68 16 84 26 84 46 Z" fill={CREAM} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <circle cx="37" cy="31" r="2.6" fill={INK} />
    <circle cx="50" cy="26" r="2.6" fill={INK} />
    <circle cx="63" cy="31" r="2.6" fill={INK} />
    <rect x="13" y="50" width="74" height="13" rx="6.5" fill={MAROON} stroke={INK} strokeWidth="5" />
    <path d="M16 68 Q16 85 50 85 Q84 85 84 68 Z" fill={CREAM} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
  </Svg>
);

const Cup = () => (
  <Svg>
    <path d="M54 30 L58 12 L70 12" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <polygon points="30,40 70,40 64,88 36,88" fill={MAROON} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <rect x="26" y="30" width="48" height="11" rx="3" fill={MAROON} stroke={INK} strokeWidth="5" />
    <line x1="37" y1="54" x2="63" y2="54" stroke={CREAM} strokeWidth="4" strokeLinecap="round" />
  </Svg>
);

const Fries = () => (
  <Svg>
    {[[27, 28], [37, 16], [47, 24], [57, 14], [66, 28]].map(([x, y]) => (
      <rect key={x} x={x} y={y} width="9" height="44" rx="3.5" fill={TAN} stroke={INK} strokeWidth="4" />
    ))}
    <polygon points="24,56 76,56 71,90 29,90" fill={MAROON} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <rect x="43" y="70" width="14" height="4.5" rx="2.2" fill={CREAM} />
  </Svg>
);

const Wrap = () => (
  <Svg>
    <ellipse cx="50" cy="50" rx="36" ry="21" fill={CREAM} stroke={INK} strokeWidth="5" />
    <path d="M24 47 Q50 33 76 47" fill="none" stroke={MAROON} strokeWidth="7" strokeLinecap="round" />
    <line x1="33" y1="61" x2="67" y2="61" stroke={INK} strokeWidth="4" strokeLinecap="round" />
  </Svg>
);

export default function FoodIcon({ name = "", category = "" }) {
  const n = name.toLowerCase();
  const c = category.toLowerCase();
  if (n.includes("wrap")) return <Wrap />;
  if (c.startsWith("drink") || n.includes("cola") || n.includes("lemonade")) return <Cup />;
  if (c.startsWith("side") || n.includes("fries") || n.includes("ring")) return <Fries />;
  return <Burger />;
}