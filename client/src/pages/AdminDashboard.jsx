import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import FoodIcon from "../components/FoodIcon";
import { clearSession, getUser } from "../components/auth";
import "./Admin.css";

/* ---------- helpers ---------- */

const money = (n) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const short = (n) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`);

const errText = (err) => err.response?.data?.error || err.response?.data?.message || err.message;

/* "/uploads/a.jpg" -> full URL on your API server */
const imgUrl = (u) => {
  if (!u) return "";
  if (/^(https?:|blob:|data:)/i.test(u)) return u;
  try {
    return new URL(u, api.defaults?.baseURL || window.location.origin).href;
  } catch {
    return u;
  }
};

const BAR_COLORS = ["#8f0000", "#f5d08f", "#8fb0ea", "#8fd18b", "#f6c4c4"];

/* ---------- icons ---------- */

const ic = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
const I = {
  grid: () => (
    <svg viewBox="0 0 24 24" {...ic}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  list: () => (
    <svg viewBox="0 0 24 24" {...ic}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  ),
  receipt: () => (
    <svg viewBox="0 0 24 24" {...ic}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  ),
  pencil: () => (
    <svg viewBox="0 0 24 24" {...ic}>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    </svg>
  ),
  trash: () => (
    <svg viewBox="0 0 24 24" {...ic}>
      <path d="M4 7h16M10 3h4M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </svg>
  ),
  plus: () => (
    <svg viewBox="0 0 24 24" {...ic}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  x: () => (
    <svg viewBox="0 0 24 24" {...ic} strokeWidth={3}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  camera: () => (
    <svg viewBox="0 0 24 24" {...ic}>
      <path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  ),
  chev: () => (
    <svg viewBox="0 0 24 24" {...ic} width="14" height="14">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  dollar: () => (
    <svg viewBox="0 0 24 24" {...ic}>
      <path d="M12 3v18M16.5 7.5C15.5 6.4 14 6 12 6c-2.5 0-4 1.2-4 3s1.5 2.6 4 3 4 1.2 4 3-1.5 3-4 3c-2 0-3.5-.5-4.5-1.6" />
    </svg>
  ),
  bag: () => (
    <svg viewBox="0 0 24 24" {...ic}>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  ),
  burger: () => (
    <svg viewBox="0 0 24 24" {...ic}>
      <path d="M4 11c0-4 3.6-6 8-6s8 2 8 6H4Z" />
      <path d="M3 14h18M5 17h14a1 1 0 0 1-1 2H6a1 1 0 0 1-1-2Z" />
    </svg>
  ),
};

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

function Pager({ page, total, limit, label, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = [];
  for (let p = start; p <= Math.min(pages, start + 4); p++) nums.push(p);
  return (
    <div className="pager">
      <span>
        Showing {from}–{to} of {total} {label}
      </span>
      {pages > 1 && (
        <div className="pager__nums">
          {nums.map((p) => (
            <button key={p} type="button" className={p === page ? "is-on" : ""} aria-current={p === page ? "page" : undefined} onClick={() => onPage(p)}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= dashboard ================= */

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [rev, setRev] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([api.get("/admin/stats"), api.get("/reports/category-revenue")])
      .then(([s, r]) => {
        if (!alive) return;
        setStats(s.data.data);
        setRev(
          (r.data.data || []).map((x) => ({
            name: x.category_name ?? x.category ?? x.name,
            orders: Number(x.total_orders ?? 0),
            revenue: Number(x.total_revenue ?? 0),
          }))
        );
      })
      .catch((err) => alive && setError(errText(err)));
    return () => {
      alive = false;
    };
  }, []);

  const max = Math.max(1, ...rev.map((r) => r.revenue));
  const totalOrders = rev.reduce((s, r) => s + r.orders, 0);
  const totalRevenue = rev.reduce((s, r) => s + r.revenue, 0);

  const delta = (v) =>
    v == null ? null : (
      <p className={`statc__delta${v < 0 ? " is-down" : ""}`}>
        {v < 0 ? "▼" : "▲"} {Math.abs(v).toFixed(1)}% vs last month
      </p>
    );

  return (
    <>
      {error && <p className="alert" role="alert">Couldn’t load the dashboard. {error}</p>}

      <div className="stats3">
        <div className="panel statc">
          <span className="statc__ico" style={{ background: "var(--tan)" }}><I.dollar /></span>
          <div>
            <p className="statc__label">Total Revenue</p>
            <p className="statc__value">${money(stats?.revenue)}</p>
            {delta(stats?.revenueChange)}
          </div>
        </div>
        <div className="panel statc">
          <span className="statc__ico" style={{ background: "var(--sky)" }}><I.bag /></span>
          <div>
            <p className="statc__label">Total Orders</p>
            <p className="statc__value">{(stats?.orders ?? 0).toLocaleString("en-US")}</p>
            {delta(stats?.ordersChange)}
          </div>
        </div>
        <div className="panel statc">
          <span className="statc__ico" style={{ background: "var(--pink)" }}><I.burger /></span>
          <div>
            <p className="statc__label">Active Menu Items</p>
            <p className="statc__value">{stats?.menuItems ?? 0}</p>
            <p className="statc__delta">{stats?.categories ?? 0} categories</p>
          </div>
        </div>
      </div>

      <div className="dash2">
        <section className="panel" aria-labelledby="chart-t">
          <h2 id="chart-t">Revenue by category</h2>
          <p className="panel__sub">Which food categories earn the most</p>
          {rev.length === 0 ? (
            <p className="msg">No sales yet.</p>
          ) : (
            <>
              <div className="chart" role="img" aria-label={rev.map((r) => `${r.name}: $${money(r.revenue)}`).join(", ")}>
                <div className="chart__grid" aria-hidden="true"><i /><i /><i /><i /></div>
                {rev.map((r, i) => (
                  <div className="bar" key={r.name}>
                    <span className="bar__val">{short(r.revenue)}</span>
                    <div className="bar__col" style={{ height: `${Math.max(3, (r.revenue / max) * 82)}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                  </div>
                ))}
              </div>
              <div className="bars-labels">
                {rev.map((r) => <span key={r.name}>{r.name}</span>)}
              </div>
            </>
          )}
        </section>

        <section className="panel" aria-labelledby="rep-t">
          <h2 id="rep-t">Category revenue report</h2>
          <p className="panel__sub">From view_revenue_per_category</p>
          <div className="tbl-card" style={{ marginTop: "1rem" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="num">Total orders</th>
                  <th className="num">Total revenue ($)</th>
                </tr>
              </thead>
              <tbody>
                {rev.map((r, i) => (
                  <tr key={r.name}>
                    <td><span className="dot" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />{r.name}</td>
                    <td className="num">{r.orders.toLocaleString("en-US")}</td>
                    <td className="num">{money(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>All categories</td>
                  <td className="num">{totalOrders.toLocaleString("en-US")}</td>
                  <td className="num">{money(totalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

/* ================= menu manager ================= */

const MAX_PHOTOS = 3;
const MAX_BYTES = 3 * 1024 * 1024;

function ProductModal({ product, categories, onClose, onSaved }) {
  const editing = Boolean(product);
  const [name, setName] = useState(product?.name || "");
  const [categoryId, setCategoryId] = useState(product?.category_id || categories[0]?.category_id || "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [stock, setStock] = useState(product?.stock ?? "");
  const [existing, setExisting] = useState(product?.images || []);
  const [removed, setRemoved] = useState([]);
  const [added, setAdded] = useState([]); // { file, preview }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const addedRef = useRef(added);
  addedRef.current = added;
  useEffect(() => () => addedRef.current.forEach((a) => URL.revokeObjectURL(a.preview)), []);

  const count = existing.length + added.length;

  const pick = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    setError("");
    const room = MAX_PHOTOS - count;
    const ok = [];
    for (const f of files) {
      if (!["image/jpeg", "image/png"].includes(f.type)) {
        setError("Photos must be JPG or PNG.");
        continue;
      }
      if (f.size > MAX_BYTES) {
        setError("Each photo must be under 3 MB.");
        continue;
      }
      ok.push(f);
    }
    if (ok.length > room) setError(`You can add up to ${MAX_PHOTOS} photos.`);
    setAdded((a) => [...a, ...ok.slice(0, room).map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  };

  const dropExisting = (img) => {
    setExisting((l) => l.filter((x) => x.id !== img.id));
    setRemoved((r) => [...r, img.id]);
  };

  const dropAdded = (a) => {
    URL.revokeObjectURL(a.preview);
    setAdded((l) => l.filter((x) => x !== a));
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!name.trim() || !categoryId || price === "" || stock === "") {
      setError("Please fill in the name, category, price and stock.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = { name: name.trim(), category_id: Number(categoryId), price: Number(price), stock: Number(stock) };
      let id = product?.product_id;
      if (editing) await api.put(`/admin/products/${id}`, body);
      else id = (await api.post("/admin/products", body)).data.productId;

      for (const imageId of removed) await api.delete(`/admin/products/${id}/images/${imageId}`);

      if (added.length) {
        const fd = new FormData();
        added.forEach((a) => fd.append("photos", a.file));
        await api.post(`/admin/products/${id}/images`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      onSaved();
    } catch (err) {
      setError(errText(err));
      setSaving(false);
    }
  };

  const tiles = [
    ...existing.map((img) => ({ key: `e${img.id}`, src: imgUrl(img.url), remove: () => dropExisting(img) })),
    ...added.map((a, i) => ({ key: `n${i}`, src: a.preview, remove: () => dropAdded(a) })),
  ];

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="pm-t">
        <h2 id="pm-t">{editing ? "Edit Product" : "Add New Product"}</h2>
        <p className="modal__sub">{editing ? "Update the details for this menu item." : "Fill in the details for the new menu item."}</p>

        {error && <p className="alert" role="alert">{error}</p>}

        <label className="fld">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </label>

        <label className="fld">
          <span>Category</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>{c.name}</option>
            ))}
          </select>
        </label>

        <div className="two">
          <label className="fld">
            <span>Price ($)</span>
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </label>
          <label className="fld">
            <span>Stock count</span>
            <input type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} required />
          </label>
        </div>

        <div className="photos__head fld__lab">
          <span>Photos</span>
          <small>{count} of {MAX_PHOTOS} added</small>
        </div>
        <div className="photos">
          {tiles.map((t, i) => (
            <div className="ph" key={t.key}>
              <img src={t.src} alt={`Product photo ${i + 1}`} />
              <button type="button" className="ph__x" onClick={t.remove} aria-label={`Remove photo ${i + 1}`}><I.x /></button>
              {i === 0 && <span className="ph__cover">Cover</span>}
            </div>
          ))}
          {count < MAX_PHOTOS && (
            <button type="button" className="ph ph--add" onClick={() => fileRef.current?.click()}>
              <I.camera />
              Add photo
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png" multiple hidden onChange={pick} />
        <p className="hint">Upload up to 3 photos (JPG or PNG). The first photo is shown on the menu.</p>

        <div className="modal__btns">
          <button type="button" className="btn-line" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-red" disabled={saving}>{saving ? "Saving…" : "Save Product"}</button>
        </div>
      </form>
    </div>
  );
}

function MenuManager() {
  const PAGE = 8;
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(null); // null | { product } (product null = add)
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api.get("/admin/products", { params: { page, limit: PAGE } }),
        api.get("/admin/categories"),
      ]);
      setData({ rows: p.data.data, total: p.data.total });
      setCategories(c.data.data);
      setError("");
    } catch (err) {
      setError(errText(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (p) => {
    if (!window.confirm(`Delete “${p.name}”?`)) return;
    try {
      await api.delete(`/admin/products/${p.product_id}`);
      if (data.rows.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (err) {
      setError(errText(err));
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button type="button" className="btn-red" onClick={() => setModal({ product: null })}>
          <I.plus /> Add New Product
        </button>
      </div>

      {error && <p className="alert" role="alert">{error}</p>}
      {loading && <p className="msg" role="status">Loading menu…</p>}

      {!loading && (
        <div className="tbl-card">
          <table className="tbl">
            <thead>
              <tr>
                <th>Product name</th>
                <th>Category</th>
                <th className="num">Price</th>
                <th className="num">Stock</th>
                <th className="num">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((p) => (
                <tr key={p.product_id}>
                  <td>
                    <div className="pname">
                      <span className="thumb">
                        {p.images?.[0] ? <img src={imgUrl(p.images[0].url)} alt="" /> : <div><FoodIcon name={p.name} category={p.category} /></div>}
                      </span>
                      {p.name}
                    </div>
                  </td>
                  <td>{p.category}</td>
                  <td className="num">${money(p.price)}</td>
                  <td className={`num${Number(p.stock) <= 5 ? " stock-low" : ""}`}>{p.stock}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="mini" onClick={() => setModal({ product: p })} aria-label={`Edit ${p.name}`}>
                        <I.pencil /> Edit
                      </button>
                      <button type="button" className="mini mini--icon" onClick={() => remove(p)} aria-label={`Delete ${p.name}`}>
                        <I.trash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr><td colSpan="5" className="msg">No products yet. Add your first one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} total={data.total} limit={PAGE} label="products" onPage={setPage} />

      {modal && (
        <ProductModal
          product={modal.product}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </>
  );
}

/* ================= orders ================= */

const STATUS_TABS = ["All", "Pending", "Preparing", "In Transit", "Delivered"];
const STATUS_OPTIONS = ["Pending", "Preparing", "In Transit", "Delivered"];

function AssignPopover({ riders, current, onConfirm, onClose }) {
  const [picked, setPicked] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const away = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  return (
    <div className="pop" ref={ref} role="dialog" aria-label="Assign a rider">
      <p className="pop__title">Assign a rider</p>
      {riders.length === 0 && <p className="hint">No riders yet. Register an account with the Rider type first.</p>}
      {riders.map((r) => {
        const free = r.is_online && !r.on_delivery;
        const state = !r.is_online ? "Offline" : r.on_delivery ? "On delivery" : "Available";
        return (
          <button
            key={r.rider_id}
            type="button"
            className={`pop__row${picked === r.rider_id ? " is-on" : ""}`}
            disabled={!free}
            aria-pressed={picked === r.rider_id}
            onClick={() => setPicked(r.rider_id)}
          >
            <span className={`dot ${free ? "dot--on" : "dot--off"}`} style={{ margin: 0 }} />
            {r.name}
            {current === r.rider_id ? " ✓" : ""}
            <small>{state}</small>
          </button>
        );
      })}
      <button type="button" className="btn-red" disabled={picked == null} onClick={() => onConfirm(picked)}>
        Confirm assignment
      </button>
    </div>
  );
}

function Orders() {
  const PAGE = 7;
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, counts: {} });
  const [riders, setRiders] = useState([]);
  const [openFor, setOpenFor] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [o, r] = await Promise.all([
        api.get("/admin/orders", { params: { page, limit: PAGE, status: status === "All" ? undefined : status } }),
        api.get("/admin/riders"),
      ]);
      setData({ rows: o.data.data, total: o.data.total, counts: o.data.counts || {} });
      setRiders(r.data.data);
      setError("");
    } catch (err) {
      setError(errText(err));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (id, next) => {
    try {
      await api.patch(`/admin/orders/${id}/status`, { status: next });
      load();
    } catch (err) {
      setError(errText(err));
    }
  };

  const assign = async (orderId, riderId) => {
    try {
      await api.post(`/admin/orders/${orderId}/assign`, { rider_id: riderId });
      setOpenFor(null);
      load();
    } catch (err) {
      setError(errText(err));
    }
  };

  const closePop = useCallback(() => setOpenFor(null), []);

  return (
    <>
      <div className="chips" role="group" aria-label="Filter orders by status">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            type="button"
            className={`fchip${s === status ? " is-on" : ""}`}
            aria-pressed={s === status}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {s} <b>{data.counts[s] ?? 0}</b>
          </button>
        ))}
      </div>

      {error && <p className="alert" role="alert">{error}</p>}
      {loading && <p className="msg" role="status">Loading orders…</p>}

      {!loading && (
        <div className="tbl-card tbl-card--open">
          <table className="tbl">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Delivery address</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th>Rider</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((o) => {
                const addr = [o.street, [o.city, o.pincode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
                const done = o.status === "Delivered";
                return (
                  <tr key={o.order_id}>
                    <td style={{ fontWeight: 800 }}>#{o.order_id}</td>
                    <td style={{ fontWeight: 800 }}>{o.customer_name}</td>
                    <td>{addr || "—"}</td>
                    <td className="num" style={{ fontWeight: 800, color: "var(--maroon)" }}>${money(o.total_amount)}</td>
                    <td>
                      <select
                        className={`st st--${String(o.status).replace(/\s/g, "-")}`}
                        value={o.status}
                        onChange={(e) => changeStatus(o.order_id, e.target.value)}
                        aria-label={`Status of order ${o.order_id}`}
                      >
                        {!STATUS_OPTIONS.includes(o.status) && <option value={o.status}>{o.status}</option>}
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="rider-cell">
                      {o.rider_name ? (
                        <button type="button" className="rider-chip" disabled={done} onClick={() => setOpenFor(o.order_id)} aria-label={`Rider ${o.rider_name}${done ? "" : ", change"}`}>
                          {o.rider_name} {!done && <I.chev />}
                        </button>
                      ) : (
                        <button type="button" className="btn-red" style={{ padding: "0.45em 1em", fontSize: "0.85rem" }} onClick={() => setOpenFor(o.order_id)}>
                          <I.plus /> Assign rider
                        </button>
                      )}
                      {openFor === o.order_id && (
                        <AssignPopover riders={riders} current={o.rider_id} onClose={closePop} onConfirm={(rid) => assign(o.order_id, rid)} />
                      )}
                    </td>
                  </tr>
                );
              })}
              {data.rows.length === 0 && (
                <tr><td colSpan="6" className="msg">No orders here yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} total={data.total} limit={PAGE} label="orders" onPage={setPage} />
    </>
  );
}

/* ================= shell ================= */

const TABS = [
  { id: "dashboard", label: "Dashboard", title: "Dashboard & Reports", icon: I.grid },
  { id: "menu", label: "Menu Manager", title: "Menu Manager", icon: I.list },
  { id: "orders", label: "Orders", title: "Orders Management", icon: I.receipt },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = getUser() || {};
  const [tab, setTab] = useState("dashboard");
  const current = TABS.find((t) => t.id === tab);

  const logout = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <div className="admin">
      <aside className="side">
        <div className="side__brand"><Logo /> AccessEats</div>
        <p className="side__sub">ADMIN PORTAL</p>

        <nav className="side__nav" aria-label="Admin">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={`side__link${t.id === tab ? " is-active" : ""}`} aria-current={t.id === tab ? "page" : undefined} onClick={() => setTab(t.id)}>
              <t.icon /> {t.label}
            </button>
          ))}
        </nav>

        <div className="side__foot">
          <div className="side__user">
            <span className="avatar">{(user.name || "A").charAt(0).toUpperCase()}</span>
            <div className="side__who">
              {user.name || "Admin"}
              <span>{user.email || ""}</span>
            </div>
          </div>
          <button type="button" className="side__logout" onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="main">
        <div className="main__head">
          <h1>{current.title}</h1>
          <span className="tag">Admin</span>
        </div>

        {tab === "dashboard" && <Dashboard />}
        {tab === "menu" && <MenuManager />}
        {tab === "orders" && <Orders />}
      </main>
    </div>
  );
}