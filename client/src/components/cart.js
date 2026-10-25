import { useEffect, useState } from "react";

const KEY = "accesseats_cart";
const EVENT = "cart:update";

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function save(cart) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function addToCart(item) {
  const cart = getCart();
  const found = cart.find((c) => c.id === item.id);
  if (found) found.qty += 1;
  else
    cart.push({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      qty: 1,
    });
  save(cart);
}

export function cartCount() {
  return getCart().reduce((n, c) => n + (c.qty || 0), 0);
}

export function subscribeCart(cb) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/* ---- used by the Cart page ---- */

export function updateQuantity(id, quantity) {
  if (quantity < 1) return;
  save(getCart().map((c) => (c.id === id ? { ...c, qty: quantity } : c)));
}

export function removeFromCart(id) {
  save(getCart().filter((c) => c.id !== id));
}

export function clearCart() {
  save([]);
}

/* hook: re-renders when the cart changes. Items come back with `quantity`
   (mapped from the stored `qty`) so Cart.jsx can use either name. */
export function useCart() {
  const read = () => getCart().map((c) => ({ ...c, quantity: c.qty || 0 }));
  const [cart, setCart] = useState(read);

  useEffect(() => {
    setCart(read());
    return subscribeCart(() => setCart(read()));
  }, []);

  return { cart, updateQuantity, removeFromCart, clearCart };
}