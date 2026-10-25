import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { addToCart } from "../components/cart";
import { IceCream, Leaf } from "./AuthLayout";
import "./Menu.css";

/* ---- adjust to match your backend ---- */
const MENU_ENDPOINT = "/products"; // Updated to match your /products backend route
const CURRENCY = "$";

/*
  Items without uploaded photos show the food icon. While you're still waiting
  for admins to upload photos, this previews the hover-scroll using 3 icon
  slides. Set to false once real photos exist.
*/
const DEMO_SLIDES = false;

/* shown until (or if) the API responds */
const SAMPLE_ITEMS = [
  { id: 1, name: "Classic Burger", category: "Burgers", price: 8.99 },
  { id: 2, name: "Double Stack", category: "Burgers", price: 11.49 },
  { id: 3, name: "Veggie Smash", category: "Burgers", price: 9.49 },
  { id: 4, name: "Cola", category: "Drinks", price: 2.49 },
  { id: 5, name: "Lemonade", category: "Drinks", price: 3.19 },
  { id: 6, name: "Fries", category: "Sides", price: 3.99 },
  { id: 7, name: "Onion Rings", category: "Sides", price: 4.45 },
  { id: 8, name: "Chicken Wrap", category: "Burgers", price: 7.99 },
];

/* turns "/uploads/a.jpg" into a full URL using your API's base URL */
const toUrl = (v) => {
  const s = typeof v === "string" ? v : v?.url || v?.src || v?.path || "";
  if (!s) return "";
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  try {
    return new URL(s, api.defaults?.baseURL || window.location.origin).href;
  } catch {
    return s;
  }
};

/* accepts images / photos / gallery arrays, or a single image / image_url */
const collectImages = (it) => {
  const raw =
    it.image_url ??
    it.imageUrl ??
    it.image ??
    it.images ??
    it.photos ??
    it.gallery ??
    [];
  return (Array.isArray(raw) ? raw : [raw]).map(toUrl).filter(Boolean);
};

const normalize = (raw) => {
  const list = Array.isArray(raw) ? raw : raw?.items || raw?.data || [];
  return list.map((it, i) => ({
    id: it.product_id ?? it.id ?? it._id ?? i,
    name: it.name ?? it.title ?? "Untitled",
    category: it.category_name ?? it.category ?? it.type ?? "Other",
    price: Number(it.price ?? 0),
    images: collectImages(it),
  }));
};

/* ---------- food icons ---------- */

const INK = "#3b0d0d";
const MAROON = "#8f0000";
const CREAM = "#fff8ec";
const TAN = "#f5d08f";

function Burger() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path
        d="M16 46 C16 26 32 16 50 16 C68 16 84 26 84 46 Z"
        fill={CREAM}
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <circle cx="37" cy="31" r="2.6" fill={INK} />
      <circle cx="50" cy="26" r="2.6" fill={INK} />
      <circle cx="63" cy="31" r="2.6" fill={INK} />
      <rect x="13" y="50" width="74" height="13" rx="6.5" fill={MAROON} stroke={INK} strokeWidth="5" />
      <path
        d="M16 68 Q16 85 50 85 Q84 85 84 68 Z"
        fill={CREAM}
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Cup() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M54 30 L58 12 L70 12" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="30,40 70,40 64,88 36,88" fill={MAROON} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <rect x="26" y="30" width="48" height="11" rx="3" fill={MAROON} stroke={INK} strokeWidth="5" />
      <line x1="37" y1="54" x2="63" y2="54" stroke={CREAM} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function Fries() {
  const sticks = [
    { x: 27, y: 28 },
    { x: 37, y: 16 },
    { x: 47, y: 24 },
    { x: 57, y: 14 },
    { x: 66, y: 28 },
  ];
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {sticks.map((s) => (
        <rect key={s.x} x={s.x} y={s.y} width="9" height="44" rx="3.5" fill={TAN} stroke={INK} strokeWidth="4" />
      ))}
      <polygon points="24,56 76,56 71,90 29,90" fill={MAROON} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <rect x="43" y="70" width="14" height="4.5" rx="2.2" fill={CREAM} />
    </svg>
  );
}

function Wrap() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <ellipse cx="50" cy="50" rx="36" ry="21" fill={CREAM} stroke={INK} strokeWidth="5" />
      <path d="M24 47 Q50 33 76 47" fill="none" stroke={MAROON} strokeWidth="7" strokeLinecap="round" />
      <line x1="33" y1="61" x2="67" y2="61" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function FoodIcon({ item }) {
  const name = item.name.toLowerCase();
  const cat = item.category.toLowerCase();
  if (name.includes("wrap")) return <Wrap />;
  if (cat.startsWith("drink") || name.includes("cola") || name.includes("lemonade")) return <Cup />;
  if (cat.startsWith("side") || name.includes("fries") || name.includes("ring")) return <Fries />;
  return <Burger />;
}

/* ---------- photo gallery: hover to scroll through the item's photos ---------- */

function Gallery({ item, deep }) {
  const photos = item.images || [];

  const slides = useMemo(() => {
    if (photos.length) return photos.map((src) => ({ src }));
    if (DEMO_SLIDES) {
      return (deep ? ["tan", "soft", "blue"] : ["soft", "tan", "blue"]).map((tone) => ({ tone }));
    }
    return [{ tone: deep ? "tan" : "soft" }];
  }, [photos, deep]);

  const count = slides.length;
  const multi = count > 1;

  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [playing, setPlaying] = useState(false);
  const timer = useRef(0);
  const touched = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  const tick = (delay) => {
    timer.current = setTimeout(() => {
      setIndex((i) => (i >= count ? i : i + 1));
      tick(1400);
    }, delay);
  };

  const start = () => {
    if (!multi || timer.current) return;
    setPlaying(true);
    tick(450);
  };

  const stop = () => {
    clearTimeout(timer.current);
    timer.current = 0;
    setPlaying(false);
    setAnimate(true);
    setIndex(0);
  };

  const onEnd = (e) => {
    if (e.target !== e.currentTarget || index !== count) return;
    setAnimate(false);
    setIndex(0);
    requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
  };

  const onClick = () => {
    if (!window.matchMedia("(hover: none)").matches) return;
    if (timer.current) stop();
    else start();
  };

  const track = multi ? [...slides, slides[0]] : slides;

  return (
    <div
      className={`gallery${playing ? " is-playing" : ""}${multi ? " is-multi" : ""}`}
      role="group"
      aria-label={`Photos of ${item.name}`}
      tabIndex={multi ? 0 : undefined}
      onPointerDown={(e) => {
        touched.current = e.pointerType === "touch";
      }}
      onPointerEnter={(e) => e.pointerType !== "touch" && start()}
      onPointerLeave={stop}
      onFocus={() => !touched.current && start()}
      onBlur={stop}
      onClick={onClick}
    >
      <div
        className={`gallery__track${animate ? "" : " no-anim"}`}
        style={{ "--i": index }}
        onTransitionEnd={onEnd}
      >
        {track.map((s, i) => (
          <div
            key={i}
            className={`gallery__slide${s.tone ? ` tone-${s.tone}` : ""}`}
            aria-hidden={i === count ? "true" : undefined}
          >
            {s.src ? (
              <img
                src={s.src}
                alt={i < count ? `${item.name}, photo ${i + 1} of ${count}` : ""}
                draggable={false}
              />
            ) : (
              <div className="gallery__icon">
                <FoodIcon item={item} />
              </div>
            )}
          </div>
        ))}
      </div>

      {multi && (
        <div className="gallery__dots" aria-hidden="true">
          {slides.map((_, i) => (
            <i key={i} className={i === index % count ? "is-on" : ""} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- breezy hero decorations ---------- */

function Drift({ pos, size, tilt = 0, dx = 12, dur = 6, delay = 0, bouncy = false, children }) {
  const [bouncing, setBouncing] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const bounce = () => {
    if (!bouncy || bouncing) return;
    setBouncing(true);
    timer.current = setTimeout(() => setBouncing(false), 900);
  };

  return (
    <div
      className={`drift${bouncy ? " drift--bouncy" : ""}`}
      aria-hidden="true"
      style={{
        ...pos,
        width: size,
        "--tilt": `${tilt}deg`,
        "--dx": `${dx}px`,
        "--dur": `${dur}s`,
        "--delay": `${delay}s`,
      }}
      onMouseEnter={bounce}
      onClick={bounce}
    >
      <div className={`drift__bounce${bouncing ? " is-bouncing" : ""}`}>
        <div className="drift__art">{children}</div>
      </div>
    </div>
  );
}

/* ---------- screen ---------- */

export default function Menu() {
  const [items, setItems] = useState(SAMPLE_ITEMS);
  const [filter, setFilter] = useState("All");
  const [added, setAdded] = useState(null);
  const [announce, setAnnounce] = useState("");
  const timer = useRef(0);
  const sentinelRef = useRef(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const navH = document.querySelector(".nav")?.offsetHeight || 64;
    const io = new IntersectionObserver(
      ([entry]) =>
        setStuck(!entry.isIntersecting && entry.boundingClientRect.top < navH),
      { rootMargin: `-${navH}px 0px 0px 0px`, threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .get(MENU_ENDPOINT)
      .then(({ data }) => {
        const list = normalize(data);
        if (alive && list.length) setItems(list);
      })
      .catch(() => {
        /* keep sample items if backend fails */
      });
    return () => {
      alive = false;
      clearTimeout(timer.current);
    };
  }, []);

  const categories = useMemo(
    () => ["All", ...new Set(items.map((i) => i.category))],
    [items]
  );
  const active = categories.includes(filter) ? filter : "All";
  const visible = active === "All" ? items : items.filter((i) => i.category === active);

  const handleAdd = (item) => {
    addToCart(item);
    setAdded(item.id);
    setAnnounce(`${item.name} added to your cart`);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(null), 1100);
  };

  const browse = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById("menu")
      ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return (
    <>
      <Navbar />

      <div className="menu">
        <div className="menu__sheet" aria-hidden="true" />
        <div className="menu__breeze menu__breeze--a" aria-hidden="true" />
        <div className="menu__breeze menu__breeze--b" aria-hidden="true" />
        <div className="menu__glow" aria-hidden="true" />

        <section className="menu-hero">
          <div className="menu-hero__text">
            <h1>
              Yummy food,
              <br />
              made for everyone!
            </h1>
            <p>Pick your treats, tell us how to deliver, and relax.</p>
            <button type="button" className="pill" onClick={browse}>
              Browse the menu
            </button>
          </div>

          <Drift pos={{ top: "13%", right: "15%" }} size="clamp(62px, 6.4vw, 130px)" tilt={0} dx={10} dur={6.5} bouncy>
            <IceCream />
          </Drift>
          <Drift pos={{ top: "36%", right: "6.5%" }} size="clamp(30px, 3.2vw, 66px)" tilt={8} dx={14} dur={5.4} delay={-2}>
            <IceCream scoop="#8fb0ea" cherry={false} cheeks={false} />
          </Drift>
          <Drift pos={{ top: "9%", right: "25%" }} size="clamp(18px, 2.1vw, 42px)" tilt={28} dx={16} dur={4.8} delay={-1}>
            <Leaf />
          </Drift>
          <Drift pos={{ top: "68%", right: "11%" }} size="clamp(16px, 1.8vw, 36px)" tilt={-32} dx={-14} dur={5.2} delay={-3}>
            <Leaf />
          </Drift>
        </section>

        <section id="menu" className="shelf" aria-labelledby="shelf-title">
          <h2 id="shelf-title" className="sr-only">
            Menu
          </h2>

          <div ref={sentinelRef} className="chips-sentinel" aria-hidden="true" />
          <div
            className={`chips${stuck ? " is-stuck" : ""}`}
            role="group"
            aria-label="Filter by category"
          >
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip${c === active ? " is-active" : ""}`}
                aria-pressed={c === active}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <ul className="grid" key={active}>
            {visible.map((item, idx) => (
              <li key={item.id} className="item-wrap" style={{ "--i": idx }}>
                <article className="item">
                  <Gallery item={item} deep={idx % 3 === 1} />
                  <span className="item__tag">{item.category}</span>
                  <h3 className="item__name">{item.name}</h3>
                  <div className="item__foot">
                    <span className="item__price">
                      {CURRENCY}
                      {item.price.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      className={`add${added === item.id ? " is-added" : ""}`}
                      aria-label={`Add ${item.name} to cart`}
                      onClick={() => handleAdd(item)}
                    >
                      {added === item.id ? "✓ Added" : "+ Add"}
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>

          <p className="sr-only" aria-live="polite">
            {announce}
          </p>
        </section>
      </div>
    </>
  );
}