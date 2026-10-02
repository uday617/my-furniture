import { useState } from "react";
import { Link } from "react-router-dom";
import "./StoreFooter.css";

const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const trustMarks = [
  ["PayPal", "https://skanvi.com/payments/paypal.svg"],
  ["Klarna", "https://skanvi.com/payments/klarna-wordmark.svg"],
  ["Visa", "https://skanvi.com/payments/visa.svg"],
  ["Mastercard", "https://skanvi.com/payments/mastercard.svg"],
  ["American Express", "https://skanvi.com/payments/american-express.svg"],
  ["Maestro", "https://skanvi.com/payments/maestro.svg"],
  ["Apple Pay", "https://skanvi.com/payments/apple-pay.svg"],
  ["Google Pay", "https://skanvi.com/payments/google-pay.svg"],
  ["SEPA", "https://skanvi.com/payments/sepa.svg"],
  ["DHL", "https://skanvi.com/shipping/dhl.svg"],
  ["GLS", "https://skanvi.com/shipping/gls.svg"],
  ["DPD", "https://skanvi.com/shipping/dpd.svg"],
];

function StoreFooter() {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [newsletterError, setNewsletterError] = useState("");
  const [isSubmittingNewsletter, setIsSubmittingNewsletter] = useState(false);
  const submitNewsletter = async event => {
    event.preventDefault();
    if (isSubmittingNewsletter) return;
    setIsSubmittingNewsletter(true);
    setNewsletterMessage("");
    setNewsletterError("");
    try {
      const response = await fetch(`${apiUrl}/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Newsletter signup failed.");
      setNewsletterMessage(result.message);
      setNewsletterEmail("");
    } catch (error) {
      setNewsletterError(error.message || "Could not connect to the newsletter service.");
    } finally {
      setIsSubmittingNewsletter(false);
    }
  };

  return <footer className="store-footer">
    <div className="store-footer__inner">
      <section className="store-footer__newsletter" aria-labelledby="store-footer-newsletter-title">
        <div className="store-footer__newsletter-image" aria-hidden="true"><img src="https://skanvi.com/newsletter/skanvi-newsletter-room-768.webp" alt="" loading="lazy" /></div>
        <div className="store-footer__newsletter-copy">
          <p className="store-footer__eyebrow">Skanvi newsletter</p>
          <h2 id="store-footer-newsletter-title">Get 15% off your first order.</h2>
          <p>New ideas for your home, fresh collections and selected offers, straight to your inbox.</p>
          <form className="store-footer__form" onSubmit={submitNewsletter}>
            <label className="sr-only" htmlFor="store-footer-email">Email address</label>
            <input id="store-footer-email" type="email" placeholder="Email address" autoComplete="email" maxLength={254} required value={newsletterEmail} onChange={event => setNewsletterEmail(event.target.value)} disabled={isSubmittingNewsletter} />
            <button type="submit" disabled={isSubmittingNewsletter}>{isSubmittingNewsletter ? "Sending…" : "Sign up"}</button>
          </form>
          {newsletterError ? <small className="store-footer__newsletter-error" role="alert">{newsletterError}</small> :
            <small className={newsletterMessage ? "store-footer__newsletter-success" : undefined} role={newsletterMessage ? "status" : undefined}>{newsletterMessage || "Confirm your email and we’ll send your personal 15% first-order code. Coupon redemption is not yet automated at checkout."}</small>}
        </div>
      </section>

      <div className="store-footer__lead"><Link className="store-footer__logo" to="/">Skanvi<span>.</span></Link><h2>Pure design, pure comfort.</h2></div>

      <div className="store-footer__columns">
        <section><h3>Contact</h3><span>support@skanvi.com</span><span>+49 221 29246424</span><Link to="/contact">Contact &amp; FAQ</Link><span>Mon-Fri, 12 pm-6 pm</span><div className="store-footer__social"><span>Instagram</span><span>TikTok</span><span>Pinterest</span></div></section>
        <nav aria-label="Products"><h3>Products</h3><Link to="/neuheiten?category=furniture">Furniture</Link><Link to="/neuheiten?category=outdoor">Outdoor</Link><Link to="/neuheiten?category=rugs">Rugs</Link><Link to="/neuheiten?category=lighting">Lighting</Link><Link to="/neuheiten?category=mirrors">Mirrors</Link><Link to="/neuheiten?category=accessories">Accessories</Link><Link to="/neuheiten?category=textiles">Textiles</Link></nav>
        <nav aria-label="About Skanvi"><h3>Skanvi</h3><Link to="/about">About us</Link><Link to="/?menu=rooms" onClick={() => window.scrollTo(0, 0)}>Rooms</Link><Link to="/designer">Designers</Link><Link to="/contact">Contact &amp; FAQ</Link></nav>
        <nav aria-label="Help"><h3>Help</h3><Link to="/account">Order tracking</Link><Link to="/contact#contract-cancellation">Cancel a contract</Link><Link to="/contact#delivery">Delivery times</Link><Link to="/contact#returns">Returns</Link></nav>
      </div>

      <section className="store-footer__trust" aria-label="Payment and delivery methods">
        <h2>Secure payment and delivery</h2>
        <div className="store-footer__trust-viewport"><div className="store-footer__trust-track">{[false, true].map(duplicate => <ul key={duplicate ? "duplicate" : "primary"} aria-hidden={duplicate || undefined}>{trustMarks.map(([name, image]) => <li key={name} aria-label={name}><img src={image} alt={duplicate ? "" : name} loading="lazy" /></li>)}</ul>)}</div></div>
      </section>

      <div className="store-footer__bottom"><span>© {new Date().getFullYear()} Skanvi. All rights reserved.</span><nav aria-label="Legal"><Link to="/contact#imprint">Imprint</Link><Link to="/contact#privacy">Privacy</Link><Link to="/contact#terms">Terms</Link></nav></div>
    </div>
  </footer>;
}

export default StoreFooter;