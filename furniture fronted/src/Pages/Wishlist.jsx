import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StoreHeader } from "./Home";
import { readWishlist, toggleWishlist } from "../wishlist";
import "./NewIn.css";

const formatPrice = minor => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format((Number(minor) || 0) / 100);

function HeartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M20.8 8.7c0 4.1-8.8 10-8.8 10s-8.8-5.9-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" /></svg>;
}

export default function Wishlist() {
  const [products, setProducts] = useState(readWishlist);

  useEffect(() => {
    document.title = "Wishlist | Skanvi";
    const refresh = () => setProducts(readWishlist());
    window.addEventListener("wishlistchange", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("wishlistchange", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const removeProduct = product => {
    setProducts(toggleWishlist(product));
  };

  return <main className="new-in-page">
    <StoreHeader variant="paper" />
    <section className="new-in-hero" aria-labelledby="wishlist-title">
      <p className="new-in-hero__eyebrow">Your account</p>
      <h1 id="wishlist-title">Wishlist</h1>
      <p>Your saved pieces, all in one place.</p>
    </section>
    <section className="new-in-page__listing" aria-label="Saved products">
      <div className="new-in-toolbar"><span>{products.length} saved {products.length === 1 ? "product" : "products"}</span><Link className="home-text-link" to="/neuheiten">Discover more <span aria-hidden="true">→</span></Link></div>
      {products.length === 0 ? <p className="new-in-message">Your wishlist is empty. Save a product to find it here.</p> : <div className="new-in-grid">
        {products.map(product => {
          const image = product.image || product.productImage;
          return <article className="new-in-card" key={product.id}>
            <div className="new-in-card__media">
              <button className="new-in-card__favorite is-favorite" type="button" aria-label={`Remove ${product.name} from wishlist`} onClick={() => removeProduct(product)}><HeartIcon /></button>
              <Link className="new-in-card__image-link" to={`/produkt/${product.slug}`} aria-label={`View ${product.name}`}>
                {image && <img className="new-in-card__image new-in-card__image--primary" src={image} alt={product.name} loading="lazy" decoding="async" />}
              </Link>
            </div>
            <div className="new-in-card__body">
              <div className="new-in-card__meta"><span>{product.categories?.[0] || product.brand || "Home"}</span></div>
              <div className="new-in-card__title-row"><h3><Link to={`/produkt/${product.slug}`}>{product.name}</Link></h3><span>{formatPrice(product.priceMinor)}</span></div>
            </div>
          </article>;
        })}
      </div>}
    </section>
  </main>;
}