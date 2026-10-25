import { useEffect, useState } from "react";
import api from "../services/api";
import PageShell from "../components/PageShell";
import EmptyCart from "./EmptyCart";
import "./Orders.css";

/* ---- updated to match backend /orders/my-orders endpoint ---- */
const ORDERS_ENDPOINT = "/orders/my-orders";
const CURRENCY = "$";
const TAX_AND_DELIVERY = 3.5;

const money = (n) => `${CURRENCY}${Number(n).toFixed(2)}`;

const when = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date}, ${time}`;
};

const prettyStatus = (s = "") =>
  String(s)
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const statusClass = (s) => {
  const k = prettyStatus(s).toLowerCase();
  if (k.includes("deliver")) return "is-delivered";
  if (k.includes("transit") || k.includes("way") || k.includes("picked")) return "is-transit";
  return "is-pending";
};

const normalize = (raw) => {
  const list = Array.isArray(raw) ? raw : raw?.orders || raw?.data || [];
  return list.map((o, i) => {
    const items = (o.items || o.order_items || []).map((it) => ({
      name: it.name ?? it.item_name ?? it.title ?? "Item",
      quantity: Number(it.quantity ?? it.qty ?? 1),
      price: Number(it.price ?? it.unit_price ?? 0),
    }));
    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    return {
      id: o.id ?? o.order_id ?? o._id ?? i,
      created_at: o.created_at ?? o.createdAt ?? o.date,
      status: o.status ?? "Pending",
      total: Number(o.total ?? o.total_amount ?? subtotal + TAX_AND_DELIVERY),
      address: o.address ?? o.delivery_address ?? "",
      note: o.note ?? o.delivery_note ?? o.special_note ?? "",
      items,
    };
  });
};

export default function Orders() {
  const [orders, setOrders] = useState(null); // null = still loading

  useEffect(() => {
    let alive = true;
    api
      .get(ORDERS_ENDPOINT)
      .then(({ data }) => alive && setOrders(normalize(data)))
      .catch((err) => {
        console.warn("AccessEats: couldn't load orders from", ORDERS_ENDPOINT, err);
        if (alive) setOrders([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (orders === null) {
    return (
      <PageShell title="My Orders">
        <p className="orders__msg" role="status">
          Loading your orders…
        </p>
      </PageShell>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyCart
        title="My Orders"
        heading="No orders yet"
        text="Once you place an order, it will show up here."
        buttonLabel="Browse Menu"
        buttonTo="/menu"
      />
    );
  }

  return (
    <PageShell title="My Orders">
      <ul className="orders">
        {orders.map((o) => (
          <li key={o.id}>
            <article className="order" aria-label={`Order ${o.id}`}>
              <header className="order__head">
                <h2 className="order__id">Order #{o.id}</h2>
                <time className="order__date" dateTime={o.created_at}>
                  {when(o.created_at)}
                </time>
                <span className="order__total">{money(o.total)}</span>
                <span className={`status ${statusClass(o.status)}`}>{prettyStatus(o.status)}</span>
              </header>

              <ul className="order__lines">
                {o.items.map((it, i) => (
                  <li key={i}>
                    <span>
                      {it.quantity} × {it.name}
                    </span>
                    <span>{money(it.price * it.quantity)}</span>
                  </li>
                ))}
                <li className="order__fee">
                  <span>Tax &amp; delivery</span>
                  <span>{money(TAX_AND_DELIVERY)}</span>
                </li>
              </ul>

              <div className="order__ship">
                <p>
                  <strong>Deliver to:</strong> {o.address || "—"}
                </p>
                <p>
                  <strong>Note:</strong> {o.note || "No note"}
                </p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}