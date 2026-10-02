import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { StoreHeader } from "./Home";
import { readWishlist, toggleWishlist } from "../wishlist";
import "./NewIn.css";

const CATALOG_BATCH_SIZE = 120;
const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest first" },
  { value: "price-ascending", label: "Price: low to high" },
  { value: "price-descending", label: "Price: high to low" },
  { value: "name", label: "Name A–Z" },
];
const shapeFilters = [
  { label: "Round", categories: ["Runde Spiegel", "Runde Teppiche"] },
  { label: "Oval", categories: ["Ovale Spiegel"] },
  { label: "Square", categories: ["Quadratische Spiegel"] },
  { label: "Rectangular", categories: ["Rechteckige Spiegel"] },
];

const categoryNames = {
  "möbel": "Furniture",
  "teppiche": "Rugs",
  "runde teppiche": "Round rugs",
  "kinderteppiche": "Kids’ rugs",
  "hochflorteppiche": "Shag rugs",
  "kurzflorteppiche": "Low-pile rugs",
  "flachgewebeteppiche": "Flatweave rugs",
  "wollteppiche": "Wool rugs",
  "juteteppiche": "Jute rugs",
  "stufenmatten": "Stair treads",
  "outdoor teppiche": "Outdoor rugs",
  "läufer": "Runners",
  "leuchten": "Lighting",
  "spiegel": "Mirrors",
  "wandspiegel": "Wall mirrors",
  "runde spiegel": "Round mirrors",
  "ovale spiegel": "Oval mirrors",
  "quadratische spiegel": "Square mirrors",
  "rechteckige spiegel": "Rectangular mirrors",
  "badezimmerspiegel": "Bathroom mirrors",
  "beleuchtete spiegel": "Illuminated mirrors",
  "accessoires": "Accessories",
  "dekoration": "Decor",
  "textilien": "Textiles",
  "decken": "Blankets",
  "vorhänge": "Curtains",
  "outdoor": "Outdoor",
  "3-sitzer sofas": "3-Seater Sofas",
  "2-sitzer sofas": "2-Seater Sofas",
  "ecksofas": "Corner Sofas",
  "esstisch-sets": "Dining sets",
  "runde esstisch-sets": "Round dining sets",
  "eckige esstisch-sets": "Square dining sets",
  "ovale esstisch-sets": "Oval dining sets",
  "esstische": "Dining tables",
  "tische": "Tables",
  "couchtische": "Coffee tables",
  "beistelltische": "Side tables",
  "stehleuchten": "Floor lamps",
  "wandleuchten": "Wall lights",
  "sessel": "Armchairs",
  "loungesessel": "Lounge chairs",
  "aufbewahrung": "Storage",
  "kommoden": "Dressers",
  "schränke": "Cabinets",
  "esszimmerstühle": "Dining chairs",
  "stühle": "Chairs",
  "regale": "Shelving",
  "betten": "Beds",
  "nachttische": "Nightstands",
  "barhocker": "Bar stools",
  "hocker & bänke": "Stools & benches",
  "sitzbänke": "Benches",
  "poufs": "Poufs",
  "boxspringbetten": "Box spring beds",
  "polsterbetten": "Upholstered beds",
  "schreibtische": "Desks",
};

const categoryFilters = {
  furniture: { title: "Furniture", terms: ["furniture"] },
  rugs: { title: "Rugs", terms: ["rug"] },
  lighting: { title: "Lighting", terms: ["lighting"] },
  mirrors: { title: "Mirrors", terms: ["mirror"] },
  accessories: { title: "Accessories", terms: ["accessories", "decor", "textiles"] },
  sofas: { title: "Sofas", terms: ["sofa"] },
  "2-seater-sofas": { title: "2-Seater Sofas", terms: ["2-seater sofa"] },
  "3-seater-sofas": { title: "3-Seater Sofas", terms: ["3-seater sofa"] },
  "4-seater-sofas": { title: "4-Seater Sofas", terms: ["4-seater sofa"] },
  "corner-sofas": { title: "Corner Sofas", terms: ["corner sofa"] },
  "sleeper-sofas": { title: "Sleeper Sofas", terms: ["sleeper sofa"] },
  "modular-sofas": { title: "Modular Sofas", terms: ["modular sofa"] },
  "lounge-chairs": { title: "Lounge chairs", terms: ["lounge chair", "armchair"] },
  armchairs: { title: "Armchairs", terms: ["armchair", "lounge chair"] },
  recliners: { title: "Recliners", terms: ["recliner", "armchair"] },
  "accent-chairs": { title: "Accent chairs", terms: ["accent chair", "armchair"] },
  chairs: { title: "Chairs", terms: ["chair", "bar stool"] },
  "dining-chairs": { title: "Dining chairs", terms: ["dining chair"] },
  "office-chairs": { title: "Office chairs", terms: ["office chair"] },
  tables: { title: "Tables", terms: ["table"] },
  "dining-tables": { title: "Dining tables", terms: ["dining table"] },
  "coffee-tables": { title: "Coffee tables", terms: ["coffee table"] },
  "side-tables": { title: "Side tables", terms: ["side table"] },
  "console-tables": { title: "Console tables", terms: ["console table"] },
  "dining-sets": { title: "Dining sets", terms: ["dining set"] },
  "4-seat-dining-sets": { title: "4-seat dining sets", terms: ["dining set"] },
  "6-seat-dining-sets": { title: "6-seat dining sets", terms: ["dining set"] },
  "8-seat-dining-sets": { title: "8-seat dining sets", terms: ["dining set"] },
  storage: { title: "Storage", terms: ["storage", "dresser", "cabinet", "shelving"] },
  sideboards: { title: "Sideboards", terms: ["sideboard", "dresser"] },
  cabinets: { title: "Cabinets", terms: ["cabinet"] },
  shelving: { title: "Shelving", terms: ["shelving"] },
  "tv-units": { title: "TV units", terms: ["tv units"] },
  beds: { title: "Beds", terms: ["bed"] },
  "single-beds": { title: "Single beds", terms: ["bed"] },
  "double-beds": { title: "Double beds", terms: ["bed"] },
  "bed-frames": { title: "Bed frames", terms: ["bed"] },
  "stools-and-benches": { title: "Stools & benches", terms: ["stool", "bench", "pouf"] },
  "bar-stools": { title: "Bar stools", terms: ["bar stool"] },
  footstools: { title: "Footstools", terms: ["stool", "pouf"] },
  benches: { title: "Benches", terms: ["bench"] },
  "all-rugs": { title: "Rugs", terms: ["rug"] },
  "living-room-rugs": { title: "Living room rugs", terms: ["rug"] },
  "outdoor-rugs": { title: "Outdoor rugs", terms: ["outdoor rug"] },
  runners: { title: "Runners", terms: ["runner"] },
  "small-rugs": { title: "Small rugs", terms: ["rug"] },
  "medium-rugs": { title: "Medium rugs", terms: ["rug"] },
  "large-rugs": { title: "Large rugs", terms: ["rug"] },
  "balcony-rugs": { title: "Balcony rugs", terms: ["outdoor rug"] },
  "patio-rugs": { title: "Patio rugs", terms: ["outdoor rug"] },
  "hallway-runners": { title: "Hallway runners", terms: ["runner"] },
  "kitchen-runners": { title: "Kitchen runners", terms: ["runner"] },
  "pendant-lights": { title: "Pendant lights", terms: ["lighting"] },
  "single-pendants": { title: "Single pendants", terms: ["lighting"] },
  "multi-light-pendants": { title: "Multi-light pendants", terms: ["lighting"] },
  "table-lamps": { title: "Table lamps", terms: ["lighting"] },
  "bedside-lamps": { title: "Bedside lamps", terms: ["lighting"] },
  "desk-lamps": { title: "Desk lamps", terms: ["lighting"] },
  "floor-lamps": { title: "Floor lamps", terms: ["floor lamp", "lighting"] },
  "reading-lamps": { title: "Reading lamps", terms: ["lighting"] },
  "arc-lamps": { title: "Arc lamps", terms: ["lighting"] },
  "wall-lights": { title: "Wall lights", terms: ["wall light", "lighting"] },
  "indoor-wall-lights": { title: "Indoor wall lights", terms: ["lighting"] },
  "outdoor-wall-lights": { title: "Outdoor wall lights", terms: ["lighting"] },
  "wall-mirrors": { title: "Wall mirrors", terms: ["wall mirror"] },
  "round-mirrors": { title: "Round mirrors", terms: ["round mirror", "mirror"] },
  "rectangular-mirrors": { title: "Rectangular mirrors", terms: ["rectangular mirror", "mirror"] },
  "full-length-mirrors": { title: "Full-length mirrors", terms: ["mirror"] },
  "decorative-mirrors": { title: "Decorative mirrors", terms: ["mirror"] },
  "organic-mirrors": { title: "Organic mirrors", terms: ["mirror"] },
  vases: { title: "Vases", terms: ["accessories", "decor"] },
  "small-vases": { title: "Small vases", terms: ["accessories", "decor"] },
  "large-vases": { title: "Large vases", terms: ["accessories", "decor"] },
  cushions: { title: "Cushions", terms: ["textiles", "accessories"] },
  "cushion-covers": { title: "Cushion covers", terms: ["textiles", "accessories"] },
  "filled-cushions": { title: "Filled cushions", terms: ["textiles", "accessories"] },
  throws: { title: "Throws", terms: ["textiles", "accessories"] },
  "wool-throws": { title: "Wool throws", terms: ["textiles", "accessories"] },
  "cotton-throws": { title: "Cotton throws", terms: ["textiles", "accessories"] },
  "decorative-objects": { title: "Decorative objects", terms: ["decor", "accessories"] },
  bowls: { title: "Bowls", terms: ["decor", "accessories"] },
  candlesticks: { title: "Candlesticks", terms: ["decor", "accessories"] },
  planters: { title: "Planters", terms: ["decor", "accessories"] },
};

function slugifyCategory(value) {
  return String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function slugifyDesigner(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function titleFromCategorySlug(value) {
  return value.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function matchesCategory(product, selectedCategory) {
  const filter = categoryFilters[slugifyCategory(selectedCategory)];
  const productCategories = (product.categories || []).map(value => categoryNames[value.toLocaleLowerCase()] || value).map(value => value.toLocaleLowerCase());
  if (filter) return filter.terms.some(term => productCategories.some(value => value.includes(term)));
  return productCategories.includes(selectedCategory.toLocaleLowerCase());
}

const colorNames = {
  "weiß": "White", weiss: "White", grau: "Grey", schwarz: "Black", blau: "Blue",
  grün: "Green", gruen: "Green", rot: "Red", gelb: "Yellow", braun: "Brown",
  beige: "Beige", gold: "Gold", silber: "Silver", rosa: "Pink", mokka: "Mocha",
  natur: "Natural", elfenbein: "Ivory", offwhite: "Off-white", bunt: "Multicolour",
};

const swatches = {
  white: "#f7f5ed", grey: "#9da3a2", black: "#282824", blue: "#667f9e",
  green: "#72856a", red: "#a64f45", yellow: "#d2b74f", brown: "#80614c",
  beige: "#d6c7ae", gold: "#b59a58", silver: "#b7b9b7", pink: "#d9aab4",
  mocha: "#806d5d", natural: "#bba984", ivory: "#efe8d6", "off-white": "#f1eee5",
};

const formatPrice = minor => new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
}).format((Number(minor) || 0) / 100);

function englishTerm(term) {
  const value = String(term || "").trim();
  return colorNames[value.toLocaleLowerCase()] || value;
}

function colorValue(term) {
  const english = englishTerm(term).toLocaleLowerCase();
  if (swatches[english]) return swatches[english];
  if (english.includes("green")) return "#72856a";
  if (english.includes("blue")) return "#667f9e";
  if (english.includes("grey") || english.includes("gray")) return "#9da3a2";
  if (english.includes("brown")) return "#80614c";
  if (english.includes("beige")) return "#d6c7ae";
  if (english.includes("black")) return "#282824";
  return "#c7c2b7";
}

function productCategory(product) {
  const category = product.categories?.[0] || "Furniture";
  return categoryNames[category.toLocaleLowerCase()] || category;
}

function matchesQuery(product, query) {
  if (!query) return true;
  const searchableText = [product.name, product.brand, product.slug, ...(product.categories || []), ...(product.colors || [])]
    .join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("de");
  return query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("de")
    .split(/\s+/).filter(Boolean).every(term => searchableText.includes(term));
}

function imageUrl(url) {
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

function HeartIcon({ filled = false }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill={filled ? "currentColor" : "none"}>
    <path d="M20.8 8.7c0 4.1-8.8 10-8.8 10s-8.8-5.9-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" />
  </svg>;
}

function FilterIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M4 6h16M7 12h10m-7 6h4" /><path d="M8 4v4m8 2v4m-4 2v4" />
  </svg>;
}

export default function NewIn() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q")?.trim() || "";
  const categorySlug = searchParams.get("category") || "";
  const categorySlugs = categorySlug.split(",").filter(Boolean);
  const requestedCategories = categorySlugs.map(slug => categoryFilters[slug]?.title || titleFromCategorySlug(slug));
  const brandSlug = searchParams.get("brand") || "";
  const designerSlug = searchParams.get("designer") || "";
  const requestedDesigner = searchParams.get("designerName") || (designerSlug ? titleFromCategorySlug(designerSlug) : "");
  const requestedCategory = requestedCategories.join(", ");
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [sort, setSort] = useState("relevance");
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(requestedCategories);
  const [selectedShapes, setSelectedShapes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [draftCategories, setDraftCategories] = useState(requestedCategories);
  const [draftShapes, setDraftShapes] = useState([]);
  const [draftColors, setDraftColors] = useState([]);
  const [draftBrands, setDraftBrands] = useState([]);
  const [draftMinPrice, setDraftMinPrice] = useState("");
  const [draftMaxPrice, setDraftMaxPrice] = useState("");
  const [draftAvailableOnly, setDraftAvailableOnly] = useState(false);
  const [openFilterSections, setOpenFilterSections] = useState({ shape: true });
  const [visibleCount, setVisibleCount] = useState(CATALOG_BATCH_SIZE);
  const [favorites, setFavorites] = useState(() => new Set(readWishlist().map(product => String(product.id))));
  const requestedBrand = products.find(product => slugifyCategory(product.brand) === brandSlug)?.brand || (brandSlug ? titleFromCategorySlug(brandSlug) : "");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiUrl}/catalog/products`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Unable to load the New In catalogue.");
        return response.json();
      })
      .then(data => {
        setProducts(Array.isArray(data) ? data : []);
        setStatus("ready");
      })
      .catch(error => {
        if (error.name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setSelectedCategories(requestedCategories);
    setVisibleCount(CATALOG_BATCH_SIZE);
  }, [categorySlug, requestedCategory]);

  useEffect(() => {
    document.title = searchQuery ? `Search: ${searchQuery} | Skanvi` : requestedDesigner ? `${requestedDesigner} | Skanvi` : requestedBrand ? `${requestedBrand} | Skanvi` : requestedCategory ? `${requestedCategory} | Skanvi` : "New In | Skanvi";
  }, [searchQuery, requestedCategory, requestedBrand, requestedDesigner]);

  useEffect(() => { setVisibleCount(CATALOG_BATCH_SIZE); }, [searchQuery, categorySlug, brandSlug, designerSlug]);

  useEffect(() => {
    if (!filterOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = event => {
      if (event.key === "Escape") setFilterOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [filterOpen]);

  const categories = useMemo(() => [...new Set(products.map(productCategory))].sort(), [products]);
  const colors = useMemo(() => [...new Set(products.flatMap(product => (product.colors || []).map(englishTerm)))].sort((a, b) => a.localeCompare(b, "en")), [products]);
  const brands = useMemo(() => [...new Set(products.map(product => product.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en")), [products]);

  const visibleProducts = useMemo(() => {
    const result = products.filter(product => {
      const price = Number(product.priceMinor) / 100;
      if (!matchesQuery(product, searchQuery)) return false;
      if (brandSlug && slugifyCategory(product.brand) !== brandSlug) return false;
      if (designerSlug && !slugifyDesigner(`${product.name} ${product.slug}`).includes(designerSlug)) return false;
      if (selectedCategories.length && !selectedCategories.some(value => matchesCategory(product, value))) return false;
      if (selectedShapes.length && !selectedShapes.some(shape => shapeFilters.find(option => option.label === shape)?.categories.some(value => product.categories?.includes(value)))) return false;
      if (selectedColors.length && !selectedColors.some(value => (product.colors || []).map(englishTerm).includes(value))) return false;
      if (selectedBrands.length && !selectedBrands.includes(product.brand)) return false;
      if (minPrice && price < Number(minPrice)) return false;
      if (maxPrice && price > Number(maxPrice)) return false;
      if (availableOnly && !product.inStock) return false;
      return true;
    });

    if (sort === "price-ascending") result.sort((a, b) => a.priceMinor - b.priceMinor);
    if (sort === "price-descending") result.sort((a, b) => b.priceMinor - a.priceMinor);
    if (sort === "name") result.sort((a, b) => a.name.localeCompare(b.name, "en"));
    return result;
  }, [products, sort, selectedCategories, selectedShapes, selectedColors, selectedBrands, minPrice, maxPrice, availableOnly, searchQuery, brandSlug, designerSlug]);

  const pageProducts = visibleProducts.slice(0, visibleCount);
  const activeFilters = Boolean(brandSlug || designerSlug) || selectedCategories.length > 0 || selectedShapes.length > 0 || selectedColors.length > 0 || selectedBrands.length > 0 || Boolean(minPrice || maxPrice || availableOnly);
  const activeFilterCount = Number(Boolean(brandSlug || designerSlug)) + selectedCategories.length + selectedShapes.length + selectedColors.length + selectedBrands.length + Number(Boolean(minPrice || maxPrice || availableOnly));
  const draftResultCount = products.filter(product => {
    const price = Number(product.priceMinor) / 100;
    if (!matchesQuery(product, searchQuery)) return false;
    if (brandSlug && slugifyCategory(product.brand) !== brandSlug) return false;
    if (designerSlug && !slugifyDesigner(`${product.name} ${product.slug}`).includes(designerSlug)) return false;
    if (draftCategories.length && !draftCategories.some(value => matchesCategory(product, value))) return false;
    if (draftShapes.length && !draftShapes.some(shape => shapeFilters.find(option => option.label === shape)?.categories.some(value => product.categories?.includes(value)))) return false;
    if (draftColors.length && !draftColors.some(value => (product.colors || []).map(englishTerm).includes(value))) return false;
    if (draftBrands.length && !draftBrands.includes(product.brand)) return false;
    if (draftMinPrice && price < Number(draftMinPrice)) return false;
    if (draftMaxPrice && price > Number(draftMaxPrice)) return false;
    if (draftAvailableOnly && !product.inStock) return false;
    return true;
  }).length;

  const resetVisibleProducts = () => setVisibleCount(CATALOG_BATCH_SIZE);
  const openFilters = () => {
    setDraftCategories(selectedCategories);
    setDraftShapes(selectedShapes);
    setDraftColors(selectedColors);
    setDraftBrands(selectedBrands);
    setDraftMinPrice(minPrice);
    setDraftMaxPrice(maxPrice);
    setDraftAvailableOnly(availableOnly);
    setFilterOpen(true);
  };
  const applyFilters = () => {
    setSelectedCategories(draftCategories);
    setSelectedShapes(draftShapes);
    setSelectedColors(draftColors);
    setSelectedBrands(draftBrands);
    setMinPrice(draftMinPrice);
    setMaxPrice(draftMaxPrice);
    setAvailableOnly(draftAvailableOnly);
    resetVisibleProducts();
    const nextParams = new URLSearchParams(searchParams);
    if (!draftCategories.length) nextParams.delete("category");
    else nextParams.set("category", draftCategories.map(slugifyCategory).join(","));
    setSearchParams(nextParams, { replace: true });
    setFilterOpen(false);
  };
  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedShapes([]);
    setSelectedColors([]);
    setSelectedBrands([]);
    setMinPrice("");
    setMaxPrice("");
    setAvailableOnly(false);
    setDraftCategories([]);
    setDraftShapes([]);
    setDraftColors([]);
    setDraftBrands([]);
    setDraftMinPrice("");
    setDraftMaxPrice("");
    setDraftAvailableOnly(false);
    resetVisibleProducts();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("category");
    nextParams.delete("brand");
    nextParams.delete("designer");
    nextParams.delete("designerName");
    setSearchParams(nextParams, { replace: true });
  };
  const clearToolbarFilters = () => {
    clearFilters();
    setFilterOpen(false);
  };
  const toggleDraftOption = (setter, value) => setter(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  const renderFilterSection = (id, title, content) => <section className="new-in-filter-section" key={id}>
    <button type="button" className="new-in-filter-section__trigger" aria-expanded={Boolean(openFilterSections[id])} onClick={() => setOpenFilterSections(current => ({ ...current, [id]: !current[id] }))}>
      <span>{title}</span><span className="new-in-filter-section__chevron" aria-hidden="true">{openFilterSections[id] ? "⌃" : "⌄"}</span>
    </button>
    {openFilterSections[id] && <div className="new-in-filter-section__content">{content}</div>}
  </section>;
  const toggleFavorite = product => {
    const wishlist = toggleWishlist(product);
    setFavorites(new Set(wishlist.map(item => String(item.id))));
  };

  return <main className="new-in-page">
    <StoreHeader variant="paper" />

    <section className="new-in-hero" aria-labelledby="new-in-title">
      <p className="new-in-hero__eyebrow">{searchQuery ? "Search" : requestedDesigner ? "Designer" : requestedBrand ? "Brand" : requestedCategory ? "Category" : "New In"}</p>
      <h1 id="new-in-title">{searchQuery ? `Results for “${searchQuery}”` : requestedDesigner || requestedBrand || requestedCategory || "New arrivals. New favourites."}</h1>
      <p>{searchQuery ? "Products matching your search across furniture, lighting, rugs and more." : requestedDesigner ? `Products designed by ${requestedDesigner}.` : requestedBrand ? `Explore products from ${requestedBrand}.` : requestedCategory ? `Explore our ${requestedCategory.toLowerCase()} collection.` : "Be first to discover the latest pieces for your home—from fresh accessories to new favourite furniture and rugs with instant wow factor."}</p>
    </section>

    <section className="new-in-page__listing" aria-labelledby="new-in-listing-title">
      <div className="new-in-page__heading">
        <nav className="new-in-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">{searchQuery ? "Search results" : requestedDesigner || requestedBrand || requestedCategory || "New In"}</span>
        </nav>
        <h2 id="new-in-listing-title">{searchQuery ? "Search results" : requestedDesigner || requestedBrand || requestedCategory || "New In"}</h2>
      </div>

      <div className="new-in-toolbar">
        <button type="button" className={`new-in-toolbar__filter ${filterOpen ? "is-open" : ""}`} aria-expanded={filterOpen} aria-controls="new-in-filter-dialog" onClick={openFilters}>
          <span>Filter{activeFilterCount ? ` (${activeFilterCount})` : ""}</span><FilterIcon />
        </button>
        <div className="new-in-sort">
          <button type="button" className="new-in-sort__trigger" aria-haspopup="listbox" aria-expanded={sortOpen} onClick={() => setSortOpen(open => !open)} onKeyDown={event => { if (event.key === "Escape") setSortOpen(false); }}>
            <span>{sortOptions.find(option => option.value === sort)?.label}</span><span aria-hidden="true" className="new-in-sort__chevron">⌄</span>
          </button>
          {sortOpen && <div className="new-in-sort__menu" role="listbox" aria-label="Sort products">{sortOptions.map(option => <button key={option.value} type="button" role="option" aria-selected={sort === option.value} className={sort === option.value ? "is-selected" : ""} onClick={() => { setSort(option.value); resetVisibleProducts(); setSortOpen(false); }}>{option.label}</button>)}</div>}
        </div>
        <div className="new-in-toolbar__results"><span className="new-in-toolbar__count">{status === "ready" ? `${visibleProducts.length} products` : "New arrivals"}</span>{activeFilters && <button type="button" className="new-in-toolbar__clear" onClick={clearToolbarFilters}>Clear all</button>}</div>
      </div>

      {filterOpen && <div className="new-in-filter-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setFilterOpen(false); }}>
        <aside id="new-in-filter-dialog" className="new-in-filter-drawer" role="dialog" aria-modal="true" aria-labelledby="new-in-filter-title">
          <header className="new-in-filter-drawer__header"><div><p>Refine selection</p><h2 id="new-in-filter-title">Filter</h2></div><button type="button" aria-label="Close filters" onClick={() => setFilterOpen(false)}>×</button></header>
          <div className="new-in-filter-drawer__body">
            {renderFilterSection("colors", "Colors", <div className="new-in-filter-options">{colors.map(color => <label className="new-in-filter-option new-in-filter-option--color" key={color}><input type="checkbox" checked={draftColors.includes(color)} onChange={() => toggleDraftOption(setDraftColors, color)} /><span className="new-in-filter-option__swatch" style={{ "--filter-swatch": colorValue(color) }} /><span>{color}</span><small>{products.filter(product => (product.colors || []).map(englishTerm).includes(color)).length}</small></label>)}</div>)}
            {renderFilterSection("shape", "Shape", <div className="new-in-filter-options">{shapeFilters.map(shape => {
              const count = products.filter(product => shape.categories.some(value => product.categories?.includes(value))).length;
              return <label className="new-in-filter-option" key={shape.label}><input type="checkbox" checked={draftShapes.includes(shape.label)} onChange={() => toggleDraftOption(setDraftShapes, shape.label)} /><span>{shape.label}</span><small>{count}</small></label>;
            })}</div>)}
            {renderFilterSection("brands", "Brands", <div className="new-in-filter-options">{brands.map(brand => <label className="new-in-filter-option" key={brand}><input type="checkbox" checked={draftBrands.includes(brand)} onChange={() => toggleDraftOption(setDraftBrands, brand)} /><span>{brand}</span><small>{products.filter(product => product.brand === brand).length}</small></label>)}</div>)}
            {renderFilterSection("categories", "Collection", <div className="new-in-filter-options">{categories.map(name => <label className="new-in-filter-option" key={name}><input type="checkbox" checked={draftCategories.includes(name)} onChange={() => toggleDraftOption(setDraftCategories, name)} /><span>{name}</span><small>{products.filter(product => matchesCategory(product, name)).length}</small></label>)}</div>)}
            {renderFilterSection("price", "Price", <div className="new-in-filter-price"><label><span className="sr-only">Minimum price in euros</span><input type="number" min="0" inputMode="decimal" placeholder="Min" value={draftMinPrice} onChange={event => setDraftMinPrice(event.target.value)} /></label><label><span className="sr-only">Maximum price in euros</span><input type="number" min="0" inputMode="decimal" placeholder="Max" value={draftMaxPrice} onChange={event => setDraftMaxPrice(event.target.value)} /></label></div>)}
            {renderFilterSection("availability", "Availability", <label className="new-in-filter-option new-in-filter-option--availability"><input type="checkbox" checked={draftAvailableOnly} onChange={event => setDraftAvailableOnly(event.target.checked)} /><span>Only available products</span></label>)}
          </div>
          <footer className="new-in-filter-drawer__footer"><button type="button" onClick={clearFilters}>Clear all</button><button type="button" onClick={applyFilters}>Show {draftResultCount} products</button></footer>
        </aside>
      </div>}

      {status === "loading" && <div className="new-in-grid" aria-label="Loading products">{Array.from({ length: 12 }, (_, index) => <div className="new-in-skeleton" key={index}><div /><span /><i /></div>)}</div>}
      {status === "error" && <div className="new-in-message" role="alert">We couldn’t load the latest products. Please refresh and try again.</div>}
      {status === "ready" && products.length === 0 && <div className="new-in-message">There are no new products available right now.</div>}
      {status === "ready" && visibleProducts.length === 0 && <div className="new-in-message">No products match these filters.</div>}

      {status === "ready" && visibleProducts.length > 0 && <>
        <div className="new-in-grid">
          {pageProducts.map((product, index) => {
            const isFavorite = favorites.has(String(product.id));
            const colorList = Array.isArray(product.colors) ? product.colors : [];
            const mainImage = imageUrl(product.image);
            const alternateImage = imageUrl(product.hoverImage);
            const productPath = `/produkt/${product.slug}`;
            return <article className={`new-in-card${alternateImage ? " has-hover-image" : ""}`} key={product.id}>
              <div className="new-in-card__media">
                  <button className={`new-in-card__favorite${isFavorite ? " is-favorite" : ""}`} type="button" aria-label={`${isFavorite ? "Remove" : "Add"} ${product.name} ${isFavorite ? "from" : "to"} favourites`} aria-pressed={isFavorite} onClick={() => toggleFavorite(product)}>
                  <HeartIcon filled={isFavorite} />
                </button>
                <Link to={productPath} className="new-in-card__image-link" aria-label={`View ${product.name}`}>
                  {mainImage && <img className="new-in-card__image new-in-card__image--primary" src={mainImage} alt={product.name} loading={index < 8 ? "eager" : "lazy"} fetchPriority={index < 4 ? "high" : undefined} decoding="async" />}
                  {alternateImage && <img className="new-in-card__image new-in-card__image--hover" src={alternateImage} alt="" loading="lazy" decoding="async" />}
                </Link>
                {!product.inStock && <span className="new-in-card__stock">Sold out</span>}
              </div>
              <div className="new-in-card__body">
                <div className="new-in-card__meta">
                  {colorList.length > 0 ? <div className="new-in-card__colors" aria-label="Available colours">
                    {colorList.slice(0, 4).map(color => <span className="new-in-card__swatch" key={color} title={englishTerm(color)} aria-label={englishTerm(color)} style={{ "--swatch-color": colorValue(color) }} />)}
                    {colorList.length > 4 && <small>+{colorList.length - 4}</small>}
                  </div> : <span />}
                  {product.dimensions && product.dimensions !== "n. v." && <span className="new-in-card__dimensions">{product.dimensions.replace(/&times;/g, "×").replace(/&nbsp;/g, " ")}</span>}
                </div>
                <div className="new-in-card__title-row">
                  <h3><Link to={productPath}>{product.name}</Link></h3>
                  <span>{formatPrice(product.priceMinor)}</span>
                </div>
              </div>
            </article>;
          })}
        </div>

        <div className="new-in-load-more">
          {visibleCount < visibleProducts.length ? <>
            <p>Showing {pageProducts.length} of {visibleProducts.length} products</p>
            <button type="button" onClick={() => setVisibleCount(count => count + CATALOG_BATCH_SIZE)}>Load more products <span aria-hidden="true">↓</span></button>
          </> : <p className="new-in-load-more__complete">You’ve seen all {visibleProducts.length} products</p>}
        </div>
      </>}
    </section>

  </main>;
}
