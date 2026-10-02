import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { readWishlist, toggleWishlist } from "../wishlist";
import "./Home.css";

const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const categories = [
  { title: "Storage", image: "/images/skanvi-category-storage.png" },
  { title: "Beds", image: "/images/skanvi-category-bed.png" },
  { title: "Dining sets", image: "/images/skanvi-category-dining.png" },
  { title: "Lounge chairs", image: "/images/skanvi-category-lounge-chair.png" },
  { title: "Sofas", image: "/images/skanvi-category-sofa.png" },
  { title: "Chairs", image: "/images/skanvi-category-chair.png" },
];

const featuredProductSlugs = [
  "wiggle-2912-201",
  "villeroy-boch-1906-wollteppich-wilhelmine-gruen",
  "villeroy-boch-1812-wollteppich-organic-shape-kari-natur-gruen-106292-125x200-organic-shape",
  "kabinett-linien-15632-208",
  "polly-esszimmerstuhl-19934-130",
  "lenox-runder-esstisch-61292-152",
  "runder-esstisch-gilda-61901-130",
  "amalfi-ecksofa",
  "cielo-3-sitz-sofa",
  "lindoen-tischleuchte-61811-111",
  "flauschiger-sessel-61825-150",
  "stjaernoe-oval-esstisch-61939-107",
];
const featuredProductOverrides = {
  "wiggle-2912-201": { displayName: "Wiggle", featuredImage: "https://media.skanvidata.com/DK/2912-201/02-2912_201_wiggle_decor_5.jpg?w=576&q=72", displayPriceMinor: 64800, displayDimensions: "93 × 133 cm" },
  "villeroy-boch-1906-wollteppich-wilhelmine-gruen": {
    displayName: "Villeroy & Boch 1906 Wool Rug Wilhelmine Cream",
    featuredImage: "https://media.skanvidata.com/HH/QoAUeY082jMCp0a4uaguayp0QZA%3D.jpg?w=576&q=72",
    displayPriceMinor: 9990,
    featuredVariantLabel: "5 colours",
    featuredColors: [{ name: "Cream", value: "#eee9dc" }, { name: "Gray", value: "#a8aaa5" }, { name: "Beige", value: "#c9b99e" }, { name: "Green", value: "#71836d" }, { name: "Copper brown", value: "#a16a50" }],
  },
  "villeroy-boch-1812-wollteppich-organic-shape-kari-natur-gruen-106292-125x200-organic-shape": {
    displayName: "Villeroy & Boch 1812 Organic Shape Wool Rug Kari Natural Cream",
    featuredImage: "https://media.skanvidata.com/HH/64tWqAJH551yt1Yb9RJUWuBQjvk%3D.jpg?w=576&q=72",
    displayPriceMinor: 17990,
    displayDimensions: "200 × 125 × 1.7 cm",
    featuredVariantLabel: "4 colours",
    featuredColors: [{ name: "Cream", value: "#eee9dc" }, { name: "Gray", value: "#b9b8b2" }, { name: "Beige", value: "#c9b99e" }, { name: "Green", value: "#71836d" }],
  },
  "kabinett-linien-15632-208": { displayName: "Cabinet Lines", featuredImage: "https://media.skanvidata.com/VD/15632-208_11_m.jpg?w=576&q=72", displayPriceMinor: 36900, displayDimensions: "40 × 70 × 80 cm", featuredVariantLabel: "2 sizes" },
  "polly-esszimmerstuhl-19934-130": { displayName: "Polly Dining Chair", featuredImage: "https://media.skanvidata.com/VD/61824-104_1_m.jpg?w=576&q=72", displayPriceMinor: 15900, displayDimensions: "50 × 45 × 80 cm" },
  "lenox-runder-esstisch-61292-152": { displayName: "Lenox Round Dining Table", featuredImage: "https://media.skanvidata.com/VD/61292-152_11_m.jpg?w=576&q=72", displayPriceMinor: 79900, displayDimensions: "75 cm" },
  "runder-esstisch-gilda-61901-130": { displayName: "Gilda Round Dining Table", featuredImage: "https://media.skanvidata.com/VD/61901-130_11_m.jpg?w=576&q=72", displayPriceMinor: 54900, displayDimensions: "75 cm" },
  "amalfi-ecksofa": { displayName: "Amalfi Corner Sofa", featuredImage: "https://media.skanvidata.com/VD/61995-108_11_m.jpg?w=576&q=72", displayPriceMinor: 195900 },
  "cielo-3-sitz-sofa": { displayName: "Cielo 3-Seater Sofa", featuredImage: "https://media.skanvidata.com/VD/61233-102_1_m.jpg?w=576&q=72", displayPriceMinor: 181900 },
  "lindoen-tischleuchte-61811-111": { displayName: "Lindön Table Lamp", featuredImage: "https://media.skanvidata.com/VD/61811-111_1_m.jpg?w=576&q=72", displayPriceMinor: 26900, displayDimensions: "48 cm", featuredSoldOut: true },
  "flauschiger-sessel-61825-150": { displayName: "Fluffy Armchair", featuredImage: "https://media.skanvidata.com/VD/s_15020-477__10.jpg?w=576&q=72", displayPriceMinor: 29900, displayDimensions: "64 × 66 × 70 cm" },
  "stjaernoe-oval-esstisch-61939-107": { displayName: "Stjärnö Oval Dining Table", featuredImage: "https://media.skanvidata.com/VD/61939-107_1_m.jpg?w=576&q=72", displayPriceMinor: 88900, displayDimensions: "200 × 90 × 76 cm", featuredSoldOut: true },
};

const featuredColorNames = { "grün": "Green", grau: "Gray", creme: "Cream", beige: "Beige", natur: "Natural", weiß: "White", braun: "Brown", gelb: "Yellow", sand: "Sand", hellgrau: "Light gray", schwarz: "Black", burgundisch: "Burgundy" };
const featuredColorValues = { green: "#71836d", gray: "#a8aaa5", cream: "#eee9dc", beige: "#c9b99e", natural: "#bba984", white: "#f1eee5", brown: "#80614c", yellow: "#d2b74f", sand: "#c8b8a1", "light gray": "#b7b9b7", black: "#282824", burgundy: "#75424a" };

function featuredColor(color) {
  const name = featuredColorNames[String(color).toLocaleLowerCase()] || color;
  const value = featuredColorValues[String(name).toLocaleLowerCase()] || "#c7c2b7";
  return { name, value };
}

function productDimensions(product) {
  const dimensions = product.displayDimensions || product.dimensions || "";
  return dimensions && !dimensions.toLocaleLowerCase().startsWith("n.")
    ? dimensions.replace(/&times;/g, "×").replace(/&nbsp;/g, " ")
    : "";
}

const categoryPath = label => `/neuheiten?category=${label.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
const brandPath = brand => `/neuheiten?brand=${brand.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
const brandLogos = {
  "Deknudt Mirrors": "https://skanvi.com/partnerlogos/optimized/deknudt_mirrors_dark-192.webp",
  "Hanse Home": "https://skanvi.com/partnerlogos/optimized/hanse_home-192.webp",
  "Villeroy & Boch": "https://skanvi.com/partnerlogos/optimized/villeroy_und_boch-192.webp",
  Vind: "https://skanvi.com/partnerlogos/optimized/vind-192.webp",
};
let searchCatalogRequest;

function readCartItems() {
  try {
    const items = JSON.parse(localStorage.getItem("cartData") || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function cartItemPrice(item) {
  return Number(item.productPrice ?? Number(item.priceMinor || 0) / 100) || 0;
}

function formatCartPrice(price) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(price);
}

function loadSearchCatalog() {
  if (!searchCatalogRequest) {
    searchCatalogRequest = fetch(`${apiUrl}/catalog/products`)
      .then(response => {
        if (!response.ok) throw new Error("Unable to load product search.");
        return response.json();
      })
      .catch(error => {
        searchCatalogRequest = undefined;
        throw error;
      });
  }
  return searchCatalogRequest;
}

function normalizeSearchTerm(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("de");
}

function matchesSearch(product, query) {
  const searchableText = normalizeSearchTerm([
    product.name,
    product.brand,
    product.slug,
    ...(product.categories || []),
    ...(product.colors || []),
  ].join(" "));
  return normalizeSearchTerm(query).split(/\s+/).filter(Boolean).every(term => searchableText.includes(term));
}

export function StoreHeader({ variant = "hero" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuHandoffPending, setMenuHandoffPending] = useState(() => {
    try {
      return sessionStorage.getItem("openFurnitureMenuOnHome") === "true";
    } catch { return false; }
  });
  const [menuHandoffLayout, setMenuHandoffLayout] = useState(menuHandoffPending);
  const [productsOpen, setProductsOpen] = useState(menuHandoffPending);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState(readCartItems);
  const roomsOpen = location.pathname === "/" && new URLSearchParams(location.search).get("menu") === "rooms";
  const [activeRoom, setActiveRoom] = useState("Dining room");
  const [activeProductCategory, setActiveProductCategory] = useState(null);
  const [activeSubcategory, setActiveSubcategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchProducts, setSearchProducts] = useState([]);
  const [searchStatus, setSearchStatus] = useState("idle");
  useEffect(() => {
    if (!menuHandoffPending) return;
    try { sessionStorage.removeItem("openFurnitureMenuOnHome"); } catch { /* Storage is optional. */ }
  }, [menuHandoffPending]);
  useEffect(() => {
    if (!productsOpen && !roomsOpen && !cartOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [productsOpen, roomsOpen, cartOpen]);
  useEffect(() => {
    setMenuOpen(false);
    setCartOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const syncCart = () => setCartItems(readCartItems());
    window.addEventListener("cartDataUpdated", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("cartDataUpdated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchProducts([]);
      setSearchStatus("idle");
      return undefined;
    }

    let cancelled = false;
    setSearchStatus("loading");
    const timer = window.setTimeout(() => {
      loadSearchCatalog()
        .then(data => {
          if (!cancelled) {
            setSearchProducts(Array.isArray(data) ? data.filter(product => matchesSearch(product, query)) : []);
            setSearchStatus("ready");
          }
        })
        .catch(() => {
          if (!cancelled) setSearchStatus("error");
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);
  useEffect(() => {
    if (!productsOpen) {
      setActiveProductCategory(null);
      setActiveSubcategory(null);
    }
  }, [productsOpen]);
  const cart = cartItems.reduce((total, item) => total + (Number(item.pQuantity) || 1), 0);
  const cartSubtotal = cartItems.reduce((total, item) => total + cartItemPrice(item) * (Number(item.pQuantity) || 1), 0);
  const changeCartQuantity = (itemIndex, change) => {
    const next = cartItems.map((item, index) => index === itemIndex
      ? { ...item, pQuantity: (Number(item.pQuantity) || 1) + change }
      : item).filter(item => item.pQuantity === undefined || Number(item.pQuantity) > 0);
    localStorage.setItem("cartData", JSON.stringify(next));
    setCartItems(next);
    window.dispatchEvent(new Event("cartDataUpdated"));
  };
  const removeCartItem = itemIndex => {
    const next = cartItems.filter((_, index) => index !== itemIndex);
    localStorage.setItem("cartData", JSON.stringify(next));
    setCartItems(next);
    window.dispatchEvent(new Event("cartDataUpdated"));
  };
  const searchSuggestions = searchProducts.slice(0, 6);
  const submitSearch = event => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setSearchFocused(false);
    navigate(`/neuheiten?q=${encodeURIComponent(query)}`);
  };
  const links = [["Furniture", "/shop"], ["Rooms", "/shop"], ["Designers", "/designer"], ["New in", "/neuheiten"]];
  const productLinks = ["Furniture", "Rugs", "Lighting", "Mirrors", "Accessories"];
  const roomLinks = ["Living room", "Dining room", "Bedroom", "Kids’ room", "Hallway", "Kitchen", "Bathroom", "Outdoor"];
  const roomCategories = { "Living room": "sofas", "Dining room": "dining-sets", Bedroom: "beds", "Kids’ room": "beds", Hallway: "runners", Kitchen: "dining-tables", Bathroom: "mirrors", Outdoor: "outdoor-rugs" };
  const subcategories = {
    Furniture: ["Sofas", "Lounge chairs", "Chairs", "Tables", "Dining sets", "Storage", "Beds", "Stools & benches"],
    Rugs: ["All rugs", "Living room rugs", "Outdoor rugs", "Runners"],
    Lighting: ["Pendant lights", "Table lamps", "Floor lamps", "Wall lights"],
    Mirrors: ["Wall mirrors", "Full-length mirrors", "Decorative mirrors"],
    Accessories: ["Vases", "Cushions", "Throws", "Decorative objects"],
  };
  const detailCategories = {
    Sofas: ["2-Seater Sofas", "3-Seater Sofas", "4-Seater Sofas", "Corner Sofas", "Sleeper Sofas", "Modular Sofas"],
    "Lounge chairs": ["Armchairs", "Recliners", "Accent chairs"],
    Chairs: ["Dining chairs", "Bar stools", "Office chairs"],
    Tables: ["Dining tables", "Coffee tables", "Side tables", "Console tables"],
    "Dining sets": ["4-seat dining sets", "6-seat dining sets", "8-seat dining sets"],
    Storage: ["Sideboards", "Cabinets", "Shelving", "TV units"],
    Beds: ["Single beds", "Double beds", "Bed frames"],
    "Stools & benches": ["Bar stools", "Footstools", "Benches"],
    "All rugs": ["Living room rugs", "Bedroom rugs", "Outdoor rugs"],
    "Living room rugs": ["Small rugs", "Medium rugs", "Large rugs"],
    "Outdoor rugs": ["Balcony rugs", "Patio rugs"],
    Runners: ["Hallway runners", "Kitchen runners"],
    "Pendant lights": ["Single pendants", "Multi-light pendants"],
    "Table lamps": ["Bedside lamps", "Desk lamps"],
    "Floor lamps": ["Reading lamps", "Arc lamps"],
    "Wall lights": ["Indoor wall lights", "Outdoor wall lights"],
    "Wall mirrors": ["Round mirrors", "Rectangular mirrors"],
    "Full-length mirrors": ["Wall-mounted mirrors", "Standing mirrors"],
    "Decorative mirrors": ["Round mirrors", "Organic mirrors"],
    Vases: ["Small vases", "Large vases"],
    Cushions: ["Cushion covers", "Filled cushions"],
    Throws: ["Wool throws", "Cotton throws"],
    "Decorative objects": ["Bowls", "Candlesticks", "Planters"],
  };
  const openFurnitureMenu = ({ goHome = false } = {}) => {
    setProductsOpen(true);
    if (goHome && variant === "paper" && location.pathname !== "/") {
      try {
        sessionStorage.setItem("openFurnitureMenuOnHome", "true");
        navigate("/");
      } catch { /* Keep the current page open if the menu state cannot be carried over. */ }
    } else if (roomsOpen) {
      navigate("/");
    }
  };
  const closeFurnitureMenu = () => {
    setProductsOpen(false);
    setMenuHandoffPending(false);
    setMenuHandoffLayout(false);
    try { sessionStorage.removeItem("openFurnitureMenuOnHome"); } catch { /* Storage is optional. */ }
  };
  useEffect(() => {
    if (!menuHandoffPending) return undefined;
    const handleFirstPointerMove = event => {
      setMenuHandoffPending(false);
      const target = event.target;
      if (!target?.closest?.(".home-mega-menu, .home-mega-submenu, .home-mega-tertiary, .home-nav__furniture")) {
        setProductsOpen(false);
      }
    };
    document.addEventListener("pointermove", handleFirstPointerMove, { once: true });
    return () => document.removeEventListener("pointermove", handleFirstPointerMove);
  }, [menuHandoffPending]);

  return <>
    <div className="home-announcement">Thoughtful furniture, made for everyday living</div>
    <header className={`home-header home-header--${variant} ${productsOpen ? "is-mega-open" : ""} ${menuHandoffLayout ? "is-menu-handoff" : ""} ${roomsOpen ? "is-rooms-open" : ""} ${searchFocused ? "is-search-open" : ""} ${cartOpen ? "is-cart-open" : ""}`} onMouseLeave={() => { if (!menuHandoffPending) closeFurnitureMenu(); }} onKeyDown={event => { if (event.key === "Escape") { setSearchFocused(false); setCartOpen(false); if (event.target.matches(".home-search input")) event.target.blur(); closeFurnitureMenu(); if (roomsOpen) navigate("/"); setMenuOpen(false); } }}>
      <div className="home-header__inner">
        <Link className="home-wordmark" to="/">Skanvi<span>.</span></Link>
        <form className="home-search" role="search" onSubmit={submitSearch} onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) window.setTimeout(() => setSearchFocused(false), 120);
        }}>
          <span aria-hidden="true">⌕</span>
          <input type="text" placeholder="Search furniture" aria-label="Search products" autoComplete="off" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} onFocus={() => setSearchFocused(true)} />
          {searchQuery.trim() && searchFocused && <div className="home-search__panel" onMouseDown={event => event.preventDefault()}>
            <div className="home-search__panel-heading"><span>Live search</span>{searchStatus === "ready" && <span>{searchProducts.length} results</span>}</div>
            {searchStatus === "loading" && <p className="home-search__message">Searching products…</p>}
            {searchStatus === "error" && <p className="home-search__message">Search is temporarily unavailable.</p>}
            {searchStatus === "ready" && searchProducts.length === 0 && <p className="home-search__message">No products match “{searchQuery.trim()}”.</p>}
            {searchStatus === "ready" && searchSuggestions.length > 0 && <div className="home-search__results">
              {searchSuggestions.map(product => <Link className="home-search__result" to={`/produkt/${product.slug}`} key={product.id} onClick={() => setSearchFocused(false)}>
                <img src={product.image} alt="" loading="lazy" />
                <span className="home-search__result-copy"><strong>{product.name}</strong><small>{product.categories?.[0] || product.brand || "Home"}</small></span>
                <span className="home-search__result-price">{new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format((Number(product.priceMinor) || 0) / 100)}</span>
              </Link>)}
            </div>}
            {searchStatus === "ready" && searchProducts.length > 0 && <button className="home-search__all" type="submit">View all {searchProducts.length} results <span aria-hidden="true">→</span></button>}
          </div>}
        </form>
        <nav className={`home-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          {links.map(([label, href]) => label === "Furniture"
            ? <button key={label} className="home-nav__furniture" type="button" aria-haspopup="true" aria-expanded={productsOpen} onMouseEnter={() => openFurnitureMenu({ goHome: true })} onFocus={() => openFurnitureMenu({ goHome: true })} onClick={() => { if (window.matchMedia("(max-width: 650px)").matches && productsOpen) { closeFurnitureMenu(); return; } openFurnitureMenu({ goHome: true }); }}>{label}</button>
            : label === "Rooms"
              ? <button key={label} className="home-nav__rooms" type="button" aria-expanded={roomsOpen} onClick={() => { setMenuOpen(false); setProductsOpen(false); navigate(roomsOpen ? "/" : "/?menu=rooms", { replace: roomsOpen }); }}>{label}</button>
              : <Link key={label} to={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}
          {productsOpen && <div className="home-mobile-subnav">{productLinks.map(label => <Link key={label} to={categoryPath(label)} onClick={() => { setMenuOpen(false); setProductsOpen(false); }}>{label}</Link>)}</div>}
        </nav>
        <div className="home-header__actions">
          <Link className="home-icon-link home-account" to="/account" aria-label="Your account"><img src="/images/user.svg" alt="" /></Link>
          <Link className="home-icon-link home-wishlist" to="/wishlist" aria-label="Wishlist"><span aria-hidden="true">♡</span></Link>
          <button className="home-icon-link home-cart" type="button" aria-label={`Shopping bag, ${cart} items`} aria-haspopup="dialog" aria-expanded={cartOpen} onClick={() => { setCartItems(readCartItems()); setSearchFocused(false); closeFurnitureMenu(); setMenuOpen(false); setCartOpen(true); }}><img src="/images/cart.svg" alt="" /><span className="home-cart__count" aria-hidden="true">{cart}</span></button>
          <button className="home-menu-toggle" type="button" aria-expanded={menuOpen} aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
        </div>
        <div className="home-shipping">Free delivery on orders over $250</div>
      </div>
      {cartOpen && <>
        <button className="home-cart-backdrop" type="button" aria-label="Close shopping bag" onClick={() => setCartOpen(false)} />
        <aside className="home-cart-drawer" role="dialog" aria-modal="true" aria-labelledby="home-cart-title">
          <header className="home-cart-drawer__header"><div><p>Your order</p><h2 id="home-cart-title">Shopping bag <span>({cart})</span></h2></div><button type="button" aria-label="Close shopping bag" onClick={() => setCartOpen(false)}>×</button></header>
          <div className="home-cart-drawer__items">
            {cartItems.length === 0 && <div className="home-cart-drawer__empty"><p>Your bag is empty.</p><Link to="/neuheiten?category=furniture" onClick={() => setCartOpen(false)}>Explore furniture <span aria-hidden="true">→</span></Link></div>}
            {cartItems.map((item, index) => {
              const name = item.productName || item.name || "Product";
              const image = item.productImage || item.image;
              const quantity = Number(item.pQuantity) || 1;
              return <article className="home-cart-item" key={`${item.id}-${index}`}>
                {image && <Link to={`/produkt/${item.slug}`} onClick={() => setCartOpen(false)}><img src={image} alt="" /></Link>}
                <div className="home-cart-item__details"><Link to={`/produkt/${item.slug}`} onClick={() => setCartOpen(false)}>{name}</Link><span>{formatCartPrice(cartItemPrice(item))}</span>
                  <div className="home-cart-item__quantity"><button type="button" aria-label={`Decrease ${name} quantity`} disabled={quantity <= 1} onClick={() => changeCartQuantity(index, -1)}>−</button><span>{quantity}</span><button type="button" aria-label={`Increase ${name} quantity`} onClick={() => changeCartQuantity(index, 1)}>+</button></div>
                </div>
                <button className="home-cart-item__remove" type="button" aria-label={`Remove ${name}`} onClick={() => removeCartItem(index)}>×</button>
              </article>;
            })}
          </div>
          {cartItems.length > 0 && <footer className="home-cart-drawer__footer"><p><span>Subtotal</span><strong>{formatCartPrice(cartSubtotal)}</strong></p><Link className="home-cart-drawer__view" to="/cart" onClick={() => setCartOpen(false)}>View bag</Link><Link className="home-cart-drawer__checkout" to="/checkout" onClick={() => setCartOpen(false)}>Checkout <span aria-hidden="true">→</span></Link></footer>}
        </aside>
      </>}
      {roomsOpen && <div className="home-room-menu" aria-label="Browse by room">{roomLinks.map(label => <Link className={`home-room-menu__item ${activeRoom === label ? "is-active" : ""}`} to={`/neuheiten?category=${roomCategories[label]}`} key={label} onMouseEnter={() => setActiveRoom(label)} onFocus={() => setActiveRoom(label)}>{label}</Link>)}</div>}
      {productsOpen && <>
        <button className="home-mega-backdrop" type="button" aria-label="Close furniture menu" onMouseEnter={() => { if (!menuHandoffPending) closeFurnitureMenu(); }} onClick={closeFurnitureMenu} />
        <div className="home-mega-menu" aria-label="Product categories"><p className="eyebrow">Products</p>{productLinks.map((label, index) => <Link className={`home-mega-menu__item ${activeProductCategory === label ? "is-active" : ""}`} to={categoryPath(label)} key={label} aria-expanded={activeProductCategory === label} onMouseEnter={() => { setActiveProductCategory(label); setActiveSubcategory(null); }} onFocus={() => { setActiveProductCategory(label); setActiveSubcategory(null); }} onClick={() => setProductsOpen(false)}><span className="home-mega-menu__icon" aria-hidden="true">{["▱", "◈", "♧", "✧", "◇"][index]}</span><span>{label}</span><span className="home-mega-menu__plus" aria-hidden="true">+</span></Link>)}</div>
        {activeProductCategory && <div className="home-mega-submenu" aria-label={`${activeProductCategory} categories`}><p className="eyebrow">{activeProductCategory}</p>{subcategories[activeProductCategory].map((label, index) => <Link className={`home-mega-submenu__item ${activeSubcategory === label ? "is-active" : ""}`} to={categoryPath(label)} key={label} aria-expanded={activeSubcategory === label} onMouseEnter={() => setActiveSubcategory(detailCategories[label] ? label : null)} onFocus={() => setActiveSubcategory(detailCategories[label] ? label : null)} onClick={() => setProductsOpen(false)}><span className="home-mega-submenu__icon" aria-hidden="true">{activeProductCategory === "Furniture" ? ["▱", "▱", "▱", "▦", "▦", "⬡", "▱", "⬡"][index] : ["◇", "◇", "◇", "◇"][index]}</span><span>{label}</span><span className="home-mega-menu__plus" aria-hidden="true">+</span></Link>)}</div>}
        {activeSubcategory && <div className="home-mega-tertiary" aria-label={`${activeSubcategory} types`}><p className="eyebrow">{activeSubcategory}</p>{detailCategories[activeSubcategory].map(label => <Link className="home-mega-tertiary__item" to={categoryPath(label)} key={label} onClick={() => setProductsOpen(false)}><span className="home-mega-tertiary__icon" aria-hidden="true">▱</span><span>{label}</span></Link>)}</div>}
      </>}
    </header>
  </>;
}

function Home() {
  const categoryStrip = useRef(null);
  const featuredStrip = useRef(null);
  const [brandNames, setBrandNames] = useState(["Deknudt Mirrors", "Elle Decoration", "Furniture Fashion", "Hanse Home", "Ted Baker", "Venture Home", "Vind", "Villeroy & Boch"]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [favorites, setFavorites] = useState(() => new Set(readWishlist().map(product => String(product.id))));
  const slideCategories = (direction) => categoryStrip.current?.scrollBy({ left: direction * categoryStrip.current.clientWidth * 0.75, behavior: "smooth" });
  const slideFeatured = direction => featuredStrip.current?.scrollBy({ left: direction * featuredStrip.current.clientWidth * 0.8, behavior: "smooth" });
  useEffect(() => {
    let active = true;
    loadSearchCatalog().then(catalog => {
      const brands = [...new Set(catalog.map(product => product.brand?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en"));
      const catalogBySlug = new Map(catalog.map(product => [product.slug, product]));
      const favourites = featuredProductSlugs.map(slug => {
        const product = catalogBySlug.get(slug);
        return product ? { ...product, ...featuredProductOverrides[slug] } : null;
      }).filter(Boolean);
      if (active && brands.length) setBrandNames(brands);
      if (active) setFeaturedProducts(favourites);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const refreshWishlist = () => setFavorites(new Set(readWishlist().map(product => String(product.id))));
    window.addEventListener("wishlistchange", refreshWishlist);
    return () => window.removeEventListener("wishlistchange", refreshWishlist);
  }, []);
  const toggleFeaturedFavorite = product => {
    const wishlist = toggleWishlist(product);
    setFavorites(new Set(wishlist.map(item => String(item.id))));
  };
  return <main className="store-home">
    <StoreHeader />
    <section className="home-hero">
      <img className="home-hero__photo" src="https://skanvi.com/video/skanvi-hero-desktop-poster.webp" alt="A warm, colourful kitchen and dining space" />
      <div className="home-hero__shade" />
      <div className="home-hero__copy"><p className="eyebrow">Skanvi living</p><h1>Rooms that<br />feel like you.</h1>
        <p className="home-hero__intro">Furniture, lighting and the small things that make a place feel like home.</p>
        <div className="home-hero__actions"><Link className="home-button home-button--cream" to="/spiegel">Shop mirrors <span aria-hidden="true">→</span></Link><Link className="home-button home-button--outline" to="/teppiche">Shop rugs <span aria-hidden="true">→</span></Link></div>
      </div>
      <div className="home-hero__caption"><span>Made for real homes</span><span>Explore the collection&nbsp; ↗</span></div>
    </section>

    <section className="home-categories home-section"><div className="home-section__heading"><div><p className="eyebrow">Start with a room</p><h2>What are you looking for?</h2></div><div className="home-category-controls"><button type="button" aria-label="Scroll categories left" onClick={() => slideCategories(-1)}>‹</button><button type="button" aria-label="Scroll categories right" onClick={() => slideCategories(1)}>›</button></div></div>
      <div className="home-category-row" ref={categoryStrip}>{categories.map(item => <Link className="home-category-card" to={categoryPath(item.title)} key={item.title}><div className="home-category-card__image"><img src={item.image} alt="" /></div><h3>{item.title}</h3></Link>)}</div>
    </section>

    <section className="home-inspiration">
      <Link className="home-editorial home-editorial--large" to={categoryPath("Sofas")}>
        <img src="/images/img-grid-1.jpg" alt="A relaxed living room with a soft neutral sofa" />
        <div><p className="eyebrow">Living room</p><h2>A softer place to land.</h2><span className="home-editorial__cta">Find your sofa <span aria-hidden="true">→</span></span></div>
      </Link>
      <div className="home-inspiration__stack">
        <Link className="home-editorial" to={categoryPath("Lounge chairs")}>
          <img src="/images/img-grid-2.jpg" alt="A quiet corner with a lounge chair" />
          <div><p className="eyebrow">Chairs</p><h2>Take a seat.</h2><span className="home-editorial__cta">Find your chair <span aria-hidden="true">→</span></span></div>
        </Link>
        <Link className="home-editorial" to={categoryPath("Dining sets")}>
          <img src="/images/img-grid-3.jpg" alt="Warm details for a lived-in home" />
          <div><p className="eyebrow">Around the table</p><h2>Room for one more.</h2><span className="home-editorial__cta">Shop dining <span aria-hidden="true">→</span></span></div>
        </Link>
      </div>
    </section>

    <section className="home-brands"><span>Picked from makers we trust</span><div className="home-brands__marquee" role="region" aria-label="Shop by brand"><div className="home-brands__track">{[false, true].map(duplicate => <div className="home-brands__group" key={duplicate ? "duplicate" : "primary"} aria-hidden={duplicate || undefined}>{brandNames.map(brand => <Link className="home-brands__link" to={brandPath(brand)} key={brand} aria-label={`Shop ${brand}`} tabIndex={duplicate ? -1 : undefined}>{brandLogos[brand] ? <img src={brandLogos[brand]} alt={brand} loading="lazy" /> : <span>{brand}</span>}</Link>)}</div>)}</div></div></section>

    <section className="home-featured home-section"><div className="home-section__heading"><div><p className="eyebrow">A few good things</p><h2>Our current favourites</h2><p className="home-section__sub">Furniture we keep coming back to.</p></div><div className="home-featured__actions"><Link className="home-text-link" to="/neuheiten">See all furniture <span aria-hidden="true">→</span></Link><div className="home-category-controls"><button type="button" aria-label="Scroll favourites left" onClick={() => slideFeatured(-1)}>‹</button><button type="button" aria-label="Scroll favourites right" onClick={() => slideFeatured(1)}>›</button></div></div></div>
      <div className="home-product-grid" ref={featuredStrip}>{featuredProducts.map((product, index) => {
        const isFavorite = favorites.has(String(product.id));
        const colors = product.featuredColors || (product.colors || []).slice(0, 4).map(featuredColor);
        const variantLabel = product.featuredVariantLabel || (product.colors?.length > 1 ? `${product.colors.length} colours` : "");
        const dimensions = productDimensions(product);
        return <article className="home-product-card" key={product.id}>
          <div className="home-product-card__image">
            <Link className="home-product-card__image-link" to={`/produkt/${product.slug}`} aria-label={`View ${product.displayName || product.name}`}><img src={product.featuredImage || product.image} alt={product.displayName || product.name} loading={index < 4 ? "eager" : "lazy"} decoding="async" /></Link>
            <button className={`home-product-card__favorite${isFavorite ? " is-favorite" : ""}`} type="button" aria-label={`${isFavorite ? "Remove" : "Add"} ${product.displayName || product.name} ${isFavorite ? "from" : "to"} favourites`} aria-pressed={isFavorite} onClick={() => toggleFeaturedFavorite(product)}><svg viewBox="0 0 24 24" aria-hidden="true" fill={isFavorite ? "currentColor" : "none"}><path d="M20.8 8.7c0 4.1-8.8 10-8.8 10s-8.8-5.9-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" /></svg></button>
            {product.featuredSoldOut && <span className="home-product-card__stock">Sold out</span>}
          </div>
          <div className="home-product-card__meta">{dimensions && <span>{dimensions}</span>}{(colors.length > 0 || variantLabel) && <div className="home-product-card__variants">{colors.map(color => <span className="home-product-card__swatch" key={color.name} title={color.name} aria-label={color.name} style={{ "--featured-swatch": color.value }} />)}{variantLabel && <span className="home-product-card__variant-label">{variantLabel}</span>}</div>}</div>
          <div className="home-product-card__details"><h3><Link to={`/produkt/${product.slug}`}>{product.displayName || product.name}</Link></h3><span>{formatCartPrice((Number(product.displayPriceMinor ?? product.priceMinor) || 0) / 100)}</span></div>
        </article>;
      })}</div>
    </section>

  </main>;
}

export default Home;
