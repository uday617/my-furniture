import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StoreHeader } from "./Home";
import "./ProductDetail.css";

const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const formatPrice = minor => new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
}).format((Number(minor) || 0) / 100);

function imageUrl(url) {
  if (!url) return "";
  try {
    const image = new URL(url);
    image.searchParams.set("w", "1400");
    image.searchParams.set("q", "80");
    return image.toString();
  } catch {
    return url;
  }
}

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading");
  const [activeImage, setActiveImage] = useState(0);
  const [hoverImage, setHoverImage] = useState(null);
  const [isGalleryHovered, setIsGalleryHovered] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState("12 cm");
  const [selectedColor, setSelectedColor] = useState("Natur");

  const images = useMemo(() => {
    if (!product) return [];
    const sources = product.gallery?.length ? product.gallery : [product.image, product.hoverImage];
    return [...new Set(sources.filter(Boolean))].map((source, index) => ({
      src: imageUrl(source),
      alt: index === 0 ? product.name : `${product.name} - view ${index + 1}`,
    }));
  }, [product]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiUrl}/catalog/products`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Unable to load this product.");
        return response.json();
      })
      .then(data => {
        const match = Array.isArray(data) ? data.find(item => item.slug === slug || item.aliases?.includes(slug) || String(item.id) === slug) : null;
        setProduct(match || null);
        setStatus(match ? "ready" : "not-found");
      })
      .catch(error => {
        if (error.name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    setActiveImage(0);
    setHoverImage(null);
    setIsGalleryHovered(false);
    setAdded(false);
    setSelectedSize("12 cm");
    setSelectedColor("Natur");
  }, [slug]);

  useEffect(() => {
    if (!isGalleryHovered || images.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setHoverImage(current => ((current ?? activeImage) + 1) % images.length);
    }, 1100);
    return () => window.clearInterval(timer);
  }, [activeImage, images.length, isGalleryHovered]);

  useEffect(() => {
    document.title = product ? `${product.name} | Skanvi` : "Product | Skanvi";
  }, [product]);

  const isYokoMirror = product?.slug === "yoko-bronze-by-annemie-vanzieleghem-2823-231";
  const isBetteCandle = product?.name === "Bette Kerzenleuchter";
  const dimensions = product?.dimensions?.replace(/&times;/g, "×").replace(/&nbsp;/g, " ");
  const featuredImageIndex = hoverImage ?? activeImage;
  const galleryImageIndexes = images.map((_, index) => index).filter(index => index !== featuredImageIndex);
  const displayedImageIndexes = images.length ? [featuredImageIndex, ...galleryImageIndexes] : [];

  const addToCart = () => {
    let cart = [];
    try {
      const stored = JSON.parse(localStorage.getItem("cartData") || "[]");
      if (Array.isArray(stored)) cart = stored;
    } catch { /* Start a fresh cart when stored data is invalid. */ }

    const existingIndex = cart.findIndex(item => String(item.id) === String(product.id)
      && (item.selectedSize || "") === (isBetteCandle ? selectedSize : "")
      && (item.selectedColor || "") === (isBetteCandle ? selectedColor : ""));
    if (existingIndex >= 0) {
      const currentQuantity = Number(cart[existingIndex].pQuantity) || 1;
      cart[existingIndex] = { ...cart[existingIndex], pQuantity: currentQuantity + quantity };
    } else {
      cart.push({
        ...product,
        productName: product.name,
        productPrice: Number(product.priceMinor) / 100,
        productImage: product.image,
        pQuantity: quantity,
        ...(isBetteCandle ? { selectedSize, selectedColor } : {}),
      });
    }

    localStorage.setItem("cartData", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartDataUpdated"));
    setAdded(true);
  };

  return <main className="product-detail-page">
    <StoreHeader variant="paper" />
    <div className="product-detail-shell">
      <nav className="product-detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link><span aria-hidden="true">/</span>
        <Link to={product?.categories?.includes("Spiegel") ? "/spiegel" : "/neuheiten"}>{product?.categories?.includes("Spiegel") ? "Mirrors" : "New In"}</Link>
        {product && <><span aria-hidden="true">/</span><span aria-current="page">{product.name}</span></>}
      </nav>

      {status === "loading" && <p className="product-detail-message" role="status">Loading product…</p>}
      {status === "error" && <p className="product-detail-message" role="alert">This product couldn’t be loaded. Please try again.</p>}
      {status === "not-found" && <section className="product-detail-message"><h1>Product not found</h1><Link to="/spiegel">Back to mirrors</Link></section>}

      {status === "ready" && product && <>
        <section className="product-detail-layout" aria-labelledby="product-title">
          <div className="product-detail-gallery" aria-label="Product images">
            {displayedImageIndexes.map((imageIndex, tileIndex) => <button
              key={tileIndex}
              type="button"
              className={`product-detail-gallery__item${tileIndex < 2 ? " is-featured" : ""}${imageIndex === activeImage ? " is-active" : ""}`}
              aria-label={`Show image ${imageIndex + 1}`}
              aria-pressed={activeImage === imageIndex}
              onMouseEnter={() => { if (tileIndex === 0) setIsGalleryHovered(true); }}
              onMouseLeave={() => { if (tileIndex === 0) { setIsGalleryHovered(false); setHoverImage(null); } }}
              onClick={() => { setActiveImage(imageIndex); setHoverImage(null); }}
            >
              <img src={images[imageIndex].src} alt={images[imageIndex].alt} loading={tileIndex < 2 ? "eager" : "lazy"} fetchPriority={tileIndex === 0 ? "high" : undefined} />
            </button>)}
          </div>

          <aside className="product-detail-info">
            <p className="product-detail-brand">{isBetteCandle ? "Accessoires" : product.brand || "Skanvi collection"}</p>
            <h1 id="product-title">{product.name}</h1>
            <p className="product-detail-price">{isBetteCandle ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(product.priceMinor / 100) : formatPrice(product.priceMinor)}</p>
            <p className={`product-detail-stock${product.inStock ? " is-available" : ""}`}>
              <span aria-hidden="true" />{product.inStock ? isBetteCandle ? "Auf Lager" : "In stock" : "Sold out"}
            </p>

            {isBetteCandle && <div className="product-detail-variants">
              <label className="product-detail-variant-size"><span>Größe</span><select value={selectedSize} onChange={event => setSelectedSize(event.target.value)} aria-label="Größe">
                {product.options.sizes.map(size => <option key={size} value={size}>{size}</option>)}
              </select></label>
              <fieldset className="product-detail-variant-colors"><legend>Farbe</legend><div>{product.options.colors.map(color => <button key={color} type="button" className={`product-detail-swatch product-detail-swatch--${color.toLowerCase()}${selectedColor === color ? " is-selected" : ""}`} aria-label={color} aria-pressed={selectedColor === color} title={color} onClick={() => setSelectedColor(color)} />)}</div></fieldset>
            </div>}

            <div className="product-detail-purchase">
              <div className="product-detail-quantity" aria-label="Quantity">
                <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))}>−</button>
                <span aria-live="polite">{quantity}</span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQuantity(value => value + 1)}>+</button>
              </div>
              <button className="product-detail-add" type="button" disabled={!product.inStock} onClick={addToCart}>
                {added ? isBetteCandle ? "Im Warenkorb" : "Added to bag" : isBetteCandle ? "In den Warenkorb" : "Add to bag"}
              </button>
            </div>
            {added && <p className="product-detail-added" role="status"><Link to="/cart">View your bag</Link></p>}

            {isBetteCandle && <div className="product-detail-payment"><span>Sicher und flexibel bezahlen mit</span><img src="https://skanvi.com/payments/paypal.svg" alt="PayPal" /><img src="https://skanvi.com/payments/klarna-wordmark.svg" alt="Klarna" /><span className="product-detail-payment__more">+5 Zahlungsarten</span></div>}

            <div className="product-detail-perks">
              {isYokoMirror && <p><span>Made in Belgium</span><span>7-year warranty</span></p>}
              <p><span>{isBetteCandle ? "Lieferzeit" : "Delivery"}</span><strong>{isBetteCandle ? "ca. 5–7 Werktage" : isYokoMirror ? "Approx. 5–7 working days" : "Delivery details at checkout"}</strong></p>
              <p><span>{isBetteCandle ? "Versand" : "Shipping"}</span><strong>{isBetteCandle ? "Ab 249 € kostenlos" : "Free over €249"}</strong></p>
              <p><span>{isBetteCandle ? "Rückgabe" : "Returns"}</span><strong>{isBetteCandle ? "30 Tage kostenlos" : "30 days, free returns"}</strong></p>
            </div>

            <details className="product-detail-accordion" open>
              <summary>{isBetteCandle ? "Produktbeschreibung" : "Product description"}</summary>
              <p>{product.name}{product.brand ? ` by ${product.brand}` : ""}{dimensions && dimensions !== "n. v." ? `, measuring ${dimensions}.` : "."}</p>
            </details>
            <details className="product-detail-accordion">
              <summary>{isBetteCandle ? "Produktdetails" : "Product details"}</summary>
              <dl>
                {product.sku && <><dt>SKU</dt><dd>{product.sku}</dd></>}
                {product.brand && <><dt>Brand</dt><dd>{product.brand}</dd></>}
                {dimensions && <><dt>Dimensions</dt><dd>{dimensions}</dd></>}
                {product.categories?.length > 0 && <><dt>Category</dt><dd>{product.categories.join(", ")}</dd></>}
              </dl>
            </details>
          </aside>
        </section>
      </>}
    </div>
  </main>;
}