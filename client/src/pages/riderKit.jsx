import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { clearSession, getUser } from "../components/auth";
import "./Rider.css";

/* ---- matches your server/routes/rider.js ---- */
export const RIDER_ORDERS_ENDPOINT = "/rider/manifests"; // GET
export const AVAILABILITY_ENDPOINT = "/rider/availability"; // PATCH { available }

/* order id -> manifest id (the server updates deliveries by manifest id) */
const manifestOf = new Map();

/* "Picked Up" / "picked-up" / "PICKED_UP" -> "picked_up" */
export const statusKey = (s = "") => {
  const k = String(s).toLowerCase().replace(/[\s-]+/g, "_");
  if (k.includes("deliver")) return "delivered";
  if (k.includes("pick") || k.includes("transit") || k.includes("way")) return "picked_up";
  return "assigned";
};

export const STATUS_LABEL = { assigned: "Assigned", picked_up: "Picked Up", delivered: "Delivered" };
export const STATUS_CLASS = { assigned: "is-assigned", picked_up: "is-picked", delivered: "is-delivered" };

export const normalizeOrders = (raw) => {
  const list = Array.isArray(raw) ? raw : raw?.data || raw?.orders || [];
  return list.map((o, i) => {
    const orderId = o.order_id ?? o.id ?? i;
    if (o.manifest_id != null) manifestOf.set(String(orderId), o.manifest_id);

    const cityLine = [o.city, o.pincode].filter(Boolean).join(" ");
    const customNote = o.instructions && o.instructions !== "Standard delivery" ? o.instructions : "";

    return {
      id: orderId,
      status: statusKey(o.status),
      customer: o.customer_name ?? "Customer",
      phone: o.customer_phone ?? "",
      street: o.street || "—",
      city: cityLine,
      short: [o.street, cityLine].filter(Boolean).join(", ") || "—",
      note: o.note || customNote,
      pickedAt: null,
    };
  });
};

export async function loadRiderOrders() {
  try {
    const { data } = await api.get(RIDER_ORDERS_ENDPOINT);
    return { list: normalizeOrders(data), demo: false, error: "" };
  } catch (err) {
    console.warn("AccessEats: couldn't load rider orders from", RIDER_ORDERS_ENDPOINT, err);
    const status = err.response?.status;
    let error = `Couldn't reach the server (${RIDER_ORDERS_ENDPOINT}).`;
    if (status === 401 || status === 403) {
      error = "Your login may have expired. Log out and log in again.";
    } else if (status) {
      error = err.response?.data?.error || `The server answered ${status} for ${RIDER_ORDERS_ENDPOINT}.`;
    }
    return { list: [], demo: false, error };
  }
}

const SERVER_STATUS = { picked_up: "Picked Up", delivered: "Delivered" };

export async function setOrderStatus(orderId, status) {
  const manifestId = manifestOf.get(String(orderId)) ?? orderId;
  await api.patch(`/rider/manifests/${manifestId}/status`, { status: SERVER_STATUS[status] || status });
}

/* ---------- icons ---------- */

const ic = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" };

export const IconUser = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...ic}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
  </svg>
);
export const IconPin = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...ic}>
    <path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
export const IconArrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...ic}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconBack = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...ic}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);
export const IconPhone = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...ic}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </svg>
);
export const IconBox = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...ic}>
    <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
    <path d="m3 8 9 5 9-5M12 13v8" />
  </svg>
);
export const IconCheck = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...ic} strokeWidth={3}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

/* ---------- top bar ---------- */

function Logo() {
  return (
    <svg viewBox="0 0 40 58" aria-hidden="true">
      <circle cx="20" cy="5" r="4.5" fill="#8f0000" />
      <polygon points="8,26 32,26 20,56" fill="#f5d08f" />
      <path d="M5 26 C2 9 13 5 20 5 C27 5 38 9 35 26 Z" fill="#fff8ec" />
      <circle cx="14" cy="17" r="1.8" fill="#3b0d0d" />
      <circle cx="26" cy="17" r="1.8" fill="#3b0d0d" />
      <path d="M17 20.5 Q20 24 23 20.5" fill="none" stroke="#3b0d0d" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* home bar: logo + "Rider" tag + avatar (tap the avatar to log out) */
export function HomeBar() {
  const navigate = useNavigate();
  const name = getUser()?.name || "Rider";
  const logout = () => {
    clearSession();
    navigate("/login");
  };
  return (
    <header className="rbar">
      <div className="rbar__in">
        <span className="rbar__brand">
          <Logo />
          AccessEats
        </span>
        <span className="pill-tag">Rider</span>
        <button type="button" className="rbar__avatar" onClick={logout} aria-label={`${name}. Log out`} title="Log out">
          {name.charAt(0).toUpperCase()}
        </button>
      </div>
    </header>
  );
}

/* details bar: back arrow + title + status tag */
export function BackBar({ title, status }) {
  const navigate = useNavigate();
  return (
    <header className="rbar">
      <div className="rbar__in">
        <button type="button" className="rbar__back" onClick={() => navigate("/rider")} aria-label="Back to deliveries">
          <IconBack />
        </button>
        <h1 className="rbar__title">{title}</h1>
        <span className={`pill-tag ${STATUS_CLASS[status] || ""}`}>{STATUS_LABEL[status]}</span>
      </div>
    </header>
  );
}