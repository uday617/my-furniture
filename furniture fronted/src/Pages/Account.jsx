import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { StoreHeader } from "./Home";
import { readWishlist } from "../wishlist";
import "./NewIn.css";
import "./Account.css";

const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function readProfile() {
  try {
    const profile = JSON.parse(localStorage.getItem("storeProfile") || "{}");
    return {
      name: profile.name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      deliveryAddress: profile.deliveryAddress || {
        firstName: "",
        lastName: "",
        country: "",
        address: "",
        apartment: "",
        city: "",
        region: "",
        postalCode: "",
      },
    };
  } catch {
    return { name: "", email: "", phone: "", deliveryAddress: {} };
  }
}

function readCartCount() {
  try {
    const items = JSON.parse(localStorage.getItem("cartData") || "[]");
    return Array.isArray(items) ? items.reduce((count, item) => count + (Number(item.pQuantity) || 1), 0) : 0;
  } catch {
    return 0;
  }
}

const formatPrice = value => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(Number(value) || 0);
const formatDate = value => value ? new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "Date unavailable";

export default function Account() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(readProfile);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [resetPassword, setResetPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationEmailStatus, setRecommendationEmailStatus] = useState("");
  const [isSavingRecommendationPreference, setIsSavingRecommendationPreference] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dashboardReady, setDashboardReady] = useState(() => {
    const current = readProfile();
    return Boolean(current.name || current.email);
  });
  const [orders, setOrders] = useState([]);
  const [cancellingOrderId, setCancellingOrderId] = useState("");
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [orderActionMessage, setOrderActionMessage] = useState("");
  const [orderActionError, setOrderActionError] = useState("");
  const [testPayments, setTestPayments] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(() => readWishlist().length);
  const [cartCount, setCartCount] = useState(readCartCount);

  useEffect(() => {
    let active = true;
    fetch(`${apiUrl}/auth/me`, { credentials: "include" })
      .then(async response => {
        if (response.status === 401) return null;
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Your account could not be loaded.");
        return result.user;
      })
      .then(async user => {
        if (!active) return;
        setAuthUser(user);
        if (!user) return;
        setProfile(current => ({ ...current, name: user.name, email: user.email, phone: user.phone || "", deliveryAddress: user.deliveryAddress || {} }));
        setDashboardReady(true);
        const response = await fetch(`${apiUrl}/account/orders`, { credentials: "include" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Your orders could not be loaded.");
        if (active) setOrders(Array.isArray(result.orders) ? result.orders : []);
        const paymentsResponse = await fetch(`${apiUrl}/account/test-payments`, { credentials: "include" });
        const paymentsResult = await paymentsResponse.json();
        if (!paymentsResponse.ok) throw new Error(paymentsResult.message || "Your test payment history could not be loaded.");
        if (active) setTestPayments(Array.isArray(paymentsResult.payments) ? paymentsResult.payments : []);
        const recommendationResponse = await fetch(`${apiUrl}/account/recommendations`, { credentials: "include" });
        const recommendationResult = await recommendationResponse.json();
        if (!recommendationResponse.ok) throw new Error(recommendationResult.message || "Your recommendations could not be loaded.");
        if (active) {
          setRecommendations(Array.isArray(recommendationResult.recommendations) ? recommendationResult.recommendations : []);
          setRecommendationEmailStatus(recommendationResult.recommendationEmailStatus || "");
        }
      })
      .catch(error => {
        if (active) setAuthError(error.message || "The account service could not be reached.");
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.title = "Your Account | Skanvi";
    const refreshDashboard = () => {
      setProfile(readProfile());
      setDashboardReady(() => {
        const current = readProfile();
        return Boolean(current.name || current.email);
      });
      setWishlistCount(readWishlist().length);
      setCartCount(readCartCount());
    };
    window.addEventListener("storage", refreshDashboard);
    window.addEventListener("orderdataupdated", refreshDashboard);
    window.addEventListener("wishlistchange", refreshDashboard);
    window.addEventListener("cartDataUpdated", refreshDashboard);
    return () => {
      window.removeEventListener("storage", refreshDashboard);
      window.removeEventListener("orderdataupdated", refreshDashboard);
      window.removeEventListener("wishlistchange", refreshDashboard);
      window.removeEventListener("cartDataUpdated", refreshDashboard);
    };
  }, []);

  const updateProfile = (key, value) => {
    setProfile(current => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const saveProfile = event => {
    event.preventDefault();
    if (isSavingProfile) return;
    setIsSavingProfile(true);
    setAuthError("");
    fetch(`${apiUrl}/account/profile`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name,
        phone: profile.phone,
        deliveryAddress: profile.deliveryAddress,
      }),
    })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Profile could not be saved.");
        const nextProfile = {
          ...profile,
          name: result.profile.name,
          email: result.profile.email,
          phone: result.profile.phone,
          deliveryAddress: result.profile.deliveryAddress,
        };
        setProfile(nextProfile);
        setAuthUser(result.profile);
        localStorage.setItem("storeProfile", JSON.stringify(nextProfile));
        setSaved(true);
        setDashboardReady(true);
      })
      .catch(error => setAuthError(error.message || "Could not connect to your account."))
      .finally(() => setIsSavingProfile(false));
  };
  const submitAuth = async event => {
    event.preventDefault();
    if (authSubmitting) return;
    setAuthSubmitting(true);
    setAuthError("");
    try {
      const response = await fetch(`${apiUrl}/auth/${authMode}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Sign-in failed.");
      setAuthUser(result.user);
      setProfile(current => ({
        ...current,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone || "",
        deliveryAddress: result.user.deliveryAddress || {},
      }));
      localStorage.setItem("storeProfile", JSON.stringify({
        ...readProfile(),
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone || "",
        deliveryAddress: result.user.deliveryAddress || {},
      }));
      setDashboardReady(true);
      const orderResponse = await fetch(`${apiUrl}/account/orders`, { credentials: "include" });
      const orderResult = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderResult.message || "Your account orders could not be loaded.");
      setOrders(Array.isArray(orderResult.orders) ? orderResult.orders : []);
      const paymentsResponse = await fetch(`${apiUrl}/account/test-payments`, { credentials: "include" });
      const paymentsResult = await paymentsResponse.json();
      if (!paymentsResponse.ok) throw new Error(paymentsResult.message || "Your test payment history could not be loaded.");
      setTestPayments(Array.isArray(paymentsResult.payments) ? paymentsResult.payments : []);
      const recommendationResponse = await fetch(`${apiUrl}/account/recommendations`, { credentials: "include" });
      const recommendationResult = await recommendationResponse.json();
      if (!recommendationResponse.ok) throw new Error(recommendationResult.message || "Your recommendations could not be loaded.");
      setRecommendations(Array.isArray(recommendationResult.recommendations) ? recommendationResult.recommendations : []);
      setRecommendationEmailStatus(recommendationResult.recommendationEmailStatus || "");
      const returnTo = searchParams.get("returnTo");
      if (returnTo === "/checkout") navigate("/checkout", { replace: true });
    } catch (error) {
      setAuthError(error.message || "The account service could not be reached.");
    } finally {
      setAuthSubmitting(false);
    }
  };
  const requestPasswordReset = async event => {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError("");
    setResetMessage("");
    try {
      const response = await fetch(`${apiUrl}/auth/password/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authForm.email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Password reset could not be requested.");
      setResetMessage(result.message);
    } catch (error) {
      setAuthError(error.message || "Could not connect to the account service.");
    } finally {
      setAuthSubmitting(false);
    }
  };
  const submitPasswordReset = async event => {
    event.preventDefault();
    const token = searchParams.get("token");
    if (!token || authSubmitting) return;
    setAuthSubmitting(true);
    setAuthError("");
    setResetMessage("");
    try {
      const response = await fetch(`${apiUrl}/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: resetPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Password could not be reset.");
      setResetMessage(result.message);
      setResetPassword("");
      setAuthMode("login");
      setSearchParams({}, { replace: true });
    } catch (error) {
      setAuthError(error.message || "Could not connect to the account service.");
    } finally {
      setAuthSubmitting(false);
    }
  };
  const cancelOrder = async event => {
    event.preventDefault();
    if (!orderToCancel || cancellingOrderId) return;
    const order = orderToCancel;
    setCancellingOrderId(order.id);
    setOrderActionMessage("");
    setOrderActionError("");
    try {
      const response = await fetch(`${apiUrl}/account/orders/${encodeURIComponent(order.id)}/cancel`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancellationReason }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "This order could not be cancelled.");
      setOrders(current => current.map(existing => existing.id === result.order.id ? result.order : existing));
      setOrderActionMessage(`Order ${result.order.id} was cancelled.`);
      setOrderToCancel(null);
      setCancellationReason("");
    } catch (error) {
      setOrderActionError(error.message || "Could not cancel this order.");
    } finally {
      setCancellingOrderId("");
    }
  };
  const updateRecommendationEmailPreference = async event => {
    const enabled = event.target.checked;
    setIsSavingRecommendationPreference(true);
    setAuthError("");
    try {
      const response = await fetch(`${apiUrl}/account/recommendations/preferences`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Email preference could not be saved.");
      setAuthUser(current => ({ ...current, recommendationEmailsEnabled: result.enabled }));
    } catch (error) {
      setAuthError(error.message || "Could not save the email preference.");
    } finally {
      setIsSavingRecommendationPreference(false);
    }
  };
  const logout = async () => {
    setAuthError("");
    try {
      const response = await fetch(`${apiUrl}/auth/logout`, { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("Could not log out. Please try again.");
      setAuthUser(null);
      setDashboardReady(false);
      setOrders([]);
      setTestPayments([]);
      setRecommendations([]);
      setRecommendationEmailStatus("");
      setAuthForm(current => ({ ...current, password: "" }));
    } catch (error) {
      setAuthError(error.message || "The account service could not be reached.");
    }
  };
  const firstName = profile.name.trim().split(/\s+/)[0];
  const totalSpent = orders.reduce((total, order) => total + (Number(order.total) || 0), 0);
  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);
  const recentTestPayments = [...testPayments].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);
  const selectedResetToken = searchParams.get("token");

  if (authLoading) return <main className="new-in-page account-page">
    <StoreHeader variant="paper" />
    <section className="account-profile"><p role="status">Loading your account…</p></section>
  </main>;

  if (!authUser || selectedResetToken) return <main className="new-in-page account-page">
    <StoreHeader variant="paper" />
    <section className="account-profile" aria-labelledby="account-title">
      <nav className="new-in-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Your account</span></nav>
      <p className="new-in-hero__eyebrow">Customer account</p>
      <h1 id="account-title">{selectedResetToken ? "Choose a new password" : authMode === "forgot" ? "Forgot your password?" : authMode === "login" ? "Log in" : "Create your account"}</h1>
      <p className="account-profile__intro">Sign in to see your orders and use cash on delivery at checkout.</p>
      {selectedResetToken ? <form className="account-profile__form account-auth__form" onSubmit={submitPasswordReset}>
        <label>New password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={resetPassword} onChange={event => setResetPassword(event.target.value)} /></label>
        {authError && <p className="account-auth__error" role="alert">{authError}</p>}
        {resetMessage && <p className="account-profile__status" role="status">{resetMessage}</p>}
        <button type="submit" disabled={authSubmitting}>{authSubmitting ? "Saving…" : "Reset password"}</button>
      </form> : authMode === "forgot" ? <form className="account-profile__form account-auth__form" onSubmit={requestPasswordReset}>
        <label>Email address<input type="email" autoComplete="email" required value={authForm.email} onChange={event => setAuthForm(current => ({ ...current, email: event.target.value }))} /></label>
        {authError && <p className="account-auth__error" role="alert">{authError}</p>}
        {resetMessage && <p className="account-profile__status" role="status">{resetMessage}</p>}
        <button type="submit" disabled={authSubmitting}>{authSubmitting ? "Sending…" : "Send reset link"}</button>
        <p className="account-auth__toggle"><button type="button" onClick={() => { setAuthMode("login"); setAuthError(""); setResetMessage(""); }}>Back to log in</button></p>
      </form> : <>
        <form className="account-profile__form account-auth__form" onSubmit={submitAuth}>
          {authMode === "register" && <label>Your name<input autoComplete="name" required maxLength={100} value={authForm.name} onChange={event => setAuthForm(current => ({ ...current, name: event.target.value }))} /></label>}
          <label>Email address<input type="email" autoComplete="email" required value={authForm.email} onChange={event => setAuthForm(current => ({ ...current, email: event.target.value }))} /></label>
          <label>Password<input type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={8} maxLength={128} required value={authForm.password} onChange={event => setAuthForm(current => ({ ...current, password: event.target.value }))} /></label>
          {authError && <p className="account-auth__error" role="alert">{authError}</p>}
          {resetMessage && <p className="account-profile__status" role="status">{resetMessage}</p>}
          <button type="submit" disabled={authSubmitting}>{authSubmitting ? "Please wait…" : authMode === "login" ? "Log in" : "Create account"}</button>
        </form>
        {authMode === "login" && <p className="account-auth__toggle"><button type="button" onClick={() => { setAuthMode("forgot"); setAuthError(""); setResetMessage(""); }}>Forgot password?</button></p>}
        <p className="account-auth__toggle">
          {authMode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button type="button" onClick={() => { setAuthMode(current => current === "login" ? "register" : "login"); setAuthError(""); }}>
            {authMode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </>}
    </section>
  </main>;

  return <main className="new-in-page account-page">
    <StoreHeader variant="paper" />
    <section className="account-profile" aria-labelledby="account-title">
      <nav className="new-in-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Your profile</span></nav>
      <p className="new-in-hero__eyebrow">Your account</p>
      <h1 id="account-title">{dashboardReady && firstName ? `Welcome back, ${firstName}` : "Your account"}</h1>
      <p className="account-profile__intro">Your profile, saved items and orders.</p>

      {dashboardReady && <section className="account-dashboard" aria-label="Account dashboard">
        <div className="account-dashboard__stats">
          <article><span>Orders</span><strong>{orders.length}</strong></article>
          <article><span>Total spent</span><strong>{formatPrice(totalSpent)}</strong></article>
          <article><span>Test payments</span><strong>{testPayments.length}</strong></article>
          <article><span>Wishlist</span><strong>{wishlistCount}</strong></article>
          <article><span>In your bag</span><strong>{cartCount}</strong></article>
        </div>

        <section className="account-orders" aria-labelledby="account-orders-title">
          <div className="account-orders__heading"><div><p>Purchase history</p><h2 id="account-orders-title">Recent orders</h2></div><span>{orders.length} total</span></div>
          {orderActionMessage && <p className="account-profile__status" role="status">{orderActionMessage}</p>}
          {orderActionError && <p className="account-auth__error" role="alert">{orderActionError}</p>}
          {recentOrders.length === 0 ? <div className="account-orders__empty"><p>No completed orders yet.</p><Link to="/neuheiten">Browse the collection <span aria-hidden="true">→</span></Link></div> : <div className="account-orders__list">
            {recentOrders.map(order => <article className="account-order" key={order.id}>
              <div className="account-order__main"><strong>{order.id}</strong><span>{formatDate(order.createdAt)}</span><small>{(order.items || []).map(item => `${item.name} × ${item.quantity}`).join(", ")}</small>{order.couponCode && <small>Coupon {order.couponCode} · saved {formatPrice(order.discountAmount)}</small>}</div>
              <div className="account-order__status"><span>Status: {String(order.status || "processing").replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase())}</span>{order.status === "cancelled" && order.cancellationReason && <small className="account-order__cancellation-reason">Reason: {order.cancellationReason}</small>}{["pending", "processing"].includes(String(order.status).toLowerCase()) && <button type="button" className="account-order__cancel" disabled={cancellingOrderId === order.id} onClick={() => { setOrderActionError(""); setOrderToCancel(order); setCancellationReason(""); }}>{cancellingOrderId === order.id ? "Cancelling…" : "Cancel order"}</button>}</div>
              <strong className="account-order__total">{formatPrice(order.total)}</strong>
            </article>)}
          </div>}
        </section>

        {orderToCancel && <div className="account-cancel-overlay" onMouseDown={event => {
          if (event.target === event.currentTarget && !cancellingOrderId) setOrderToCancel(null);
        }}>
          <section className="account-cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-order-title" aria-describedby="cancel-order-description">
            <button type="button" className="account-cancel-dialog__close" aria-label="Close cancellation form" disabled={Boolean(cancellingOrderId)} onClick={() => setOrderToCancel(null)}>×</button>
            <p className="new-in-hero__eyebrow">Order cancellation</p>
            <h2 id="cancel-order-title">Cancel {orderToCancel.id}?</h2>
            <p id="cancel-order-description">This order has not shipped. Tell us why you’re cancelling; the reason will be saved with the order.</p>
            <form onSubmit={cancelOrder}>
              <label htmlFor="cancellation-reason">Reason for cancellation</label>
              <textarea id="cancellation-reason" required minLength={5} maxLength={500} rows={4} value={cancellationReason} onChange={event => setCancellationReason(event.target.value)} placeholder="Please share the reason (5–500 characters)." />
              <span className="account-cancel-dialog__count">{cancellationReason.trim().length}/500</span>
              {orderActionError && <p className="account-auth__error" role="alert">{orderActionError}</p>}
              <div className="account-cancel-dialog__actions">
                <button type="button" className="account-cancel-dialog__keep" disabled={Boolean(cancellingOrderId)} onClick={() => { setOrderToCancel(null); setOrderActionError(""); }}>Keep order</button>
                <button type="submit" className="account-cancel-dialog__confirm" disabled={Boolean(cancellingOrderId) || cancellationReason.trim().length < 5}>{cancellingOrderId ? "Cancelling…" : "Confirm cancellation"}</button>
              </div>
            </form>
          </section>
        </div>}

        {testPayments.length > 0 && <section className="account-orders account-test-payments" aria-labelledby="account-test-payments-title">
          <div className="account-orders__heading"><div><p>Stripe test mode · only for {authUser.email}</p><h2 id="account-test-payments-title">Test payments</h2></div><span>{testPayments.length} total</span></div>
          <div className="account-orders__list">{recentTestPayments.map(payment => <article className="account-order account-test-payment" key={payment.id}>
            <div className="account-order__main"><strong>{payment.id}</strong><span>{formatDate(payment.createdAt)}</span><small>{(payment.items || []).map(item => `${item.name} × ${item.quantity}`).join(", ")}</small><details className="account-test-receipt"><summary>View receipt and delivery details</summary><p><strong>Status:</strong> Verified test payment only — not a real order.</p><p><strong>Email:</strong> {payment.email || authUser.email}</p><p><strong>Items:</strong> {(payment.items || []).map(item => `${item.name} × ${item.quantity} (${formatPrice(item.price * item.quantity)})`).join(", ")}</p><p><strong>Test amount:</strong> {formatPrice(payment.total)}</p>{payment.delivery && <p><strong>Delivery information entered for the test:</strong> {payment.delivery.name}<br />{payment.delivery.line1}{payment.delivery.line2 ? `, ${payment.delivery.line2}` : ""}<br />{payment.delivery.city}, {payment.delivery.region} {payment.delivery.postalCode}<br />{payment.delivery.country}</p>}</details></div>
            <span className="account-order__status">Status: Test only</span>
            <strong className="account-order__total">{formatPrice(payment.total)}</strong>
          </article>)}</div>
          <p className="account-test-payments__note">These Stripe test transactions are not real orders. They are not included in total spent, and nothing will be shipped.</p>
        </section>}

        {recommendations.length > 0 && <section className="account-orders account-recommendations" aria-labelledby="account-recommendations-title">
          <div className="account-orders__heading"><div><p>Based on products you viewed</p><h2 id="account-recommendations-title">Picked for you</h2></div></div>
          <div className="account-recommendation-grid">{recommendations.map(product => <Link className="account-recommendation" to={`/produkt/${product.slug}`} key={product.id}>
            <img src={product.image} alt="" loading="lazy" /><strong>{product.name}</strong><span>{formatPrice(product.priceMinor / 100)}</span>
          </Link>)}</div>
        </section>}

        <section className="account-activity-settings" aria-label="Browsing and recommendation settings">
          <p>When you are signed in, we record the store pages and products you view, searches you make, and approximate time on each page. This activity is retained for up to 180 days and is used to show relevant recommendations.</p>
          <label><input type="checkbox" checked={authUser.recommendationEmailsEnabled !== false} disabled={isSavingRecommendationPreference} onChange={updateRecommendationEmailPreference} /> Email me a weekly selection when related in-stock products are available.</label>
          {recommendationEmailStatus === "sent" && <small role="status">Your weekly product selection has been emailed.</small>}
          {recommendationEmailStatus === "weekly_limit" && <small role="status">Your next product email can be sent after the weekly limit resets.</small>}
        </section>

        <nav className="account-dashboard__links" aria-label="Your account shortcuts">
          <Link to="/wishlist"><span>Wishlist</span><strong>{wishlistCount} saved</strong><span aria-hidden="true">→</span></Link>
          <Link to="/cart"><span>Shopping bag</span><strong>{cartCount} items</strong><span aria-hidden="true">→</span></Link>
          {authUser.role === "admin" && <Link to="/admin"><span>Admin dashboard</span><strong>Manage store</strong><span aria-hidden="true">→</span></Link>}
        </nav>
      </section>}

      <section className="account-details" aria-labelledby="account-details-title">
        <div className="account-details__heading"><div><p>Account details</p><h2 id="account-details-title">Personal details</h2></div><button className="account-auth__logout" type="button" onClick={logout}>Log out</button></div>
        {authError && <p className="account-auth__error" role="alert">{authError}</p>}
      <form className="account-profile__form" onSubmit={saveProfile}>
        <label>Your name<input autoComplete="name" required maxLength={100} value={profile.name} onChange={event => updateProfile("name", event.target.value)} /></label>
        <label>Email address<input type="email" autoComplete="email" value={profile.email} readOnly /></label>
        <label>Phone number<input type="tel" autoComplete="tel" maxLength={30} value={profile.phone} onChange={event => updateProfile("phone", event.target.value)} /></label>
        <label>First name<input autoComplete="given-name" maxLength={100} value={profile.deliveryAddress.firstName || ""} onChange={event => updateProfile("deliveryAddress", { ...profile.deliveryAddress, firstName: event.target.value })} /></label>
        <label>Last name<input autoComplete="family-name" maxLength={100} value={profile.deliveryAddress.lastName || ""} onChange={event => updateProfile("deliveryAddress", { ...profile.deliveryAddress, lastName: event.target.value })} /></label>
        <label>Country<select value={profile.deliveryAddress.country || ""} onChange={event => updateProfile("deliveryAddress", { ...profile.deliveryAddress, country: event.target.value })}><option value="">Select a country</option><option value="US">United States</option></select></label>
        <label>Street address<input autoComplete="street-address" maxLength={200} value={profile.deliveryAddress.address || ""} onChange={event => updateProfile("deliveryAddress", { ...profile.deliveryAddress, address: event.target.value })} /></label>
        <label>Apartment, suite, etc.<input autoComplete="address-line2" maxLength={200} value={profile.deliveryAddress.apartment || ""} onChange={event => updateProfile("deliveryAddress", { ...profile.deliveryAddress, apartment: event.target.value })} /></label>
        <label>City<input autoComplete="address-level2" maxLength={100} value={profile.deliveryAddress.city || ""} onChange={event => updateProfile("deliveryAddress", { ...profile.deliveryAddress, city: event.target.value })} /></label>
        <label>State or region<input autoComplete="address-level1" maxLength={100} value={profile.deliveryAddress.region || ""} onChange={event => updateProfile("deliveryAddress", { ...profile.deliveryAddress, region: event.target.value })} /></label>
        <label>Postal code<input autoComplete="postal-code" maxLength={30} value={profile.deliveryAddress.postalCode || ""} onChange={event => updateProfile("deliveryAddress", { ...profile.deliveryAddress, postalCode: event.target.value })} /></label>
        <button type="submit" disabled={isSavingProfile}>{isSavingProfile ? "Saving…" : "Save profile"}</button>
        {saved && <p className="account-profile__status" role="status">Profile saved in this browser.</p>}
      </form>
      </section>
      <p className="account-profile__note">Signed in as {authUser.email}. Your COD orders are saved to your account.</p>
      <nav className="account-profile__links" aria-label="Account links"><Link to="/wishlist">View wishlist <span aria-hidden="true">→</span></Link><Link to="/cart">View your bag <span aria-hidden="true">→</span></Link></nav>
    </section>
  </main>;
}