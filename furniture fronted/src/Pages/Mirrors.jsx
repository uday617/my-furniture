import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StoreHeader } from "./Home";
import { readWishlist, toggleWishlist } from "../wishlist";
import "./NewIn.css";
import "./Mirrors.css";

const BATCH_SIZE = 48;
const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest first" },
  { value: "price-ascending", label: "Price: low to high" },
  { value: "price-descending", label: "Price: high to low" },
  { value: "name", label: "Name A–Z" },
];
const shapeOptions = [
  { label: "Round", category: "Runde Spiegel" },
  { label: "Oval", category: "Ovale Spiegel" },
  { label: "Square", category: "Quadratische Spiegel" },
  { label: "Rectangular", category: "Rechteckige Spiegel" },
];
const collectionOptions = [
  { label: "Wall mirrors", category: "Wandspiegel" },
  { label: "Bathroom mirrors", category: "Badezimmerspiegel" },
  { label: "Lighted mirrors", category: "Beleuchtete Spiegel" },
];
const colorNames = { "Weiß": "White", "Schwarz": "Black", "Silber": "Silver", "Natur": "Natural", "Walnuss": "Walnut", "Whitewash-Optik": "Whitewash" };
const emptyFilters = () => ({ colors: [], shapes: [], brands: [], collections: [], minPrice: "", maxPrice: "", availableOnly: false });
const mirrorTypes = [
  { label: "Round mirrors", category: "Runde Spiegel" },
  { label: "Rectangular mirrors", category: "Rechteckige Spiegel" },
  { label: "Organic & asymmetrical mirrors", category: "Ovale Spiegel" },
  { label: "Full-length mirrors", category: "__full_length__" },
  { label: "Illuminated mirrors", category: "Beleuchtete Spiegel" },
  { label: "Bathroom mirrors", category: "Badezimmerspiegel" },
];

function formatPrice(minor) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format((Number(minor) || 0) / 100);
}

function getImage(url) {
  if (!url) return "";
  try {
    const image = new URL(url);
    image.searchParams.set("w", "672");
    image.searchParams.set("q", "72");
    return image.toString();
  } catch {
    return url;
  }
}

function matchesType(product, category) {
  if (!category) return true;
  if (category === "__full_length__") {
    const dimensions = String(product.dimensions || "").replace(/&times;/g, "×").match(/\d+(?:[.,]\d+)?/g)?.map(Number) || [];
    return dimensions.length > 0 && Math.max(...dimensions) >= 150;
  }
  return product.categories?.includes(category);
}

function matchesFilters(product, filters) {
  const price = (Number(product.priceMinor) || 0) / 100;
  const productColors = (product.colors || []).map(color => colorNames[color] || color);
  return (!filters.colors.length || filters.colors.some(color => productColors.includes(color)))
    && (!filters.shapes.length || filters.shapes.some(category => product.categories?.includes(category)))
    && (!filters.brands.length || filters.brands.includes(product.brand || ""))
    && (!filters.collections.length || filters.collections.some(category => product.categories?.includes(category)))
    && (!filters.minPrice || price >= Number(filters.minPrice))
    && (!filters.maxPrice || price <= Number(filters.maxPrice))
    && (!filters.availableOnly || product.inStock);
}

function swatchColor(color) {
  const value = color.toLowerCase();
  if (value.includes("white")) return "#fff";
  if (value.includes("black")) return "#242424";
  if (value.includes("gold") || value.includes("yellow")) return "#e9a900";
  if (value.includes("silver") || value.includes("grey") || value.includes("gray")) return "#adb4b1";
  if (value.includes("brown") || value.includes("walnut")) return "#7d5a42";
  return "#b6a58a";
}

function HeartIcon({ filled }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill={filled ? "currentColor" : "none"}><path d="M20.8 8.7c0 4.1-8.8 10-8.8 10s-8.8-5.9-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" /></svg>;
}

export default function Mirrors() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("relevance");
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [openSections, setOpenSections] = useState({ colors: true, shapes: true });
  const [filters, setFilters] = useState(emptyFilters);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [favorites, setFavorites] = useState(() => new Set(readWishlist().map(product => String(product.id))));

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiUrl}/catalog/products`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Unable to load the mirror catalogue.");
        return response.json();
      })
      .then(data => {
        setProducts(Array.isArray(data) ? data.filter(product => product.categories?.includes("Spiegel")) : []);
        setStatus("ready");
      })
      .catch(error => {
        if (error.name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => { document.title = "Mirrors | Skanvi"; }, []);

  useEffect(() => {
    if (!filterOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [filterOpen]);

  const colors = useMemo(() => [...new Set(products.flatMap(product => (product.colors || []).map(color => colorNames[color] || color)))].sort(), [products]);
  const brands = useMemo(() => [...new Set(products.map(product => product.brand).filter(Boolean))].sort(), [products]);

  const visibleProducts = useMemo(() => {
    let result = products.filter(product => matchesType(product, type) && matchesFilters(product, filters));
    if (sort === "price-ascending") result = [...result].sort((a, b) => a.priceMinor - b.priceMinor);
    if (sort === "price-descending") result = [...result].sort((a, b) => b.priceMinor - a.priceMinor);
    if (sort === "name") result = [...result].sort((a, b) => a.name.localeCompare(b.name, "en"));
    return result;
  }, [products, type, filters, sort]);

  const setDraftValue = (key, value) => setDraftFilters(current => ({ ...current, [key]: value }));
  const toggleDraftValue = (key, value) => setDraftFilters(current => {
    const values = current[key];
    return { ...current, [key]: values.includes(value) ? values.filter(item => item !== value) : [...values, value] };
  });
  const filterCount = filters.colors.length + filters.shapes.length + filters.brands.length + filters.collections.length
    + Number(Boolean(filters.minPrice || filters.maxPrice || filters.availableOnly));
  const hasActiveFilters = filterCount > 0 || Boolean(type);
  const clearToolbarFilters = () => {
    setType("");
    setFilters(emptyFilters());
    setDraftFilters(emptyFilters());
    setVisibleCount(BATCH_SIZE);
    setFilterOpen(false);
  };

  const renderAccordion = (id, title, children) => <section className="mirror-filter-section" key={id}>
    <button type="button" className="mirror-filter-section__trigger" aria-expanded={Boolean(openSections[id])} onClick={() => setOpenSections(current => ({ ...current, [id]: !current[id] }))}>
      <span>{title}</span><span aria-hidden="true" className="mirror-filter-section__chevron">{openSections[id] ? "⌃" : "⌄"}</span>
    </button>
    {openSections[id] && <div className="mirror-filter-section__content">{children}</div>}
  </section>;

  const toggleFavorite = product => {
    const wishlist = toggleWishlist(product);
    setFavorites(new Set(wishlist.map(item => String(item.id))));
  };

  return <main className="new-in-page mirrors-page">
    <StoreHeader variant="paper" />
    <section className="mirror-intro" aria-labelledby="mirrors-title">
      <nav className="new-in-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Mirrors</span></nav>
      <h1 id="mirrors-title">Mirrors</h1>
      <p>Designer, wall and bathroom mirrors in carefully selected shapes, colours and sizes.</p>
      <nav className="mirror-types" aria-label="Mirror types">
        {mirrorTypes.map(item => <button key={item.label} type="button" className={type === item.category ? "is-active" : ""} aria-pressed={type === item.category} onClick={() => { setType(current => current === item.category ? "" : item.category); setVisibleCount(BATCH_SIZE); }}>{item.label}<span aria-hidden="true">↗</span></button>)}
      </nav>
    </section>

    <section className="mirror-listing" aria-label="Mirror products">
      <div className="new-in-toolbar">
        <button type="button" className={`new-in-toolbar__filter ${filterOpen ? "is-open" : ""}`} aria-expanded={filterOpen} onClick={() => { setDraftFilters(filters); setFilterOpen(true); }}><span>Filter{filterCount > 0 ? ` (${filterCount})` : ""}</span><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6h16M7 12h10m-7 6h4" /></svg></button>
        <div className="mirror-sort">
          <button type="button" className="mirror-sort__trigger" aria-haspopup="listbox" aria-expanded={sortOpen} onClick={() => setSortOpen(open => !open)} onKeyDown={event => { if (event.key === "Escape") setSortOpen(false); }}>
            <span>{sortOptions.find(option => option.value === sort)?.label}</span><span aria-hidden="true" className="mirror-sort__chevron">⌄</span>
          </button>
          {sortOpen && <div className="mirror-sort__menu" role="listbox" aria-label="Sort products">{sortOptions.map(option => <button key={option.value} type="button" role="option" aria-selected={sort === option.value} className={sort === option.value ? "is-selected" : ""} onClick={() => { setSort(option.value); setVisibleCount(BATCH_SIZE); setSortOpen(false); }}>{option.label}</button>)}</div>}
        </div>
        <div className="new-in-toolbar__results"><span className="new-in-toolbar__count">{status === "ready" ? `${visibleProducts.length} products` : "Mirrors"}</span>{hasActiveFilters && <button type="button" className="new-in-toolbar__clear" onClick={clearToolbarFilters}>Clear all</button>}</div>
      </div>
      {filterOpen && <div className="mirror-filter-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setFilterOpen(false); }}>
        <aside className="mirror-filter-drawer" role="dialog" aria-modal="true" aria-labelledby="mirror-filter-title">
          <header className="mirror-filter-drawer__header"><div><p>Refine selection</p><h2 id="mirror-filter-title">Filter</h2></div><button type="button" className="mirror-filter-drawer__close" aria-label="Close filters" onClick={() => setFilterOpen(false)}>×</button></header>
          <div className="mirror-filter-drawer__body">
            {renderAccordion("colors", "Colors", <div className="mirror-filter-options">{colors.map(color => <label className="mirror-filter-option mirror-filter-option--color" key={color}><input type="checkbox" checked={draftFilters.colors.includes(color)} onChange={() => toggleDraftValue("colors", color)} /><span className="mirror-filter-option__swatch" style={{ "--filter-swatch": swatchColor(color) }} /><span className="mirror-filter-option__label">{color}</span><small>{products.filter(product => (product.colors || []).map(item => colorNames[item] || item).includes(color)).length}</small></label>)}</div>)}
            {renderAccordion("shapes", "Shape", <div className="mirror-filter-options">{shapeOptions.map(option => <label className="mirror-filter-option mirror-filter-option--text" key={option.category}><input type="checkbox" checked={draftFilters.shapes.includes(option.category)} onChange={() => toggleDraftValue("shapes", option.category)} /><span className="mirror-filter-option__label">{option.label}</span><small>{products.filter(product => product.categories?.includes(option.category)).length}</small></label>)}</div>)}
            {renderAccordion("brands", "Brands", <div className="mirror-filter-options">{brands.map(brand => <label className="mirror-filter-option mirror-filter-option--text" key={brand}><input type="checkbox" checked={draftFilters.brands.includes(brand)} onChange={() => toggleDraftValue("brands", brand)} /><span className="mirror-filter-option__label">{brand}</span><small>{products.filter(product => product.brand === brand).length}</small></label>)}</div>)}
            {renderAccordion("collections", "Collection", <div className="mirror-filter-options">{collectionOptions.map(option => <label className="mirror-filter-option mirror-filter-option--text" key={option.category}><input type="checkbox" checked={draftFilters.collections.includes(option.category)} onChange={() => toggleDraftValue("collections", option.category)} /><span className="mirror-filter-option__label">{option.label}</span><small>{products.filter(product => product.categories?.includes(option.category)).length}</small></label>)}</div>)}
            {renderAccordion("price", "Price", <div className="mirror-filter-price"><label><span className="sr-only">Minimum price in euros</span><input type="number" min="0" inputMode="decimal" placeholder="Min" value={draftFilters.minPrice} onChange={event => setDraftValue("minPrice", event.target.value)} /></label><label><span className="sr-only">Maximum price in euros</span><input type="number" min="0" inputMode="decimal" placeholder="Max" value={draftFilters.maxPrice} onChange={event => setDraftValue("maxPrice", event.target.value)} /></label></div>)}
            {renderAccordion("availability", "Availability", <label className="mirror-filter-option mirror-filter-option--availability"><input type="checkbox" checked={draftFilters.availableOnly} onChange={event => setDraftValue("availableOnly", event.target.checked)} /><span>Only available products</span></label>)}
          </div>
          <footer className="mirror-filter-drawer__footer"><button type="button" className="mirror-filter-drawer__clear" onClick={() => setDraftFilters(emptyFilters())}>Clear all</button><button type="button" className="mirror-filter-drawer__apply" onClick={() => { setFilters(draftFilters); setVisibleCount(BATCH_SIZE); setFilterOpen(false); }}>Show selection <span>({products.filter(product => matchesType(product, type) && matchesFilters(product, draftFilters)).length})</span></button></footer>
        </aside>
      </div>}
      {status === "loading" && <div className="new-in-grid" aria-label="Loading mirrors">{Array.from({ length: 8 }, (_, i) => <div className="new-in-skeleton" key={i}><div /><span /><i /></div>)}</div>}
      {status === "error" && <p className="new-in-message" role="alert">We couldn’t load the mirrors. Please refresh and try again.</p>}
      {status === "ready" && visibleProducts.length === 0 && <p className="new-in-message">No mirrors match this filter.</p>}
      {status === "ready" && visibleProducts.length > 0 && <>
        <div className="new-in-grid">
          {visibleProducts.slice(0, visibleCount).map((product, index) => {
            const image = getImage(product.image);
            const hoverImage = getImage(product.hoverImage);
            const favorite = favorites.has(String(product.id));
            const productPath = `/produkt/${product.slug}`;
            return <article className={`new-in-card${hoverImage ? " has-hover-image" : ""}`} key={product.id}>
              <div className="new-in-card__media">
                <button className={`new-in-card__favorite${favorite ? " is-favorite" : ""}`} type="button" aria-label={`${favorite ? "Remove" : "Add"} ${product.name} ${favorite ? "from" : "to"} favourites`} aria-pressed={favorite} onClick={() => toggleFavorite(product)}><HeartIcon filled={favorite} /></button>
                <Link className="new-in-card__image-link" to={productPath} aria-label={`View ${product.name}`}>
                  {image && <img className="new-in-card__image new-in-card__image--primary" src={image} alt={product.name} loading={index < 8 ? "eager" : "lazy"} fetchPriority={index < 4 ? "high" : undefined} decoding="async" />}
                  {hoverImage && <img className="new-in-card__image new-in-card__image--hover" src={hoverImage} alt="" loading="lazy" decoding="async" />}
                </Link>
                {!product.inStock && <span className="new-in-card__stock">Sold out</span>}
              </div>
              <div className="new-in-card__body">
                <div className="new-in-card__meta">
                  {product.colors?.length ? <div className="new-in-card__colors" aria-label="Available colours">{product.colors.slice(0, 4).map((color, colorIndex) => <span className="new-in-card__swatch" key={`${product.id}-${colorIndex}`} title={color} aria-label={color} style={{ "--swatch-color": color.toLowerCase().includes("black") ? "#282824" : color.toLowerCase().includes("gold") ? "#b59a58" : color.toLowerCase().includes("white") ? "#f7f5ed" : "#9da3a2" }} />)}</div> : <span />}
                  {product.dimensions && <span className="new-in-card__dimensions">{product.dimensions.replace(/&times;/g, "×").replace(/&nbsp;/g, " ")}</span>}
                </div>
                <div className="new-in-card__title-row"><h3><Link to={productPath}>{product.name}</Link></h3><span>{formatPrice(product.priceMinor)}</span></div>
              </div>
            </article>;
          })}
        </div>
        <div className="new-in-load-more">{visibleCount < visibleProducts.length ? <><p>Showing {Math.min(visibleCount, visibleProducts.length)} of {visibleProducts.length} products</p><button type="button" onClick={() => setVisibleCount(count => count + BATCH_SIZE)}>Load more mirrors <span aria-hidden="true">↓</span></button></> : <p className="new-in-load-more__complete">You’ve seen all {visibleProducts.length} mirrors</p>}</div>
      </>}
    </section>
  </main>;
}
