import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { StoreHeader } from "./Home";
import "./NewIn.css";
import "./Account.css";

const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function NewsletterConfirm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [message, setMessage] = useState("Confirming your email…");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) {
      setMessage("");
      setError("This confirmation link is missing or invalid. Please sign up again.");
      setIsLoading(false);
      return undefined;
    }

    let active = true;
    setIsLoading(true);
    setError("");
    fetch(`${apiUrl}/newsletter/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Email confirmation failed.");
        return result;
      })
      .then(result => {
        if (active) setMessage(result.message);
      })
      .catch(requestError => {
        if (active) setError(requestError.message || "Could not connect to the newsletter service.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [token, attempt]);

  return <main className="new-in-page account-page">
    <StoreHeader variant="paper" />
    <section className="account-profile" aria-labelledby="newsletter-confirm-title">
      <nav className="new-in-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Newsletter confirmation</span></nav>
      <p className="new-in-hero__eyebrow">Skanvi newsletter</p>
      <h1 id="newsletter-confirm-title">{error ? "Confirmation needs attention" : isLoading ? "Confirming your email" : "Thank you"}</h1>
      {error ? <p className="account-auth__error" role="alert">{error}</p> :
        <p className="account-profile__intro" role="status">{message}</p>}
      {!isLoading && error && token && <button className="account-auth__retry" type="button" onClick={() => setAttempt(current => current + 1)}>Try again</button>}
      {!error && !isLoading && <p className="account-profile__note">Your personal coupon code is emailed after confirmation. Coupon redemption is not yet automated at checkout; contact support to redeem it.</p>}
      <nav className="account-profile__links" aria-label="Newsletter confirmation links"><Link to="/">Back to home <span aria-hidden="true">→</span></Link><Link to="/neuheiten">Browse the collection <span aria-hidden="true">→</span></Link></nav>
    </section>
  </main>;
}
