import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { StoreHeader } from "./Home";
import "./NewIn.css";
import "./Checkout.css";

const emptyAddress = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "US",
  address: "",
  apartment: "",
  city: "",
  region: "",
  postalCode: "",
};

function readCart() {
  try {
    const items = JSON.parse(localStorage.getItem("cartData") || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function readCheckoutDraft() {
  try {
    return JSON.parse(sessionStorage.getItem("checkoutDraft") || "null");
  } catch {
    return null;
  }
}

function readCheckoutQuote() {
  try {
    return JSON.parse(sessionStorage.getItem("checkoutQuote") || "null");
  } catch {
    return null;
  }
}

function readTestReceipt() {
  try {
    const receipt = JSON.parse(sessionStorage.getItem("testPaymentReceipt") || "null");
    return receipt?.sessionReference && Number.isInteger(receipt.amountTotal) ? receipt : null;
  } catch {
    return null;
  }
}

function readCodOrder() {
  try {
    const order = JSON.parse(sessionStorage.getItem("codOrderReceipt") || "null");
    return order?.id && Array.isArray(order.items) ? order : null;
  } catch {
    return null;
  }
}

function readStoredObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function readStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function sameCart(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
    left.every((item, index) => item && right[index] && String(item.id) === String(right[index].id) &&
      quantityOf(item) === quantityOf(right[index]));
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(Number(value) || 0);
}

function priceOf(item) {
  return Number(item.productPrice ?? Number(item.priceMinor || 0) / 100) || 0;
}

function quantityOf(item) {
  return Number(item.pQuantity) || 1;
}

function removePurchasedItemsFromCart(purchasedItems) {
  const purchasedQuantities = new Map();
  purchasedItems.forEach(item => {
    const id = String(item.id || "");
    const quantity = Number(item.quantity);
    if (id && Number.isInteger(quantity) && quantity > 0) {
      purchasedQuantities.set(id, (purchasedQuantities.get(id) || 0) + quantity);
    }
  });

  const currentCart = readCart();
  const remainingCart = [];
  currentCart.forEach(item => {
    const id = String(item.id || "");
    const quantityToRemove = purchasedQuantities.get(id) || 0;
    const remainingQuantity = quantityOf(item) - quantityToRemove;
    if (remainingQuantity > 0) {
      remainingCart.push(quantityToRemove ? { ...item, pQuantity: remainingQuantity } : item);
    }
    if (quantityToRemove > quantityOf(item)) {
      purchasedQuantities.set(id, quantityToRemove - quantityOf(item));
    } else {
      purchasedQuantities.delete(id);
    }
  });

  localStorage.setItem("cartData", JSON.stringify(remainingCart));
  window.dispatchEvent(new Event("cartDataUpdated"));
}

export default function CheckOut() {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const [items] = useState(readCart);
  const [savedReceipt] = useState(() => items.length === 0 ? readTestReceipt() : null);
  const [savedCodOrder] = useState(() => items.length === 0 ? readCodOrder() : null);
  const [savedDraft] = useState(() => {
    const draft = readCheckoutDraft();
    return draft?.contact && draft?.delivery && sameCart(draft.items, items) ? draft : null;
  });
  const [step, setStep] = useState(() => savedReceipt || savedCodOrder ? "complete" : "information");
  const [contact, setContact] = useState(() => savedDraft?.contact || emptyAddress);
  const [differentAddress, setDifferentAddress] = useState(() => savedDraft?.differentAddress || false);
  const [shippingAddress, setShippingAddress] = useState(() => savedDraft?.delivery || emptyAddress);
  const [orderNotes, setOrderNotes] = useState("");
  const [information, setInformation] = useState(savedDraft);
  const [testReceipt, setTestReceipt] = useState(savedReceipt);
  const [codOrder, setCodOrder] = useState(savedCodOrder);
  const [quote, setQuote] = useState(() => {
    const savedQuote = readCheckoutQuote();
    return savedQuote?.currency === "eur" && Array.isArray(savedQuote.items) &&
      Number.isInteger(savedQuote.amountTotal) && sameCart(savedQuote.cart, items) ? savedQuote : null;
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [paymentError, setPaymentError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [verifiedTotal, setVerifiedTotal] = useState(() => savedReceipt ? savedReceipt.amountTotal / 100 : null);
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const [isRetryingReceipt, setIsRetryingReceipt] = useState(false);
  const [receiptEmailError, setReceiptEmailError] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [couponCode, setCouponCode] = useState("");
  const [couponQuote, setCouponQuote] = useState(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  useEffect(() => { document.title = "Checkout | Skanvi"; }, []);
  useEffect(() => {
    let active = true;
    fetch(`${apiUrl}/auth/me`, { credentials: "include" })
      .then(async response => {
        if (response.status === 401) return null;
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Your account could not be checked.");
        return result.user;
      })
      .then(user => {
        if (!active) return;
        setAuthUser(user);
        if (user) {
          const savedAddress = user.deliveryAddress || {};
          const firstAndLastName = String(user.name || "").trim().split(/\s+/);
          const savedContact = {
            ...emptyAddress,
            email: user.email || "",
            phone: user.phone || "",
            firstName: savedAddress.firstName || firstAndLastName[0] || "",
            lastName: savedAddress.lastName || firstAndLastName.slice(1).join(" "),
            country: savedAddress.country || "US",
            address: savedAddress.address || "",
            apartment: savedAddress.apartment || "",
            city: savedAddress.city || "",
            region: savedAddress.region || "",
            postalCode: savedAddress.postalCode || "",
          };
          if (!savedDraft) {
            setContact(savedContact);
            setShippingAddress(savedContact);
          }
        }
      })
      .catch(error => { if (active) setPaymentError(error.message); })
      .finally(() => { if (active) setIsLoadingAuth(false); });
    return () => { active = false; };
  }, [apiUrl, savedDraft]);

  const subtotal = useMemo(() => items.reduce((total, item) => total + priceOf(item) * quantityOf(item), 0), [items]);
  const displayedSubtotal = codOrder?.total ?? verifiedTotal ?? (quote ? quote.amountTotal / 100 : subtotal);
  const displayedTotal = paymentMethod === "cod" && couponQuote
    ? couponQuote.total / 100
    : displayedSubtotal;
  const isCouponApplied = paymentMethod === "cod" && Boolean(couponQuote);
  const updateContact = (key, value) => setContact(current => ({ ...current, [key]: value }));
  const updateShipping = (key, value) => setShippingAddress(current => ({ ...current, [key]: value }));
  const continueToPayment = async event => {
    event.preventDefault();
    const delivery = differentAddress ? shippingAddress : contact;
    if (contact.country !== "US" || delivery.country !== "US") {
      setPaymentError("Stripe test checkout currently accepts US addresses only.");
      return;
    }
    const draft = { contact, delivery, differentAddress, orderNotes, items, currency: "EUR", subtotal };
    setIsLoadingQuote(true);
    setPaymentError("");
    try {
      const response = await fetch(`${apiUrl}/checkout/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map(item => ({ id: item.id, pQuantity: quantityOf(item) })) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "The bag could not be priced.");
      if (result.currency !== "eur" || !Array.isArray(result.items) || !Number.isInteger(result.amountTotal)) {
        throw new Error("The server returned an invalid EUR price quote.");
      }
      const checkoutQuote = { ...result, cart: items };
      sessionStorage.setItem("checkoutDraft", JSON.stringify(draft));
      sessionStorage.setItem("checkoutQuote", JSON.stringify(checkoutQuote));
      setQuote(checkoutQuote);
      setInformation(draft);
      setStep("payment");
      window.scrollTo(0, 0);
    } catch (error) {
      setPaymentError(error.message);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  useEffect(() => {
    const paymentResult = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    if (!paymentResult) return undefined;

    let active = true;
    if (paymentResult === "cancelled") {
      setPaymentNotice("Payment was cancelled. Your bag is unchanged; you can try again.");
      setStep("payment");
      setSearchParams({}, { replace: true });
      return () => { active = false; };
    }

    if (paymentResult !== "success" || !sessionId) {
      setPaymentError("We could not verify the checkout result. No order has been placed.");
      setStep("payment");
      setSearchParams({}, { replace: true });
      return () => { active = false; };
    }

    setStep("complete");
    fetch(`${apiUrl}/checkout/session/${encodeURIComponent(sessionId)}`)
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Payment status could not be verified.");
        return result;
      })
      .then(result => {
        if (!active) return;
        if (result.status !== "complete" || result.paymentStatus !== "paid" || result.currency !== "eur" || !result.testPayment) {
          throw new Error("Stripe has not confirmed a completed test payment.");
        }
        const testPayment = result.testPayment;
        const checkoutContact = information?.contact || savedDraft?.contact || emptyAddress;
        const checkoutDelivery = information?.delivery || savedDraft?.delivery || emptyAddress;
        const receipt = {
          sessionId,
          ...testPayment,
          sessionReference: testPayment.id,
          amountTotal: result.amountTotal,
          currency: result.currency,
          email: checkoutContact.email,
          delivery: {
            firstName: checkoutDelivery.firstName,
            lastName: checkoutDelivery.lastName,
            address: checkoutDelivery.address,
            apartment: checkoutDelivery.apartment,
            city: checkoutDelivery.city,
            region: checkoutDelivery.region,
            postalCode: checkoutDelivery.postalCode,
            country: checkoutDelivery.country,
          },
          verifiedAt: testPayment.createdAt || new Date().toISOString(),
        };
        const existingTests = readStoredArray("storeTestPayments");
        const testPayments = [receipt, ...existingTests.filter(payment => payment?.id !== receipt.id)];
        localStorage.setItem("storeTestPayments", JSON.stringify(testPayments));
        removePurchasedItemsFromCart(testPayment.items);
        localStorage.setItem("storeProfile", JSON.stringify({
          ...readStoredObject("storeProfile"),
          name: `${checkoutContact.firstName || ""} ${checkoutContact.lastName || ""}`.trim(),
          email: checkoutContact.email || "",
          phone: checkoutContact.phone || "",
          address: [checkoutDelivery.address, checkoutDelivery.apartment, checkoutDelivery.city,
            checkoutDelivery.region, checkoutDelivery.postalCode, checkoutDelivery.country]
            .filter(Boolean).join(", "),
        }));
        sessionStorage.setItem("testPaymentReceipt", JSON.stringify(receipt));
        setTestReceipt(receipt);
        setVerifiedTotal(result.amountTotal / 100);
        setPaymentNotice("Stripe verified your test payment.");
        window.dispatchEvent(new Event("orderdataupdated"));
        sessionStorage.removeItem("checkoutDraft");
        sessionStorage.removeItem("checkoutQuote");
        setSearchParams({}, { replace: true });
      })
      .catch(error => {
        if (!active) return;
        setPaymentError(error.message);
        setStep("payment");
      });
    return () => { active = false; };
  }, [
    apiUrl,
    information?.contact,
    information?.delivery,
    savedDraft?.contact,
    savedDraft?.delivery,
    searchParams,
    setSearchParams,
    verificationAttempt,
  ]);

  const startPayment = async () => {
    if (!information || isStartingPayment) return;
    if (paymentMethod === "cod" && !authUser) {
      setPaymentError("Log in or create an account to place a cash-on-delivery order.");
      return;
    }
    setIsStartingPayment(true);
    setPaymentError("");
    setPaymentNotice("");
    try {
      if (paymentMethod === "cod") {
        const checkoutRequestId = sessionStorage.getItem("codCheckoutRequestId") || crypto.randomUUID();
        sessionStorage.setItem("codCheckoutRequestId", checkoutRequestId);
        const response = await fetch(`${apiUrl}/checkout/cod`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: information.items.map(item => ({ id: item.id, pQuantity: quantityOf(item) })),
            delivery: information.delivery,
            phone: information.contact.phone,
            notes: information.orderNotes,
            checkoutRequestId,
            couponCode: couponQuote?.couponCode || "",
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Your COD order could not be placed.");
        if (!result.order?.id || !Array.isArray(result.order.items)) {
          throw new Error("The server returned an invalid order confirmation.");
        }
        const order = result.order;
        const savedOrders = readStoredArray("storeOrders");
        localStorage.setItem("storeOrders", JSON.stringify([order, ...savedOrders.filter(saved => saved?.id !== order.id)]));
        localStorage.setItem("storeProfile", JSON.stringify({
          ...readStoredObject("storeProfile"),
          name: authUser.name,
          email: authUser.email,
          phone: information.contact.phone || "",
          address: [information.delivery.address, information.delivery.apartment, information.delivery.city,
            information.delivery.region, information.delivery.postalCode, information.delivery.country]
            .filter(Boolean).join(", "),
        }));
        let profileSaveIssue = false;
        try {
          const profileResponse = await fetch(`${apiUrl}/account/profile`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: authUser.name,
              phone: information.contact.phone,
              deliveryAddress: information.delivery,
            }),
          });
          if (!profileResponse.ok) profileSaveIssue = true;
        } catch {
          profileSaveIssue = true;
        }
        sessionStorage.setItem("codOrderReceipt", JSON.stringify(order));
        sessionStorage.removeItem("codCheckoutRequestId");
        removePurchasedItemsFromCart(order.items);
        setCodOrder(order);
        setVerifiedTotal(order.total);
        setStep("complete");
        setPaymentNotice(profileSaveIssue
          ? "Your order is saved, but the updated address could not be saved to your account."
          : "Your cash-on-delivery order was placed.");
        window.dispatchEvent(new Event("orderdataupdated"));
        sessionStorage.removeItem("checkoutDraft");
        sessionStorage.removeItem("checkoutQuote");
        window.scrollTo(0, 0);
        return;
      }

      const response = await fetch(`${apiUrl}/checkout/session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: information.items.map(item => ({ id: item.id, pQuantity: quantityOf(item) })),
          contact: information.contact,
          delivery: information.delivery,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Secure checkout could not be started.");
      if (!result.url) throw new Error("Stripe did not return a checkout link.");
      window.location.assign(result.url);
    } catch (error) {
      setPaymentError(error.message);
      setIsStartingPayment(false);
    }
  };

  const applyCoupon = async event => {
    event.preventDefault();
    if (isApplyingCoupon || !authUser) return;
    setIsApplyingCoupon(true);
    setCouponMessage("");
    setPaymentError("");
    try {
      const response = await fetch(`${apiUrl}/checkout/coupon/validate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: information.items.map(item => ({ id: item.id, pQuantity: quantityOf(item) })),
          couponCode,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Coupon could not be applied.");
      setCouponQuote(result);
      setCouponCode(result.couponCode);
      setCouponMessage(`15% coupon applied. You save ${formatPrice(result.discountAmount / 100)}.`);
    } catch (error) {
      setCouponQuote(null);
      setCouponMessage(error.message || "Coupon could not be applied.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const retryReceiptEmail = async () => {
    if (!testReceipt?.sessionId || isRetryingReceipt) return;
    setIsRetryingReceipt(true);
    setReceiptEmailError("");
    try {
      const response = await fetch(`${apiUrl}/checkout/session/${encodeURIComponent(testReceipt.sessionId)}/receipt`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "The test receipt email could not be sent.");
      const nextReceipt = { ...testReceipt, receiptEmailStatus: result.receiptEmailStatus };
      setTestReceipt(nextReceipt);
      sessionStorage.setItem("testPaymentReceipt", JSON.stringify(nextReceipt));
      const testPayments = readStoredArray("storeTestPayments").map(payment =>
        payment?.id === nextReceipt.id ? nextReceipt : payment);
      localStorage.setItem("storeTestPayments", JSON.stringify(testPayments));
      window.dispatchEvent(new Event("orderdataupdated"));
    } catch (error) {
      setReceiptEmailError(error.message);
    } finally {
      setIsRetryingReceipt(false);
    }
  };

  if (!items.length && !savedReceipt && !savedCodOrder && searchParams.get("payment") !== "success") {
    return <Navigate to="/cart" replace />;
  }

  return <main className="new-in-page checkout-page">
    <StoreHeader variant="paper" />
    <div className="checkout-shell">
      <nav className="new-in-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><Link to="/cart">Shopping bag</Link><span aria-hidden="true">/</span><span aria-current="page">Checkout</span></nav>

      <header className="checkout-heading"><div><p className="new-in-hero__eyebrow">{codOrder || paymentMethod === "cod" ? "Cash on delivery" : "Stripe test checkout"}</p><h1>Complete your order</h1></div><Link to="/cart">Back to bag <span aria-hidden="true">→</span></Link></header>

      <ol className="checkout-steps" aria-label="Checkout progress">
        {[ ["information", "Information"], ["payment", "Payment"], ["complete", "Complete"] ].map(([key, label], index) => <li className={`${step === key ? "is-current" : ""}${index < 1 && step === "payment" ? " is-complete" : ""}`} key={key} aria-current={step === key ? "step" : undefined}><span>{index + 1}</span><strong>{label}</strong></li>)}
      </ol>

      <div className="checkout-layout">
        <section className="checkout-main" aria-labelledby="checkout-section-title">
          {step === "information" ? <form className="checkout-form" onSubmit={continueToPayment}>
            <div className="checkout-section-heading"><div><p>Guest checkout</p><h2 id="checkout-section-title">Contact information</h2></div><span>No account required</span></div>
            <div className="checkout-fields checkout-fields--two">
              <label>Email address<input type="email" autoComplete="email" required value={contact.email} onChange={event => updateContact("email", event.target.value)} /></label>
              <label>Phone number<input type="tel" autoComplete="tel" required value={contact.phone} onChange={event => updateContact("phone", event.target.value)} /></label>
            </div>

            <div className="checkout-section-heading checkout-section-heading--address"><div><p>Delivery</p><h2>Shipping address</h2></div></div>
            <div className="checkout-fields checkout-fields--two">
              <label>First name<input autoComplete="given-name" required value={contact.firstName} onChange={event => updateContact("firstName", event.target.value)} /></label>
              <label>Last name<input autoComplete="family-name" required value={contact.lastName} onChange={event => updateContact("lastName", event.target.value)} /></label>
              <label className="checkout-field--full">Country or region<select autoComplete="country" required value={contact.country} onChange={event => updateContact("country", event.target.value)}><option value="US">United States</option></select></label>
              <label className="checkout-field--full">Street address<input autoComplete="address-line1" required value={contact.address} onChange={event => updateContact("address", event.target.value)} /></label>
              <label className="checkout-field--full">Apartment, suite, etc. <span>Optional</span><input autoComplete="address-line2" value={contact.apartment} onChange={event => updateContact("apartment", event.target.value)} /></label>
              <label>City<input autoComplete="address-level2" required value={contact.city} onChange={event => updateContact("city", event.target.value)} /></label>
              <label>State or region<input autoComplete="address-level1" required value={contact.region} onChange={event => updateContact("region", event.target.value)} /></label>
              <label>Postal code<input autoComplete="postal-code" required value={contact.postalCode} onChange={event => updateContact("postalCode", event.target.value)} /></label>
            </div>

            <label className="checkout-checkbox"><input type="checkbox" checked={differentAddress} onChange={event => setDifferentAddress(event.target.checked)} /><span>Use a different delivery address</span></label>
            {differentAddress && <div className="checkout-fields checkout-fields--two checkout-fields--alternate">
              <label>First name<input autoComplete="shipping given-name" required value={shippingAddress.firstName} onChange={event => updateShipping("firstName", event.target.value)} /></label>
              <label>Last name<input autoComplete="shipping family-name" required value={shippingAddress.lastName} onChange={event => updateShipping("lastName", event.target.value)} /></label>
              <label className="checkout-field--full">Country or region<select autoComplete="shipping country" required value={shippingAddress.country} onChange={event => updateShipping("country", event.target.value)}><option value="US">United States</option></select></label>
              <label className="checkout-field--full">Street address<input autoComplete="shipping address-line1" required value={shippingAddress.address} onChange={event => updateShipping("address", event.target.value)} /></label>
              <label>City<input autoComplete="shipping address-level2" required value={shippingAddress.city} onChange={event => updateShipping("city", event.target.value)} /></label>
              <label>State or region<input autoComplete="shipping address-level1" required value={shippingAddress.region} onChange={event => updateShipping("region", event.target.value)} /></label>
              <label>Postal code<input autoComplete="shipping postal-code" required value={shippingAddress.postalCode} onChange={event => updateShipping("postalCode", event.target.value)} /></label>
            </div>}

            <label className="checkout-notes">Order notes <span>Optional</span><textarea rows="4" value={orderNotes} onChange={event => setOrderNotes(event.target.value)} placeholder="Delivery instructions or other details" /></label>
            {paymentError && <p className="checkout-payment-notice" role="alert">{paymentError}</p>}
            <button className="checkout-primary" type="submit" disabled={isLoadingQuote}>{isLoadingQuote ? "Checking current prices…" : "Continue to payment"} <span aria-hidden="true">→</span></button>
          </form> : step === "payment" ? <section className="checkout-payment" aria-labelledby="checkout-section-title">
            <div className="checkout-section-heading"><div><p>Step 2 of 3 · {paymentMethod === "cod" ? "Cash on delivery" : "Stripe test mode"}</p><h2 id="checkout-section-title">{paymentMethod === "cod" ? "Cash on delivery" : "Card payment"}</h2></div></div>
            {information && <div className="checkout-review"><h3>Contact</h3><p>{information.contact.email}<br />{information.contact.phone}</p><h3>Delivery address</h3><p>{information.delivery.firstName} {information.delivery.lastName}<br />{information.delivery.address}{information.delivery.apartment ? `, ${information.delivery.apartment}` : ""}<br />{information.delivery.city}, {information.delivery.region} {information.delivery.postalCode}<br />United States</p><button type="button" onClick={() => setStep("information")}>Edit details</button></div>}
            {paymentNotice && <div className="checkout-payment-notice" role="status"><strong>Payment cancelled</strong><span>{paymentNotice}</span></div>}
            {paymentError && <div className="checkout-payment-notice" role="alert"><strong>We couldn’t finish saving the test payment.</strong><span>{paymentError}</span>{searchParams.get("session_id") && <button type="button" onClick={() => setVerificationAttempt(attempt => attempt + 1)}>Retry payment verification</button>}</div>}
            <div className="checkout-payment-notice" role="note"><strong>Stripe test payment · EUR</strong><span>Stripe test mode does not collect a real payment or create a fulfillable order. Cash on delivery creates a real order; pay the courier in cash when it arrives.</span></div>
            <fieldset className="checkout-payment-methods"><legend>Choose a payment method</legend><label className={`checkout-payment-method${paymentMethod === "stripe" ? " is-selected" : ""}`}><input type="radio" name="payment" value="stripe" checked={paymentMethod === "stripe"} onChange={() => setPaymentMethod("stripe")} /><span><strong>Card payment</strong><small>Stripe test mode only — no real order</small></span></label><label className={`checkout-payment-method${paymentMethod === "cod" ? " is-selected" : ""}`}><input type="radio" name="payment" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} disabled={isLoadingAuth || !authUser} /><span><strong>Cash on delivery</strong><small>{isLoadingAuth ? "Checking your account…" : authUser ? `Available for ${authUser.email}` : "Log in to place a real COD order."}</small></span></label></fieldset>
            {!isLoadingAuth && !authUser && <p className="checkout-auth-prompt"><Link to="/account?returnTo=%2Fcheckout">Log in or create an account</Link> to use cash on delivery.</p>}
            {authUser && paymentMethod === "cod" && <p className="checkout-auth-prompt">Your order will be saved to {authUser.email}. Pay the courier in cash on delivery.</p>}
            {authUser && paymentMethod === "cod" && <form className="checkout-coupon" onSubmit={applyCoupon}>
              <label htmlFor="checkout-coupon-code">15% first-order coupon</label>
              <div><input id="checkout-coupon-code" autoComplete="off" maxLength={40} value={couponCode} onChange={event => { setCouponCode(event.target.value.toUpperCase()); setCouponQuote(null); setCouponMessage(""); }} placeholder="Enter your newsletter code" /><button type="submit" disabled={isApplyingCoupon || !couponCode.trim()}>{isApplyingCoupon ? "Checking…" : couponQuote ? "Recheck code" : "Apply"}</button></div>
              {couponMessage && <p className={couponQuote ? "is-success" : "is-error"} role={couponQuote ? "status" : "alert"}>{couponMessage}</p>}
            </form>}
            <button className="checkout-primary" type="button" onClick={startPayment} disabled={isStartingPayment || (paymentMethod === "stripe" && !quote) || isLoadingAuth}>{isStartingPayment ? paymentMethod === "cod" ? "Placing your order…" : "Opening secure checkout…" : paymentMethod === "cod" ? "Place cash-on-delivery order" : "Continue to Stripe test checkout"} <span aria-hidden="true">→</span></button>
          </section> : <section className="checkout-complete" aria-labelledby="checkout-section-title">
            {paymentError ? <div className="checkout-payment-notice" role="alert">{paymentError}</div> : codOrder ? <>
              <div className="checkout-complete__hero">
                <span className="checkout-complete__icon" aria-hidden="true">✓</span>
                <p className="new-in-hero__eyebrow">Order received</p>
                <h2 id="checkout-section-title">Thank you{information?.delivery?.firstName ? `, ${information.delivery.firstName}` : ""}.</h2>
                <p>Your cash-on-delivery order is saved. Pay the courier when it arrives.</p>
              </div>
              <div className="checkout-test-receipt" role="status">
                <span className="checkout-test-receipt__badge">Cash on delivery</span>
                <h3>Order {codOrder.id}</h3>
                <dl>
                  <div><dt>Order total</dt><dd>{formatPrice(codOrder.total)}</dd></div>
                  <div><dt>Payment</dt><dd>Cash to courier on delivery</dd></div>
                  {authUser?.email && <div><dt>Account</dt><dd>{authUser.email}</dd></div>}
                </dl>
                <p className={`checkout-test-receipt__email checkout-test-receipt__email--${codOrder.emailStatus || "not_configured"}`} role="status">
                  {codOrder.emailStatus === "sent" ? "Order confirmation emailed to your account address." :
                    codOrder.emailStatus === "failed" ? "Your order is saved, but the confirmation email could not be sent." :
                      "Your order is saved. Email confirmation is not configured."}
                </p>
              </div>
              {codOrder.delivery && <div className="checkout-review checkout-complete__delivery">
                <h3>Delivery address</h3>
                <p>{codOrder.delivery.firstName} {codOrder.delivery.lastName}<br />{codOrder.delivery.address}{codOrder.delivery.apartment ? `, ${codOrder.delivery.apartment}` : ""}<br />{codOrder.delivery.city}, {codOrder.delivery.region} {codOrder.delivery.postalCode}<br />United States</p>
              </div>}
              <div className="checkout-complete__actions"><Link className="checkout-primary" to="/neuheiten?category=furniture">Continue shopping <span aria-hidden="true">→</span></Link><Link to="/account">View your account</Link></div>
            </> : testReceipt ? <>
              <div className="checkout-complete__hero">
                <span className="checkout-complete__icon" aria-hidden="true">✓</span>
                <p className="new-in-hero__eyebrow">Payment complete</p>
                <h2 id="checkout-section-title">Thank you{testReceipt.delivery?.firstName ? `, ${testReceipt.delivery.firstName}` : ""}.</h2>
                <p>Your card payment was verified successfully.</p>
              </div>
              <div className="checkout-test-receipt" role="status">
                <span className="checkout-test-receipt__badge">Stripe test mode · no real charge</span>
                <h3>Test payment confirmed</h3>
                <p>This is a successful payment test, not a live purchase. No order was placed and nothing will be shipped.</p>
                <dl>
                  <div><dt>Test payment reference</dt><dd>{testReceipt.sessionReference}</dd></div>
                  <div><dt>Amount verified</dt><dd>{formatPrice(testReceipt.amountTotal / 100)}</dd></div>
                  {testReceipt.email && <div><dt>Receipt email</dt><dd>{testReceipt.email}</dd></div>}
                  {testReceipt.verifiedAt && <div><dt>Verified</dt><dd>{new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(testReceipt.verifiedAt))}</dd></div>}
                </dl>
                <p className={`checkout-test-receipt__email checkout-test-receipt__email--${testReceipt.receiptEmailStatus || "not_configured"}`} role="status">
                  {testReceipt.receiptEmailStatus === "sent" ? "A test receipt was emailed to the address above." :
                    testReceipt.receiptEmailStatus === "failed" ? "The test payment is saved, but the receipt email could not be delivered. Check the SMTP settings." :
                      testReceipt.receiptEmailStatus === "sending" ? "The test receipt email is being sent." :
                        "The test payment is saved. Email receipts are not configured yet."}
                </p>
                {receiptEmailError && <p className="checkout-test-receipt__email-error" role="alert">{receiptEmailError}</p>}
                {testReceipt.receiptEmailStatus !== "sent" && testReceipt.receiptEmailStatus !== "sending" &&
                  <button className="checkout-test-receipt__retry" type="button" onClick={retryReceiptEmail} disabled={isRetryingReceipt}>
                    {isRetryingReceipt ? "Sending test receipt…" : "Try sending the test receipt again"}
                  </button>}
              </div>
              {testReceipt.delivery && <div className="checkout-review checkout-complete__delivery">
                <h3>Delivery address entered for this test</h3>
                <p>{testReceipt.delivery.firstName} {testReceipt.delivery.lastName}<br />{testReceipt.delivery.address}{testReceipt.delivery.apartment ? `, ${testReceipt.delivery.apartment}` : ""}<br />{testReceipt.delivery.city}, {testReceipt.delivery.region} {testReceipt.delivery.postalCode}<br />United States</p>
              </div>}
              <div className="checkout-complete__actions"><Link className="checkout-primary" to="/neuheiten?category=furniture">Continue shopping <span aria-hidden="true">→</span></Link><Link to="/">Back to home</Link></div>
            </> : <div className="checkout-payment-notice" role="status"><strong>Verifying payment with Stripe…</strong><span>Please wait while we confirm the test payment.</span></div>}
          </section>}
        </section>

        <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
          <h2 id="checkout-summary-title">{step === "complete" ? "Payment summary" : "Order summary"}</h2>
          <div className="checkout-summary__items">{(codOrder?.items?.length ? codOrder.items : testReceipt?.items?.length ? testReceipt.items : items).map((item, index) => {
            const quotedItem = codOrder?.items?.length || testReceipt?.items?.length ? item : quote?.items?.[index];
            const quantity = quotedItem?.quantity || quantityOf(item);
            const name = quotedItem?.name || item.productName || item.name || "Product";
            const unitAmount = quotedItem?.unitAmount ?? (Number.isFinite(quotedItem?.price) ? Math.round(quotedItem.price * 100) : Math.round(priceOf(item) * 100));
            return <div className="checkout-summary__item" key={`${item.id}-${index}`}><img src={quotedItem?.image || item.productImage || item.image} alt="" /><div><strong>{name}</strong><span>Qty {quantity}</span></div><span>{formatPrice(unitAmount * quantity / 100)}</span></div>;
          })}</div>
          <div className="checkout-summary__row"><span>Subtotal</span><strong>{formatPrice(codOrder ? codOrder.subtotal : isCouponApplied ? couponQuote.subtotal / 100 : displayedSubtotal)}</strong></div>
          {((codOrder?.discountAmount || 0) > 0 || isCouponApplied) && <div className="checkout-summary__row"><span>Newsletter coupon {codOrder?.couponCode || (isCouponApplied && couponQuote.couponCode)}</span><strong>−{formatPrice(codOrder ? codOrder.discountAmount : couponQuote.discountAmount / 100)}</strong></div>}
          {step !== "complete" && <>
            <div className="checkout-summary__row"><span>Delivery</span><span>{paymentMethod === "cod" ? "Pay courier on delivery" : "Not included in test mode"}</span></div>
            <div className="checkout-summary__row"><span>Tax</span><span>{paymentMethod === "cod" ? "Not calculated" : "Not included in test mode"}</span></div>
          </>}
          <div className="checkout-summary__total"><span>{codOrder ? "Due on delivery" : step === "complete" ? "Verified test payment" : "Test payment subtotal"}</span><strong>{formatPrice(codOrder ? codOrder.total : displayedTotal)}</strong></div>
          {codOrder ? <p className="checkout-summary__note">Real order placed. Pay the courier in cash at delivery.</p> : step === "complete" ? <p className="checkout-summary__note">Test transaction only. No live payment, order, delivery, or fulfillment.</p> : <p className="checkout-summary__note">EUR reference prices only. Stripe test mode charges no real card. Shipping and tax are not included; this is not an order.</p>}
          {step !== "complete" && <Link to="/cart">Edit shopping bag</Link>}
        </aside>
      </div>
    </div>
  </main>;
}