const WISHLIST_KEY = "wishlistData";

export function readWishlist() {
  try {
    const stored = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function toggleWishlist(product) {
  const current = readWishlist();
  const exists = current.some(item => String(item.id) === String(product.id));
  const next = exists ? current.filter(item => String(item.id) !== String(product.id)) : [...current, product];
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("wishlistchange"));
  return next;
}