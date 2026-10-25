import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../components/cart";
import PageShell from "../components/PageShell";
import FoodIcon from "../components/FoodIcon";
import EmptyCart from "./EmptyCart";
import "./Cart.css";

/* ---- updated to match backend /checkout endpoint ---- */
const ORDERS_ENDPOINT = "/orders/checkout";
const CURRENCY = "$";
const TAX_AND_DELIVERY = 3.5;

const money = (n) => `${CURRENCY}${n.toFixed(2)}`;

export default function Cart() {
  const navigate = useNavigate();
  const { cart = [], updateQuantity, removeFromCart, clearCart } = useCart();

  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (cart.length === 0) return <EmptyCart />;

  const subtotal = cart.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const total = subtotal + TAX_AND_DELIVERY;

  const setQty = (item, qty) => {
    if (qty < 1) return;
    updateQuantity?.(item.id, qty);
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await api.post(ORDERS_ENDPOINT, {
        // Matches backend expectations: items array with product id/name/price/quantity + addressId
        items: cart.map((i) => ({ 
          product_id: i.id, // mapped to match product_id in backend order_item
          id: i.id, 
          name: i.name, 
          price: i.price, 
          quantity: i.quantity 
        })),
        addressId: 1, // Default relational address ID for your database constraint
        address: address.trim(),
        note: note.trim(),
        total,
      });
      clearCart?.();
      navigate("/orders");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "We couldn't place your order. Check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Your Cart">
      <div className="cart">
        <section className="cart__list" aria-label="Items in your cart">
          <ul>
            {cart.map((item) => (
              <li key={item.id} className="line">
                <div className="line__art">
                  <div className="line__icon">
                    <FoodIcon name={item.name} category={item.category} />
                  </div>
                </div>

                <div className="line__info">
                  <h2 className="line__name">{item.name}</h2>
                  <p className="line__each">{money(Number(item.price))} each</p>
                </div>

                <div className="qty" role="group" aria-label={`Quantity of ${item.name}`}>
                  <button
                    type="button"
                    className="qty__btn"
                    aria-label={`Remove one ${item.name}`}
                    disabled={item.quantity <= 1}
                    onClick={() => setQty(item, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="qty__n" aria-live="polite">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    className="qty__btn"
                    aria-label={`Add one ${item.name}`}
                    onClick={() => setQty(item, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>

                <span className="line__total">{money(Number(item.price) * item.quantity)}</span>

                <button
                  type="button"
                  className="bin"
                  aria-label={`Remove ${item.name} from cart`}
                  onClick={() => removeFromCart?.(item.id)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16M10 3h4M6 7l1 13h10l1-13M10 11v6M14 11v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          <p className="cart__more">
            + Add more from the <Link to="/menu">menu</Link>
          </p>
        </section>

        <aside className="cart__side">
          <section className="sum" aria-label="Order summary">
            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>{money(subtotal)}</dd>
              </div>
              <div>
                <dt>Tax &amp; delivery</dt>
                <dd>{money(TAX_AND_DELIVERY)}</dd>
              </div>
            </dl>
            <div className="sum__total">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </section>

          <form className="deliver" onSubmit={placeOrder}>
            <h2>Delivery details</h2>

            {error && (
              <p className="deliver__alert" role="alert">
                {error}
              </p>
            )}

            <label htmlFor="address">Delivery address</label>
            <input
              id="address"
              type="text"
              autoComplete="street-address"
              placeholder="Street, city, zip code"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />

            <label htmlFor="note">Special delivery note</label>
            <textarea
              id="note"
              rows={3}
              placeholder="e.g. Please knock twice, ring is broken"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <button type="submit" className="place" disabled={loading}>
              {loading ? "Placing order…" : "Place order"}
            </button>
          </form>
        </aside>
      </div>
    </PageShell>
  );
}