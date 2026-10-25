import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BackBar,
  IconBox,
  IconCheck,
  IconPhone,
  loadRiderOrders,
  setOrderStatus,
} from "./riderKit";

const STEPS = [
  { key: "assigned", label: "Assigned" },
  { key: "picked_up", label: "Picked Up" },
  { key: "delivered", label: "Delivered" },
];

const nowTime = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

function Stepper({ status }) {
  const at = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="steps" style={{ listStyle: "none", margin: 0 }} aria-label="Delivery progress">
      {STEPS.map((s, i) => {
        const state = i < at || status === "delivered" ? "is-done" : i === at ? "is-now" : "";
        return [
          i > 0 && <li key={`l${i}`} className={`step__line${i <= at ? " is-done" : ""}`} aria-hidden="true" />,
          <li key={s.key} className={`step ${state}`} aria-current={i === at ? "step" : undefined}>
            <span className="step__dot">{state === "is-done" ? <IconCheck /> : i + 1}</span>
            {s.label}
          </li>,
        ];
      })}
    </ol>
  );
}

export default function RiderOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(undefined); // undefined = loading, null = not found
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    loadRiderOrders().then(({ list }) => {
      if (alive) setOrder(list.find((o) => String(o.id) === String(id)) || null);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  if (order === undefined || order === null) {
    return (
      <div className="rider">
        <BackBar title={`Order #${id}`} status="assigned" />
        <main className="rcol">
          <p className="rmsg" role="status">
            {order === undefined ? "Loading order…" : "We couldn't find this order. Go back and pick one from your list."}
          </p>
        </main>
      </div>
    );
  }

  const next = order.status === "assigned" ? "picked_up" : order.status === "picked_up" ? "delivered" : null;

  const advance = async () => {
    if (!next || busy) return;
    setBusy(true);
    setError("");
    try {
      await setOrderStatus(order.id, next);
    } catch (err) {
      /* no backend yet: keep going so you can see the flow; real failures are logged */
      console.warn("AccessEats: status update failed", err);
      if (err.response) {
        setError(err.response?.data?.message || "We couldn't update this order. Please try again.");
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    if (next === "delivered") {
      navigate("/rider", { replace: true });
      return;
    }
    setOrder((o) => ({ ...o, status: next, pickedAt: nowTime() }));
  };

  return (
    <div className="rider">
      <BackBar title={`Order #${order.id}`} status={order.status} />

      <main className="rcol rcol--details">
        <Stepper status={order.status} />

        <section className="card" aria-labelledby="c-label">
          <p className="label" id="c-label">Customer contact</p>
          <div className="contact">
            <span className="contact__av" aria-hidden="true">
              {order.customer.charAt(0).toUpperCase()}
            </span>
            <div className="contact__who">
              <b>{order.customer}</b>
              <span>{order.phone || "No phone number"}</span>
            </div>
            {order.phone && (
              <a className="callbtn" href={`tel:${order.phone.replace(/\s/g, "")}`} aria-label={`Call ${order.customer}`}>
                <IconPhone /> Call
              </a>
            )}
          </div>
        </section>

        <section className="card addr" aria-labelledby="a-label">
          <p className="label" id="a-label">Delivery address</p>
          <b>{order.street}</b>
          {order.city && <span>{order.city}</span>}
        </section>

        <section className="card" aria-labelledby="n-label">
          <p className="label" id="n-label">Special instructions</p>
          <p className="note">{order.note || "No special instructions."}</p>
        </section>
      </main>

      {next && (
        <div className="actionbar">
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <p className="actionbar__hint" role="status">
              {order.status === "assigned"
                ? "Pick up from AccessEats kitchen, then head out."
                : `Picked up at ${order.pickedAt || "—"} · on the way to the customer`}
            </p>
            {error && (
              <p className="alert-r" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="btn-maroon" onClick={advance} disabled={busy}>
              {order.status === "assigned" ? (
                <>
                  <IconBox /> Accept / Pick Up Order
                </>
              ) : (
                <>
                  <IconCheck /> Mark as Delivered
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}