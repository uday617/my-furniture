import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StoreHeader } from "./Home";
import "./NewIn.css";
import "./Admin.css";

const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const orderStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
const blankProduct = {
  id: "",
  name: "",
  slug: "",
  sku: "",
  priceMinor: "",
  image: "",
  hoverImage: "",
  galleryText: "",
  categories: [],
  categoryText: "",
  brand: "",
  colorsText: "",
  dimensions: "",
  inStock: true,
  active: true,
};
const formatPrice = value => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(Number(value) || 0);
const formatDate = value => value ? new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Date unavailable";
const normalizeOrderStatus = status => {
  const normalized = status?.toLowerCase().replaceAll(" ", "_");
  return normalized === "pending_confirmation" ? "pending" : normalized;
};

function toProductForm(product) {
  return {
    ...blankProduct,
    ...product,
    priceMinor: String(product.priceMinor ?? ""),
    galleryText: (product.gallery || []).join("\n"),
    categoryText: "",
    colorsText: (product.colors || []).join(", "),
  };
}

export default function Admin() {
  const [user, setUser] = useState(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [orderFilter, setOrderFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productForm, setProductForm] = useState(blankProduct);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [busyOrder, setBusyOrder] = useState("");
  const [pageError, setPageError] = useState("");
  const [pageMessage, setPageMessage] = useState("");

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${apiUrl}${path}`, {
      ...options,
      credentials: "include",
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
    });
    const result = response.status === 204 ? {} : await response.json();
    if (!response.ok) throw new Error(result.message || "Admin request failed.");
    return result;
  }, []);

  const refreshAdminData = useCallback(async () => {
    setPageError("");
    const results = await Promise.all([
      request("/admin/orders"),
      request("/admin/products"),
      request("/admin/catalog/categories"),
      request("/admin/coupons"),
      request("/admin/customers"),
    ]);
    setOrders(results[0].orders || []);
    setProducts(results[1] || []);
    setCategories(results[2].categories || []);
    setCoupons(results[3].coupons || []);
    setCustomers(results[4].customers || []);
    setTotalUsers(results[4].totalUsers || 0);
    setSelectedCustomerId(current => current || results[4].customers?.[0]?.id || "");
  }, [request]);

  useEffect(() => {
    document.title = "Admin dashboard | Skanvi";
    let active = true;
    request("/auth/me")
      .then(result => {
        if (!active) return;
        setUser(result.user);
        if (result.user.role !== "admin") return;
        return refreshAdminData();
      })
      .catch(error => { if (active) setPageError(error.message || "Could not verify administrator access."); })
      .finally(() => { if (active) setIsCheckingAccess(false); });
    return () => { active = false; };
  }, [refreshAdminData, request]);

  const visibleOrders = useMemo(() => orders.filter(order =>
    orderFilter === "all" || normalizeOrderStatus(order.status) === orderFilter), [orders, orderFilter]);
  const visibleProducts = useMemo(() => products.filter(product =>
    categoryFilter === "all" || product.categories?.includes(categoryFilter)), [products, categoryFilter]);
  const selectedCustomer = customers.find(customer => customer.id === selectedCustomerId);

  const changeOrderStatus = async (orderNumber, status) => {
    setBusyOrder(orderNumber);
    setPageError("");
    try {
      await request(`/admin/orders/${encodeURIComponent(orderNumber)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setPageMessage(`Order ${orderNumber} updated.`);
      await refreshAdminData();
    } catch (error) {
      setPageError(error.message || "Order status could not be updated.");
    } finally {
      setBusyOrder("");
    }
  };

  const saveProduct = async event => {
    event.preventDefault();
    if (isSavingProduct) return;
    setIsSavingProduct(true);
    setPageError("");
    setPageMessage("");
    const categoriesToSave = [...new Set([
      ...productForm.categories,
      ...productForm.categoryText.split(",").map(category => category.trim()).filter(Boolean),
    ])];
    const payload = {
      ...productForm,
      slug: productForm.slug.trim() || undefined,
      priceMinor: Number(productForm.priceMinor),
      categories: categoriesToSave,
      gallery: productForm.galleryText.split(/\r?\n/).map(image => image.trim()).filter(Boolean),
      colors: productForm.colorsText.split(",").map(color => color.trim()).filter(Boolean),
      hasOptions: productForm.hasOptions === true,
    };
    delete payload.categoryText;
    delete payload.galleryText;
    delete payload.colorsText;
    try {
      const result = await request(
        isEditingProduct ? `/admin/products/${encodeURIComponent(productForm.id)}` : "/admin/products",
        { method: isEditingProduct ? "PUT" : "POST", body: JSON.stringify(payload) }
      );
      setProductForm(blankProduct);
      setIsEditingProduct(false);
      setPageMessage(`Product “${result.product.name}” saved.`);
      await refreshAdminData();
    } catch (error) {
      setPageError(error.message || "Product could not be saved.");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const toggleProductActive = async product => {
    setPageError("");
    try {
      await request(`/admin/products/${encodeURIComponent(product.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active: !product.active }),
      });
      setPageMessage(`${product.name} ${product.active ? "archived" : "restored"}.`);
      await refreshAdminData();
    } catch (error) {
      setPageError(error.message || "Product status could not be updated.");
    }
  };

  const editProduct = product => {
    setProductForm(toProductForm(product));
    setIsEditingProduct(true);
    setPageMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isCheckingAccess) return <main className="new-in-page admin-page"><StoreHeader variant="paper" /><section className="admin-shell"><p role="status">Checking administrator access…</p></section></main>;

  if (!user) return <main className="new-in-page admin-page"><StoreHeader variant="paper" /><section className="admin-shell"><h1>Admin sign in required</h1><p>{pageError || "Log in with an administrator account to continue."}</p><Link to="/account">Go to account sign in</Link></section></main>;

  if (user.role !== "admin") return <main className="new-in-page admin-page"><StoreHeader variant="paper" /><section className="admin-shell"><h1>Access denied</h1><p>Your account does not have the administrator role.</p><Link to="/account">Back to your account</Link></section></main>;

  return <main className="new-in-page admin-page">
    <StoreHeader variant="paper" />
    <section className="admin-shell" aria-labelledby="admin-title">
      <nav className="new-in-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Admin dashboard</span></nav>
      <header className="admin-heading"><div><p className="new-in-hero__eyebrow">Skanvi management</p><h1 id="admin-title">Admin dashboard</h1><p>Signed in as {user.email}</p></div><button type="button" onClick={() => refreshAdminData().catch(error => setPageError(error.message))}>Refresh data</button></header>

      <div className="admin-stats">
        <article><span>Customers</span><strong>{totalUsers}</strong></article>
        <article><span>COD orders</span><strong>{orders.length}</strong></article>
        <article><span>Active products</span><strong>{products.filter(product => product.active).length}</strong></article>
        <article><span>Categories</span><strong>{categories.length}</strong></article>
        <article><span>Coupon redemptions</span><strong>{coupons.filter(coupon => coupon.redeemedAt).length}</strong></article>
      </div>

      {pageError && <p className="admin-alert" role="alert">{pageError}</p>}
      {pageMessage && <p className="admin-success" role="status">{pageMessage}</p>}

      <nav className="admin-tabs" aria-label="Admin sections">
        {[["orders", "Orders"], ["customers", "Customers"], ["products", "Products"], ["coupons", "Coupons"]].map(([key, label]) =>
          <button type="button" key={key} className={activeTab === key ? "is-active" : ""} aria-pressed={activeTab === key} onClick={() => { setActiveTab(key); setPageError(""); setPageMessage(""); }}>{label}</button>)}
      </nav>

      {activeTab === "orders" && <section className="admin-section" aria-labelledby="admin-orders-title">
        <header className="admin-section__heading"><div><p>Customer orders</p><h2 id="admin-orders-title">Cash on delivery</h2></div><label>Filter status<select value={orderFilter} onChange={event => setOrderFilter(event.target.value)}><option value="all">All statuses</option>{orderStatuses.map(status => <option key={status} value={status}>{status}</option>)}</select></label></header>
        {visibleOrders.length === 0 ? <p className="admin-empty">No orders match this filter.</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer / delivery</th><th>Items</th><th>Coupon</th><th>Due</th><th>Status / cancellation reason</th></tr></thead><tbody>{visibleOrders.map(order => <tr key={order.id}>
          <td><strong>{order.id}</strong><small>{formatDate(order.createdAt)}</small></td>
          <td>{order.customer?.name}<small>{order.customer?.email}</small><small>{order.customer?.phone}</small><small>{order.delivery?.address}, {order.delivery?.city}, {order.delivery?.region} {order.delivery?.postalCode}</small></td>
          <td>{order.items?.map(item => `${item.name} × ${item.quantity}`).join(", ")}</td>
          <td>{order.couponCode ? `${order.couponCode} (−${formatPrice(order.discountAmount)})` : "—"}</td>
          <td>{formatPrice(order.total)}</td>
          <td><select aria-label={`Status for ${order.id}`} value={normalizeOrderStatus(order.status)} disabled={busyOrder === order.id} onChange={event => changeOrderStatus(order.id, event.target.value)}>{orderStatuses.map(status => <option key={status} value={status}>{status}</option>)}</select>{order.cancellationReason && <small>Reason: {order.cancellationReason}</small>}</td>
        </tr>)}</tbody></table></div>}
      </section>}

      {activeTab === "products" && <section className="admin-section" aria-labelledby="admin-products-title">
        <header className="admin-section__heading"><div><p>Catalog management</p><h2 id="admin-products-title">Products by category</h2></div><label>Filter category<select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></label></header>
        <form className="admin-product-form" onSubmit={saveProduct}>
          <h3>{isEditingProduct ? `Edit product · ${productForm.name}` : "Add a product"}</h3>
          <div className="admin-form-grid">
            <label>Product name<input required maxLength={200} value={productForm.name} onChange={event => setProductForm(current => ({ ...current, name: event.target.value }))} /></label>
            <label>Slug<input maxLength={200} value={productForm.slug} placeholder="Generated from product name when blank" onChange={event => setProductForm(current => ({ ...current, slug: event.target.value }))} /></label>
            <label>Price in EUR<input type="number" min="0.01" step="0.01" required value={Number(productForm.priceMinor) / 100 || ""} onChange={event => setProductForm(current => ({ ...current, priceMinor: String(Math.round(Number(event.target.value) * 100)) }))} /></label>
            <label>SKU<input maxLength={100} value={productForm.sku} onChange={event => setProductForm(current => ({ ...current, sku: event.target.value }))} /></label>
            <label className="admin-form-wide">Main image URL<input type="url" required value={productForm.image} onChange={event => setProductForm(current => ({ ...current, image: event.target.value }))} /></label>
            <label className="admin-form-wide">Hover image URL<input type="url" value={productForm.hoverImage || ""} onChange={event => setProductForm(current => ({ ...current, hoverImage: event.target.value }))} /></label>
            <label className="admin-form-wide">Gallery images, one URL per line<textarea rows="3" value={productForm.galleryText} onChange={event => setProductForm(current => ({ ...current, galleryText: event.target.value }))} /></label>
            <label>Brand<input maxLength={100} value={productForm.brand} onChange={event => setProductForm(current => ({ ...current, brand: event.target.value }))} /></label>
            <label>Dimensions<input maxLength={200} value={productForm.dimensions} onChange={event => setProductForm(current => ({ ...current, dimensions: event.target.value }))} /></label>
            <label className="admin-form-wide">New categories, comma-separated<input value={productForm.categoryText} onChange={event => setProductForm(current => ({ ...current, categoryText: event.target.value }))} placeholder="Furniture, Chairs" /></label>
            {categories.length > 0 && <fieldset className="admin-category-picker admin-form-wide"><legend>Or choose existing categories</legend>{categories.map(category => <label key={category}><input type="checkbox" checked={productForm.categories.includes(category)} onChange={event => setProductForm(current => ({ ...current, categories: event.target.checked ? [...current.categories, category] : current.categories.filter(item => item !== category) }))} />{category}</label>)}</fieldset>}
            <label className="admin-form-wide">Colors, comma-separated<input value={productForm.colorsText} onChange={event => setProductForm(current => ({ ...current, colorsText: event.target.value }))} /></label>
            <label className="admin-checkbox"><input type="checkbox" checked={productForm.inStock} onChange={event => setProductForm(current => ({ ...current, inStock: event.target.checked }))} />In stock</label>
            {isEditingProduct && <label className="admin-checkbox"><input type="checkbox" checked={productForm.active} onChange={event => setProductForm(current => ({ ...current, active: event.target.checked }))} />Visible in store</label>}
          </div>
          <div className="admin-form-actions"><button type="submit" disabled={isSavingProduct}>{isSavingProduct ? "Saving…" : isEditingProduct ? "Save product" : "Add product"}</button>{isEditingProduct && <button type="button" className="admin-secondary" onClick={() => { setProductForm(blankProduct); setIsEditingProduct(false); }}>Cancel edit</button>}</div>
        </form>
        <div className="admin-product-list">{visibleProducts.map(product => <article key={product.id} className={!product.active ? "is-inactive" : ""}>
          <img src={product.image} alt="" loading="lazy" /><div><strong>{product.name}</strong><span>{product.categories?.join(" · ")}</span><small>{formatPrice(product.priceMinor / 100)} · {product.sku || "No SKU"} · {product.active ? "Visible" : "Archived"}</small></div>
          <button type="button" onClick={() => editProduct(product)}>Edit</button>
          <button type="button" className="admin-secondary" onClick={() => toggleProductActive(product)}>{product.active ? "Archive" : "Restore"}</button>
        </article>)}</div>
      </section>}

      {activeTab === "customers" && <section className="admin-section" aria-labelledby="admin-customers-title">
        <header className="admin-section__heading"><div><p>Account activity · rolling 180 days</p><h2 id="admin-customers-title">Customers and interests</h2></div><span>{customers.length} shown of {totalUsers} accounts</span></header>
        <p className="admin-note">Browsing data is recorded only while a customer is signed in. Page duration is approximate and activity expires after 180 days. Email recommendations are limited to once per week and can be disabled in the customer account.</p>
        {customers.length === 0 ? <p className="admin-empty">No customer accounts yet.</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Joined</th><th>Orders / spent</th><th>Tracked time</th><th>Last active</th><th>Most-viewed products</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.id} className={selectedCustomerId === customer.id ? "is-selected" : ""}>
          <td><strong>{customer.name}</strong><small>{customer.email}</small><button type="button" className="admin-inline-button" onClick={() => setSelectedCustomerId(customer.id)}>{selectedCustomerId === customer.id ? "Viewing activity" : "View activity"}</button></td>
          <td>{formatDate(customer.createdAt)}</td>
          <td>{customer.orderCount} orders<small>{formatPrice(customer.totalSpent)} COD</small></td>
          <td>{customer.trackedMinutes} min<small>{customer.activityCount} visits/interactions</small></td>
          <td>{formatDate(customer.lastActivityAt)}</td>
          <td>{customer.topProducts.length ? customer.topProducts.map(product => `${product.name} (${product.views})`).join(", ") : "No product views recorded yet"}</td>
        </tr>)}</tbody></table></div>}
        {selectedCustomer && <section className="admin-customer-activity" aria-labelledby="admin-customer-activity-title">
          <header className="admin-section__heading"><div><p>{selectedCustomer.email}</p><h3 id="admin-customer-activity-title">Recent browsing activity</h3></div></header>
          {selectedCustomer.recentActivities.length === 0 ? <p className="admin-empty">No signed-in activity has been recorded for this account yet.</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Type</th><th>Page / product / search</th><th>Time spent</th><th>When</th></tr></thead><tbody>{selectedCustomer.recentActivities.map((activity, index) => <tr key={`${activity.createdAt}-${index}`}>
            <td>{activity.kind.replaceAll("_", " ")}</td>
            <td>{activity.productName || activity.query || activity.path}</td>
            <td>{activity.durationSeconds} sec</td>
            <td>{formatDate(activity.createdAt)}</td>
          </tr>)}</tbody></table></div>}
        </section>}
      </section>}

      {activeTab === "coupons" && <section className="admin-section" aria-labelledby="admin-coupons-title">
        <header className="admin-section__heading"><div><p>Newsletter promotions</p><h2 id="admin-coupons-title">15% welcome coupons</h2></div><span>{coupons.length} issued</span></header>
        {coupons.length === 0 ? <p className="admin-empty">No newsletter coupons have been issued yet.</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Email</th><th>Code</th><th>Email status</th><th>Redemption</th><th>Confirmed</th></tr></thead><tbody>{coupons.map(coupon => <tr key={coupon._id}><td>{coupon.email}</td><td><code>{coupon.couponCode}</code></td><td>{coupon.couponEmailStatus}</td><td>{coupon.redeemedAt ? `Used · ${coupon.redeemedOrderNumber}` : "Unused"}</td><td>{formatDate(coupon.confirmedAt)}</td></tr>)}</tbody></table></div>}
        <p className="admin-note">Coupon codes are restricted to the matching signed-in email and first COD order. Stripe checkout remains test-only.</p>
      </section>}
    </section>
  </main>;
}
