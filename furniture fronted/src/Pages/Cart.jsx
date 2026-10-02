import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StoreHeader } from "./Home";
import "./Cart.css";

function readCart() {
  try {
    const items = JSON.parse(localStorage.getItem("cartData") || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function itemName(item) {
  return item.productName || item.name || "Product";
}

function itemPrice(item) {
  return Number(item.productPrice ?? Number(item.priceMinor || 0) / 100) || 0;
}

const formatPrice = price => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(price);

export default function Cart() {
  const [items, setItems] = useState(readCart);
  const itemCount = items.reduce((total, item) => total + (Number(item.pQuantity) || 1), 0);
  const subtotal = items.reduce((total, item) => total + itemPrice(item) * (Number(item.pQuantity) || 1), 0);

  useEffect(() => {
    document.title = "Shopping bag | Skanvi";
    const syncCart = () => setItems(readCart());
    window.addEventListener("cartDataUpdated", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("cartDataUpdated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const saveItems = next => {
    localStorage.setItem("cartData", JSON.stringify(next));
    setItems(next);
    window.dispatchEvent(new Event("cartDataUpdated"));
  };
  const changeQuantity = (itemIndex, change) => saveItems(items.map((item, index) => index === itemIndex
    ? { ...item, pQuantity: (Number(item.pQuantity) || 1) + change }
    : item).filter(item => item.pQuantity === undefined || Number(item.pQuantity) > 0));

  return <main className="new-in-page cart-page">
    <StoreHeader variant="paper" />
    <div className="cart-page__shell">
      <nav className="new-in-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Shopping bag</span></nav>
      <header className="cart-page__heading"><div><p className="new-in-hero__eyebrow">Your order</p><h1>Shopping bag <span>({itemCount})</span></h1></div><Link to="/neuheiten?category=furniture">Continue shopping <span aria-hidden="true">→</span></Link></header>

      {items.length === 0 ? <section className="cart-page__empty"><p>Your bag is empty.</p><Link to="/neuheiten?category=furniture">Explore furniture <span aria-hidden="true">→</span></Link></section> : <div className="cart-page__layout">
        <section className="cart-page__items" aria-label="Items in your shopping bag">
          {items.map((item, index) => {
            const name = itemName(item);
            const image = item.productImage || item.image;
            const quantity = Number(item.pQuantity) || 1;
            return <article className="cart-page-item" key={`${item.id}-${index}`}>
              <Link className="cart-page-item__image" to={`/produkt/${item.slug}`} aria-label={`View ${name}`}>{image && <img src={image} alt={name} />}</Link>
              <div className="cart-page-item__details"><Link className="cart-page-item__name" to={`/produkt/${item.slug}`}>{name}</Link>
                {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                <strong>{formatPrice(itemPrice(item))}</strong>
                <div className="cart-page-item__quantity"><button type="button" aria-label={`Decrease ${name} quantity`} disabled={quantity <= 1} onClick={() => changeQuantity(index, -1)}>−</button><span>{quantity}</span><button type="button" aria-label={`Increase ${name} quantity`} onClick={() => changeQuantity(index, 1)}>+</button></div>
              </div>
              <button className="cart-page-item__remove" type="button" aria-label={`Remove ${name}`} onClick={() => saveItems(items.filter((_, itemNumber) => itemNumber !== index))}>×</button>
            </article>;
          })}
        </section>

        <aside className="cart-page-summary" aria-labelledby="cart-summary-title">
          <h2 id="cart-summary-title">Order summary</h2>
          <p><span>Items</span><span>{itemCount}</span></p>
          <p><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p>
          <small>Shipping and any applicable charges are calculated at checkout.</small>
          <Link to="/checkout">Checkout <span aria-hidden="true">→</span></Link>
        </aside>
      </div>}
    </div>
  </main>;
}
