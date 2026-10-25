import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { getUser } from "../components/auth";
import {
  AVAILABILITY_ENDPOINT,
  HomeBar,
  IconArrow,
  IconPin,
  IconUser,
  STATUS_CLASS,
  STATUS_LABEL,
  loadRiderOrders,
} from "./riderKit";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const today = () => {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/* remembers the toggle in this browser, so it stays put even before the backend supports it */
const ONLINE_KEY = "accesseats_rider_online";
const readOnline = () => {
  try {
    return localStorage.getItem(ONLINE_KEY) !== "off";
  } catch {
    return true;
  }
};

export default function RiderDashboard() {
  const name = (getUser()?.name || "Rider").split(" ")[0];
  const [orders, setOrders] = useState(null); // null = loading
  const [error, setError] = useState("");
  const [online, setOnline] = useState(readOnline);

  useEffect(() => {
    let alive = true;
    loadRiderOrders().then(({ list, error }) => {
      if (!alive) return;
      setOrders(list);
      setError(error);
    });
    return () => {
      alive = false;
    };
  }, []);

  const toggle = async () => {
    const next = !online;
    setOnline(next);
    try {
      localStorage.setItem(ONLINE_KEY, next ? "on" : "off");
    } catch {
      /* ignore */
    }
    try {
      await api.patch(AVAILABILITY_ENDPOINT, { available: next });
    } catch (err) {
      /* keep the choice even if the backend has no such route yet */
      console.warn("AccessEats: couldn't save availability on the server", err);
    }
  };

  const active = (orders || []).filter((o) => o.status !== "delivered");
  const deliveredToday = (orders || []).filter((o) => o.status === "delivered").length;

  return (
    <div className="rider">
      <HomeBar />

      <main className="rcol">
        <h1 className="greet">Hi, {name}! 👋</h1>
        <p className="greet__sub">{today()} · Ready to roll?</p>

        <section className="card card--soft avail" aria-labelledby="avail-title">
          <div>
            <h2 id="avail-title">Availability</h2>
            <p>
              {online
                ? "You're online. New orders can be assigned to you."
                : "You're offline. You won't get new orders."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={online}
            aria-labelledby="avail-title"
            className={`switch${online ? " is-on" : ""}`}
            onClick={toggle}
          >
            <span className="switch__knob" />
          </button>
        </section>

        <div className="stats">
          <div className="card stat">
            <b>{active.length}</b>
            <span>Active</span>
          </div>
          <div className="card stat">
            <b>{deliveredToday}</b>
            <span>Delivered today</span>
          </div>
        </div>

        <div className="sec">
          <h2>Active deliveries</h2>
          <span className="sec__count" aria-label={`${active.length} active`}>
            {active.length}
          </span>
        </div>

        {error && (
          <p className="alert-r" role="alert">
            Couldn't load your deliveries. {error}
          </p>
        )}

        {orders === null && (
          <p className="rmsg" role="status">
            Loading your deliveries…
          </p>
        )}

        {orders && !error && active.length === 0 && (
          <p className="rmsg">No active deliveries. Stay online and new orders will show up here.</p>
        )}

        <ul className="list">
          {active.map((o) => (
            <li key={o.id}>
              <article className="card" aria-label={`Order ${o.id}`}>
                <div className="dcard__head">
                  <h3>Order #{o.id}</h3>
                  <span className={`pill-tag ${STATUS_CLASS[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                </div>

                <p className="dcard__row dcard__row--name">
                  <IconUser />
                  {o.customer}
                </p>
                <p className="dcard__row">
                  <IconPin />
                  {o.short}
                </p>

                {o.note && (
                  <p className="note">
                    <b>Note:</b> {o.note}
                  </p>
                )}

                <Link to={`/rider/orders/${o.id}`} className="btn-tan" aria-label={`View details for order ${o.id}`}>
                  View details <IconArrow />
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}